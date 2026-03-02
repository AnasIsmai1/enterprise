import { Request } from 'express';
import * as querystring from 'querystring';

export function requestToCurl(req: Request): string {
    try {
        const { method, headers, originalUrl, protocol, hostname, body, host } = req;
        const url = `${protocol}://${host}${originalUrl || req.url}`;

        let curl = `curl -X ${method} '${url}'`;

        if (headers) {
            Object.keys(headers).forEach(key => {
                // Skip some internal headers
                if (key === 'host' || key === 'connection' || key === 'content-length' || key === 'if-none-match') return;

                const value = headers[key];
                if (value) {
                    curl += ` -H '${key}: ${value}'`;
                }
            });
        }

        // Add request body if present
        if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
            let bodyString = '';

            if (typeof body === 'string') {
                bodyString = body;
            } else {
                try {
                    bodyString = JSON.stringify(body);
                } catch (e) {
                    bodyString = querystring.stringify(body);
                }
            }

            if (bodyString) {
                // Check content-type to determine how to format the body
                const contentType = headers['content-type'] || '';

                if (contentType.includes('application/json')) {
                    curl += ` -H 'Content-Type: application/json'`;
                    curl += ` -d '${bodyString}'`;
                } else if (contentType.includes('application/x-www-form-urlencoded')) {
                    curl += ` -H 'Content-Type: application/x-www-form-urlencoded'`;
                    curl += ` --data-urlencode '${bodyString}'`;
                } else {
                    curl += ` -d '${bodyString}'`;
                }
            }
        }

        return curl;
    } catch (error) {
        return `Error generating curl: ${error.message}`;
    }
}
