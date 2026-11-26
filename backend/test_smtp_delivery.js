require('dotenv').config();
const nodemailer = require('nodemailer');
const { getMailConfig } = require('./src/config/env');

const config = getMailConfig();

// Don't print secrets - just check configuration state
console.log('SMTP configured:', config.configured);
console.log('Host:', config.host);
console.log('Port:', config.port);
console.log('Secure:', config.secure);
console.log('User present:', Boolean(config.user));
console.log('Pass present:', Boolean(config.pass));
console.log('From email:', config.fromEmail);
console.log('From name:', config.fromName);

const transporter = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.secure,
  auth: { user: config.user, pass: config.pass },
  tls: { rejectUnauthorized: false },
});

async function main() {
  try {
    await transporter.verify();
    console.log('SMTP verify: OK');
    
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: config.fromEmail,
      subject: 'SMTP Delivery Test',
      html: '<h1>Test Email</h1><p>This is a delivery test.</p>',
    });
    console.log('Email sent: messageId=', info.messageId);
    console.log('Response:', info.response ? info.response.substring(0, 100) : 'N/A');
  } catch (err) {
    console.log('SMTP ERROR:');
    console.log('  code:', err.code);
    console.log('  command:', err.command);
    console.log('  responseCode:', err.responseCode);
    const resp = err.response ? err.response.substring(0, 200) : 'N/A';
    console.log('  response:', resp);
    console.log('  message:', err.message ? err.message.substring(0, 200) : 'N/A');
  }
}

main();
