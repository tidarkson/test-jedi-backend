import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
export declare class IntegrationController {
    registerWebhook(req: AuthenticatedRequest, res: Response): Promise<void>;
    listWebhooks(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateWebhook(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteWebhook(req: AuthenticatedRequest, res: Response): Promise<void>;
    configureIntegration(req: AuthenticatedRequest, res: Response): Promise<void>;
    listIntegrations(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteIntegration(req: AuthenticatedRequest, res: Response): Promise<void>;
    jiraConnect(req: Request, res: Response): Promise<void>;
    jiraCallback(req: Request, res: Response): Promise<void>;
    jiraWebhookSync(req: Request, res: Response): Promise<void>;
    linkRunToPr(req: AuthenticatedRequest, res: Response): Promise<void>;
    listRunPrLinks(req: AuthenticatedRequest, res: Response): Promise<void>;
    createNotificationRule(req: AuthenticatedRequest, res: Response): Promise<void>;
    listNotificationRules(req: AuthenticatedRequest, res: Response): Promise<void>;
    updateNotificationRule(req: AuthenticatedRequest, res: Response): Promise<void>;
    deleteNotificationRule(req: AuthenticatedRequest, res: Response): Promise<void>;
    importResults(req: AuthenticatedRequest, res: Response): Promise<void>;
    private handleError;
}
declare const _default: IntegrationController;
export default _default;
//# sourceMappingURL=IntegrationController.d.ts.map