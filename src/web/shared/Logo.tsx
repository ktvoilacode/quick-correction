/**
 * The Quick Correction logo.
 *
 * The mark is a "Q" whose tail is a marigold tick — a corrected answer. Colours come from theme
 * tokens, so it follows light/dark mode; public/favicon.svg is the same mark
 * with the colours written in.
 */
import { Link } from 'react-router-dom';

export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="mm-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--mm-from, #0AA2B2)" }} />
          <stop offset="1" style={{ stopColor: "var(--mm-to, #6B4FD8)" }} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#mm-logo-grad)" />
      <path
        d="M27.6 25.4A9.6 9.6 0 1 1 29.6 19"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.5 25.5l4 4 8-8.5"
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
      Quick <span className="mm-gradient-text">Correction</span>
    </span>
  );
}

export function Logo({ to = '/', className = '', markClassName }: { to?: string; className?: string; markClassName?: string }) {
  return (
    <Link to={to} className={`flex items-center gap-2.5 ${className}`} aria-label="Quick Correction home">
      <LogoMark className={markClassName} />
      <Wordmark />
    </Link>
  );
}
