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

### Phase 1 — Skeleton & Server ✅ / 🔲
**Objective:** Running locally end-to-end, no LLM calls yet.
- `package.json`, `server.js` with Express static serving
- `.env` + `.gitignore`
- `index.html` shell with step containers
- `main.css` with design tokens and base layout
- `/api/user-context` endpoint reads and returns Windows env vars
- `app.js` loads user context on page start, pre-fills identity fields
- **Test:** `node server.js` → localhost → identity fields pre-filled

### Phase 2 — Intake Form & State Machine 🔲
**Objective:** Full intake UI works with mocked/hardcoded responses.
- Identity form (pre-filled, editable)
- Issue description textarea + urgency selector with plain-language labels
- Category display (mocked)
- Follow-up question rendering + reflection card (mocked)
- `intake.css` polish
- **Test:** Walk through full flow using mocked data, no API calls

### Phase 3 — LLM Integration 🔲
**Objective:** Replace mocked responses with real OpenAI API calls.
- `server.js`: add `/api/classify`, `/api/questions`, `/api/reflect`, `/api/generate-ticket`
- `prompts/` files: controlled prompts with JSON output requirements
- `api.js`: connect frontend to backend
- Wire state machine to real responses
- Loading states and error handling
- **Test:** Full live flow from vague input to reflection confirmation

### Phase 4 — Output Artifacts 🔲
**Objective:** Generate all three output artifacts.
- `ticket.html` + `ticket.js`: read localStorage, render structured ticket
- `payload.html` + `payload.js`: read localStorage, render pretty JSON
- Main page confirmation card with simulated email line
- `pdf.js`: jsPDF summary card, optional transcript toggle
- **Test:** Complete intake → verify all three outputs, download PDF

### Phase 5 — Polish & Edge Cases 🔲
**Objective:** Demo-ready.
- Graceful exit flow when max rounds reached
- Category confirmation / override step
- `output.css` for ticket and payload tabs
- Responsive layout check
- Error states (API failure, empty answers, malformed LLM response)
- README with setup instructions
- **Test:** Walk all edge case paths

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
| 2026-03-23 | Phase 1 | Starting now |
