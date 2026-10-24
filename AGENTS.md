# AGENTS.md — medhamark

> Rules, not reference. Everything here is something that has actually gone
> wrong. For API shapes, read the `.d.ts` — see **Lookup** below.

## Lookup: read types before prose

| Need | Read | Cost |
|---|---|---|
| A UIKit component's props | `node_modules/@bloomneo/uikit/dist/types/index.d.ts` | ~1.3k tok, complete public API |
| An AppKit module's API | `node_modules/@bloomneo/appkit/dist/<module>/index.d.ts` | small, per-module |
| A route this app serves | `src/web/shared/api-routes.ts` | generated, always current |
| Long-form explanation | `docs/` | ~23k tok — last resort, not first |

The `.d.ts` is authoritative and matches the installed version. The prose does
not always. **Do not guess a prop name — the type file is cheaper to read than
the mistake is to debug.**

## Never write a bare string where a type exists

Every expensive mistake made in this codebase was a plausible, wrong string
that compiled cleanly. Strings are the failure surface.

```ts
// ✗ compiles, 404s at runtime
fetch('/api/user')

// ✓ compile error if the route does not exist
import { api } from '@/shared/api';
api.get('/api/user/admin/users')
```

- **API calls** → `api.get/post/patch/delete` from `@/shared/api`. Never call
  `fetch` directly. The client owns the base URL, the JWT and error shape.
- **Routes** → typed by `ApiRoute`, generated from the route files by
  `npm run gen:routes` (runs automatically on `npm run dev`).
- **Roles** → `role.level` pairs, e.g. `'admin.system'`. The full list is in
  `prisma/seeding/user.seed.js`, not invented. (auth layer)

## Backend conventions

- Get instances via `xxxClass.get()` — never `new SomethingClass()`.
- Wrap async handlers: `error.asyncRoute(async (req, res) => { … })`.
- **One route file per feature**: `features/<name>/<name>.route.ts` and no
  other. A second `.route.ts` in the same folder is silently ignored — the
  endpoint will 404 with no warning. Need a second surface? New feature folder.
- `res` inside `asyncRoute` is typed as `{ status, json }` only. `.send()` and
  `.end()` do not compile, so a bodyless 204 is unreachable — return
  `res.json({ ok: true })`.
- Ownership goes in the WHERE clause, not just a session check. Use
  `updateMany`/`deleteMany` with `{ id, userId }` so another user's id cannot
  be passed in.

## Frontend conventions

- A file's location is its URL. `features/todo/pages/index.tsx` → `/todo`.
  Prefix with `_` to keep a file out of routing.
- Adding a sidebar entry means editing `shared/nav.base.ts` (auth layer) —
  layers contribute their own `nav.<layer>.ts`.
- Never set a `theme-*` class on `<html>` by hand — `ThemeProvider` strips any
  class it did not set, and the change vanishes with no error.

## After changing the Prisma schema

Restart the dev server. `prisma generate` updates the client on disk, but the
running process keeps the old one — new columns read as `undefined` with no
error. This has cost more debugging time than any other single issue here.
