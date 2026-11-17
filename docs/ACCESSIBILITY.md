# Accessibility

Target: WCAG 2.2 AA and Israeli Standard 5568. **No external accessibility audit has been performed** – required before launch.

## Implemented
Semantic landmarks, skip link, single h1 per page, labelled forms with linked errors (`Field`), Radix dialogs/menus (focus trap, Escape), keyboard-operable gallery, combobox (ARIA 1.2 pattern), accordion, image editor keyboard fallback, visible focus ring, contrast-safe tokens (derived `--brand-amber-strong`, `--brand-warning-strong`, darkened muted text), no color-only status (badges carry text + icon), reduced-motion support, reflow at 320px, 200% text zoom, LTR isolation for numbers/plates, Hebrew `lang`/`dir`, alt text (seller-provided per photo + fallback), chart with text description + table.

## Automated checks (Playwright + axe, desktop & mobile)
17 public routes, WCAG 2a/2aa/21a/21aa/22aa tags → 0 violations. Keyboard (skip link, accordion), mobile menu Escape, 320px reflow, 200% zoom, reduced motion.

## Manual checklist before launch
- [ ] NVDA + Firefox, VoiceOver iOS/macOS, TalkBack: login, search, listing, wizard (all 9 steps), account, admin moderation
- [ ] Keyboard-only full publishing flow incl. image reorder/cover/crop
- [ ] Authenticated pages with real data through axe (not covered without a backend)
- [ ] Windows high contrast mode
- [ ] External audit by a certified accessibility service provider; publish coordinator details (`NEXT_PUBLIC_ACCESSIBILITY_CONTACT_*`)
- [ ] Update `/accessibility` with audit date and results
