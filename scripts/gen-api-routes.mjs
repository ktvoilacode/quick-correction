/**
 * Emits a union type of every real API route, derived from the route files.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * Every expensive mistake an agent made building this app was a STRING. Wrong
 * base URL, wrong path. Both compiled cleanly and failed at runtime with an
 * error that pointed nowhere near the cause.
 *
 * Documentation does not fix that class: docs are consulted during research,
 * and this kind of error happens mid-sentence, when the model is confident.
 * A type is checked at exactly the moment the wrong thing is typed.
 *
 * FBCA makes this derivable rather than hand-maintained: the router mounts
 * `features/<name>/<name>.route.ts` at `/api/<name>`, so the prefix is known
 * from the path and the suffixes are the router.METHOD calls inside.
 */
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const featuresDir = join(root, 'src/api/features');
const outFile = join(root, 'src/web/shared/api-routes.ts');

const CALL = /router\.(get|post|put|patch|delete)\(\s*(?:\n\s*)?['"`]([^'"`]*)['"`]/g;

const routes = [];
for (const entry of await readdir(featuresDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const name = entry.name;
  let src;
  try {
    src = await readFile(join(featuresDir, name, `${name}.route.ts`), 'utf8');
  } catch {
    continue; // no route file for this feature
  }
  for (const [, method, sub] of src.matchAll(CALL)) {
    // ':id' style params become a template slot so callers can interpolate
    // without losing the check on the rest of the path.
    const path = `/api/${name}${sub === '/' ? '' : sub}`.replace(/\/+$/, '') || `/api/${name}`;
    routes.push({ method: method.toUpperCase(), path: path.replace(/:([a-zA-Z]+)/g, '${string}') });
  }
}

const uniq = [...new Set(routes.map((r) => r.path))].sort();
const hasParam = (p) => p.includes('${string}');

const body = `/**
 * GENERATED — do not edit. Run \`npm run gen:routes\`.
 *
 * Every path the API actually serves, as a type. Passing a path that is not
 * in this union is a compile error, not a 404 at runtime.
 */

export type ApiRoute =
${uniq.map((p) => (hasParam(p) ? `  | \`${p}\`` : `  | '${p}'`)).join('\n')};

/** Every route, for runtime assertions and tooling. */
export const API_ROUTES = [
${uniq.filter((p) => !hasParam(p)).map((p) => `  '${p}',`).join('\n')}
] as const;
`;

await writeFile(outFile, body);
console.log(`  ${uniq.length} routes → src/web/shared/api-routes.ts`);
