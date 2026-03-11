import http from 'http';
import https from 'https';

export interface HttpResponse {
  statusCode: number;
  body: string;
}

export class HttpService {
  async postJson(
    urlString: string,
    payload: unknown,
    headers: Record<string, string> = {},
    timeoutMs: number = 5000,
  ): Promise<HttpResponse> {
    const body = JSON.stringify(payload);
    return this.request(urlString, 'POST', body, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body).toString(),
      ...headers,
    }, timeoutMs);
  }

  async request(
    urlString: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    body: string | undefined,
    headers: Record<string, string>,
    timeoutMs: number,
  ): Promise<HttpResponse> {
    const url = new URL(urlString);
    const client = url.protocol === 'https:' ? https : http;

    return new Promise<HttpResponse>((resolve, reject) => {
      const req = client.request(
        {
          method,
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          headers,
        },
        (res) => {
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
        },
      );

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

export default new HttpService();
