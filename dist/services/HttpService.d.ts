export interface HttpResponse {
    statusCode: number;
    body: string;
}
export declare class HttpService {
    postJson(urlString: string, payload: unknown, headers?: Record<string, string>, timeoutMs?: number): Promise<HttpResponse>;
    request(urlString: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH', body: string | undefined, headers: Record<string, string>, timeoutMs: number): Promise<HttpResponse>;
}
declare const _default: HttpService;
export default _default;
//# sourceMappingURL=HttpService.d.ts.map