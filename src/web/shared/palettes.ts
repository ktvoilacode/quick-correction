/**
 * The palettes offered by the switcher in the header.
 *
 * Each `id` must match a class in `styles/brand.css`. The default palette has
 * no suffix, so its id is the bare project slug.
 *
 * `swatch` is only for the picker's own dots — it cannot use a token, because
 * it has to show a colour the app is NOT currently themed with.
 */
export type Palette = {
  id: string;
  label: string;
  /** OKLCH string for the picker dot. Mirrors --brand-h in brand.css. */
  swatch: string;
};

export const PALETTES: Palette[] = [
  { id: 'medhamark',          label: 'Maroon',  swatch: 'oklch(0.42 0.150 8)' },
  { id: 'medhamark-teal',     label: 'Teal',    swatch: 'oklch(0.52 0.196 195)' },
  { id: 'medhamark-emerald',  label: 'Emerald', swatch: 'oklch(0.52 0.196 155)' },
  { id: 'medhamark-amber',    label: 'Amber',   swatch: 'oklch(0.52 0.160 68)'  },
  { id: 'medhamark-rose',     label: 'Rose',    swatch: 'oklch(0.52 0.190 14)'  },
  { id: 'medhamark-slate',    label: 'Slate',   swatch: 'oklch(0.52 0.028 268)' },
];

export const DEFAULT_PALETTE = PALETTES[0].id;
