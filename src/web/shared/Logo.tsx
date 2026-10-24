/**
 * The Quick Correction logo.
 *
 * The mark is a round chat bubble whose tail points out to the bottom-right,
 * so it reads as a "Q", with a tick inside: chat-first, and a corrected answer. Colours come from theme
 * tokens, so it follows light/dark mode; public/favicon.svg is the same mark
 * with the colours written in.
 */
import { Link } from 'react-router-dom';

export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="mm-logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--mm-from, #0AA2B2)" }} />
          <stop offset="1" style={{ stopColor: "var(--mm-to, #6B4FD8)" }} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#mm-logo-grad)" />
      {/* Round chat bubble whose tail points out to the bottom-right — it reads as a "Q". */}
      <path
        d="M35.06 25.87L38.5 38.5L25.86 35.06A13 13 0 1 1 35.06 25.87Z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M16.6 23l4.2 4.2 7.6-8"
        fill="none"
        stroke="url(#mm-logo-grad)"
        strokeWidth="3.8"
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
