"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const environment_1 = require("../config/environment");
const logger_1 = require("../config/logger");
class EmailService {
    constructor() {
        this.transporter = null;
        this.provider = environment_1.config.EMAIL_PROVIDER;
        this.initializeTransporter();
    }
    initializeTransporter() {
        try {
            switch (this.provider) {
                case 'GMAIL':
                    this.transporter = nodemailer_1.default.createTransport({
                        service: 'gmail',
                        auth: {
                            user: environment_1.config.GMAIL_USER,
                            pass: environment_1.config.GMAIL_PASSWORD,
                        },
                    });
                    logger_1.logger.info('Gmail transporter initialized');
                    break;
                case 'SENDGRID':
                    // SendGrid SMTP config
                    this.transporter = nodemailer_1.default.createTransport({
                        host: 'smtp.sendgrid.net',
                        port: 587,
                        auth: {
                            user: 'apikey',
                            pass: process.env.SENDGRID_API_KEY || '',
                        },
                    });
                    logger_1.logger.info('SendGrid transporter initialized');
                    break;
                case 'SMTP':
                    this.transporter = nodemailer_1.default.createTransport({
                        host: process.env.SMTP_HOST || 'localhost',
                        port: parseInt(process.env.SMTP_PORT || '587', 10),
                        secure: process.env.SMTP_SECURE === 'true',
                        auth: {
                            user: process.env.SMTP_USER,
                            pass: process.env.SMTP_PASSWORD,
                        },
                    });
                    logger_1.logger.info('SMTP transporter initialized');
                    break;
                case 'TEST':
                default:
                    // Test/development mode - log to console
                    logger_1.logger.info('Email service in TEST mode (console output only)');
                    break;
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize email transporter:', error);
        }
    }
    async sendEmail(options) {
        try {
            if (this.provider === 'TEST') {
                logger_1.logger.info('TEST EMAIL:');
                logger_1.logger.info(`To: ${options.to}`);
                logger_1.logger.info(`Subject: ${options.subject}`);
                logger_1.logger.info(`HTML:\n${options.html}`);
                return true;
            }
            if (!this.transporter) {
                logger_1.logger.error('Email transporter not initialized');
                return false;
            }
            const info = await this.transporter.sendMail({
                from: environment_1.config.EMAIL_FROM,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            });
            logger_1.logger.info(`Email sent: ${info.messageId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to send email to ${options.to}:`, error);
            return false;
        }
    }
    /**
     * Send invitation email
     */
    async sendInvitationEmail(email, organizationName, inviterName, inviteLink) {
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
    async sendRoleUpdateEmail(email, organizationName, newRole) {
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
    async sendDeactivationEmail(email, organizationName) {
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
exports.emailService = new EmailService();
//# sourceMappingURL=mailer.js.map