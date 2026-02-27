const nodemailer = require('nodemailer');
const { config } = require('../../config');

let transporter = null;

function getSmtpConfig() {
  const host = config.smtp.host;
  const port = config.smtp.port;
  const secure = config.smtp.secure;
  const user = config.smtp.user;
  const pass = config.smtp.pass;
  const from = config.smtp.from;

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    isConfigured: Boolean(host && port && user && pass && from)
  };
}

function ensureTransporter() {
  if (transporter) {
    return transporter;
  }

  const config = getSmtpConfig();
  if (!config.isConfigured) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  return transporter;
}

function getAppUrl() {
  const appUrl = config.appUrl || '';

  if (!appUrl) {
    console.warn('[Email] APP_URL não configurada. Links de e-mail podem ficar inválidos.');
    return appUrl;
  }

  if (!appUrl.startsWith('https://')) {
    console.warn('[Email] APP_URL não usa HTTPS. Recomendado usar HTTPS em produção.');
  }

  return appUrl.replace(/\/$/, '');
}

async function verifySmtpConnection() {
  const config = getSmtpConfig();

  if (!config.isConfigured) {
    console.warn(
      '[Email] SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS e SMTP_FROM.'
    );
    return false;
  }

  try {
    const smtpTransport = ensureTransporter();
    await smtpTransport.verify();
    console.log('[Email] SMTP verificado com sucesso.');
    return true;
  } catch (error) {
    console.warn(`[Email] Falha ao verificar SMTP: ${error.message}`);
    return false;
  }
}

async function sendMail({ to, subject, html, text }) {
  const config = getSmtpConfig();

  if (!config.isConfigured) {
    console.warn('[Email] Envio ignorado: SMTP não configurado.');
    return { ok: false, skipped: true };
  }

  try {
    const smtpTransport = ensureTransporter();
    await smtpTransport.sendMail({
      from: config.from,
      to,
      subject,
      html,
      text
    });

    return { ok: true };
  } catch (error) {
    console.warn(`[Email] Falha ao enviar e-mail para ${to}: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

function buildActivationEmail({ name, token }) {
  const appUrl = getAppUrl();
  const activationLink = `${appUrl}/activate?token=${encodeURIComponent(token)}`;

  const subject = 'Ative sua conta no SINGEM';
  const html = `
    <p>Olá, ${name || 'usuário'}.</p>
    <p>Para ativar sua conta no SINGEM, clique no link abaixo:</p>
    <p><a href="${activationLink}">${activationLink}</a></p>
    <p>Este link expira em 24 horas.</p>
    <p>Se você não solicitou este cadastro, ignore este e-mail.</p>
  `;
  const text = [
    `Olá, ${name || 'usuário'}.`,
    'Para ativar sua conta no SINGEM, acesse:',
    activationLink,
    'Este link expira em 24 horas.',
    'Se você não solicitou este cadastro, ignore este e-mail.'
  ].join('\n');

  return { subject, html, text };
}

function buildResetPasswordEmail({ name, token }) {
  const appUrl = getAppUrl();
  const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const subject = 'Redefinição de senha - SINGEM';
  const html = `
    <p>Olá, ${name || 'usuário'}.</p>
    <p>Recebemos uma solicitação de redefinição de senha.</p>
    <p>Para continuar, clique no link abaixo:</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>Este link expira em 1 hora.</p>
    <p>Se você não solicitou, ignore este e-mail.</p>
  `;
  const text = [
    `Olá, ${name || 'usuário'}.`,
    'Recebemos uma solicitação de redefinição de senha.',
    'Para continuar, acesse:',
    resetLink,
    'Este link expira em 1 hora.',
    'Se você não solicitou, ignore este e-mail.'
  ].join('\n');

  return { subject, html, text };
}

module.exports = {
  verifySmtpConnection,
  sendMail,
  buildActivationEmail,
  buildResetPasswordEmail
};
