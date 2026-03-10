interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
declare class EmailService {
    private transporter;
    private provider;
    constructor();
    private initializeTransporter;
    sendEmail(options: EmailOptions): Promise<boolean>;
    /**
     * Send invitation email
     */
    sendInvitationEmail(email: string, organizationName: string, inviterName: string, inviteLink: string): Promise<boolean>;
    /**
     * Send role update notification
     */
    sendRoleUpdateEmail(email: string, organizationName: string, newRole: string): Promise<boolean>;
    /**
     * Send user deactivation notification
     */
    sendDeactivationEmail(email: string, organizationName: string): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=mailer.d.ts.map