# IT Help Desk Intake Assistant — Project Plan

**Course:** BIT 5544
**Type:** Local prototype / class assignment
**Date started:** 2026-03-23
**Stack:** Node.js + Express · Vanilla HTML/CSS/JS · OpenAI API · jsPDF

---

## Project Summary

A local-only web prototype of an IT help desk intake assistant. Its one job: take a vague employee complaint and transform it into a structured, well-formed ticket through a short guided conversation powered by the OpenAI API.

The app is not a chatbot. It is not a troubleshooting tool. It is a structured intake flow with a hard cap on rounds and questions. At the end, it produces three output artifacts: a confirmation card on the main page, a structured ticket in a second tab, and a mock API payload in a third tab. A PDF download is also available. Nothing actually sends anywhere.

All OpenAI calls are proxied through a small Node/Express backend so the API key never touches the browser.

---

## Issue Categories (6 fixed)

| # | Label | Canonical Key | Typical vague trigger |
|---|---|---|---|
| 1 | Login & Access | `login_access` | "I can't log in", "My account is locked" |
| 2 | Email & Collaboration | `email_collab` | "My email is broken", "Teams isn't working" |
| 3 | Network & Connectivity | `network_connectivity` | "The internet doesn't work", "I can't reach a site" |
| 4 | Files & Shared Drives | `files_drives` | "I can't get to my documents", "I lost a file" |
| 5 | Device & Workstation | `device_workstation` | "My laptop is acting weird", "Computer won't start" |
| 6 | Software & Applications | `software_apps` | "An app is crashing", "I need a program installed" |

---

## Urgency Model

Employee self-reports one of four levels. LLM independently assesses priority from the issue description and answers. Both values are recorded in the ticket.

| Label | Description shown to user |
|---|---|
| Low | Annoying, but I can work around it |
| Medium | I can't do what I want, but I can do other things |
| High | I'm prevented from doing any work |
| Critical | I'm prevented from doing any work and it must be resolved immediately |

The LLM's assessment becomes the `priority` field. The employee's choice becomes `requester_priority_self_reported`. The LLM also provides a one-line rationale displayed alongside its determination.

---

## Architecture

```
Node.js + Express       — backend API proxy (server.js, ~1 file)
Vanilla HTML/CSS/JS     — frontend, no framework, no build step
OpenAI API              — all calls server-side only
jsPDF                   — browser-side PDF generation (no server changes needed)
localStorage            — inter-tab communication for output artifacts
```

---

## User Flow

```
STEP 0 — Identity Pre-fill
  App loads → backend reads Windows env vars (USERNAME, USERDNSDOMAIN, COMPUTERNAME)
  Name + email pre-filled, user can edit

STEP 1 — Issue Entry
  Employee types vague description
  Employee selects self-reported urgency (with plain-language labels)

STEP 2 — LLM Classification
  Backend classifies into one of 6 categories
  LLM produces its own priority assessment + one-line rationale
  App shows: detected category + both priority views
  Employee confirms or adjusts

STEP 3 — Guided Follow-up  [Round 1 of max 3]
  3–5 targeted questions generated for that category
  Employee answers each

STEP 4 — Reflection & Confirmation
  App shows: "So in summary, you need help with..."
  Employee: Confirm ✓  or  Not quite ✗

  If ✓ → proceed to ticket generation
  If ✗ and rounds < 3 → next round of follow-up questions
  If ✗ and rounds = 3 → graceful exit, invite restart with clearer description

STEP 5 — Ticket Generation
  LLM builds final structured ticket
  Main page → confirmation card (simulated email notice + PDF download)
  Tab 2 → structured ticket view
  Tab 3 → mock JSON payload
```

---

## Page Flow

```
browser
  │
  ├── index.html        ← single page, all intake steps render here
  │     State machine: identity → entry → classifying → follow-up → reflection → done
  │
  ├── ticket.html       ← opened in new tab at step 5
  │     Reads ticket data from localStorage
  │     Renders as a clean service desk form
  │
  └── payload.html      ← opened in new tab at step 5
        Reads ticket data from localStorage
        Renders pretty-printed JSON
```

---

## Data Model

```javascript
{
  // Identity
  requester_name: String,
  requester_email: String,
  requester_username: String,            // from env USERNAME
  requester_domain: String,              // from env USERDNSDOMAIN

  // Issue
  raw_description: String,               // exactly what the user typed
  issue_started_at: String,             // user-provided onset ("this morning", "last Tuesday")
  category: String,                      // one of 6 canonical keys
  subcategory: String,                   // LLM-inferred (e.g. "VPN access")

  // Priority
  priority: String,                      // LLM assessment: Low|Medium|High|Critical
  priority_rationale: String,            // one-line LLM explanation
  requester_priority_self_reported: String,

  // Context
  affected_service: String,
  affected_device: String,               // from env COMPUTERNAME or user-provided
  user_location: String,
  single_or_multi_user: String,          // "Just me" | "Multiple people affected"
  business_impact: String,              // LLM-generated sentence

  // Ticket body
  issue_summary: String,                 // short 1-line title
  detailed_description: String,          // full structured paragraph
  routing_team: String,                  // e.g. "Level 1 Support", "Network Team"

  // Intake metadata
  follow_up_rounds: [
    {
      round: Number,
      questions: [String],
      answers: [{ question: String, answer: String }]
    }
  ],
  intake_round_count: Number,
  confirmation_status: String,           // "confirmed" | "max_rounds_reached"

  // Output
  timestamp: String,                     // ISO 8601
  ticket_id: String                      // mock: "INC-" + random 6-digit number
}
```

---

## Controlled Output Schema (JSON)

```json
{
  "ticket_id": "INC-847291",
  "timestamp": "2026-03-23T14:32:00Z",
  "requester_name": "Jane Smith",
  "requester_email": "jsmith@contoso.com",
  "category": "network_connectivity",
  "subcategory": "VPN / Remote Access",
  "priority": "High",
  "priority_rationale": "User is fully blocked from accessing remote resources required for their role.",
  "requester_priority_self_reported": "High",
  "business_impact": "Employee cannot access internal systems needed to complete assigned work.",
  "affected_service": "Corporate VPN",
  "affected_device": "DESKTOP-A1B2C3",
  "user_location": "Home office",
  "single_or_multi_user": "Just me",
  "issue_summary": "VPN client fails to connect after password change",
  "detailed_description": "Employee reports inability to connect to corporate VPN following a recent password reset...",
  "routing_team": "Network & Remote Access Support",
  "follow_up_rounds": [
    {
      "round": 1,
      "questions": ["What error message, if any, are you seeing?"],
      "answers": [
        { "question": "What error message, if any, are you seeing?", "answer": "It just says connection failed" }
      ]
    }
  ],
  "intake_round_count": 1,
  "confirmation_status": "confirmed"
}
```

---

## File Structure

```
project-root/
│
├── .env                        ← NEVER committed. Contains OPENAI_API_KEY
├── .gitignore                  ← includes .env
├── package.json
├── server.js                   ← Express backend, all API proxy routes
├── PLAN.md                     ← this file
│
├── public/                     ← everything here is served statically
│   ├── index.html              ← main intake page
│   ├── ticket.html             ← structured ticket tab
│   ├── payload.html            ← mock JSON payload tab
│   │
│   ├── css/
│   │   ├── main.css            ← shared base styles, design tokens
│   │   ├── intake.css          ← intake flow specific styles
│   │   └── output.css          ← ticket and payload tab styles
│   │
│   └── js/
│       ├── app.js              ← state machine, intake flow controller
│       ├── api.js              ← all fetch() calls to the backend
│       ├── ui.js               ← DOM rendering functions
│       ├── pdf.js              ← jsPDF ticket summary generation
│       ├── ticket.js           ← runs on ticket.html, reads localStorage
│       └── payload.js          ← runs on payload.html, reads localStorage
│
└── prompts/                    ← LLM prompt templates
    ├── classify.js
    ├── questions.js
    ├── reflect.js
    └── generate-ticket.js
```

---

## Implementation Phases

### Phase 1 — Skeleton & Server ✅ COMPLETE
**Objective:** Running locally end-to-end, no LLM calls yet.
- `package.json`, `server.js` with Express static serving
- `.env` + `.gitignore`
- `index.html` shell with step containers
- `main.css` with design tokens and base layout
- `/api/user-context` endpoint reads and returns Windows env vars
- `app.js` loads user context on page start, pre-fills identity fields
- **Test:** `node server.js` → localhost → identity fields pre-filled

### Phase 2 — Intake Form & State Machine ✅ COMPLETE
**Objective:** Full intake UI works with mocked/hardcoded responses.
- Identity form (pre-filled, editable)
- Issue description textarea + urgency selector with plain-language labels
- Category display (mocked)
- Follow-up question rendering + reflection card (mocked)
- `intake.css` polish
- **Test:** Walk through full flow using mocked data, no API calls

### Phase 3 — LLM Integration ✅ COMPLETE
**Objective:** Replace mocked responses with real OpenAI API calls.
- `server.js`: add `/api/classify`, `/api/questions`, `/api/reflect`, `/api/generate-ticket`
- `prompts/` files: controlled prompts with JSON output requirements
- `api.js`: connect frontend to backend
- Wire state machine to real responses
- Loading states and error handling
- **Test:** Full live flow from vague input to reflection confirmation

### Phase 4 — Output Artifacts ✅ COMPLETE
**Objective:** Generate all three output artifacts.
- `ticket.html` + `ticket.js`: read localStorage, render structured ticket
- `payload.html` + `payload.js`: read localStorage, render pretty JSON
- Main page confirmation card with simulated email line
- `pdf.js`: jsPDF summary card, optional transcript toggle
- **Test:** Complete intake → verify all three outputs, download PDF

### Phase 5 — Polish & Branding ✅ COMPLETE
**Objective:** Demo-ready with VT branding and UX polish.
- Virginia Tech color scheme (Chicago Maroon + Burnt Orange) across all surfaces
- "Hokie Hackers" company branding with tagline and phone number
- Category override as 2-step modal with live search filtering and "Other" option
- "When did this start?" text field on the issue entry step
- PDF transcript toggle checkbox on the done screen
- ServiceNow-style ticket header with burnt orange accent strip and priority pill
- Fix redundant script tags in index.html
- Fix stale comment in api.js
- Set confirmation_status = 'max_rounds_reached' on exit path
- Soft validation for empty follow-up answers
- `issue_started_at` field propagated through data model, ticket view, PDF, and prompt
- **Test:** Walk all edge case paths; verify branding on all surfaces

---

## Design Patterns & Technical Decisions

### Mock-First Development Pattern (`USE_MOCKS` flag)

One of the more deliberate architectural choices in this project is the way LLM integration was staged using a single feature flag.

In `public/js/app.js`:
```javascript
const USE_MOCKS = true; // Phase 3: flip to false
```

Every step runner (`runClassification`, `runFollowUp`, `runReflection`, `runGenerateTicket`) branches on this flag:

```javascript
if (USE_MOCKS) {
  await mockDelay();
  result = mockClassify(state.raw_description);
} else {
  result = await classifyIssue(state.raw_description); // real API
}
```

**Why this matters:**

- The entire UI, state machine, and output rendering was built and verified before a single real API call was made. This means the interface contract between the frontend and the LLM was defined upfront and the UI never had to change when real responses came in.
- The mock delay (`mockDelay()`) simulates real API latency, so loading spinners and transitions behave identically in both modes. The demo looks the same whether mocks or live calls are running.
- Flipping to live mode in Phase 3 requires changing exactly one line. Nothing else changes.
- If the OpenAI API is unavailable (rate limit, outage, no key), the app can be demonstrated in full by switching back to mock mode.

This pattern — build against a contract, mock the dependency, flip a flag to go live — is standard practice in professional software development and directly applicable to enterprise integrations like ServiceNow or Jira.

---

### Two-Layer Question Bank Design

There are two question banks in this project that serve completely different purposes:

**`public/js/mock.js` — the mock bank (Phase 2)**

These are the actual questions shown to the user during Phase 2. Since there is no LLM involved, the app selects directly from this list. Round 1 uses the first set of questions, round 2 uses a shorter follow-up set. The user's answers are collected and stored in state but do not influence what is asked next — the mock is purely static.

**`prompts/questions.js` — the LLM hint bank (Phase 3)**

These are **not** shown to the user. They are passed inside the system prompt to OpenAI as scaffolding — suggested question themes for each category. The LLM reads the user's original description, the current round number, and all prior answers, then writes its own questions. The hint bank steers the model toward relevant IT intake topics without locking it into fixed text.

This means Phase 3 question behavior is:
- **Personalized** — questions respond to what the user actually said
- **Non-repeating** — prior answers are passed in context, so the model doesn't re-ask covered ground
- **Bounded** — the hint bank and prompt rules keep it focused on IT intake, not open-ended conversation

| | Phase 2 (mock) | Phase 3 (LLM) |
|---|---|---|
| Question source | Pulled directly from `mock.js` | Generated by OpenAI |
| Hint bank role | Is the actual output | Guides the model only |
| Round 2 behavior | Different static list | LLM reads prior answers, adapts |
| User answers affect questions | No | Yes |

---

## Non-Goals

Do not build:
- Real authentication
- Real ticket submission to ServiceNow or Jira
- Real email delivery
- Real troubleshooting or diagnostic logic
- Long-term storage or a database
- Admin dashboards
- Enterprise security features beyond sensible local API key handling
- A multi-role platform

---

## Environment Setup (for reference)

1. Install Node.js (v18+)
2. Clone / open project folder
3. Run `npm install`
4. Create `.env` in project root:
   ```
   OPENAI_API_KEY=sk-your-key-here
   PORT=3000
   ```
5. Run `node server.js`
6. Open `http://localhost:3000`

---

## Progress Log

| Date | Phase | Notes |
|---|---|---|
| 2026-03-23 | Planning | Full plan drafted, all clarifications resolved |
| 2026-03-23 | Phase 1 | Started implementation |
| 2026-03-24 | Phase 1 | Completed — merged PR #1 to main |
| 2026-03-24 | Phase 2 | Started implementation |
| 2026-03-24 | Phase 2 | Completed — merged PR #2 to main |
| 2026-03-25 | Phase 3 | Completed — merged PR #3 to main |
| 2026-03-25 | Phase 4 | Completed — output artifacts validated (ticket, payload, PDF) |
| 2026-03-25 | Phase 5 | Completed — VT branding, category modal, issue_started_at, ServiceNow ticket header |
| 2026-03-25 | Post-5 fixes | Reflection prompt uses all Q&A rounds; exit step adds submit-as-is; ticket timestamp uses real server time |

---

## Phase 1 Completion Summary

**Branch:** `phase-1-skeleton`
**PR:** #1 — merged to `main` on 2026-03-24
**Commits:** 2 (skeleton + README)

### What was built

#### Backend (`server.js`)
- Node.js + Express server serving the `public/` directory as static files
- `/api/user-context` endpoint that reads Windows environment variables (`USERNAME`, `USERDNSDOMAIN`, `COMPUTERNAME`) and returns them as JSON to pre-fill the intake form
- Stub routes for all four Phase 3 LLM endpoints (`/api/classify`, `/api/questions`, `/api/reflect`, `/api/generate-ticket`) returning HTTP 501 until wired in Phase 3
- API key loaded from `.env` via `dotenv` — never exposed to the browser
- Startup console output confirming env var detection and API key presence

#### Frontend shell (`public/index.html`)
- Single-page application shell containing all 7 step containers:
  - Step 0: Identity form (pre-filled, editable)
  - Step 1: Issue description + urgency selector
  - Step 2: Classification result display
  - Step 3: Follow-up questions
  - Step 4: Reflection and confirmation
  - Step 5: Ticket generating (loading state)
  - Step 6: Done / confirmation card
  - Graceful exit state (max rounds reached)
- Only the active step is shown at any time via CSS class toggling

#### Design system (`public/css/`)
- `main.css`: Full design token system using CSS custom properties — colors, typography scale, spacing scale, border radii, shadows, transitions. Base styles for cards, form elements, buttons (primary, secondary, ghost, danger), step indicators, loading spinners, and utility classes.
- `intake.css`: Styles specific to the intake flow — urgency radio card selector with four labeled levels, category badge display, priority comparison blocks, follow-up question list, reflection summary card, graceful exit state, and confirmation card.
- `output.css`: Styles for the two output tabs — structured ticket document layout with header band, field grid sections, Q&A transcript display, and a dark-mode JSON payload view with syntax highlight color tokens.

#### JavaScript (`public/js/`)
- `app.js`: Central state machine. Owns all application state. Handles identity pre-fill on load, wires all form submit and button click events, and calls the appropriate step runner (classify, follow-up, reflect, generate) in sequence. Enforces the MAX_ROUNDS = 3 limit. Writes the final ticket to `localStorage` for output tabs to read.
- `api.js`: All `fetch()` calls to the backend in one place. Each function is named for its intent (`fetchUserContext`, `classifyIssue`, `fetchQuestions`, `fetchReflection`, `generateTicket`). Ready to be wired to real responses in Phase 3.
- `ui.js`: Pure DOM rendering functions — `showStep`, `renderClassification`, `renderQuestions`, `collectAnswers`, `renderReflection`, `resetLoadingState`, `showError`. No state, no side effects.
- `pdf.js`: Full jsPDF implementation generating a letter-format PDF summary card. Includes blue header band, labeled field sections (requester, issue, priority, description, routing), footer with page numbers, and optional Q&A transcript appendix. Chosen because it runs entirely in the browser with no server involvement.
- `ticket.js`: Reads ticket JSON from `localStorage` and renders a formatted service desk form in `ticket.html`. Includes all ticket fields, priority pill badges, and the full Q&A transcript.
- `payload.js`: Reads ticket JSON from `localStorage` and renders pretty-printed, syntax-highlighted JSON in `payload.html`. Includes a one-click copy-to-clipboard button.

#### LLM prompt templates (`prompts/`)
- `classify.js`: System + user prompt for issue classification. Constrains output to the 6 canonical category keys. Requires JSON response with category, subcategory, llmPriority, and priorityRationale fields.
- `questions.js`: System + user prompt for follow-up question generation. Includes per-category question hint banks. Enforces 3–5 question limit. Passes prior answers to avoid repeating covered ground.
- `reflect.js`: System + user prompt for generating the plain-language reflection summary. Enforces second-person, 2–4 sentence format starting with "It sounds like you need help with..."
- `generate-ticket.js`: System + user prompt for final ticket generation. Includes the full controlled output schema, routing team defaults per category, and all collected intake data.

#### Documentation
- `README.md`: Full setup guide for collaborators and instructors — prerequisites, step-by-step clone/install/run instructions, `.env` configuration, port conflict resolution, project structure overview, and API key security explanation.
- `PLAN.md`: This file — full architecture documentation, data model, output schema, file structure, and phase-by-phase roadmap.

### Key design decisions made in this phase

| Decision | Rationale |
|---|---|
| Node/Express backend instead of browser-only | Required to keep OpenAI API key off the client |
| Vanilla JS, no framework | Keeps code readable and explainable for a class project |
| All state in a single `state` object in `app.js` | Simple to understand, no external state library needed |
| `localStorage` for inter-tab communication | Simple, no server round-trip, works for a single-session prototype |
| jsPDF via CDN | Zero install, runs in browser, well-documented |
| CSS custom properties for design tokens | Easy to read and modify, no preprocessor needed |
| Prompt templates in separate `prompts/` files | Clean separation, easy to iterate on prompts independently |

### Verified working
- `npm install` installs all dependencies cleanly (0 vulnerabilities)
- Server starts and reads `USERNAME` and `COMPUTERNAME` from environment
- `/api/user-context` returns correct JSON
- App loads at `http://localhost:3000`
- Identity fields pre-fill from system environment
- Step 0 → Step 1 navigation works with form validation
- `.env` and `node_modules/` correctly excluded from git

---

## Phase 2 Completion Summary

**Branch:** `phase-2-intake-flow`
**PR:** #2 — merged to `main` on 2026-03-24
**Commits:** 3 (flow implementation + design pattern docs + progress log)

### What was built

#### `public/js/mock.js` (new file)
The complete mock layer that enables the full intake flow to run without any API calls or OpenAI key.

- **Keyword-aware classification:** Scores each of the 6 categories against the user's description using keyword matching. The category with the most keyword hits wins, defaulting to `device_workstation` if nothing matches. This means the mock responds to what the user actually typed — typing "internet" routes to Network & Connectivity, typing "email" routes to Email & Collaboration.
- **Per-category question banks:** Two rounds of questions for all 6 categories. Round 1 has 4 questions, round 2 has 3 targeted follow-up questions. Each set is distinct — round 2 questions go deeper rather than repeating round 1.
- **Personalized reflection builder:** Pulls the first substantive answer the user provided and weaves it into the summary string, making the reflection feel responsive rather than canned.
- **Full ticket generator:** Builds a complete ticket object matching the controlled output schema entirely from real intake state — uses the user's actual name, email, device, description, answers, category, and priority. Generates a realistic `INC-XXXXXX` ticket ID and ISO 8601 timestamp.
- **`mockDelay()`:** A configurable promise-based delay (default 900ms, 1200ms for ticket generation) applied to every mock call so loading spinners and transitions behave identically to real API calls during a demo.

#### `public/js/app.js` (updated)
- Added `USE_MOCKS = true` constant at the top with a clear `// Phase 3: flip to false` comment
- Imported `mockDelay`, `mockClassify`, `mockQuestions`, `mockReflect`, `mockGenerateTicket` from `mock.js`
- All four step runners (`runClassification`, `runFollowUp`, `runReflection`, `runGenerateTicket`) now branch on `USE_MOCKS` — mock path and live path are side by side, making the Phase 3 transition a one-line change
- Added `clearErrors()` calls on every step transition to prevent validation messages from persisting across steps

#### `public/js/ui.js` (updated)
- Added `clearErrors()` export — removes all `.inline-error` elements from the DOM, called by `app.js` on every navigation action

### Key design decisions made in this phase

| Decision | Rationale |
|---|---|
| `USE_MOCKS` single flag | One-line toggle between mock and live mode; no restructuring required for Phase 3 |
| Keyword scoring in mock classifier | Makes the demo respond to real input rather than always showing the same category |
| `mockDelay()` on all mock calls | Loading states are visible and transitions feel identical to live API behavior |
| Mock ticket built from real state | Output artifacts contain the user's actual data, not placeholder text — demo looks production-quality |
| `clearErrors()` on step transitions | Prevents stale validation messages from appearing on unrelated steps |

### Two-layer question bank — detailed explanation

This is one of the more architecturally interesting decisions in the project and is worth understanding clearly. See the **Design Patterns & Technical Decisions** section above for the full breakdown.

In short: `mock.js` contains questions that ARE shown to the user in Phase 2. `prompts/questions.js` contains hints that are passed to the LLM in Phase 3 — they guide what the model generates but are never shown directly. Phase 3 questions are dynamic (responding to prior answers), Phase 2 questions are static. The interface contract between the two is identical: both return `{ questions: string[] }`.

### Verified working (full end-to-end flow)
- Step 0 → identity pre-fills, validates name and email before advancing
- Step 1 → description textarea and urgency radio cards work, both fields required
- Step 2 → classification spinner shows ~900ms, category badge and dual priority blocks render
- Step 3 → 4 follow-up questions render with numbered labels and text inputs
- Step 4 → reflection summary incorporates the user's first answer; round counter shows correctly
- "Not quite" path → increments round, shows different question set, tracks toward max
- Max rounds path → graceful exit step renders with restart button
- Confirm path → generating spinner shows ~1200ms, done card renders with ticket ID
- Done screen → ticket tab opens with full structured view, payload tab opens with highlighted JSON, PDF downloads
- Start over → state resets completely, identity form re-shows with pre-filled values intact

---

## Phase 3 Completion Summary

**Branch:** `phase-3-llm-integration`
**PR:** #3 — merged to `main` on 2026-03-25

### What was built

#### `server.js` (updated)
- Shared `callOpenAI(messages, model)` helper centralizes all OpenAI HTTP calls — one place to adjust timeout, model, or headers
- `/api/classify` — POST, calls GPT-4o-mini with classify prompt, returns `{ category, subcategory, llmPriority, priorityRationale }`
- `/api/questions` — POST, calls GPT-4o-mini with questions prompt, returns `{ questions: string[] }`
- `/api/reflect` — POST, calls GPT-4o-mini with reflect prompt, returns `{ summary: string }`
- `/api/generate-ticket` — POST, calls GPT-4o-mini with generate-ticket prompt, returns full ticket JSON
- All routes validate required fields and return 400 on missing input
- All routes validate LLM response structure and return 500 if output is malformed
- `response_format: { type: 'json_object' }` used for all structured-output calls

#### `public/js/app.js` (updated)
- `USE_MOCKS` flipped to `false` — all four step runners now call real OpenAI routes

### Root cause of initial API failure
`OPENAI_API_KEY` was set as a Windows system environment variable (pointing to a stale/different key). `dotenv` does not override existing process environment variables — the stale value was winning. Fix: deleted the system environment variable via Windows Environment Variables dialog, opened a fresh terminal.

### Verified working
- Full live flow: vague description → classification → 3 follow-up questions → reflection → ticket generation
- All four routes return valid JSON from OpenAI
- Loading spinners and error handling work identically to mock mode

---

## Phase 4 Completion Summary

**Branch:** `phase-3-llm-integration` (output artifacts included in same branch)
**Verified:** 2026-03-25

### What was validated
- `ticket.html` opens in new tab, reads localStorage, renders full structured ticket with all fields and Q&A transcript
- `payload.html` opens in new tab, reads localStorage, renders syntax-highlighted JSON with copy button
- Main page done card shows ticket ID and simulated email notice
- PDF download generates letter-format summary card with all ticket fields
- Optional transcript checkbox on done screen controls whether Q&A is appended to PDF
- All three outputs contain real data from the live LLM-generated ticket

---

## Phase 5 Completion Summary

**Branch:** `phase-3-llm-integration` (polish applied before final merge)

### What was built

#### VT Branding (`main.css`, `intake.css`, `index.html`, `pdf.js`, `output.css`)
- Primary color token changed to VT Chicago Maroon (`#861F41`), accent token added for Burnt Orange (`#E5751F`)
- All blue hardcoded values in `intake.css` replaced with maroon equivalents
- App header rebuilt with Hokie Hackers brand structure: company name, tagline ("Enterprise quality vibe coding at scale for critical systems deployment."), and phone number (540) 555-4653
- PDF header band changed to VT Maroon with a 4pt Burnt Orange accent strip
- Ticket view header updated with 4px Burnt Orange bottom border

#### Category Override Modal (`ui.js`, `app.js`, `intake.css`)
- "Change" button opens a full-screen modal dialog with search input and scrollable category list
- Active filtering: typing in the search box instantly filters visible options
- "Other" option silently preserves the LLM-inferred category in state for routing; only the badge display changes
- Event delegation: `#classify-result` listens for `#btn-change-category` clicks so the listener survives badge re-renders
- Modal closes on: X button, Cancel button, Escape key, clicking the overlay

#### "When did this start?" field (`index.html`, `app.js`, `pdf.js`, `ticket.js`, `prompts/generate-ticket.js`)
- Optional text input on Step 1 (issue entry)
- Value stored in `state.issue_started_at`, passed through `buildIntakePayload`
- Included in generate-ticket prompt context and output schema
- Rendered in ticket view (Classification section) and PDF (Issue Details section)

#### ServiceNow-style ticket header (`ticket.js`, `output.css`)
- Header right side now shows both status badge and priority pill
- Priority pill styled with white-on-maroon semi-transparent treatment
- Burnt orange bottom border on header separates header band from body

#### Other fixes
- Removed 3 redundant `<script type="module">` tags from `index.html` (api.js, ui.js, pdf.js are imported by app.js)
- Removed stale "Phase 3: wired to OpenAI. For now returns 501." comment from `api.js`
- `state.confirmation_status = 'max_rounds_reached'` now set before `showStep('exit')` on the no-more-rounds path
- Soft validation on follow-up form: if all answers are blank, shows a tip but blocks submission; one answered question is sufficient
- PDF transcript toggle reads `#pdf-include-transcript` checkbox; ticket and payload tabs always include full transcript
- `issue_started_at` and `original_llm_category` added to `resetState()`

---

## Post-Phase-5 Fixes

### Reflection quality (`prompts/reflect.js`, `server.js`)
- Q&A context is now grouped and labeled by round ("Round 1:", "Round 2:") so the model synthesizes all rounds equally rather than defaulting to the most recent
- Blank answers are filtered from context to reduce noise
- Removed the "2–4 sentences maximum" cap — summary length now scales proportionally with how much information was collected
- `callOpenAI` default temperature raised from 0.3 → 0.5; reflection runs at 0.7 for natural varied prose; question generation runs at 0.4 for consistent structured output; classification remains at default

### Exit step UX (`public/index.html`, `public/js/app.js`)
- Max-rounds exit screen now offers two choices:
  - **Submit ticket as-is** — proceeds to ticket generation using all collected information, `confirmation_status = max_rounds_reached`
  - **Start a new request** — resets state and returns to identity step (previous behavior)

### Ticket timestamp (`server.js`)
- Timestamp is now always set to `new Date().toISOString()` at the moment of server-side ticket generation. Previously the server trusted the LLM's fabricated timestamp and only fell back to real time if the model omitted the field.
