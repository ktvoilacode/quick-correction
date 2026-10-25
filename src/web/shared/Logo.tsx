/**
 * The Quick Correction logo.
 *
 * The mark is a round bubble with a small tail nub at the bottom-right, so it
 * reads as a "Q", with a tick inside: chat-first, and a corrected answer. Colours come from theme
 * tokens, so it follows light/dark mode; public/favicon.svg is the same mark
 * with the colours written in.
 */
import { useId } from 'react';
import { Link } from 'react-router-dom';

export function LogoMark({ className = 'size-8' }: { className?: string }) {
  // Each mark gets its own gradient id: a shared id breaks every logo on the
  // page whenever the first one is inside a hidden (display: none) element.
  const grad = `mm-logo-grad-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--mm-from, #1D4ED8)" }} />
          <stop offset="1" style={{ stopColor: "var(--mm-to, #1E3A8A)" }} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${grad})`} />
      {/* Round bubble with a small tail nub at the bottom-right — it reads as a "Q". */}
      <circle cx="23" cy="23" r="13" fill="#FFFFFF" />
      <path d="M31.2 31.2L34.4 34.4" stroke="#FFFFFF" strokeWidth="4.6" strokeLinecap="round" />
      <path
        d="M17.4 22.9l3.9 3.9 7.3-7.6"
        fill="none"
        stroke={`url(#${grad})`} /* same blue as the tile */
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
