---
name: Gramin Vyapar Pristine
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#404945'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#707974'
  outline-variant: '#c0c9c3'
  surface-tint: '#376757'
  primary: '#003629'
  on-primary: '#ffffff'
  primary-container: '#1b4d3e'
  on-primary-container: '#8abda9'
  inverse-primary: '#9ed1bd'
  secondary: '#775a00'
  on-secondary: '#ffffff'
  secondary-container: '#fed269'
  on-secondary-container: '#765900'
  tertiary: '#003809'
  on-tertiary: '#ffffff'
  tertiary-container: '#005111'
  on-tertiary-container: '#74c570'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#baeed9'
  primary-fixed-dim: '#9ed1bd'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#1d4f40'
  secondary-fixed: '#ffdf99'
  secondary-fixed-dim: '#ecc15a'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5a4300'
  tertiary-fixed: '#a3f69c'
  tertiary-fixed-dim: '#88d982'
  on-tertiary-fixed: '#002204'
  on-tertiary-fixed-variant: '#005312'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  headline-lg:
    fontFamily: Noto Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 42px
  headline-lg-mobile:
    fontFamily: Noto Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Noto Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Noto Sans
    fontSize: 19px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 17px
    fontWeight: '500'
    lineHeight: 26px
  body-md:
    fontFamily: Noto Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Noto Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  label-md:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  numeric-display:
    fontFamily: Noto Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system serves traditional Indian family-run businesses operating in semi-urban and rural markets (Tier-2/3/4 towns). The target user is an experienced merchant who manages high-volume daily transactions with high practical intelligence but limited technological familiarity.

The aesthetic philosophy is **Dignified Vernacular Utility**—a fusion of warm tactile physical ledgers (*Bahi-Khata*) and modern high-contrast mobile ergonomics. The interface completely rejects decorative noise, fragile glassmorphism, and low-contrast minimalism in favor of grounded authenticity, clear structural divisions, and unmistakable affordances.

### Key Emotional Targets
- **Vishwas (Trust & Dignity):** Professional, sturdy, and reliable. Financial records and stock counts feel permanent and tamper-proof.
- **Saralta (Effortless Clarity):** Immediate comprehension in direct sunlight, zero ambiguity regarding touch areas, and zero cognitive load during high-rush hours.
- **Dual Identity Distinction:** Instant visual orientation between two distinct business wings:
  - *Krishi Wing (बीज, खाद एवं दवाइयाँ)*: Anchored by deep agricultural greens, communicating vitality and certified quality.
  - *Kirana Wing (किराना एवं जनरल स्टोर)*: Anchored by warm terracotta amber, communicating daily household warmth and pantry abundance.

## Colors

The palette draws inspiration from traditional ledger canvas, brass weights, harvest crops, and terracotta jars. 

### Palette Definition
- **Primary Brand (`#1B4D3E` - Deep Forest Green):** The institutional anchor representing stability, trust, and fiscal health. Used for global navigation headers, primary submission buttons, and authoritative badges.
- **Secondary (`#C29B38` - Earthy Brass Gold):** Signifies value, ledger totals, cash balances (*रोकड़*), and premium trust stamps.
- **Agricultural Sector (`#2E7D32` - Khet Green):** Applied exclusively to identity tags, stock tallies, and filter badges for *बीज, खाद एवं दवाइयाँ*.
- **Grocery Sector (`#D97706` - Terracotta Amber):** Applied exclusively to identity tags, stock tallies, and filter badges for *किराना एवं जनरल स्टोर*.
- **Backgrounds:**
  - Base Canvas (`#FBF9F5` - Warm Cream): Emulates high-grade sunlit parchment; avoids eye strain caused by harsh `#FFFFFF`.
  - Surface Raised (`#F4EFE6` - Bahi Tint): Container surfaces, cards, and input backgrounds to establish clear tactile layers.
- **Neutral & Text (`#1F2937` - Deep Charcoal Ink):** Uncompromising high-contrast ink for all Devanagari typography, ensuring legibility on reflective screens and entry-level mobile panels.
- **Functional Semantics:**
  - *Jama / Aavak (Credit/Inflow):* `#166534` (Deep Emerald)
  - *Udhaar / Baaki (Debit/Credit Given):* `#B91C1C` (Deep Vermillion)
  - *Mic Audio Action:* `#047857` with a pulse glow of `#A7F3D0` for instant voice-input recognition.

## Typography

Noto Sans (Devanagari) is calibrated specifically to accommodate the complex ascenders (*matras* like ो, ै) and descenders (*matras* like ु, ू) inherent to Hindi orthography. 

### Typographic Principles
- **Elevated Line-Height:** Vertical spacing is expanded by 20–25% compared to Latin-only layouts to prevent matra collisions between lines.
- **Optical Weight Floor:** Body text never drops below `400` weight or `13px` equivalent (`body-sm`). Key transactional labels default to `600` (Semi-Bold) for instant readability.
- **Numbers & Monetary Values:** Rendered using unified bold metrics (`numeric-display`), paired with explicit currency glyphs (₹) for zero ambiguity in transactional amounts.
- **No Pure Uppercase/Capital Transformations:** Devanagari possesses no concept of capitalization; visual hierarchy relies strictly on scale, weight shifts (Regular to Bold), and color anchoring.

## Layout & Spacing

The layout model is driven by a single-column, thumb-centric vertical stacking pattern designed for hand-held field and counter usage.

### Grid & Density Rules
- **Mobile Foundation:** Strict 4-column fluid layout with an outer canvas boundary of `1rem` (`16px`) and an internal gutter of `0.75rem` (`12px`).
- **Touch Target Integrity:** Every clickable element—including list rows, dropdown triggers, and numeric toggles—must guarantee an absolute minimum physical hit target of **52px × 52px** to accommodate work-hardened hands.
- **Fixed Action Canopy:** High-frequency workflows (e.g., *नया बिल बनाएँ*, *आवाज़ से खोजें*) are permanently anchored in the thumb zone at the screen base, retaining a `1rem` safe gap above device navigation bars.
- **Reflow for Tablet/Desktop:** On larger counter-mounted tablets (POS mode), the canvas splits into a 2-pane fixed layout: persistent ledger overview on the left (40% width) and active transaction entry on the right (60% width).

## Elevation & Depth

This design system avoids multi-tier floating shadows and glowing blurs. Depth is grounded, physical, and tactile—emulating structured paper ledgers, bound books, and tangible brass tokens.

### Layering Strategy
1. **Canvas Tier (0dp):** The foundation background (`#FBF9F5`).
2. **Structural Cards & Tiles (1dp):** Uses surface separation (`#F4EFE6`) combined with a crisp, low-contrast protective stroke: `1px solid rgba(31, 41, 55, 0.12)`. Subtle ground shadow: `0 2px 4px rgba(27, 77, 62, 0.04)`.
3. **Active Selection & Shop-Switchers (2dp):** Visual depth is established via inset physical borders and soft earthy drops: `0 4px 10px rgba(27, 77, 62, 0.08)`, framed with a `1.5px` border matching the active wing (Green or Terracotta).
4. **Modal Overlays & Floating Voice Panel (3dp):** Elevated above the canvas with a dense protective shadow: `0 8px 24px rgba(31, 41, 55, 0.16)`, overlaid across an earthy dimming scrim: `rgba(27, 77, 62, 0.40)`.

## Shapes

The interface balances welcoming friendliness with pragmatic structure using moderate corner curvature (`roundedness: 2`).

### Geometry Rules
- **Cards, Sheets & Module Blocks:** Styled with `0.5rem` (`8px`) corners. This maintains clear rectangular grid definitions, which helps readability for table-style itemization.
- **Buttons, Voice Microphones, and Shop-Switch Pills:** Styled with `rounded-lg` (`1rem` / `16px`) or full pill shapes to indicate physical, pressable controls.
- **Data Tables & Transaction Rows:** Crisp square corners internally (`0px`), housed inside an outer container with `8px` rounded corners, matching the visual structure of a bound ledger.

## Components

### 1. Dual-Shop Mode Switcher (दुकान चयनकर्ता)
- A segmented controller fixed at the top of the interface.
- **Agri Mode (कृषि):** Label: *बीज, खाद एवं कीटनाशक*. When active, the tab background is `#2E7D32` with white text and a sprouting plant icon.
- **Kirana Mode (किराना):** Label: *किराना एवं जनरल स्टोर*. When active, the tab background is `#D97706` with white text and a grain bag icon.
- The inactive tab rests on `#F4EFE6` with `#1F2937` charcoal text and a subtle `1px` border.

### 2. Primary Buttons (मुख्य बटन)
- Height: Minimum `52px` (standard `56px` for primary actions).
- Solid fill with `#1B4D3E` (Deep Forest Green) and crisp white text (`#FFFFFF`), bold 16px font.
- Tactile press effect: Shifts downward by `1px` with a darkened border on tap to confirm physical engagement.

### 3. Voice Input Bar (बोलकर लिखें / खोजें)
- Prominent input field containing a large dedicated microphone button (`48px × 48px`).
- Mic active state: Animated pulsing badge in `#047857` with the label: *"अब बोलिए... (सुन रहे हैं)"*.
- High-contrast visual sound-wave feedback confirms speech recognition in noisy shop environments.

### 4. Ledger Transaction Cards (खाता पर्ची कार्ड)
- Physical card appearance with off-white surface (`#FFFFFF` resting on `#FBF9F5`).
- Left-side color stripe:
  - `4px` emerald green bar for *जमा (रुपये आए)*.
  - `4px` vermillion red bar for *उधार (बाकी)*.
- Prominent bold figures in Devanagari numerals or clear English numerals (merchant choice) sized at 20px bold.

### 5. Input Fields (प्रविष्टि बॉक्स)
- Container background: `#FFFFFF` encased with a distinct `1.5px` border of `rgba(31, 41, 55, 0.20)`.
- Focus state: Border transitions to `#1B4D3E` with an extra `2px` focus ring.
- Labels are persistently pinned to the top (never floating) to prevent cognitive confusion during text entry.
- Optional voice button integrated inside the right edge of each input for voice-driven entry.

### 6. Quick Counter Chips (त्वरित फ़िल्टर)
- Height: `42px` for comfortable thumb interaction.
- Background: `#F4EFE6` with `#1F2937` text.
- Active state: Inverted high-contrast styling with `#1B4D3E` background and white text.