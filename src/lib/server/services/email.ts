import jwt from "jsonwebtoken";
import { Resend } from "resend";

import { config } from "../config";
import { createServiceLogger } from "../logger";

const log = createServiceLogger("Email");

class EmailService {
  private resend: Resend | null = null;

  private getResendClient(): Resend | null {
    if (!config.resendApiKey) {
      log.warn("RESEND_API_KEY is not configured");
      return null;
    }
    if (!this.resend) {
      this.resend = new Resend(config.resendApiKey);
    }
    return this.resend;
  }

  private emailLayout(content: string, footerText: string): string {
    const fontUrl = config.frontendUrl;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @font-face {
      font-family: 'Booton';
      font-style: normal;
      font-weight: 400;
      src: url('${fontUrl}/fonts/Booton-Regular.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Booton';
      font-style: normal;
      font-weight: 500;
      src: url('${fontUrl}/fonts/Booton-Medium.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Booton';
      font-style: normal;
      font-weight: 600;
      src: url('${fontUrl}/fonts/Booton-SemiBold.woff2') format('woff2');
    }
  </style>
</head>
<body style="margin: 0; padding: 24px; background-color: #ffffff; font-family: Booton, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <table width="700" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="padding: 48px 0 0 0;">
              <div style="margin-bottom: 16px;">
                <img src="${config.frontendUrl}/img/logo-text-on-white.png" alt="Radicle Garden" style="width: 157px; height: 28px;" />
              </div>
              <div style="padding-left: 8px;">
                ${content}
              </div>
            </td>
          </tr>
        </table>
        <div style="width: 700px; font-size: 12px; color: #7a8190; line-height: 1.5; text-align: left; margin-top: 24px;">${footerText}</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  public async sendEmail(
    emailRecipient: string,
    emailSubject: string,
    emailBody: string,
  ): Promise<boolean> {
    const senderAddress = config.emailSenderAddress;
    if (!senderAddress) {
      log.warn("EMAIL_SENDER_ADDRESS is not configured");
      return false;
    }

    const resend = this.getResendClient();
    if (!resend) {
      return false;
    }

    const { error } = await resend.emails.send({
      from: senderAddress,
      to: [emailRecipient],
      subject: emailSubject,
      html: emailBody,
    });

    if (error) {
      log.warn("Failed to send email", {
        subject: emailSubject,
        recipient: emailRecipient,
        error,
      });
      return false;
    }
    return true;
  }

  public async sendVerificationEmail(
    userId: string,
    recipientEmail: string,
    recipientName: string,
  ): Promise<{ success: boolean; error?: string }> {
    log.info("Sending email verification code", { recipient: recipientEmail });

    const token = jwt.sign(
      {
        id: userId,
        email: recipientEmail,
      },
      config.appSecret,
      {
        expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
      },
    );

    const url = this.buildVerificationLink(token);
    log.debug("Verification link generated", { url });

    const subject = "Verify your email address";
    const content = `
      <h1 style="margin: 0 0 16px; font-size: 32px; font-weight: 700; color: #000;">Verify your email address</h1>
      <p style="margin: 0 0 16px; font-size: 16px; color: #000;">Hey <strong>${recipientName}</strong>, welcome to Radicle Garden.</p>
      <div style="border: 1px solid #e9ebef; padding: 24px; margin-bottom: 16px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: #000;">Please click below to verify your email address:</p>
        <a href="${url}" style="display: inline-block; background-color: #1c77ff; padding: 8px 16px; text-decoration: none; border-radius: 2px; font-weight: 500; font-size: 16px;"><span style="color: #ffffff;">Verify email address</span></a>
      </div>
      <p style="margin: 0; font-size: 16px; color: #000;">If you didn't create an account with Radicle Garden, you can ignore this email.</p>
    `;
    const footer = `You received this email because someone signed up for Radicle Garden (<a href="${config.frontendUrl}"><span style="color: #7a8190;">${config.frontendUrl.replace(/^https?:\/\//, "")}</span></a>) with the email address ${recipientEmail}.`;

    const emailBody = this.emailLayout(content, footer);

    const senderAddress = config.emailSenderAddress;
    if (!senderAddress) {
      log.warn("EMAIL_SENDER_ADDRESS is not configured");
      return {
        success: false,
        error: "EMAIL_SENDER_ADDRESS is not configured",
      };
    }

    const resend = this.getResendClient();
    if (!resend) {
      return { success: false, error: "Email service not configured" };
    }

    const { error } = await resend.emails.send({
      from: senderAddress,
      to: [recipientEmail],
      subject,
      html: emailBody,
    });

    if (error) {
      log.warn("Failed to send verification email", { error });
      return { success: false, error: "Failed to send verification email" };
    }

    return { success: true };
  }

  public async sendPasswordResetEmail(
    userId: string,
    recipientEmail: string,
  ): Promise<{ success: boolean; error?: string }> {
    log.info("Sending password reset email", { recipient: recipientEmail });
    const token = jwt.sign(
      {
        id: userId,
        email: recipientEmail,
      },
      config.appSecret,
      {
        expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
      },
    );

    const url = this.buildPasswordResetLink(token);
    log.debug("Password reset link generated", { url });

    const subject = "Reset your password";
    const content = `
      <h1 style="margin: 0 0 16px; font-size: 32px; font-weight: 700; color: #000;">Reset your password</h1>
      <p style="margin: 0 0 16px; font-size: 16px; color: #000;">You recently requested to reset your password for Radicle Garden.</p>
      <div style="border: 1px solid #e5e5e5; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: #000;">Please click below to reset your password:</p>
        <a href="${url}" style="display: inline-block; background-color: #1c77ff; padding: 8px 16px; text-decoration: none; border-radius: 2px; font-weight: 500; font-size: 16px;"><span style="color: #ffffff;">Reset password</span></a>
      </div>
      <p style="margin: 0; font-size: 16px; color: #000;">If you didn't request this password reset, you can ignore this email.</p>
    `;
    const footer = `You received this email because someone requested a password reset link with the email address <a href="mailto:${recipientEmail}"><span style="color: #7a8190;">${recipientEmail}</span></a>. If you didn't request this password reset, you can ignore this email.`;

    const emailBody = this.emailLayout(content, footer);

    const senderAddress = config.emailSenderAddress;
    if (!senderAddress) {
      log.warn("EMAIL_SENDER_ADDRESS is not configured");
      return {
        success: false,
        error: "EMAIL_SENDER_ADDRESS is not configured",
      };
    }

    const resend = this.getResendClient();
    if (!resend) {
      return { success: false, error: "Email service not configured" };
    }

    const { error } = await resend.emails.send({
      from: senderAddress,
      to: [recipientEmail],
      subject,
      html: emailBody,
    });

    if (error) {
      log.warn("Failed to send password reset email", { error });
      return { success: false, error: "Failed to send password reset email" };
    }

    return { success: true };
  }

  private buildVerificationLink(token: string): string {
    return `${config.frontendUrl}/email-verify/${token}`;
  }

  private buildPasswordResetLink(token: string): string {
    return `${config.frontendUrl}/password-reset/${token}`;
  }
}

export const emailService = new EmailService();
