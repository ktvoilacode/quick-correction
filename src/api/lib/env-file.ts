/**
 * Minimal .env read/merge/write for the admin email-config UI.
 * @file src/api/lib/env-file.ts
 *
 * Exists because the email settings page wants to edit the running
 * process's env. In local dev that means writing to the project's
 * .env file — `tsx watch` auto-restarts on file change, picks up the
 * new values, and appkit's email module sees them on next .get().
 *
 * PRODUCTION NOTE: Whether this works in production depends on how
 * the server was started:
 *   ✓ DigitalOcean droplets, bare-metal/VMs, pm2, systemd — yes, .env
 *     is read by dotenv at boot and reading/writing the file works.
 *     The server still needs to restart to pick up the new values
 *     (pm2/systemd will usually do this on SIGHUP or file change).
 *   ✗ Fly machines, AWS Lambda, Vercel, Render, Railway — no. Env
 *     vars come from the platform; the filesystem is usually
 *     ephemeral or read-only. Writes will succeed (file write works)
 *     but the new values won't be picked up on the next boot.
 *
 * The UI banner explains this. We don't block writes in production
 * because DigitalOcean-style hosts are common enough that blocking
 * would be the wrong default.
 *
 * Parsing goals:
 *   - Preserve original line ordering, comments, and blank lines.
 *   - Update existing keys in place.
 *   - Append new keys at the end.
 *   - Quote values that contain whitespace, '#', or '='.
 *
 * Not goals:
 *   - Multi-line values. If you need those, swap this for a real
 *     dotenv-parser library (dotenv-expand, etc.).
 *   - Interpolation (${VAR}). We deliberately do NOT expand — the
 *     admin is editing literal config, not a shell script.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface EnvFileLocation {
  /** Absolute path of the .env file to read/write. */
  path: string;
  /** Whether the file exists today. */
  exists: boolean;
}

/** Resolve the target .env path relative to process.cwd(). */
export function getEnvFilePath(): EnvFileLocation {
  const path = join(process.cwd(), '.env');
  return { path, exists: existsSync(path) };
}

/**
 * Hint for the client about whether a write is likely to survive a
 * restart. Returns the best-effort answer based on common env signals.
 * NOT a hard gate — writes always attempt. The UI surfaces this as
 * a banner so the admin knows when to also set platform env vars.
 */
export function envPersistenceHint():
  | 'reliable'
  | 'platform-managed'
  | 'unknown' {
  // Serverless / edge platforms usually set one of these. If we see
  // one, we know the filesystem write won't persist across restarts.
  if (process.env.VERCEL) return 'platform-managed';
  if (process.env.FLY_APP_NAME) return 'platform-managed';
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return 'platform-managed';
  if (process.env.NETLIFY) return 'platform-managed';
  if (process.env.RENDER) return 'platform-managed';
  if (process.env.RAILWAY_ENVIRONMENT) return 'platform-managed';
  // Development or a VM-style deploy: .env writes persist as long as
  // the process can re-read the file on next boot.
  if ((process.env.NODE_ENV ?? 'development') === 'development') return 'reliable';
  return 'unknown';
}

/**
 * Parse a .env file's text. Returns an array of typed tokens so the
 * writer can preserve layout. Comments and blank lines are kept as
 * `other` tokens; key=value pairs are kept as `kv`.
 *
 * Supports:
 *   FOO=bar
 *   FOO="bar baz"
 *   FOO='bar baz'
 * Not supported: multi-line strings, shell-style backticks,
 * `${...}` interpolation (those round-trip as literal text).
 */
type EnvToken =
  | { kind: 'kv'; key: string; value: string }
  | { kind: 'other'; raw: string };

function parseEnvText(text: string): EnvToken[] {
  const tokens: EnvToken[] = [];
  // Preserve original line-ending style: split on \n, re-join with \n
  // at write time. Windows files rarely matter in dev containers.
  const lines = text.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=(.*)$/);
    if (!match) {
      tokens.push({ kind: 'other', raw: line });
      continue;
    }
    const key = match[1];
    let value = match[2];
    // Strip wrapping quotes but keep the content byte-identical.
    const trimmed = value.replace(/^\s+|\s+$/g, '');
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      value = trimmed.slice(1, -1);
    } else {
      value = trimmed;
    }
    tokens.push({ kind: 'kv', key, value });
  }
  return tokens;
}

/**
 * Quote a value only when needed. Keeps the .env file readable when
 * values are simple (API keys, hostnames) and safe when they contain
 * whitespace or '#' which would otherwise start a comment.
 */
function quoteIfNeeded(value: string): string {
  if (/[\s#'"=]/.test(value)) {
    return '"' + value.replace(/"/g, '\\"') + '"';
  }
  return value;
}

/**
 * Read the .env file as a flat map. Missing file → empty map. Keys
 * that appear multiple times keep the LAST value (matches dotenv's
 * behavior).
 */
export function readEnvFile(): Record<string, string> {
  const { path, exists } = getEnvFilePath();
  if (!exists) return {};
  const text = readFileSync(path, 'utf8');
  const tokens = parseEnvText(text);
  const out: Record<string, string> = {};
  for (const t of tokens) {
    if (t.kind === 'kv') out[t.key] = t.value;
  }
  return out;
}

/**
 * Merge `updates` into the existing .env file, preserving unrelated
 * lines. Values are updated in place; new keys are appended at the
 * end under a single blank-line separator.
 *
 * Keys with value === '' (empty string) are removed from the file so
 * the UI has a way to clear a setting without needing a separate
 * delete endpoint.
 *
 * Does NOT gate on NODE_ENV. The UI shows a banner derived from
 * `envPersistenceHint()` when we suspect writes won't survive (Vercel,
 * Fly, etc.). On DigitalOcean droplets, VMs, and bare-metal, writes
 * survive naturally.
 */
export function writeEnvFile(updates: Record<string, string>): void {
  const { path, exists } = getEnvFilePath();
  const text = exists ? readFileSync(path, 'utf8') : '';
  const tokens = parseEnvText(text);

  const handledKeys = new Set<string>();
  const out: string[] = [];

  for (const t of tokens) {
    if (t.kind === 'other') {
      out.push(t.raw);
      continue;
    }
    handledKeys.add(t.key);
    if (t.key in updates) {
      const next = updates[t.key];
      // Empty value => drop the line (delete semantic).
      if (next !== '') {
        out.push(t.key + '=' + quoteIfNeeded(next));
      }
    } else {
      out.push(t.key + '=' + quoteIfNeeded(t.value));
    }
  }

  const newKeys = Object.keys(updates).filter(
    (k) => !handledKeys.has(k) && updates[k] !== '',
  );
  if (newKeys.length > 0) {
    if (out.length > 0 && out[out.length - 1] !== '') out.push('');
    for (const k of newKeys) {
      out.push(k + '=' + quoteIfNeeded(updates[k]));
    }
  }

  writeFileSync(path, out.join('\n'));

  // Reflect changes into the CURRENT process.env immediately so the
  // rest of the request (e.g. "send test email" right after saving)
  // sees the new values without waiting for tsx-watch to restart.
  for (const [k, v] of Object.entries(updates)) {
    if (v === '') {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}
