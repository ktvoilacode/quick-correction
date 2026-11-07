/**
 * ThemeControls — the light/dark toggle.
 *
 * The brand colours are fixed (styles/brand.css); only the mode is the user's choice.
 * The palette picker that used to sit beside it was removed on purpose. Setting the
 * `theme-*` class on <html> by hand does NOT work anyway: ThemeProvider strips any
 * theme class it did not set itself, so go through `useTheme()`.
 */
import { Button, Tooltip, TooltipTrigger, TooltipContent, useTheme } from '@bloomneo/uikit';
import { Moon, Sun } from 'lucide-react';

export function ThemeControls() {
  const { mode, setMode } = useTheme();

  return (
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
  );
}
