process.env.NODE_ENV = 'test';
require('dotenv').config();
const assert = require('assert');
const nodemailer = require('nodemailer');

const sentEmails = [];
let smtpShouldFail = false;

function createMockTransporter() {
  return {
    sendMail: async (mailOptions) => {
      if (smtpShouldFail) {
        const err = new Error('SMTP connection refused');
        err.code = 'ECONNREFUSED';
        throw err;
      }
      sentEmails.push(mailOptions);
      return { messageId: 'mock-' + sentEmails.length, response: '250 OK' };
    },
    verify: async () => true,
    close: async () => {},
  };
}
nodemailer.createTransport = createMockTransporter;
function resetEmails() { sentEmails.length = 0; }
function setSmtpFail(shouldFail) { smtpShouldFail = shouldFail; }

const invitations = new Map();
let nextId = 1;

function makePrisma() {
  return {
    event: { findUnique: async ({ where }) => where.id === 'evt-123' ? { id: 'evt-123', title: 'Hackathon 2026', description: '', shortDescription: '', mode: 'ONLINE', startDate: new Date('2026-12-01'), endDate: new Date('2026-12-03'), venue: 'Online', status: 'PUBLISHED' } : null },
    eventEvaluatorInvitation: {
      findUnique: async ({ where, include }) => { const inv = invitations.get(where.id); if (!inv) return null; const r = { ...inv }; if (include && include.event) r.event = { id: 'evt-123', title: 'Hackathon 2026', description: '', shortDescription: '', mode: 'ONLINE', startDate: new Date('2026-12-01'), endDate: new Date('2026-12-03'), venue: 'Online', status: 'PUBLISHED' }; return r; },
      findFirst: async ({ where }) => { for (const inv of invitations.values()) { let m = true; if (where.eventId !== undefined && inv.eventId !== where.eventId) m = false; if (where.email !== undefined && inv.email !== where.email) m = false; if (where.status !== undefined && inv.status !== where.status) m = false; if (where.expiresAt && where.expiresAt.gt && !(new Date(inv.expiresAt) > new Date())) m = false; if (m) return { ...inv }; } return null; },
      create: async ({ data }) => { const id = 'inv-' + nextId++; const rec = { id, eventId: data.eventId, name: data.name, email: data.email, designation: data.designation, organization: data.organization, phone: data.phone, invitationMessage: data.invitationMessage, tokenHash: data.tokenHash, status: data.status, emailDeliveryStatus: data.emailDeliveryStatus, emailDeliveryError: data.emailDeliveryError, emailedAt: data.emailedAt, expiresAt: data.expiresAt, revokedAt: data.revokedAt, createdById: data.createdById, createdAt: new Date(), updatedAt: new Date() }; invitations.set(id, rec); return rec; },
      update: async ({ where, data }) => { const inv = invitations.get(where.id); if (!inv) throw new Error('Invitation not found'); const upd = { ...inv, ...data, updatedAt: new Date() }; invitations.set(where.id, upd); return upd; },
      updateMany: async ({ where, data }) => { let c = 0; for (const inv of invitations.values()) { let m = true; if (where.status !== undefined && inv.status !== where.status) m = false; if (where.expiresAt && where.expiresAt.lte && !(new Date(inv.expiresAt) <= new Date())) m = false; if (m) { Object.assign(inv, data, { updatedAt: new Date() }); c++; } } return { count: c }; },
    },
    $transaction: async (ops) => { const results = []; for (const op of ops) { const [k] = Object.keys(op); const call = op[k]; if (typeof call === 'function') results.push(await call()); else results.push(call); } return results; },
    $queryRaw: async () => [], $disconnect: async () => {}, $connect: async () => {},
  };
}

const Module = require('module');
const origRequire = Module.prototype.require;
const dbMock = makePrisma();
Module.prototype.require = function (id) {
  if (id === '@prisma/client') return { Prisma: { PrismaClientKnownRequestError: class extends Error { constructor() { super(); this.code = 'P2002'; } } } };
  const n = id.replace(/\\/g, '/');
  if (n.endsWith('/src/config/database') || n.endsWith('config/database')) return dbMock;
  return origRequire.call(this, id);
};

const mailService = require('./src/services/mailService');
const { getMailConfig } = require('./src/config/env');
const evaluatorService = require('./src/modules/admin/evaluatorManagement.service');

async function runTests() {
  let passed = 0, failed = 0;
  async function check(name, fn) {
    try { await fn(); console.log('  PASS: ' + name); passed++; }
    catch (err) { console.log('  FAIL: ' + name + ' — ' + err.message); failed++; }
  }

  await check('config: frontendUrl valid and no password suffix', async () => {
    const c = getMailConfig();
    assert.strictEqual(c.configured, true);
    assert.strictEqual(c.frontendUrl, 'http://localhost:5173');
    assert.strictEqual(c.frontendUrlValid, true);
    assert.ok(!c.frontendUrl.includes('Nikhilpa12'));
  });
  await check('sendEvaluatorInvitation builds correct URL', async () => {
    resetEmails();
    await mailService.sendEvaluatorInvitation({ evaluatorName: 'John', evaluatorEmail: 'john@test.com', event: { title: 'Event', startDate: new Date(), mode: 'ONLINE', venue: 'Online' }, designation: 'Prof', organization: 'Uni', invitationMessage: 'Hi', expiresAt: new Date('2026-12-10'), invitationToken: 'tok123' });
    assert.strictEqual(sentEmails.length, 1);
    assert.ok(sentEmails[0].html.includes('http://localhost:5173/evaluator/invitations/tok123'));
    assert.ok(!sentEmails[0].html.includes('Nikhilpa12'));
  });

  await check('inviteEvaluator creates + sends email', async () => {
    resetEmails();
    const r = await evaluatorService.inviteEvaluator('evt-123', { name: 'Alice', email: 'alice@test.com', designation: 'Prof', organization: 'Uni', phone: '+1234567890', invitationMessage: 'Hi' }, 'u1');
    assert.strictEqual(r.invitation.emailDeliveryStatus, 'SENT');
    assert.strictEqual(r.invitation.emailDeliveryError, null);
    assert.strictEqual(r.emailDelivered, true);
    assert.strictEqual(sentEmails.length, 1);
  });

  await check('resendInvitation sends email', async () => {
    resetEmails();
    let id; for (const [i, inv] of invitations) if (inv.email === 'alice@test.com') { id = i; break; }
    assert.ok(id);
    const r = await evaluatorService.resendInvitation(id);
    assert.strictEqual(r.invitation.emailDeliveryStatus, 'SENT');
    assert.strictEqual(r.emailDelivered, true);
    assert.strictEqual(sentEmails.length, 1);
  });

  await check('regenerateInvitation sends email', async () => {
    resetEmails();
    let id; for (const [i, inv] of invitations) if (inv.email === 'alice@test.com') { id = i; break; }
    const r = await evaluatorService.regenerateInvitation(id, 'u1');
    assert.strictEqual(r.invitation.emailDeliveryStatus, 'SENT');
    assert.strictEqual(r.emailDelivered, true);
    assert.strictEqual(sentEmails.length, 1);
  });

  await check('SMTP failure: FAILED status, record not corrupted', async () => {
    resetEmails(); setSmtpFail(true);
    const r = await evaluatorService.inviteEvaluator('evt-123', { name: 'Bob', email: 'bob@test.com', designation: 'Prof', organization: 'Uni', phone: '+1234567890' }, 'u1');
    assert.strictEqual(r.invitation.emailDeliveryStatus, 'FAILED');
    assert.ok(r.invitation.emailDeliveryError);
    assert.strictEqual(r.emailDelivered, false);
    assert.strictEqual(sentEmails.length, 0);
    const inv = invitations.get(r.invitation.id);
    assert.strictEqual(inv.status, 'PENDING');
    assert.strictEqual(inv.tokenHash.length, 64);
    assert.ok(inv.expiresAt);
    setSmtpFail(false);
  });

  await check('config flags broken frontendUrl', async () => {
    const orig = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'http://localhost:5173Nikhilpa12@';
    try {
      const c = getMailConfig();
      assert.strictEqual(c.frontendUrlValid, false);
    } finally { process.env.FRONTEND_URL = orig; }
  });

  console.log('\n' + passed + ' passed, ' + failed + ' failed out of ' + (passed + failed));
  process.exit(failed > 0 ? 1 : 0);
}
runTests().catch(e => { console.error(e); process.exit(1); });