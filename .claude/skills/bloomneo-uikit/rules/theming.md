# Theming — @bloomneo/uikit

Rules for customizing, switching, and generating themes. Theming is the most common place agents break uikit apps. Read this before editing any color, writing CSS, or running `uikit generate theme`.

## When to do what

| User asks for | Do this |
|---|---|
| "Switch to dark mode" | Call `useTheme().setMode('dark')`. No CSS edits. |
| "Use our brand theme" | Generate it once with `uikit generate theme brand`, then `useTheme().setTheme('brand')`. No CSS edits. |
| "Match our brand color" | `npx uikit generate theme brand`, edit `primary` in the generated file, `npx uikit bundle`. |
| "Make the button blue" | **Don't.** Components take brand color from the theme's `primary`. If they want one-off color, use `variant` — never override via className with raw colors. |
| "Create a custom theme" | `npx uikit generate theme <name>` → edit → `npx uikit bundle`. |

## Built-in themes

`base` is the only bundled theme (4.0 removed `elegant`, `metro`, `studio` and `vivid`). Generate your own with `uikit generate theme <name>`, then switch at runtime with `useTheme().setTheme()`.

## The 29-variable contract

Every theme defines the same set of CSS variables. Components consume them via
semantic Tailwind classes.

**In 3.0 raw palette classes are not merely discouraged — they produce no CSS.**
`@bloomneo/uikit/styles` removes Tailwind's default palette, so `bg-blue-500`
and `text-gray-900` compile to nothing and the element renders unstyled. That
is deliberate: a rule that only lives in documentation gets bypassed, and one
production app accumulated 1,547 hardcoded palette classes against 196 semantic
ones before this change.

Migrating a 2.x app? `@bloomneo/uikit/styles/permissive` restores the old
behaviour while you convert.

Core variables (the ones you'll touch when customizing):

| Variable | Class | When to change |
|---|---|---|
| `--primary` / `--primary-foreground` | `bg-primary` | Brand color. This is usually the only one to customize. Controls buttons, links, focus rings, active states, charts. |
| `--background` / `--foreground` | `bg-background` | Page background + primary text. Light mode: near-white bg, dark text. Dark mode: near-black bg, light text. |
| `--destructive` / `--destructive-foreground` | `bg-destructive` | Error/delete actions. Red family. |
| `--muted` / `--muted-foreground` | `bg-muted`, `text-muted-foreground` | Secondary text, subtle sections. |
| `--border`, `--input`, `--ring` | `border-border` | Borders, form inputs, focus rings. |
| `--chart-1` … `--chart-5` | `var(--chart-1)` | Data visualization. Change if charts clash with brand. |
| `--sidebar` … `--sidebar-ring` | `bg-sidebar` | Your app shell's sidebar (7 vars). Change only if the sidebar needs distinct styling. |

Hierarchy (for choosing the right class):
- **Backgrounds:** `bg-background` → `bg-card` → `bg-muted` → `bg-accent` (lightest to most-interactive)
- **Text:** `text-foreground` → `text-muted-foreground` → `text-primary` (primary to emphasis)

## OKLCH primer

Themes use OKLCH color space (`oklch(L C H)`), not hex or HSL. Why: OKLCH is perceptually uniform — equal L values look equally bright regardless of hue. Fixes the classic "my blue primary looks darker than my green one" problem.

- `L` = Lightness (0–1). `0.5` = mid, `0.7` = light button bg, `0.3` = dark text.
- `C` = Chroma (saturation). `0` = gray, `0.2+` = vivid.
- `H` = Hue (0–360°). 0 = red, 120 = green, 240 = blue.

When converting from hex: use an OKLCH converter (e.g. `culori`), don't eyeball it. The generated theme file has comments showing the source hex for each OKLCH value.

## Custom theme workflow

```bash
# 1. Generate the theme file
npx uikit generate theme brand

# 2. Edit the generated file
#    src/themes/presets/theme-brand.js         (standard)
#    src/web/themes/presets/theme-brand.js     (FBCA layout)

# 3. Compile to CSS
npx uikit bundle

# 4. Watch mode during development
npx uikit bundle --watch

# 5. Use in app
useTheme().setTheme('brand');
```

The generated theme file has `light` and `dark` blocks. Edit both. The bundler compiles both into the output CSS.

## Dark mode rule

**Primary color must lighten in dark mode.** A dark-blue primary (`#1E40AF`) over a dark background is unreadable. Rule of thumb: dark-mode `primary` should be 2-3 lightness steps higher than light-mode `primary`.

- Light mode: `#1E40AF` (indigo-800) → Dark mode: `#60A5FA` (blue-400)
- Light mode: `#047857` (emerald-700) → Dark mode: `#34D399` (emerald-400)

Also: **dark mode backgrounds should never be pure `#000000`.** Use `#0A0A0A` or slightly tinted dark. Pure black flares against OLED/LCD glass.

## Incorrect / Correct

```tsx
// ❌ Hardcoded brand color — breaks on theme switch
<Button className="bg-blue-500 text-white">Save</Button>
// ✅ Uses the theme's primary
<Button>Save</Button>

// ❌ Inline color style — invisible to theming
<div style={{ backgroundColor: '#1E40AF' }}>…</div>
// ✅ Semantic token
<div className="bg-primary">…</div>

// ❌ Hardcoded text color
<p className="text-gray-500">Subtitle</p>
// ✅ Semantic muted token
<p className="text-muted-foreground">Subtitle</p>

// ❌ Writing custom CSS files for theming
// src/styles/brand.css → .my-button { background: #1E40AF; }
// ✅ Generating a theme preset
// npx uikit generate theme brand → edit primary → bundle

// ❌ Raw border color
<div className="border border-gray-200">…</div>
// ✅ Theme border
<div className="border border-border">…</div>

// ❌ Switching theme by editing CSS variables manually
document.documentElement.style.setProperty('--primary', '#1E40AF');
// ✅ useTheme hook
useTheme().setTheme('brand');
```

## FBCA projects

In a Feature-Based Component Architecture app (what `@bloomneo/bloom` scaffolds), themes live at `src/web/themes/presets/` instead of `src/themes/presets/`. The CLI detects FBCA automatically — same commands work.

## Troubleshooting

| Problem | Fix |
|---|---|
| Theme changes not showing | Run `npx uikit bundle`, clear browser cache, restart dev server |
| Colors look washed out in dark mode | Lighten `primary` — see dark mode rule above |
| Chart colors clash with brand | Override `--chart-1` … `--chart-5` in the theme file |
| Sidebar looks wrong | Sidebar surfaces read `--sidebar*` vars separately — 7 variables; default to `base` if unsure |
| FOUC (flash of default theme) on load | Ensure `<script>{foucScript()}</script>` is in `index.html` `<head>`, not body |

## Don't do

- Don't write `.css` files for brand colors. The theme preset system exists for exactly this.
- Don't use Tailwind palette classes (`bg-blue-500`, `text-red-600`). Under the default stylesheet they emit no CSS at all — the element just has no colour.
- Don't edit compiled CSS in `dist/` — regenerate from the preset instead.
- Don't mix OKLCH with hex in the same theme file. Pick one (prefer OKLCH — that's what the generator emits).
- Don't set `primary` to a color with low contrast against white — button text becomes unreadable.
