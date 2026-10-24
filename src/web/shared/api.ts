/**
 * The one way to call this app's API.
 *
 * ── What this is defending against ────────────────────────────────────────
 * Three mistakes, all of which were made building this app, none of which the
 * compiler could see:
 *
 *   1. a path that does not exist        → now a compile error (ApiRoute)
 *   2. a missing Authorization header    → now impossible to forget
 *   3. a base URL of '' in development   → now detected and explained
 *
 * (1) is the important one. Documentation cannot prevent a wrong string,
 * because a wrong string is written with confidence and never triggers a
 * lookup. A union type is checked at the moment it is typed.
 */
import type { ApiRoute } from './api-routes';

/**
 * An escape hatch for callers that cannot use the typed union yet.
 *
 * Exists only for the admin layer's deprecated `adminFetch` shim. New code
 * should take `ApiRoute` — that is the whole point of generating it.
 */
export type ApiRouteLoose = ApiRoute | (string & {});

/**
 * Vite inlines this at build time. The fallback is dev-only and deliberate:
 * the API and the dev server are different origins, so a relative path would
 * hit Vite and return index.html — see the guard in `request` below.
 */
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/*
 * The server rejects /api calls without this header in production when
 * BLOOM_FRONTEND_KEY is set. It ships in the bundle, so it deters casual
 * scripted access; it is not a secret and never replaces auth.
 */
const FRONTEND_KEY = import.meta.env.VITE_FRONTEND_KEY as string | undefined;

/** Same key the auth feature writes. Read here so no feature repeats it. */
const TOKEN_KEY = 'auth_token';

/*
 * The x-request-id of the most recent API response.
 *
 * A page that crashes has usually just called the API, and that call is the
 * likeliest cause. Remembering the id lets a client error report name the exact
 * server log line that preceded it — which is the only thing that turns two
 * separate records into one story.
 */
let _lastRequestId: string | undefined;

/** The x-request-id of the last API response, if there has been one. */
export function lastRequestId(): string | undefined {
  return _lastRequestId;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
    /**
     * The server's `x-request-id` for the failed call.
     *
     * This is the join between the two halves of a failure: the message a user
     * reports, and the server log line that explains it. Without it you are
     * matching timestamps by eye. With it, `grep <id>` lands on the request.
     */
    readonly requestId?: string,
  ) {
    super(requestId ? `${message} [request ${requestId}]` : message);
    this.name = 'ApiError';
  }
}

type Options = Omit<RequestInit, 'body'> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

export async function request<T = unknown>(path: ApiRoute, opts: Options = {}): Promise<T> {
  const { body, query, headers, ...rest } = opts;

  let url = `${BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') qs.set(k, String(v));
    if (qs.toString()) url += `?${qs}`;
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(FRONTEND_KEY ? { 'X-Frontend-Key': FRONTEND_KEY } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  /*
   * The loud failure that used to be silent.
   *
   * A misconfigured base URL sends the request to the Vite dev server, which
   * answers every path with index.html. The old failure mode was
   * `SyntaxError: Unexpected token '<'` from JSON.parse — an error that names
   * the symptom and hides the cause. Check the content type first and say what
   * actually happened.
   */
  const requestId = res.headers.get('x-request-id') ?? undefined;
  if (requestId) _lastRequestId = requestId;

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    // No request id is quoted here on purpose: an HTML answer means the request
    // never reached the API, so there is no server log line to point at.
    throw new ApiError(
      res.status,
      `Expected JSON from ${url} but got HTML. The API base URL is probably wrong — ` +
        `this request reached the web server, not the API. Set VITE_API_URL in .env.`,
    );
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      detail?.message ?? detail?.error ?? res.statusText,
      detail,
      requestId,
    );
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  get:    <T>(p: ApiRoute, o?: Options) => request<T>(p, { ...o, method: 'GET' }),
  post:   <T>(p: ApiRoute, body?: unknown, o?: Options) => request<T>(p, { ...o, method: 'POST', body }),
  patch:  <T>(p: ApiRoute, body?: unknown, o?: Options) => request<T>(p, { ...o, method: 'PATCH', body }),
  put:    <T>(p: ApiRoute, body?: unknown, o?: Options) => request<T>(p, { ...o, method: 'PUT', body }),
  delete: <T>(p: ApiRoute, o?: Options) => request<T>(p, { ...o, method: 'DELETE' }),
};
