# VMG MATE Design System
*Multi-Agent Tooling Ecosystem — The Intelligent Workspace Companion.*

## # Principles
- **The "Mate" Vibe:** The UI must feel like a professional partner (Ally/Mate). Approachable, high-integrity, and highly productive.
- **Approachable Minimalism:** Inspired by Notion, the UI should feel like quality paper—tactile and focused, avoiding sterile "glassy" effects.
- **Whisper-Thin Division:** Structure is created through ultra-thin borders (`1px solid rgba(0,0,0,0.08)`) and multi-layered, low-opacity shadows.
- **Utility-First Dashboard:** Prioritize information density. Every screen is a workspace, not a marketing landing page.
- **8px Grid & Touch-First:** All spacing follows an 8px scale. Minimum touch targets are 44px (ZaUI standard).

---

## # Tokens (Exact Measurements)

### Colors (VMG Red x Warm Neutrals)
- **Primary:** `#D32F2F` (VMG Red) - Used surgically for CTAs, active states, and focus.
- **Text (Primary):** `rgba(0, 0, 0, 0.95)` - Softened near-black for long-form readability.
- **Text (Secondary):** `#615d59` - Warm gray for metadata and descriptions.
- **Background (Canvas):** `#ffffff` - Pure white.
- **Background (Surface):** `#f6f5f4` - Warm white for Sidebar, Hub sections, and Agent cards.
- **Whisper Border:** `1px solid rgba(0, 0, 0, 0.08)`.

### Typography (ZaUI Scales)
- **Heading XLarge:** 28px, Weight 700.
- **Heading Medium:** 20px, Weight 600.
- **Body Large:** 16px, Weight 400 (Standard chat text).
- **Body Medium:** 14px, Weight 500 (UI Labels, navigation).
- **Caption:** 12px, Weight 400 (Timestamps, secondary metadata).
- **Constraint:** NO ALL-CAPS / UPPERCASE headings or labels. Maintain natural sentence case.

### Corner Radius
- **Micro (4px):** Buttons, functional input elements.
- **Standard (8px):** Main input bar, internal blocks.
- **Comfortable (12px):** Default cards, user chat bubbles.
- **Pill (9999px):** Status badges and tags.

### Elevation (Notion Shadow Stack)
- **Level 1 (Rest):** `rgba(0,0,0,0.04) 0px 4px 18px`
- **Level 4 (Floating):** `0px 8px 16px rgba(0, 0, 0, 0.12)` (Used for Chat Input bar).

---

## # Components

### Header (Native ZaUI)
- **Height:** 44px container height + `env(safe-area-inset-top)`.
- **Branding:** Colorful logo (32x32 sidebar / 24x24 header), no grayscale filters.

### Chat Input (Floating Workspace)
- **Style:** Background white, 8px radius, Level 4 Shadow.
- **Layout:** Centered max-width 4xl, transparent outer container.
- **Disclaimer:** Shortened text: "Kiểm tra lại thông tin, MATE có thể nhầm lẫn."

### Chat Bubbles
- **Assistant:** Full-width plain canvas. NO background, NO border. Sits directly on white background.
- **User:** VMG Red background, White text, 12px radius (4px at sender's corner).
- **Alignment:** Text and icons (e.g., Report button) must align to the same left margin as the message content.

### Admin Dashboard (Table-Based)
- **Navigation:** Nested paths (`/admin/silos/[id]/files/[fileId]`).
- **Editing:** Inline editable headers for names/descriptions. NO modal popups for simple metadata.
- **Responsiveness:** Hide secondary columns (`sm:table-cell`) to prevent horizontal scrolling.

### Agentic Thinking (Progressive Disclosure)
- **Closed State:** Horizontal pill with pulsing red dot and active phase label.
- **Open State:** Click to expand vertical reasoning chain with thin connector lines.
