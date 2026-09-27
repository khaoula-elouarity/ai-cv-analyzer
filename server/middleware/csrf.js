const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * CSRF defence for state-changing requests that rely on the auth cookie.
 *
 * Layered defences:
 *  1. `SameSite=Lax|Strict` cookies are not attached to cross-site POSTs.
 *  2. A cross-origin <form> cannot set `Content-Type: application/json`, so
 *     requiring a JSON content type on non-multipart requests blocks the
 *     classic simple-request CSRF vector.
 *  3. The `Origin` header is checked against the allow-list as a final gate.
 *
 * Requests without an `Origin` header (e.g. curl, server-to-server) are
 * allowed through — they cannot have been triggered by a browser page.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Explicit allow-list, e.g. { "https://app.example.com" }.
 */
const allowedOrigins = () =>
  new Set([env.clientUrl, ...env.extraOrigins].filter(Boolean));

/**
 * In development Vite will fall forward to the next free port whenever the
 * configured one is taken (5173 -> 5174 -> ...), and the Vite proxy forwards
 * the browser's `Origin` header verbatim. Pinning a single port in
 * CLIENT_URL therefore breaks auth as soon as another project grabs that
 * port. Outside development the allow-list stays exact.
 */
const isLoopbackOrigin = (origin) => {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
};

/**
 * Single source of truth for "may this origin talk to the API?", shared by
 * the CORS middleware and the CSRF guard so the two can never disagree.
 *
 * @param {string|undefined} origin
 * @returns {boolean}
 */
const isOriginAllowed = (origin) => {
  if (!origin) return true; // same-origin, curl, or a non-browser client
  if (allowedOrigins().has(origin)) return true;
  return !env.isProd && isLoopbackOrigin(origin);
};

const enforceSameOrigin = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (!origin) return next(); // non-browser client

  if (!isOriginAllowed(origin)) {
    return next(ApiError.forbidden('Cross-origin request blocked'));
  }

  const contentType = req.get('content-type') || '';
  const isMultipart = contentType.includes('multipart/form-data');
  const isJson = contentType.includes('application/json');

  // A request with no body carries no Content-Type at all. Axios omits the
  // header on a bodyless `POST` (e.g. /auth/logout), so treat "absent" as
  // JSON rather than rejecting it — otherwise logout 403s and the auth
  // cookie is never cleared. A *present* non-JSON type is still blocked.
  if (contentType && !isMultipart && !isJson) {
    return next(ApiError.forbidden('Unsupported content type'));
  }

  return next();
};

module.exports = { enforceSameOrigin, allowedOrigins, isOriginAllowed };
