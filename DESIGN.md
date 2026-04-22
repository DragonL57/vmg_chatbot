# VMG Knowledge Base Design System (Notion-Inspired)

## # Principles
- **Approachable Minimalism:** The UI should feel like quality paper—tactile and approachable, not sterile or glassy.
- **Utility Over Marketing:** This is a professional tool. Avoid giant hero sections or excessive whitespace; prioritize information density and task completion.
- **Whisper-Thin Division:** Structure is created through ultra-thin borders and multi-layered, low-opacity shadows rather than heavy lines or solid color blocks.
- **Warm Neutrality:** Use warm grays with yellow-brown undertones (#f6f5f4) to soften the experience compared to cold blue-grays.
- **Singular Brand Accent:** VMG Red (#D32F2F) is the *only* saturated brand color, used surgically for primary actions, active states, and focus indicators.

---

## # Tokens

### Colors
- **Text (Primary):** `rgba(0, 0, 0, 0.95)` (Softened near-black for long-form reading)
- **Text (Secondary):** `#615d59` (Warm gray for descriptions and metadata)
- **Text (Muted):** `#a39e98` (Placeholders and disabled states)
- **Background (Canvas):** `#ffffff` (Pure white)
- **Background (Surface):** `#f6f5f4` (Warm white for alternating sections/sidebars)
- **Primary Accent:** `#D32F2F` (VMG Red)
- **Primary Active:** `#B71C1C` (Deep Red)
- **Border (Whisper):** `1px solid rgba(0, 0, 0, 0.1)`
- **Success:** `#1aae39`
- **Warning/Error:** `#EF3E36`

### Typography
- **Font Family:** `Inter`, System-UI
- **Weights:** 400 (Body), 500 (Medium/UI), 600 (Semibold), 700 (Bold/Headings)
- **Scaling:**
  - **Display:** 32px-48px, Weight 700, Letter-spacing -0.035em
  - **Heading:** 20px-24px, Weight 700, Letter-spacing -0.02em
  - **Body (Standard):** 16px, Weight 400, Line-height 1.6
  - **UI/Label:** 14px, Weight 500
  - **Caption:** 12px, Weight 500
- **Constraint:** Do not place logos or icons next to main headings (Display/Heading levels). Keep titles focused on typography to maintain a clean, high-density dashboard look.
- **Note:** Avoid using uppercase transform or all-caps text for headings, labels, or badges to maintain a natural, approachable tone.

### Radius
- **Micro (4px):** Buttons, inputs, functional corners of chat bubbles.
- **Standard (8px):** Internal component blocks, thinking process cards.
- **Comfortable (12px):** Default cards, input containers.
- **Pill (9999px):** Status badges and tags.

### Shadows (The Notion Stack)
- **Notion Shadow:** `rgba(0, 0, 0, 0.04) 0px 4px 18px, rgba(0, 0, 0, 0.027) 0px 2.025px 7.84688px, rgba(0, 0, 0, 0.02) 0px 0.8px 2.925px, rgba(0, 0, 0, 0.01) 0px 0.175px 1.04062px`

---

## # Components

### Buttons
- **Primary:** Background `var(--vmg-red)`, White text, 4px radius. Scale to 0.96 on click.
- **Secondary/Ghost:** Background `transparent` or `black 3%`, Near-black text. Underline on hover.
- **Icon Buttons:** No background by default. 4px-8px padding. Subtle `black 5%` background on hover.

### Inputs
- **Container:** Whisper border, 12px radius, Notion Shadow.
- **Focus State:** `ring-[3px] ring-[#D32F2F]/10`, border color shift to `[#D32F2F]/30`.
- **Placeholder:** Warm gray `#a39e98`.

### Chat Bubbles
- **General:** Asymmetrical rounding. 12px all corners except sender's corner (4px).
- **Assistant:** White background, Whisper border, Shadow Level 1.
- **User:** VMG Red background, White text, Shadow Level 1.
- **Metadata:** 12px font, 30% opacity black (assistant) or 60% opacity white (user).

### Cards (Silos/Knowledge)
- Background: White.
- Border: Whisper border.
- Hover: Subtle shadow intensification + border color shift to Brand Red 20% opacity.
- Header icons: Floating (no background), Brand Red or Neutral 40% based on active state.

### Layout
- **Sidebar:** Width 240px, Background `#f6f5f4`, Whisper border-right.
- **Header:** Height 45px, Minimalist, Breadcrumb-style title navigation.
- **Content:** Pure white canvas, center-aligned max-width 4xl to 5xl for readability.
