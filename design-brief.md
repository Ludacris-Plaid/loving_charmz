# Loving Charmz — Premium Redesign Brief

## Brand Identity

- **Name:** Loving Charmz
- **Niche:** Pet-bond memorial/symbolic jewelry for women
- **Positioning:** Meaning-driven mid-premium. NOT budget. NOT generic.
- **Tagline:** "Modern keepsake jewelry for women who carry what matters—love, memory, and connection."
- **Core themes:** Connection ("Because they're not just pets"), Meaning ("Every symbol carries a story"), Permanence ("Made to stay with you")

## Current Tech Stack

- Next.js 16 (App Router), React 19, TypeScript 6, TailwindCSS 4
- Supabase backend (auth, database)
- Fonts: Inter (sans), Playfair Display (headings) — both loaded via next/font
- All UI components exist in `components/ui/`

## Existing Brand Tokens (from globals.css @theme)

```
--color-brand-50:  #fffaf7     (warm white)
--color-brand-100: #fff6f1     (cream)
--color-brand-200: #f7ede8     (warm beige)
--color-brand-300: #f3d7cf     (rose cream)
--color-brand-400: #d4a99a     (dusty rose)
--color-brand-500: #8f5c4c     (warm bronze)  <-- hover/accent
--color-brand-600: #6f5a53     (brown)
--color-brand-700: #5c392f     (dark brown)   <-- primary text/buttons
--color-brand-800: #2d1f1a     (deepest brown) <-- body text
--color-surface: rgba(255,255,255,0.86)
--color-surface-strong: #fffdfb
--radius-card: 1.25rem
--radius-pill: 9999px
--shadow-card: 0 20px 80px rgba(92, 57, 47, 0.08)
--shadow-card-hover: 0 24px 90px rgba(92, 57, 47, 0.14)
```

## Current Site State

- Homepage at `app/(marketing)/page.tsx` — decent but static. Hero with text + CTA + featured keepsake card (The Loyal Companion). Three highlight cards (Connection/Meaning/Permanence).
- Header/footer exist in `components/marketing/`
- Account and admin layouts with sidebars
- Auth pages at `/login` and `/signup`

## What We Want

### 1. ANIMATED HERO SECTION (Highest Priority)
- Page-load entrance animation — NOT cheap fade-in. Something elegant, confident.
- Playfair Display hero text should animate in with purpose — stagger each line, subtle scale, or letter-reveal
- The "Featured keepsake" card (The Loyal Companion) should have a subtle ambient animation — maybe a gentle float, a soft glow pulse, or an elegant border shimmer
- The three highlight cards (Connection/Meaning/Permanence) should reveal with staggered timing
- Badge ("Bond Collection — 4 pieces") should have a subtle animated indicator
- CTA buttons should feel tactile and responsive

### 2. SUBTLE ANIMATIONS THROUGHOUT
- **Scroll-triggered reveals:** sections fade/slide in as user scrolls
- **Hover states:** Cards elevate smoothly, buttons have satisfying transitions, nav links have subtle underlines that animate in
- **Page transitions:** Buttery-smooth route changes
- **Loading states:** Animated skeletons that aren't boring
- **Micro-interactions:** Heart/like animations, add-to-cart feedback, form focus states
- **Navigation:** Mobile menu has smooth open/close animation (not instant snap)
- **Footer:** Subtle reveal on scroll

### 3. AESTHETIC DIRECTION
- **NOT generic luxury.** No gold gradients, no cheesy sparkles.
- **Think:** Emotional warmth meets editorial precision. Like a high-end magazine spread about memory and connection.
- **Motion posture:** Confident, deliberate, never frantic. Animations should feel like breathing — organic, calm, intentional.
- **Hero vibe:** The pet-bond jewelry should feel HEARTFELT not flashy. Think: morning light through a window onto a keepsake box. Warm, intimate, precious.
- **Avoid:** Glassmorphism overload, rainbow palettes, emoji, fake stats, generic SaaS cards, stock-photo vibes

### 4. SPECIFIC ANIMATION TECHNIQUES TO USE
- CSS-only where possible (performance)
- Framer Motion for complex sequenced animations (if adding dependency is acceptable)
- `prefers-reduced-motion` respected everywhere
- Use Tailwind's `animate-*` utilities + custom `@keyframes` in globals.css
- Hero text: staggered reveal per line (split text or manual spans)
- Cards: `transform` + `box-shadow` transitions on hover
- Scroll reveals: Intersection Observer or scroll-driven animations
- Subtle ambient animations on the featured keepsake card: gentle Y-axis float (2-4px) + soft glow pulse on border

### 5. FILES TO MODIFY
- `app/globals.css` — add custom @keyframes, animation utilities
- `app/(marketing)/page.tsx` — animated hero rebuild
- `components/marketing/Header.tsx` — smooth mobile menu, scroll-aware header
- `components/marketing/Footer.tsx` — scroll reveal
- `components/ui/Card.tsx` — enhanced hover state
- `components/ui/Button.tsx` — enhanced transitions
- `components/ui/Badge.tsx` — animated indicator
- `app/layout.tsx` — page transition wrapper (if needed)

### 6. DO NOT CHANGE
- Brand color palette (keep ALL existing tokens)
- Font choices (Inter + Playfair Display)
- Existing component API (props/interfaces)
- Supabase auth code
- Layout structure (header/footer/page routing)
- PLAN.md or SPEC.md docs
- The 4 Bond Collection product names/taglines

### 7. ACCEPTANCE
- Site loads without jank — animations don't block rendering
- All existing pages still work (login, signup, account, admin)
- Mobile hamburger menu animates smoothly
- `prefers-reduced-motion` disables all non-essential animations
- The homepage feels premium, emotional, and polished — not generic
