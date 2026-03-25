# IT Help Desk Intake Assistant

A local-only web prototype built for BIT 5544. It guides an employee from a vague IT complaint to a structured, well-formed support ticket through a short AI-assisted intake conversation.

**This is a prototype.** Nothing is sent to a real ticketing system, no emails are delivered, and no data is stored beyond your browser session.

---

## What it does

1. Pre-fills your name and device from your system account
2. You describe your issue in plain language
3. The app classifies it into one of six IT issue categories
4. A short set of follow-up questions (3–5) are generated for that category
5. The app reflects its understanding back to you for confirmation
6. On confirmation, it generates three output artifacts:
   - A **confirmation card** on the main page with a simulated email notice
   - A **structured ticket** in a new browser tab
   - A **mock API payload** (JSON) in a third tab, showing what would be sent to ServiceNow or Jira
   - A **downloadable PDF** summary

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | v18 or higher | Includes npm |
| OpenAI API key | — | Required for LLM features (Phase 3+) |
| Git | Any recent version | To clone the repo |

To check your Node version:
```bash
node --version
```

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/acottman1/vibe-code-helpdesk-ui.git
cd vibe-code-helpdesk-ui
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your `.env` file

In the project root, create a file named `.env` (this file is gitignored and will never be committed):

```
OPENAI_API_KEY=sk-your-openai-api-key-here
PORT=3000
```

**Where to get an API key:**
- Go to [platform.openai.com](https://platform.openai.com)
- Sign in → API keys → Create new secret key
- Paste it as the value for `OPENAI_API_KEY`

> **Note:** The app will start without a key, but the classify, questions, reflect, and ticket-generation steps will fail until one is provided.

### 4. Start the server

```bash
npm start
```

You should see:

```
  Helpdesk Intake Assistant running at http://localhost:3000

  User context will be read from environment:
    USERNAME      = yourname
    USERDNSDOMAIN = (not set on personal machines)
    COMPUTERNAME  = YOUR-DEVICE
    OPENAI_API_KEY = (set ✓)
```

### 5. Open the app

Navigate to **http://localhost:3000** in your browser.

---

## Running on a different port

If port 3000 is already in use, set a different port in your `.env`:

```
PORT=3001
```

Then open `http://localhost:3001`.

---

## Stopping the server

Press `Ctrl + C` in the terminal where the server is running.

If you get an `EADDRINUSE` error on restart, a previous server session is still holding the port. To clear it:

**Windows PowerShell:**
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
```

**Mac / Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

---

## Project structure

```
project-root/
│
├── .env                        ← YOU CREATE THIS (never committed)
├── .gitignore
├── package.json
├── server.js                   ← Express backend + API proxy
├── PLAN.md                     ← Full project plan and architecture notes
│
├── public/                     ← Static frontend (served by Express)
│   ├── index.html              ← Main intake page
│   ├── ticket.html             ← Structured ticket output tab
│   ├── payload.html            ← Mock JSON payload output tab
│   │
│   ├── css/
│   │   ├── main.css            ← Design tokens and base styles
│   │   ├── intake.css          ← Intake flow styles
│   │   └── output.css          ← Output tab styles
│   │
│   └── js/
│       ├── app.js              ← State machine and flow controller
│       ├── api.js              ← Backend fetch calls
│       ├── ui.js               ← DOM rendering helpers
│       ├── pdf.js              ← PDF generation (jsPDF, browser-side)
│       ├── ticket.js           ← Structured ticket tab
│       └── payload.js          ← JSON payload tab
│
└── prompts/                    ← LLM prompt templates
    ├── classify.js
    ├── questions.js
    ├── reflect.js
    └── generate-ticket.js
```

---

## How the API key is protected

The OpenAI API key lives only in your `.env` file on your local machine. It is:
- Read by Node.js at startup via the `dotenv` package
- Used exclusively in `server.js` for server-side API calls
- **Never sent to the browser**

All LLM calls go: Browser → your local Express server → OpenAI. The browser only ever talks to `localhost`.

---

## Issue categories supported

| Category | Examples |
|---|---|
| Login & Access | Can't log in, account locked, MFA issues |
| Email & Collaboration | Outlook broken, Teams not working |
| Network & Connectivity | No internet, VPN won't connect |
| Files & Shared Drives | Can't access network drive, missing files |
| Device & Workstation | Laptop acting weird, won't boot |
| Software & Applications | App crashing, need software installed |

---

## Development phases

| Phase | Status | Description |
|---|---|---|
| 1 — Skeleton & Server | ✅ Complete | Server, HTML shell, CSS design system, identity pre-fill |
| 2 — Intake UI & State Machine | ✅ Complete | Full flow with mocked responses |
| 3 — LLM Integration | ✅ Complete | Real OpenAI API calls |
| 4 — Output Artifacts | ✅ Complete | Ticket tab, payload tab, PDF |
| 5 — Polish & Edge Cases | ✅ Complete | Error states, graceful exit, branding |

---

## Course information

**Course:** BIT 5544
**Semester:** Spring 2026
**Type:** Local prototype / class assignment
**Stack:** Node.js · Express · Vanilla HTML/CSS/JS · OpenAI API · jsPDF
