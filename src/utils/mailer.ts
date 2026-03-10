import nodemailer from 'nodemailer';
import { config } from '../config/environment';
import { logger } from '../config/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private provider: string;

  constructor() {
    this.provider = config.EMAIL_PROVIDER;
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      switch (this.provider) {
        case 'GMAIL':
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: config.GMAIL_USER,
              pass: config.GMAIL_PASSWORD,
            },
          });
          logger.info('Gmail transporter initialized');
          break;

        case 'SENDGRID':
          // SendGrid SMTP config
          this.transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            auth: {
              user: 'apikey',
              pass: process.env.SENDGRID_API_KEY || '',
            },
          });
          logger.info('SendGrid transporter initialized');
          break;

        case 'SMTP':
          this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          });
          logger.info('SMTP transporter initialized');
          break;

        case 'TEST':
        default:
          // Test/development mode - log to console
          logger.info('Email service in TEST mode (console output only)');
          break;
      }
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.provider === 'TEST') {
        logger.info('TEST EMAIL:');
        logger.info(`To: ${options.to}`);
        logger.info(`Subject: ${options.subject}`);
        logger.info(`HTML:\n${options.html}`);
        return true;
      }

      if (!this.transporter) {
        logger.error('Email transporter not initialized');
        return false;
      }

      const info = await this.transporter.sendMail({
        from: config.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(
    email: string,
    organizationName: string,
    inviterName: string,
    inviteLink: string,
  ): Promise<boolean> {
    const html = `
      <h2>You've been invited to ${organizationName}</h2>
      <p>Hi there,</p>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Test-Jedi.</p>
      <p>
        <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">
          Accept Invitation
        </a>
      </p>
      <p>Or copy this link: <code>${inviteLink}</code></p>
      <p style="color: #666; font-size: 12px;">This link will expire in 7 days.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `Invitation to join ${organizationName}`,
      html,
      text: `You've been invited to join ${organizationName}. Visit: ${inviteLink}`,
    });
  }

  /**
   * Send role update notification
   */
  async sendRoleUpdateEmail(
    email: string,
    organizationName: string,
    newRole: string,
  ): Promise<boolean> {
    const html = `
      <h2>Your role has been updated</h2>
      <p>Hi there,</p>
      <p>Your role in <strong>${organizationName}</strong> has been updated to <strong>${newRole}</strong>.</p>
      <p>Please log in to see your new permissions.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `Role update in ${organizationName}`,
      html,
      text: `Your role in ${organizationName} has been updated to ${newRole}`,
    });
  }

  /**
   * Send user deactivation notification
   */
  async sendDeactivationEmail(
    email: string,
    organizationName: string,
  ): Promise<boolean> {
    const html = `
      <h2>Your account has been deactivated</h2>
      <p>Hi there,</p>
      <p>Your account in <strong>${organizationName}</strong> has been deactivated.</p>
      <p>If you believe this is in error, please contact your organization administrator.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `Account deactivation in ${organizationName}`,
      html,
      text: `Your account in ${organizationName} has been deactivated`,
    });
  }
}

export const emailService = new EmailService();
