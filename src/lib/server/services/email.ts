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

    const VERIFICATION_EMAIL_SUBJECT = `[Radicle Garden] Please verify your email address.`;
    const VERIFICATION_EMAIL_BODY = `
      <html lang="en">
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Hello ${recipientName} and welcome to the Radicle Garden! </p>
          <p>Please click the link below to verify your email address and start your very own Radicle Seed Node:</p>
          <p>
            <a href="${url}"
              style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Verify Email Address
            </a>
          </p>
          <p>If you did not request an account to be created, please ignore this email.</p>
        </body>
      </html>
    `;

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
      subject: VERIFICATION_EMAIL_SUBJECT,
      html: VERIFICATION_EMAIL_BODY,
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

    const PASSWORD_RESET_EMAIL_SUBJECT = `[Radicle Garden] Password reset request.`;
    const PASSWORD_RESET_EMAIL_BODY = `
      <html lang="en">
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset</h2>
          <p>We have received a request to reset your password. Please click the link below to reset your password:</p>
          <p>
            <a href="${url}"
              style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Reset Password
          </a>
          </p>
          <p>If you did not request a password reset, please ignore this email.</p>
        </body>
      </html>
    `;

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
      subject: PASSWORD_RESET_EMAIL_SUBJECT,
      html: PASSWORD_RESET_EMAIL_BODY,
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
