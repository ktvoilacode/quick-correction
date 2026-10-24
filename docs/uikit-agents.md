# AGENTS.md — @bloomneo/uikit

> Rules for AI coding agents generating code with `@bloomneo/uikit` v4.1.8.
> Read this FIRST, then `llms.txt` for per-component snippets.

## Always do

1. Import from `@bloomneo/uikit` (flat, canonical).
2. Wire the styles correctly — this is the one that gets missed:
   - App runs its own Tailwind (every Bloom template)? Put
     `@import "@bloomneo/uikit/theme";` after `@import "tailwindcss";` in your
     CSS. A prebuilt stylesheet cannot constrain your build, so this is what
     actually applies the palette lockdown.
   - No build, prebuilt CSS only? `import '@bloomneo/uikit/styles'` at entry.
   - Migrating a 2.x app? `@bloomneo/uikit/styles/permissive` keeps raw
     palette classes working temporarily.

   Both default entries ship the semantic tokens ONLY — Tailwind's default
   palette is removed, so `bg-blue-600` produces no CSS. Use `bg-primary`,
   `bg-card`, `text-muted-foreground`.
3. Wrap the app root in `ThemeProvider` > `ToastProvider` > `ConfirmProvider` (in that order).
4. Add the FOUC-prevention script via `foucScript()` in the `<head>` of `index.html`.
5. Pass `data` as `[]` while loading — never pass `undefined` to `DataTable`.
6. Give every `DataTable` column a unique `id`.
7. Use `useConfirm()` for delete/destructive flows — never manage confirm dialog state manually.
8. Use `toast.*` for notifications — never build custom toast UI.
9. Use `format*` helpers (`formatCurrency`, `formatDate`, `formatBytes`, etc.) for display values.
10. Use `useBreakpoint()` for responsive logic — never write manual resize listeners.
11. Use `<FormField>` to wrap inputs (provides label, error message, and a11y wiring automatically).
12. Use `<PermissionGate>` for role-based UI — never write inline `if (role === 'admin')` checks.

## Never do

1. Never deep-import as primary: `@bloomneo/uikit/button` is only for tree-shaking optimization.
2. Never use `<FormController>` for new code — it is a legacy alias for react-hook-form's FormField.
3. Never hardcode colors — not hex, and not Tailwind palette classes like
   `bg-blue-600` or `text-gray-900`. They compile to nothing under the default
   stylesheet. Use semantic classes: `bg-primary`, `text-muted-foreground`,
   `bg-card`, `border-border`.
4. Never create custom toast UI — use `ToastProvider` + `toast.*`.
5. Never manage Dialog/Sheet/Confirm open state with a custom boolean when a provider hook exists.
6. Never skip `ThemeProvider` — components depend on CSS variables it sets.
7. Never use `onChange` on `<Select>` or `<Combobox>` — both use `onValueChange(newValue)` in 2.0+. `onChange(e)` is reserved for native input wrappers (Input, Textarea, PasswordInput).
8. Never render `<ToastProvider>` or `<ConfirmProvider>` more than once in the component tree.
9. Never pass `undefined` to the `DataTable` `data` prop — use `[]` for empty or loading states.

## Required setup (every app)

```tsx
// app entry (main.tsx) — imports styles + mounts providers
import "@bloomneo/uikit/styles";
import {
  ThemeProvider,
  ToastProvider,
  ConfirmProvider,
} from "@bloomneo/uikit";

function App({ children }) {
  return (
    <ThemeProvider theme="base" mode="light">
      <ToastProvider />
      <ConfirmProvider>{children}</ConfirmProvider>
    </ThemeProvider>
  );
}
```

`ToastProvider` is a self-closing sibling — it mounts the Toaster and does
NOT wrap children. `ConfirmProvider` wraps children because `useConfirm()`
reads context from it. This order matches every cookbook recipe and llms.txt;
any other arrangement is drift.

FOUC prevention (recommended, prevents theme flash on first paint):

```tsx
// Next.js (app router) — app/layout.tsx
import { foucScript } from "@bloomneo/uikit";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script dangerouslySetInnerHTML={{ __html: foucScript() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

```html
<!-- Vite / static HTML — paste the output of foucScript() once into index.html -->
<head>
  <script>/* output of foucScript() pasted here */</script>
</head>
```

## Component decision tree

| Need | Use | Not |
|---|---|---|
| Centered modal | `Dialog` | — |
| Slide-in panel | `Sheet` with `side` prop | No `Drawer` component exists — use `Sheet side="right"` |
| Text-only hint on hover | `Tooltip` | — |
| Rich preview on hover | `HoverCard` | — |
| Interactive content, click-triggered | `Popover` | — |
| Static option list in a form | `Select` | — |
| Searchable/clearable select | `Combobox` | — |
| Action menu from a button (not form value) | `DropdownMenu` | `Select` |
| Transient notification, auto-dismiss | `toast.*` | `Alert` |
| Inline banner, stays visible | `Alert` | `toast.*` |
| Table with sort/filter/paginate | `DataTable` | `Table` |
| Raw HTML table for custom layouts | `Table` | `DataTable` |
| No data exists | `EmptyState` | a loading placeholder |
| Data is loading | `<div className="h-N animate-pulse rounded-md bg-muted" />` | `EmptyState` |
| Label + error + a11y input wrapper | `FormField` | `FormController` |
| react-hook-form controller (legacy) | `FormController` (only with `useForm`) | — |

## Prop conventions

**Overlays** (Dialog, Sheet, Popover):
Controlled via `open` + `onOpenChange`.

**Native inputs** (Input, Textarea, PasswordInput):
Standard React DOM: `value` + `onChange(e)` where `e` is a `ChangeEvent`.

**Single-value pickers** (Select, Combobox, Tabs):
`value` + `onValueChange(newValue)` — the callback receives the value
directly, not a ChangeEvent. Unified in 2.0.0; pre-2.0 Combobox used
`onChange` — no alias kept.

**Radix checkable** (Checkbox, Switch, RadioGroup):
`checked` + `onCheckedChange(newChecked)`.

**Universal props** across all interactive components:
- `className` — accepted for customization.
- `disabled` — accepted to disable interaction.

## Common mistakes and fixes

| Mistake | Symptom | Fix |
|---|---|---|
| `<DataTable data={users}>` where `users` is undefined during loading | Runtime crash: "expects data to be an array" | Always pass `[]` while loading: `data={users ?? []}` |
| Using `onChange` on `<Select>` or `<Combobox>` | Nothing happens — no error, no update | Both use `onValueChange(newValue)` in 2.0+. Unified. |
| Using `onValueChange` on `<Input>` / `<Textarea>` | Type error | Native inputs emit `ChangeEvent` — use `onChange(e => setX(e.target.value))` |
| Mounting `<ToastProvider>` twice | Duplicate toasts appear | Mount exactly once at app root. Dev warning will fire if duplicated |
| Mounting `<ConfirmProvider>` twice | Confirm dialogs show twice or don't resolve | Mount exactly once at app root. Dev warning will fire if duplicated |
| Missing `<ThemeProvider>` wrapper | Components render without styles, CSS vars missing | Wrap entire app: `<ThemeProvider>` > `<ToastProvider>` > `<ConfirmProvider>` |
| Missing FOUC script in `<head>` | Flash of default theme on page load | Add `<script>{foucScript()}</script>` to index.html `<head>` |
| Using `<Dialog>` for delete confirmation | Works but verbose — managing open state manually | Use `useConfirm()` or `<ConfirmDialog>` instead |
| Bare `<Input>` without `<FormField>` | No label, no error display, broken a11y | Wrap in `<FormField label="..." error={...}>` |
| Hardcoded colors like `bg-blue-500` | Breaks when theme changes | Use semantic classes: `bg-primary`, `text-muted-foreground` |

## Icon name collisions with lucide-react

Four uikit components share a name with a `lucide-react` icon:
**Badge, Command, Sheet, Table.**

Importing both unqualified makes `<Table />` ambiguous, and the icon
usually wins because it is what most code means. Alias the icon:

```tsx
import { Table } from '@bloomneo/uikit';
import { Table as TableIcon } from 'lucide-react';
```

## Client-only components

These components require `"use client"` at the top of the file in Next.js App Router:

Dialog, Sheet, Popover, Tooltip, HoverCard, DropdownMenu, ConfirmDialog,
Toast / ToastProvider, Command / CommandDialog, Combobox, Tabs, ThemeProvider.
