import axios from 'axios';

/**
 * Backend URL structure. VITE_API_URL is the *origin* of the API, never a
 * path — the "/api" prefix is appended here:
 *
 *   local dev   VITE_API_URL=  (empty)  -> baseURL "/api", Vite proxies to :5000
 *               or VITE_API_URL=http://localhost:5000   (same effect)
 *   production  VITE_API_URL=https://cv-analyzer-api.onrender.com  (no /api)
 *               or empty if the host rewrites /api to the backend itself
 *
 * A trailing "/api" is tolerated and stripped: without that, the value printed
 * in the README (or in someone's .env) would turn /auth/login into
 * /api/api/auth/login and every request would 404.
 */
const API_ORIGIN = (import.meta.env.VITE_API_URL || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const baseURL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

/** Origin of the API host, or '' when requests are same-origin. */
export const API_HOST = API_ORIGIN;

if (import.meta.env.PROD && !API_ORIGIN) {
  // VITE_API_URL is inlined at build time, so a variable that was never added
  // to the Vercel project is invisible until a request fails. Point at the
  // two ways out instead of letting it 404 as "Cannot POST /api/auth/login".
  console.error(
    '[api] VITE_API_URL is not set in this build, so requests go to the same origin (/api). ' +
      'Set VITE_API_URL to the backend origin (e.g. https://cv-analyzer-api.onrender.com, no /api) ' +
      'in the deployment environment variables and redeploy — or keep it empty and add an ' +
      '/api/:path* external rewrite to the backend in client/vercel.json.'
  );
}

// Default timeout for ordinary reads/writes. Kept tight so a hung request
// surfaces quickly rather than leaving the UI spinning for minutes.
const timeout = Number(import.meta.env.VITE_API_TIMEOUT) || 60_000;

/**
 * Upload + analysis is the one genuinely long call: on a cold OCR cache the
 * server has to fetch and boot the Tesseract worker before it can read a
 * scanned document, which has been measured at 117-146s. The server's own OCR
 * init timeout is 180s, so 240s here leaves headroom without the client giving
 * up while the server is still working.
 */
export const ANALYSIS_TIMEOUT = Number(import.meta.env.VITE_ANALYSIS_TIMEOUT) || 240_000;

const API = axios.create({
  baseURL,
  // The session is an httpOnly cookie, so the browser must be told to attach
  // it to every request — including cross-origin ones in production.
  // Omitting this is what produces 401s on protected routes.
  withCredentials: true,
  timeout,
  headers: { Accept: 'application/json' },
});

/** Called by AuthProvider so a 401 anywhere logs the user out. */
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

/**
 * Endpoints where a 401 is the *expected answer* rather than a dead session.
 * `/auth/login` returns 401 for a wrong password, and `/auth/register` for a
 * duplicate account — firing the global handler there would wipe a perfectly
 * good session just because someone mistyped a password.
 */
const isAuthEntryPoint = (url = '') =>
  /\/auth\/(login|register)\/?$/.test(url.split('?')[0]);

/**
 * The browser session is an httpOnly cookie, so the app never stores a token
 * itself. This is a read-only escape hatch for hosts that inject a token into
 * localStorage (e.g. a native shell or an external integration) and expect the
 * Authorization header instead of the cookie. We attach one if it is there,
 * but deliberately never write the server's token to localStorage — anything
 * readable by script can be exfiltrated by an XSS payload.
 */
const TOKEN_KEYS = ['token', 'accessToken', 'jwt'];

const storedToken = () => {
  // localStorage throws in some privacy modes, so never let it break a request.
  try {
    for (const key of TOKEN_KEYS) {
      const value = localStorage.getItem(key);
      if (value) return value.replace(/^Bearer\s+/i, '');
    }
  } catch {
    // Storage unavailable — fall through to cookie-only auth.
  }
  return null;
};

API.interceptors.request.use((config) => {
  // Non-JSON requests (file upload) must not carry a Content-Type, otherwise
  // the browser omits the multipart boundary and multer cannot parse it.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (config.data) {
    config.headers['Content-Type'] = 'application/json';
  }

  if (!config.headers.Authorization) {
    const token = storedToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const url = error.config?.url || '';

    // Session expired or never established: clear local state once. Skipped
    // for the login/register endpoints and for the initial `/auth/me` probe,
    // which is expected to 401 for a signed-out visitor.
    const isSessionProbe = /\/auth\/me\/?$/.test(url.split('?')[0]);
    if (status === 401 && onUnauthorized && !isAuthEntryPoint(url) && !isSessionProbe) {
      onUnauthorized();
    }

    // A 502/503/504 is produced by a proxy (Vite's dev proxy, Vercel, or the
    // host in front of the API) rather than by Express, so it means "the
    // gateway could not reach the backend", not "the backend rejected this".
    const isGatewayError = status === 502 || status === 503 || status === 504;

    // Flatten the API's error shape into a predictable Error for UI code.
    const message =
      data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'The request timed out. The AI analysis may still be running — try again shortly.'
        : isGatewayError
          ? `The server could not be reached (${status}). The API host ${
              API_ORIGIN || '/api'
            } did not answer — check that the backend is deployed, awake, and listed in its CORS/CLIENT_URL allow-list.`
          : !error.response
            ? API_ORIGIN
              ? `Cannot reach the API at ${API_ORIGIN}.`
              : 'Cannot reach the server. Is the backend running on port 5000?'
            : error.message) ||
      'Something went wrong';

    const wrapped = new Error(message);
    wrapped.status = status;
    wrapped.errors = data?.errors || [];
    wrapped.original = error;
    return Promise.reject(wrapped);
  }
);

export default API;
