/**
 * Admin API helpers — a thin shim over the app-wide client.
 *
 * ── Why this is no longer its own implementation ──────────────────────────
 * It used to duplicate the base URL, the frontend key, the Authorization
 * header and the error shape. That duplication was the tell: the base template
 * had no shared client, so every surface that needed authenticated fetch grew
 * its own — and they drifted. This one carried `credentials: 'include'`, which
 * is invalid against `Access-Control-Allow-Origin: *` and made every admin
 * request fail after a successful preflight, with nothing in the server log.
 *
 * Now there is one implementation in `@/shared/api`, and these two names exist
 * only so the admin pages keep compiling. New code should import `api`
 * directly — it takes a typed `ApiRoute`, which these do not.
 *
 * @deprecated Use `api` from `@/shared/api`.
 */
import { request, type ApiRouteLoose } from '@/shared/api';

/** @deprecated Use `api.get`/`api.post`/… from `@/shared/api`. */
export async function adminFetchJson<T = unknown>(
  path: ApiRouteLoose,
  init: RequestInit & { query?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const { body, ...rest } = init;
  return request<T>(path as never, {
    ...rest,
    ...(typeof body === 'string' ? { body: JSON.parse(body) } : {}),
  });
}

/**
 * @deprecated Use `api` from `@/shared/api`.
 *
 * Returns a Response-shaped object rather than a real Response: callers only
 * ever read `.ok` and `.status`, and the shared client already threw on
 * failure by the time this returns.
 */
type ResponseLike = {
  ok: boolean;
  status: number;
  statusText: string;
  /** `any` so existing call sites can read fields off the parsed body. */
  json: () => Promise<any>;
};

export async function adminFetch(
  path: ApiRouteLoose,
  init: RequestInit & { query?: Record<string, string | number | undefined> } = {},
): Promise<ResponseLike> {
  try {
    const data = await adminFetchJson<unknown>(path, init);
    return { ok: true, status: 200, statusText: 'OK', json: async () => data };
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = (err as Error).message;
    return { ok: false, status, statusText: message, json: async () => ({ message }) };
  }
}
