/**
 * postinstall: hydrate this project with the installed versions of
 * @bloomneo/appkit and @bloomneo/uikit agent docs + skills.
 *
 * Runs automatically after `npm install`. Safe to re-run — always overwrites
 * with the version that matches what's currently in node_modules, so agent
 * rules stay in sync with the actual installed API.
 *
 * Output after first run:
 *
 *   docs/appkit.md              — @bloomneo/appkit llms.txt (full API reference)
 *   docs/appkit-agents.md       — @bloomneo/appkit AGENTS.md (do/never rules)
 *   docs/uikit.md               — @bloomneo/uikit llms.txt (full API reference)
 *   docs/uikit-agents.md        — @bloomneo/uikit AGENTS.md (do/never rules)
 *   .claude/skills/appkit-<name>/  — every appkit skill, mounted for auto-discovery
 *   .claude/skills/bloomneo-uikit/ — the uikit skill, mounted for auto-discovery
 *
 * Side-effect: replaces any remaining `{{PROJECT_NAME}}` placeholders in this
 * project's own AGENTS.md with the real package.json name. bloom's scaffold
 * processes .template files at create time, but AGENTS.md.template variants
 * across templates are not guaranteed to land everywhere — this is the
 * belt-and-braces pass.
 *
 * Survives gracefully if either package isn't installed (mobile-basicapp
 * has no appkit, for example).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const docsDir = path.join(root, 'docs');
const skillsDir = path.join(root, '.claude', 'skills');

/** Copy a single file. Returns true on success, false if source missing. */
function copyFile(src, dest, label) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Skipped ${label} (not installed or tarball missing it)`);
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`✅ ${path.relative(root, dest)} — ${label}`);
  return true;
}

/** Recursively copy a directory tree. Returns number of files copied. */
function copyTree(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyTree(src, dest);
    } else {
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
      count++;
    }
  }
  return count;
}

/** Replace {{PROJECT_NAME}} in a text file with the real package.json name. */
function fillProjectName(file) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('{{PROJECT_NAME}}')) return;
  let name = 'your-project';
  try {
    name = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).name || name;
  } catch {
    // package.json missing or malformed — fall back to placeholder default
  }
  content = content.replaceAll('{{PROJECT_NAME}}', name);
  fs.writeFileSync(file, content);
  console.log(`✅ ${path.relative(root, file)} — filled {{PROJECT_NAME}} → ${name}`);
}

// ─── docs/*.md — llms.txt + AGENTS.md from each installed package ────────

fs.mkdirSync(docsDir, { recursive: true });

let docsCopied = 0;
docsCopied += copyFile(
  path.join(root, 'node_modules/@bloomneo/appkit/llms.txt'),
  path.join(docsDir, 'appkit.md'),
  '@bloomneo/appkit API reference',
) ? 1 : 0;
docsCopied += copyFile(
  path.join(root, 'node_modules/@bloomneo/appkit/AGENTS.md'),
  path.join(docsDir, 'appkit-agents.md'),
  '@bloomneo/appkit agent rules',
) ? 1 : 0;
docsCopied += copyFile(
  path.join(root, 'node_modules/@bloomneo/uikit/llms.txt'),
  path.join(docsDir, 'uikit.md'),
  '@bloomneo/uikit API reference',
) ? 1 : 0;
docsCopied += copyFile(
  path.join(root, 'node_modules/@bloomneo/uikit/AGENTS.md'),
  path.join(docsDir, 'uikit-agents.md'),
  '@bloomneo/uikit agent rules',
) ? 1 : 0;

// ─── .claude/skills/ — merge skill trees from each package ────────────────

let skillCount = 0;

// appkit ships skills at .claude/skills/<name>/SKILL.md
skillCount += copyTree(
  path.join(root, 'node_modules/@bloomneo/appkit/.claude/skills'),
  skillsDir,
);
// uikit ships skills at skills/<name>/SKILL.md
skillCount += copyTree(
  path.join(root, 'node_modules/@bloomneo/uikit/skills'),
  skillsDir,
);

if (skillCount > 0) {
  console.log(`✅ .claude/skills/ — ${skillCount} skill file(s) mounted`);
}

// ─── {{PROJECT_NAME}} fill-in ─────────────────────────────────────────────

fillProjectName(path.join(root, 'AGENTS.md'));

// ─── Summary ──────────────────────────────────────────────────────────────

if (docsCopied > 0 || skillCount > 0) {
  console.log(
    `\n📚 Agent context ready: ${docsCopied} doc(s), ${skillCount} skill file(s). ` +
    `Agents can read docs/ for API reference and .claude/skills/ auto-triggers.\n`,
  );
}
