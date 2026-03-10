export declare class AppError extends Error {
    statusCode: number;
    code: string;
    details?: any | undefined;
    constructor(statusCode: number, code: string, message: string, details?: any | undefined);
}
export declare const ErrorCodes: {
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly USER_NOT_FOUND: "USER_NOT_FOUND";
    readonly USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly MISSING_TOKEN: "MISSING_TOKEN";
    readonly EXPIRED_TOKEN: "EXPIRED_TOKEN";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INVALID_REQUEST: "INVALID_REQUEST";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly EXPIRED: "EXPIRED";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly LOCKED_RESOURCE: "LOCKED_RESOURCE";
    readonly DUPLICATE_CASE: "DUPLICATE_CASE";
    readonly INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR";
};
//# sourceMappingURL=errors.d.ts.map