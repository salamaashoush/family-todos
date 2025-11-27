import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@example.com";
const APP_NAME = process.env.APP_NAME || "Family Todos";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set, skipping email send");
    return { success: false, error: "Email not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[Email] Failed to send:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Sent successfully:", data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[Email] Error:", err);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  return sendEmail({
    to,
    subject: `Verify your email - ${APP_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Click the button below to verify your email address:</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}"
             style="background-color: #8B5CF6; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 8px; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link expires in 24 hours.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">
          If you didn't create an account, you can ignore this email.
        </p>
      </div>
    `,
    text: `Verify your email address\n\nClick this link to verify: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  return sendEmail({
    to,
    subject: `Reset your password - ${APP_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>You requested to reset your password. Click the button below:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background-color: #8B5CF6; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 8px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link expires in 1 hour.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">
          If you didn't request this, you can ignore this email. Your password will not be changed.
        </p>
      </div>
    `,
    text: `Reset your password\n\nClick this link to reset: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
  });
}

export async function sendMemberInviteEmail(
  to: string,
  token: string,
  memberName: string,
  familyName: string
) {
  const inviteUrl = `${APP_URL}/accept-invite?token=${token}`;

  return sendEmail({
    to,
    subject: `You've been invited to manage ${familyName} - ${APP_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited!</h2>
        <p>You've been invited to help manage <strong>${familyName}</strong> on ${APP_NAME}.</p>
        <p>Your profile "${memberName}" will be linked to your new account, giving you access to:</p>
        <ul style="color: #444; line-height: 1.8;">
          <li>Manage family tasks and schedules</li>
          <li>Track progress and rewards</li>
          <li>Add and edit family members</li>
        </ul>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}"
             style="background-color: #8B5CF6; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 8px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <a href="${inviteUrl}">${inviteUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This invitation expires in 3 days.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">
          If you weren't expecting this invitation, you can ignore this email.
        </p>
      </div>
    `,
    text: `You're invited!\n\nYou've been invited to help manage ${familyName} on ${APP_NAME}.\n\nClick this link to accept: ${inviteUrl}\n\nThis invitation expires in 3 days.\n\nIf you weren't expecting this, ignore this email.`,
  });
}
