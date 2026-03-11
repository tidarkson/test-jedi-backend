"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpService = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
class HttpService {
    async postJson(urlString, payload, headers = {}, timeoutMs = 5000) {
        const body = JSON.stringify(payload);
        return this.request(urlString, 'POST', body, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body).toString(),
            ...headers,
        }, timeoutMs);
    }
    async request(urlString, method, body, headers, timeoutMs) {
        const url = new URL(urlString);
        const client = url.protocol === 'https:' ? https_1.default : http_1.default;
        return new Promise((resolve, reject) => {
            const req = client.request({
                method,
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: `${url.pathname}${url.search}`,
                headers,
            }, (res) => {
                let responseBody = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    responseBody += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode || 0,
                        body: responseBody,
                    });
                });
            });
            req.on('error', (error) => reject(error));
            req.setTimeout(timeoutMs, () => {
                req.destroy(new Error(`Request timeout after ${timeoutMs}ms`));
            });
            if (body) {
                req.write(body);
            }
            req.end();
        });
    }
}
exports.HttpService = HttpService;
exports.default = new HttpService();
//# sourceMappingURL=HttpService.js.map