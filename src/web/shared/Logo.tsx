/**
 * The MedhaMark logo.
 *
 * The mark is an "M" drawn as one pen stroke, finished with a marigold tick —
 * Medha (intellect) + Mark (a corrected answer). Colours come from theme
 * tokens, so it follows light/dark mode; public/favicon.svg is the same mark
 * with the colours written in.
 */
import { Link } from 'react-router-dom';

export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="11" fill="var(--color-primary)" />
      <path
        d="M10.5 28V13.5L20 23l9.5-9.5V19"
        fill="none"
        stroke="var(--color-primary-foreground)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.5 26.5l3.8 3.8 7.2-7.6"
        fill="none"
        stroke="var(--color-highlight, #F5B331)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      Medha<span className="text-primary">Mark</span>
    </span>
  );
}

export function Logo({ to = '/', className = '', markClassName }: { to?: string; className?: string; markClassName?: string }) {
  return (
    <Link to={to} className={`flex items-center gap-2.5 ${className}`} aria-label="MedhaMark home">
      <LogoMark className={markClassName} />
      <Wordmark />
    </Link>
  );
}
