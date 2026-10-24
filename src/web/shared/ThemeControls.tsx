/**
 * ThemeControls — palette picker + light/dark toggle.
 *
 * Both go through `useTheme()`. Setting the `theme-*` class on <html> by hand
 * does NOT work: ThemeProvider strips any theme class it did not set itself,
 * so your change vanishes on the next render with no error.
 *
 * The picker is here mostly so the token system is visible: switching palettes
 * recolours every component in the app — including ones this file has never
 * heard of — because they all resolve through `var(--color-…)`. Six palettes
 * are six lines of CSS, not six stylesheets.
 *
 * Shipping this in your product is optional. Delete the picker and keep the
 * mode toggle if users should not choose the brand colour.
 */
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  useTheme,
} from '@bloomneo/uikit';
import { Moon, Sun, Check, Palette } from 'lucide-react';
import { PALETTES } from './palettes';

export function ThemeControls() {
  const { theme, setTheme, mode, setMode } = useTheme();

  return (
    <div className="flex items-center gap-0.5">
      <DropdownMenu>
        {/* Deliberately NOT wrapped in a Tooltip: the tip fires on the same
            click that opens the menu, so both appear at once. The menu's own
            "Palette" heading says what it is. */}
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Change colour palette" className="size-8">
            <Palette className="size-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="px-2 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">
            Palette
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PALETTES.map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => setTheme(p.id)} className="gap-2.5">
              <span
                aria-hidden
                className="size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                style={{ background: p.swatch }}
              />
              <span className="flex-1">{p.label}</span>
              {theme === p.id && <Check className="size-3.5 text-muted-foreground" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
          >
            {mode === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{mode === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
      </Tooltip>
    </div>
  );
}
