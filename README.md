# Cisco AI Prompt Navigator

A high-performance, mobile-responsive Material Design 3 web application crafted to remove friction and accelerate adoption of Cisco internal AI tools:
- **Circuit AI Chat** (`enterprise-chat-ai@webex.bot`)
- **My Agent** (`circuitpulse@webex.bot`)

## Key Features

1. **Clean, Decluttered Experience:**
   - Radical consolidation down to a curated core of 104 high-impact, actionable prompts across key Cisco roles.
   - Removed duplicate noise and obscure tool acronyms.

2. **Onboarding Wizard & Account Executive Spotlight:**
   - First-time visitor onboarding dialog asks: *"Are you an Account Executive / Sales Leader?"*
   - **Account Executive Mode:** Instantly filters to the **Top 12 AE Prompts** (Mailbox & Webex triage, My Performance Review check-ins, Concur/Performance Review approvals, CCW deal discount justification, customer install base insights, renewal contracts, and account 360 dossiers).
   - **Full Catalog Mode:** Explore all Cisco roles (Engineering, Network Operations, Customer Success & Support, Marketing, HR, Finance).
   - Prominent **"Restart Wizard"** button in the top navigation bar lets users change their view anytime.

3. **Freeform Text Inputs (Zero Dropdowns):**
   - The Prompt Builder uses plain text inputs and textareas for all variable placeholders (e.g. `{customer_name}`, `{timeframe}`, `{deal_value}`).
   - Allows users to enter or paste any custom data freely without restrictive dropdown menus.
   - Real-time live prompt preview updates as you type.

4. **Webex Bot Integration & Dual Action Buttons:**
   - Separate **"Copy Prompt"** button (copies customized text to clipboard with tactile toast notification).
   - Separate **"Open Webex Chat"** button (launches `webexteams://im?email=...` directly into a 1:1 chat window with the appropriate bot).
   - One-click **"Copy & Open Webex"** button for instant handoff.

5. **Prompt Database Portability (In-Browser CRUD):**
   - Edit any existing prompt or add custom new prompts from the UI.
   - Export full library as `.json`.
   - Import JSON files to merge or replace prompts.
   - "Reset to Defaults" button to restore the factory curated library.
   - Persistent storage via browser `localStorage`.

6. **Material Design 3 & Cisco Brand Aesthetics:**
   - Cisco Bridge Blue palette (`#049fd9`, `#005073`).
   - Official Cisco SVG and PNG logos.
   - Light and Dark mode toggle with persistent preference.
   - Fully responsive grid for mobile, tablet, and desktop viewports.
   - Zero confidential or author branding.

## Project Structure

```
apps/cisco-prompt-library/
├── index.html                  # Semantic HTML5 application shell
├── styles/
│   ├── m3-tokens.css          # MD3 color tokens, elevation, Cisco palette, dark theme
│   └── main.css               # Responsive layout, cards, dialogs, form styles
├── js/
│   ├── app.js                 # App state orchestrator, wizard, filters, grid rendering
│   ├── prompts-store.js       # LocalStorage persistence, seed loader, JSON export/import
│   ├── prompt-builder.js      # Parameter substitution engine with live preview
│   ├── editor.js              # In-browser prompt database CRUD manager
│   └── webex.js               # Webex protocol launcher and clipboard bridge
├── data/
│   └── default-prompts.json   # Curated 104 core prompts (including 12 AE spotlight)
├── assets/
│   ├── cisco-logo.svg         # Official Cisco vector bridge logo
│   └── cisco-logo.png         # Cisco logo PNG fallback
├── .gitlab-ci.yml             # Automated GitLab Pages deployment pipeline
└── README.md                  # Project documentation
```

## Local Development & Testing

To preview the app locally:
```bash
cd apps/cisco-prompt-library
python3 -m http.server 8080
```
Open `http://localhost:8080` in your web browser.

## Deployment to GitLab Pages

Push this repository to GitLab. The included `.gitlab-ci.yml` pipeline automatically builds the `public/` directory and deploys it to your GitLab Pages URL.
