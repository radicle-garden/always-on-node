import { config } from '../config';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';

class EmailService {
	private resend: Resend | null = null;

	private getResendClient(): Resend | null {
		if (!config.resendApiKey) {
			console.warn('[Email] RESEND_API_KEY is not configured');
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
		emailBody: string
	): Promise<boolean> {
		const senderAddress = config.emailSenderAddress;
		if (!senderAddress) {
			console.error('[Email] EMAIL_SENDER_ADDRESS is not configured');
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
			html: emailBody
		});

		if (error) {
			console.warn(
				`[Email] Failed to send email with subject: "${emailSubject}" to ${emailRecipient}:`,
				error
			);
			return false;
		}
		return true;
	}

	public async sendVerificationEmail(
		userId: string,
		recipientEmail: string,
		recipientName: string
	): Promise<{ success: boolean; error?: string }> {
		console.log(`[Email] Sending email verification code to ${recipientEmail}`);

		const token = jwt.sign(
			{
				id: userId,
				email: recipientEmail
			},
			config.appSecret,
			{
				expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn']
			}
		);

		const url = this.buildVerificationLink(token);
		console.log(`[Email] Verification link: ${url}`);

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
			console.error('[Email] EMAIL_SENDER_ADDRESS is not configured');
			return {
				success: false,
				error: 'EMAIL_SENDER_ADDRESS is not configured'
			};
		}

		const resend = this.getResendClient();
		if (!resend) {
			return { success: false, error: 'Email service not configured' };
		}

		const { error } = await resend.emails.send({
			from: senderAddress,
			to: [recipientEmail],
			subject: VERIFICATION_EMAIL_SUBJECT,
			html: VERIFICATION_EMAIL_BODY
		});

		if (error) {
			console.warn(`[Email] Failed to send verification email:`, error);
			return { success: false, error: 'Failed to send verification email' };
		}

		return { success: true };
	}

	private buildVerificationLink(token: string): string {
		return `${config.frontendUrl}/email-verify/${token}`;
	}
}

export const emailService = new EmailService();
