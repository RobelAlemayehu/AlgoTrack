const nodemailer = require('nodemailer');

/**
 * Creates and returns a Nodemailer transport using SMTP settings from environment variables.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });
}

/**
 * Generate branded inline-styled HTML template for AlgoTrack OTP emails.
 */
function getBrandedEmailTemplate({ purpose, otpCode, username }) {
  const isSignup = purpose === 'signup_verification';
  const title = isSignup ? 'Verify Your Email' : 'Password Reset Request';
  const headingCopy = isSignup
    ? 'Verify your email to start tracking your DSA progress'
    : 'Reset your AlgoTrack password';
  const bodyText = isSignup
    ? `Hi ${username || 'there'}, welcome to AlgoTrack! Use the verification code below to complete your registration and unlock your dashboard.`
    : `Hi ${username || 'there'}, we received a request to reset your password. Use the verification code below to set a new password.`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Branding -->
          <tr>
            <td style="padding: 32px 32px 20px; text-align: center; border-bottom: 1px solid #27272a;">
              <div style="display: inline-block; vertical-align: middle;">
                <span style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.03em;">Algo<span style="color: #f97316;">Track</span></span>
              </div>
              <p style="margin: 6px 0 0; color: #a1a1aa; font-size: 13px; font-weight: 500;">
                DSA & Competitive Programming Tracker
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #ffffff; text-align: center; line-height: 1.3;">
                ${headingCopy}
              </h1>
              <p style="margin: 0 0 28px; font-size: 14px; color: #a1a1aa; line-height: 1.6; text-align: center;">
                ${bodyText}
              </p>

              <!-- OTP Code Display Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="background-color: #09090b; border: 2px dashed #f97316; border-radius: 8px; padding: 18px 24px; display: inline-block;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #f97316;">
                        ${otpCode}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry Alert -->
              <div style="background-color: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 6px; padding: 10px 14px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #fb923c; font-weight: 500;">
                  ⏳ This code expires in <strong>10 minutes</strong>.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center; line-height: 1.5;">
                For security reasons, never share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #121215; border-top: 1px solid #27272a; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #71717a;">
                If you didn't request this email, you can safely ignore it.
              </p>
              <p style="margin: 0; font-size: 11px; color: #52525b;">
                © ${new Date().getFullYear()} AlgoTrack. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends OTP email using Nodemailer.
 * NOTE: Raw OTP code is never logged to stdout or error logs.
 */
async function sendOTPEmail({ email, otpCode, purpose, username }) {
  const transporter = createTransporter();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply.algotrack@gmail.com';
  const isSignup = purpose === 'signup_verification';

  const subject = isSignup
    ? 'AlgoTrack - Verification Code'
    : 'AlgoTrack - Password Reset Code';

  const html = getBrandedEmailTemplate({ purpose, otpCode, username });

  const mailOptions = {
    from: `"AlgoTrack" <${fromAddress}>`,
    to: email,
    subject,
    html
  };

  return await transporter.sendMail(mailOptions);
}

module.exports = {
  getBrandedEmailTemplate,
  sendOTPEmail
};
