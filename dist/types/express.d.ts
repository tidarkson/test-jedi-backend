import { Request } from 'express';
import { AuthUser } from './auth';
export interface AuthenticatedRequest extends Request {
    user?: AuthUser;
    token?: string;
}
//# sourceMappingURL=express.d.ts.map