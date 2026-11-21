function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

function evaluatorInvitationEmail({ evaluatorName, event, designation, organization, invitationMessage, expiresAt, invitationUrl, platformName }) {
  const safeName = escapeHtml(evaluatorName);
  const safeEvent = escapeHtml(event.title);
  const safeDesignation = escapeHtml(designation);
  const safeOrganization = organization ? escapeHtml(organization) : null;
  const safeMessage = invitationMessage ? escapeHtml(invitationMessage).replace(/\n/g, '<br>') : null;
  const eventDate = formatDate(event.startDate);
  const expiryDate = formatDate(expiresAt);
  const safeLocation = escapeHtml(event.venue || (event.mode === 'ONLINE' ? 'Online' : 'Location to be announced'));

  const subject = `Invitation to Evaluate — ${event.title}`;
  const html = `
  <div style="margin:0;background:#f1f5f9;padding:32px 12px;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#0f172a;padding:24px 32px;color:#ffffff"><strong style="font-size:20px">${escapeHtml(platformName)}</strong></div>
      <div style="padding:32px">
        <h1 style="font-size:24px;margin:0 0 16px">Evaluator invitation</h1>
        <p style="line-height:1.6">Hello ${safeName},</p>
        <p style="line-height:1.6">You have been invited to participate as an evaluator for <strong>${safeEvent}</strong>.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:20px 0">
          <strong style="display:block;margin-bottom:10px">Invitation details</strong>
          <div style="line-height:1.8;font-size:14px">
            <div><strong>Event:</strong> ${safeEvent}</div>
            <div><strong>Designation:</strong> ${safeDesignation}</div>
            ${safeOrganization ? `<div><strong>Organization:</strong> ${safeOrganization}</div>` : ''}
            ${eventDate ? `<div><strong>Event date:</strong> ${escapeHtml(eventDate)}</div>` : ''}
            <div><strong>Location / mode:</strong> ${safeLocation}</div>
            ${expiryDate ? `<div><strong>Invitation expires:</strong> ${escapeHtml(expiryDate)}</div>` : ''}
          </div>
        </div>
        ${safeMessage ? `<div style="border-left:4px solid #2563eb;padding:10px 14px;margin:18px 0;background:#eff6ff"><strong>Personal message</strong><div style="margin-top:6px;line-height:1.6">${safeMessage}</div></div>` : ''}
        <div style="text-align:center;margin:28px 0">
          <a href="${escapeHtml(invitationUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:bold">Review Invitation</a>
        </div>
        <p style="font-size:13px;line-height:1.6;color:#475569">If the button does not work, copy this secure link into your browser:</p>
        <p style="font-size:12px;line-break:anywhere"><a href="${escapeHtml(invitationUrl)}" style="color:#2563eb">${escapeHtml(invitationUrl)}</a></p>
        <p style="font-size:12px;line-height:1.6;color:#64748b">This invitation is intended specifically for you. Do not share the link with others.</p>
        <p style="line-height:1.6;margin-top:24px">Regards,<br><strong>${escapeHtml(platformName)} Administration Team</strong></p>
      </div>
    </div>
  </div>`;

  return { subject, html };
}

module.exports = { evaluatorInvitationEmail };
