import nodemailer from "nodemailer";

// Configure Brevo SMTP
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

export async function sendOTPEmail(email, otp, name) {
  try {
    const mailOptions = {
      from: `"Neura" <${process.env.FROM_EMAIL || process.env.BREVO_SMTP_USER}>`,
      to: email,
      subject: "Verify Your Neura Account",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { font-size: 40px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background: white; border-radius: 10px; margin: 20px 0; letter-spacing: 8px; font-family: monospace; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Neura! 🚀</h1>
              <p>Your AI-Powered Messaging Assistant</p>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Thanks for signing up for Neura. Please use the verification code below to complete your registration:</p>
              
              <div class="otp-code">
                ${otp}
              </div>
              
              <p>This code will expire in <strong>10 minutes</strong>.</p>
              <p>If you didn't request this, please ignore this email.</p>
              
              <hr />
              <p style="font-size: 14px; color: #666;">
                <strong>What makes Neura special?</strong><br />
                • AI-powered auto-responses when you're busy<br />
                • Learn from your conversations<br />
                • 50 free credits to start<br />
                • End-to-end encrypted messaging
              </p>
            </div>
            <div class="footer">
              <p>Neura - Intelligent Messaging Assistant</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to Neura, ${name}!\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this message.\n\nNeura - Your AI-Powered Messaging Assistant`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error: error.message };
  }
}
