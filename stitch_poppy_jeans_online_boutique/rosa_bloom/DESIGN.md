---
name: Rosa Bloom
colors:
  surface: '#fcf9f9'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f3'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1b1c'
  on-surface-variant: '#524343'
  inverse-surface: '#303031'
  inverse-on-surface: '#f3f0f0'
  outline: '#857372'
  outline-variant: '#d7c2c1'
  surface-tint: '#8a4d4e'
  primary: '#8a4d4e'
  on-primary: '#ffffff'
  primary-container: '#d48c8c'
  on-primary-container: '#592628'
  inverse-primary: '#ffb3b3'
  secondary: '#665c5b'
  on-secondary: '#ffffff'
  secondary-container: '#eedfdd'
  on-secondary-container: '#6c6261'
  tertiary: '#685b5b'
  on-tertiary: '#ffffff'
  tertiary-container: '#ab9c9c'
  on-tertiary-container: '#3e3434'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad9'
  primary-fixed-dim: '#ffb3b3'
  on-primary-fixed: '#380c0f'
  on-primary-fixed-variant: '#6e3637'
  secondary-fixed: '#eedfdd'
  secondary-fixed-dim: '#d1c3c2'
  on-secondary-fixed: '#211a19'
  on-secondary-fixed-variant: '#4e4543'
  tertiary-fixed: '#f0dfde'
  tertiary-fixed-dim: '#d3c3c2'
  on-tertiary-fixed: '#221919'
  on-tertiary-fixed-variant: '#4f4444'
  background: '#fcf9f9'
  on-background: '#1b1b1c'
  surface-variant: '#e4e2e2'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style
The design system is built on a foundation of "Poetic Modernism"—a blend of high-end fashion editorial and romantic floral aesthetics. It targets a feminine demographic that appreciates the intersection of classic denim craftsmanship and soft, contemporary elegance. 

The visual language draws heavily from **Minimalism** with a **Glassmorphism** overlay to evoke the ethereal, shimmering quality found in the reference imagery. The goal is to create a serene, premium shopping environment that feels as tactile as silk and as durable as premium denim. Use generous whitespace to allow product photography to breathe, and incorporate subtle, high-quality botanical flourishes as background elements rather than primary UI components to maintain a modern edge.

## Colors
The palette is centered around *Rosa Palo* (Dusty Pink), providing a warm, sophisticated anchor. 

- **Primary (#D48C8C):** A muted, medium-tone rose used for calls to action, active states, and brand highlights.
- **Secondary (#F9EAE8):** A very soft blush used for surface backgrounds, hover states, and subtle container fills.
- **Tertiary (#4A3F3F):** A deep, warm espresso used primarily for typography to maintain high legibility without the harshness of pure black.
- **Neutral (#FAF7F7):** A near-white with a hint of rose, acting as the primary canvas for the interface.

Accentuate these colors with a "Sparkle" effect—subtle, high-contrast white highlights (#FFFFFF) used sparingly in gradients to mimic the shimmering light in the reference artwork.

## Typography
The typography strategy employs a "High-Contrast Pairing." **Playfair Display** provides an editorial, authoritative serif presence for headings, evoking the feeling of a luxury fashion magazine. Its high-contrast strokes pair beautifully with the softer color palette.

**Plus Jakarta Sans** is used for all functional and body text. Its modern, rounded geometric forms ensure high legibility and maintain an approachable, friendly tone. For navigation and buttons, use the `label-md` style with increased letter spacing and uppercase styling to provide a clean, architectural structure to the page.

## Layout & Spacing
This design system utilizes a **Fixed Grid** on desktop (12 columns) and a **Fluid Grid** on mobile (4 columns). The layout philosophy is "Spacious and Intentional." 

- **Desktop:** 12 columns with a 24px gutter and large 64px outer margins to create a "frame" effect around the content.
- **Tablet:** 8 columns with 24px margins.
- **Mobile:** 4 columns with 20px margins.

Vertical rhythm is strictly managed through a 8px base unit. Product listings should use a masonry-lite approach or generous vertical padding between rows to prevent a cluttered, "discount" appearance. Use `stack-lg` for section breaks to maintain the premium, airy feel.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Soft Ambient Shadows**. Rather than heavy black shadows, use tinted shadows (Primary color at 10-15% opacity) with a high blur radius to create a "floating" effect.

**Glassmorphism** is applied to navigation bars and overlay cards. Use a `backdrop-filter: blur(12px)` combined with a subtle white border at 20% opacity to simulate frosted glass. This allows the floral backgrounds and product photography to peek through the interface, creating a sense of layered depth without sacrificing readability.

## Shapes
The shape language is consistently **Rounded**, avoiding sharp corners to align with the soft, feminine aesthetic. 

- **Standard Elements (Buttons, Inputs):** 0.5rem (8px) radius.
- **Large Containers (Cards, Modals):** 1rem (16px) radius.
- **Specialty Elements (Search bars, Chips):** Pill-shaped (fully rounded).

Incorporate circular framing for brand-specific imagery (like the logo or category highlights) to echo the reference images. Borders should be kept thin (1px) and rendered in a slightly darker shade of the background color for a "whisper" effect.

## Components
- **Buttons:** Primary buttons use a solid Primary fill with White text. Secondary buttons use a transparent background with a Primary border. All buttons feature a subtle 2px vertical lift on hover.
- **Input Fields:** Use an understated style—a Secondary color background with a bottom-only border that transforms into a full border on focus.
- **Product Cards:** No visible borders. Depth is indicated by a very soft shadow on hover. The product name uses `label-md` and the price uses `body-md` in a slightly muted tone.
- **Chips/Filters:** Pill-shaped with a Secondary background. Active states toggle to the Primary color.
- **Lists:** Use `stack-sm` for spacing. Dividers should be 1px, using the Primary color at 10% opacity.
- **Specialty Component - "The Bloom Reveal":** A hover effect on images where a subtle floral overlay or sparkle texture fades in over the product photography.