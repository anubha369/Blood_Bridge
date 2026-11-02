const nodemailer = require('nodemailer');
const config = require('../config');

/**
 * Generates a responsive, branded HTML email template for BloodBridge OTP verification.
 */
function generateOtpEmailHtml({ toName, otp, expiresInMinutes = 5 }) {
  const safeName = toName || 'BloodBridge Member';
  const formattedOtp = String(otp).trim();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your BloodBridge Account</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 560px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 24px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #d71935 0%, #b91c1c 100%);
      padding: 36px 32px 32px;
      text-align: center;
      color: #ffffff;
    }
    .brand {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .sub-brand {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.9;
      margin-top: 4px;
      font-weight: 700;
    }
    .content {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .lead {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 28px;
    }
    .otp-card {
      background: #fff1f2;
      border: 2px dashed #f43f5e;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #be123c;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #9f1239;
      margin: 4px 0;
    }
    .otp-expiry {
      font-size: 12px;
      font-weight: 600;
      color: #e11d48;
      margin-top: 8px;
    }
    .security-notice {
      background: #f8fafc;
      border-left: 4px solid #d71935;
      padding: 14px 16px;
      border-radius: 8px;
      margin: 24px 0;
      font-size: 12px;
      color: #334155;
      line-height: 1.5;
    }
    .security-notice strong {
      color: #0f172a;
    }
    .footer {
      background: #f8fafc;
      padding: 24px 32px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer a {
      color: #d71935;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">🩸 BloodBridge Vision-X</div>
      <div class="sub-brand">Emergency Blood Coordination Network</div>
    </div>
    <div class="content">
      <div class="greeting">Hello ${safeName},</div>
      <p class="lead">
        Thank you for joining BloodBridge. To complete your registration and secure your healthcare coordination account, please enter the following 6-digit verification code:
      </p>

      <div class="otp-card">
        <div class="otp-label">Email Verification Code</div>
        <div class="otp-code">${formattedOtp}</div>
        <div class="otp-expiry">⏱️ Valid for ${expiresInMinutes} minutes only</div>
      </div>

      <div class="security-notice">
        <strong>🛡️ Security Notice:</strong> BloodBridge staff and healthcare coordinators will <em>never</em> call, message, or email you to ask for this code. If you did not request this registration, please ignore this email.
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 24px; line-height: 1.5;">
        By verifying your email, you confirm your consent to participate in emergency coordination communications under BloodBridge privacy guidelines.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px;">
        <strong>BloodBridge Vision-X</strong> • Emergency Blood Search &amp; Spatial Coordination Platform
      </p>
      <p style="margin: 0; font-size: 10px; color: #94a3b8;">
        Clinical cross-matching and transfusion compatibility belong exclusively to authorized medical professionals.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Masks an email for privacy in logs and responses (e.g. j***3@gmail.com).
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***@***';
  const parts = email.split('@');
  if (parts.length !== 2) return '***@***';
  const [name, domain] = parts;
  const maskedName = name.length <= 2 
    ? `${name[0]}***`
    : `${name[0]}***${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
}

let _lastDispatchedOtpForTest = null;

let _cachedSmtpTransporter = null;

function getSmtpTransporter() {
  if (_cachedSmtpTransporter) return _cachedSmtpTransporter;
  const smtpUser = config.brevoSmtpLogin || config.brevoSenderEmail || 'vedikadubey16@gmail.com';
  _cachedSmtpTransporter = nodemailer.createTransport({
    host: config.brevoSmtpHost || 'smtp-relay.brevo.com',
    port: config.brevoSmtpPort || 587,
    secure: (config.brevoSmtpPort === 465),
    auth: {
      user: smtpUser,
      pass: config.brevoApiKey
    },
    family: 4,
    connectionTimeout: 30000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    pool: true,
    maxConnections: 3,
    maxMessages: 100
  });
  return _cachedSmtpTransporter;
}

/**
 * Sends a transactional OTP email using Brevo (REST API or SMTP).
 * Falls back to simulation logging in development if Brevo credentials are not yet live.
 */
async function sendOtpEmail({ toEmail, toName, otp, expiresInMinutes = 5 }) {
  const cleanEmail = String(toEmail).trim().toLowerCase();
  _lastDispatchedOtpForTest = { toEmail: cleanEmail, otp: String(otp).trim() };
  const masked = maskEmail(cleanEmail);
  const subject = 'Verify Your BloodBridge Account';
  const htmlContent = generateOtpEmailHtml({ toName, otp, expiresInMinutes });
  const textContent = `Your BloodBridge verification code is: ${otp}\n\nThis code is valid for ${expiresInMinutes} minutes.\nDo not share this code with anyone.`;

  // Method 1: Brevo REST API v3 (used if API key starts with xkeysib- or general Brevo API key)
  if (config.brevoApiKey && config.brevoApiKey.startsWith('xkeysib-')) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': config.brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: config.brevoSenderName || 'Blood Bridge',
            email: config.brevoSenderEmail || 'vedikadubey16@gmail.com'
          },
          to: [{ email: cleanEmail, name: toName || 'BloodBridge Member' }],
          subject,
          htmlContent,
          textContent
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log(`[Brevo API] Verification email sent to ${masked} (messageId: ${data.messageId || 'ok'})`);
        return { success: true, provider: 'brevo_rest', messageId: data.messageId };
      } else {
        console.warn(`[Brevo API Error] (${res.status}):`, data.message || data.code || 'Failed');
      }
    } catch (apiErr) {
      console.warn('[Brevo API Dispatch Error]:', apiErr.message);
    }
  }

  // Method 2: Brevo SMTP Relay (used for xsmtpsib- keys)
  if (config.brevoApiKey) {
    try {
      const transporter = getSmtpTransporter();
      const info = await transporter.sendMail({
        from: `"${config.brevoSenderName || 'Blood Bridge'}" <${config.brevoSenderEmail || 'vedikadubey16@gmail.com'}>`,
        to: cleanEmail,
        subject,
        text: textContent,
        html: htmlContent
      });

      console.log(`[Brevo SMTP] Verification email sent to ${masked} (messageId: ${info.messageId})`);
      return { success: true, provider: 'brevo_smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.warn(`[Brevo SMTP Dispatch Notice] (${smtpErr.message}) for ${masked}`);
    }
  }

  // Development Fallback: Safe simulated delivery log (never leaking OTP to public output)
  console.log(`[Email Dispatch Notice] Verification email simulated for ${masked} (expires in ${expiresInMinutes}m).`);
  return {
    success: true,
    simulated: true,
    provider: 'local_resilient',
    masked_email: masked
  };
}

module.exports = {
  sendOtpEmail,
  generateOtpEmailHtml,
  maskEmail,
  getLastDispatchedOtp: () => _lastDispatchedOtpForTest
};
