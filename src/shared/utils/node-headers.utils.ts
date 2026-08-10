import type { IncomingHttpHeaders } from 'node:http';

/**
 * Node's `IncomingHttpHeaders` → Fetch `Headers`, which is what better-auth's
 * server API expects.
 *
 * Equivalent to better-auth's own `fromNodeHeaders`, reimplemented here because
 * `better-auth/node` is ESM-only and this runs on a per-request path where a
 * dynamic import would be wasteful.
 */
export function toFetchHeaders(nodeHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      // Repeated headers (e.g. multiple Set-Cookie) must each be appended.
      for (const item of value) headers.append(key, item);
    } else {
      headers.append(key, value);
    }
  }

  return headers;
}
