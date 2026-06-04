import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) !== 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOtpEmail = async (toEmail, otpCode) => {
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: "Your OTP — Motion Robotics LMS",
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#3b82f6;margin-bottom:8px">Motion Robotics LMS</h2>
        <p style="color:#64748b;margin-bottom:24px">Use the code below to verify your identity. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f172a;text-align:center;padding:24px;background:#f1f5f9;border-radius:8px">${otpCode}</div>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};
