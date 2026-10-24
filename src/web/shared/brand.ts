/**
 * One source of brand truth.
 *
 * UIKit deliberately ships no <Logo>, no <Header> and no <Footer> — product
 * identity is the one thing a component library cannot get right for you.
 * It lives here instead, so there is exactly one place to change it.
 *
 * The theme id must match the class in `styles/brand.css`.
 */
export const brand = {
  /** Theme id — matches `.theme-medhamark` in styles/brand.css. */
  themeId: 'medhamark',

  name: 'Quick Correction',
  tagline: 'Board-pattern tests, handwritten answers, AI correction.',

  /** Shown in the shell and the browser tab. */
  shortName: 'Quick Correction',

  /**
   * Primary navigation. Empty by default — a one-page scaffold has nowhere to
   * navigate to, and a lone "Home" link pointing at the current page is noise.
   * Add entries and the header (and the mobile slide-over) pick them up:
   *
   *   nav: [{ label: 'Pricing', to: '/pricing' }],
   */
  nav: [
    { label: 'Prototype', to: '/demo' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ] as { label: string; to: string }[],

  /** Footer link groups. Also empty until you have somewhere to point. */
  footer: [
    {
      heading: 'Company',
      links: [
        { label: 'About', to: '/about' },
        { label: 'Contact', to: '/contact' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy', to: '/privacy' },
        { label: 'Terms', to: '/terms' },
        { label: 'Refunds', to: '/refund' },
        { label: 'Cancellation', to: '/cancellation' },
      ],
    },
  ] as { heading: string; links: { label: string; to: string }[] }[],

  social: {
    github: 'https://github.com',
  },
} as const;

export type BrandNavItem = (typeof brand.nav)[number];
