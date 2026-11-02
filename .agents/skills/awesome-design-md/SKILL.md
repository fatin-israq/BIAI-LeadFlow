---
name: awesome-design-md
description: Curated collection of 70+ DESIGN.md design system specifications inspired by top developer and consumer tech companies (Tesla, Apple, Stripe, Linear, Vercel, Supabase, Framer, Airbnb, etc.). Use when styling, designing, or scaffolding UI to match a specific brand's aesthetic, color tokens, typography, layout rules, and component styles.
---

# Awesome DESIGN.md — Semantic Design System Skill

## Overview
A `DESIGN.md` file is a plain-text design system document that AI agents read to build and style visually consistent, high-fidelity UI. Instead of relying on vague prompts or default AI aesthetics, a `DESIGN.md` defines concrete tokens, colors, typography scales, spacing rules, and anti-patterns extracted from world-class websites.

This skill provides direct access to 73 pre-analyzed brand design systems located in [references/design-md/](./references/design-md/).

---

## How to Use This Skill

### 1. Identify the Target Aesthetic
When a user asks for a specific visual style, brand language, or company aesthetic:
- **Tesla**: Radical subtraction, full-viewport cinematic showcase, Electric Blue (`#3E6AE1`) accent, Universal Sans typography, frosted glass floating navbar, near-zero UI decoration. (See [references/design-md/tesla/DESIGN.md](./references/design-md/tesla/DESIGN.md)).
- **Linear**: High-density dark mode, subtle `#222326` borders, precise key shortcuts, purple/indigo accents, crisp modern product feel. (See [references/design-md/linear.app/DESIGN.md](./references/design-md/linear.app/DESIGN.md)).
- **Stripe**: Multi-color gradients, blur cards, micro-textures, polished developer-first enterprise polish. (See [references/design-md/stripe/DESIGN.md](./references/design-md/stripe/DESIGN.md)).
- **Apple**: Spacious, human-centered, San Francisco typography, subtle glassmorphism, black/white clarity. (See [references/design-md/apple/DESIGN.md](./references/design-md/apple/DESIGN.md)).
- **Vercel**: High-contrast monochrome, Geist typography, geometric grid systems, crisp borders. (See [references/design-md/vercel/DESIGN.md](./references/design-md/vercel/DESIGN.md)).
- **Supabase**: Dark mode with Emerald green (`#3ECF8E`), hacker/terminal energy, dense developer tables. (See [references/design-md/supabase/DESIGN.md](./references/design-md/supabase/DESIGN.md)).

### 2. Activate or Apply a Design System
To apply a design system to the project:
1. Locate the requested brand in `references/design-md/<brand>/DESIGN.md`.
2. Inspect the design system's:
   - **Color Palette**: Primary, secondary, background, text, borders, and functional colors with exact hex values.
   - **Typography**: Display/Heading/Body font families, weights, font sizes, line heights, letter spacing.
   - **Component Styles**: Buttons (primary, secondary, ghost), Cards (borders, backgrounds, elevation), Inputs, Badges, Navigation bars.
   - **Layout Rules**: Container widths, max widths, grid columns, padding/margin scales.
   - **Interactions & Motion**: Transition timing functions, durations, hover effects, micro-animations.
   - **Anti-patterns**: Explicit list of banned styles to avoid.
3. Apply the tokens directly in CSS/code or copy the `DESIGN.md` file to the workspace root if the user wants a project-wide design specification.

---

## Available Design Systems Catalog (73 Brands)

| Category | Available Brands in [references/design-md/](./references/design-md/) |
| :--- | :--- |
| **Automotive & Luxury** | `tesla`, `bmw`, `bmw-m`, `ferrari`, `lamborghini`, `bugatti`, `renault` |
| **Developer Tools & Infrastructure** | `linear.app`, `vercel`, `supabase`, `cursor`, `posthog`, `sentry`, `raycast`, `warp`, `hashicorp`, `clickhouse`, `mongodb`, `sanity`, `composio`, `voltagent`, `opencode.ai` |
| **AI & LLM Platforms** | `claude`, `cohere`, `elevenlabs`, `minimax`, `mistral.ai`, `ollama`, `replicate`, `runwayml`, `together.ai`, `x.ai` |
| **Design & Creative Platforms** | `figma`, `framer`, `webflow`, `miro`, `lovable`, `expo`, `mintlify` |
| **Fintech & Crypto** | `stripe`, `wise`, `revolut`, `coinbase`, `binance`, `kraken`, `mastercard` |
| **Consumer, Commerce & Media** | `apple`, `airbnb`, `nike`, `spotify`, `shopify`, `slack`, `notion`, `starbucks`, `superhuman`, `cal`, `clay`, `resend`, `uber`, `spacex`, `playstation`, `pinterest`, `theverge`, `wired`, `zapier`, `vodafone`, `ibm`, `hp`, `meta` |
| **Retro & Historic** | `dell-1996`, `nintendo-2001` |

---

## Direct Integration with Dhaka Tesla Pool

For this repository (`Dhaka Tesla Pool`), the Tesla design system is available at:
👉 [references/design-md/tesla/DESIGN.md](./references/design-md/tesla/DESIGN.md)

It contains exact specs for:
- Electric Blue CTA (`#3E6AE1`)
- Carbon Dark text (`#171A20`) & Light Ash backgrounds (`#F4F4F4`)
- Universal Sans Display & Text font configurations
- 100vh full-bleed hero sections with floating frosted navigation
- Edge-to-edge photography showcases and 0.33s cubic-bezier transitions
