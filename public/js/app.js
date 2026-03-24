// app.js — State machine and intake flow controller
// Imports api.js, ui.js, pdf.js. Owns all application state.

import { fetchUserContext, classifyIssue, fetchQuestions, fetchReflection, generateTicket } from './api.js';
import { showStep, renderClassification, renderQuestions, collectAnswers, renderReflection, resetLoadingState, showError } from './ui.js';
import { downloadTicketPDF } from './pdf.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_ROUNDS = 3;

// ---------------------------------------------------------------------------
// Application state
// Phase 1: only identity is populated. Other fields filled in later phases.
// ---------------------------------------------------------------------------
const state = {
  // Identity (Step 0)
  requester_name:     '',
  requester_email:    '',
  requester_username: '',
  requester_domain:   '',
  affected_device:    '',
  user_location:      '',

  // Issue (Step 1)
  raw_description:                   '',
  requester_priority_self_reported:  '',

  // Classification (Step 2)
  category:           '',
  subcategory:        '',
  priority:           '',          // LLM assessment
  priority_rationale: '',

  // Follow-up rounds (Steps 3–4)
  follow_up_rounds:   [],          // [{ round, questions, answers }]
  intake_round_count: 0,

  // Final ticket
  ticket:             null,
};

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function init() {
  await prefillIdentity();
  wireEventListeners();
}

// ---------------------------------------------------------------------------
// Step 0 — Identity pre-fill
// ---------------------------------------------------------------------------
async function prefillIdentity() {
  try {
    const ctx = await fetchUserContext();

    // Pre-fill inputs if we have values
    if (ctx.displayName) setInputValue('input-name', ctx.displayName);
    if (ctx.email)       setInputValue('input-email', ctx.email);
    if (ctx.computer)    setInputValue('input-device', ctx.computer);

    // Show a hint if email looks incomplete (no domain dot)
    if (ctx.username && !ctx.email) {
      document.getElementById('email-hint').textContent =
        `We could not detect your domain. Please enter your full work email.`;
    }

    // Show username in header if we have it
    if (ctx.displayName || ctx.username) {
      document.getElementById('header-username').textContent =
        ctx.displayName || ctx.username;
    }

    // Stash raw env values in state
    state.requester_username = ctx.username || '';
    state.requester_domain   = ctx.domain   || '';
    state.affected_device    = ctx.computer || '';

  } catch (err) {
    // Non-fatal: user can fill in manually
    console.warn('Could not load user context:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------
function wireEventListeners() {

  // ── Step 0 — identity form submit ────────────────────────────────────────
  document.getElementById('form-identity').addEventListener('submit', e => {
    e.preventDefault();
    const name  = getInputValue('input-name').trim();
    const email = getInputValue('input-email').trim();

    if (!name) {
      showError('form-identity', 'Please enter your name.');
      return;
    }
    if (!email || !email.includes('@')) {
      showError('form-identity', 'Please enter a valid work email address.');
      return;
    }

    state.requester_name  = name;
    state.requester_email = email;
    state.affected_device = getInputValue('input-device').trim() || state.affected_device;
    state.user_location   = getInputValue('input-location').trim();

    showStep('issue');
  });

  // ── Step 1 — issue form submit ───────────────────────────────────────────
  document.getElementById('form-issue').addEventListener('submit', async e => {
    e.preventDefault();
    const description = getInputValue('input-description').trim();
    const urgency = document.querySelector('input[name="urgency"]:checked')?.value;

    if (!description) {
      showError('form-issue', 'Please describe your issue before continuing.');
      return;
    }
    if (!urgency) {
      showError('form-issue', 'Please select an urgency level.');
      return;
    }

    state.raw_description                  = description;
    state.requester_priority_self_reported = urgency;

    showStep('classify');
    resetLoadingState('classify');
    await runClassification();
  });

  // ── Step 1 — back button ─────────────────────────────────────────────────
  document.getElementById('btn-issue-back').addEventListener('click', () => {
    showStep('identity');
  });

  // ── Step 2 — confirm classification ─────────────────────────────────────
  document.getElementById('btn-classify-confirm').addEventListener('click', async () => {
    showStep('followup');
    resetLoadingState('followup');
    await runFollowUp();
  });

  // ── Step 2 — back ────────────────────────────────────────────────────────
  document.getElementById('btn-classify-back').addEventListener('click', () => {
    showStep('issue');
  });

  // ── Step 3 — follow-up form submit ───────────────────────────────────────
  document.getElementById('form-followup').addEventListener('submit', async e => {
    e.preventDefault();
    const answers = collectAnswers();

    // Record this round's answers
    const currentRound = state.follow_up_rounds[state.follow_up_rounds.length - 1];
    if (currentRound) {
      currentRound.answers = answers;
    }

    showStep('reflect');
    resetLoadingState('reflect');
    await runReflection();
  });

  // ── Step 4 — user confirms reflection ───────────────────────────────────
  document.getElementById('btn-reflect-yes').addEventListener('click', async () => {
    state.confirmation_status = 'confirmed';
    showStep('generating');
    await runGenerateTicket();
  });

  // ── Step 4 — user says not quite ────────────────────────────────────────
  document.getElementById('btn-reflect-no').addEventListener('click', async () => {
    if (state.intake_round_count >= MAX_ROUNDS) {
      showStep('exit');
      return;
    }
    showStep('followup');
    resetLoadingState('followup');
    await runFollowUp();
  });

  // ── Step 5 (done) — view ticket tab ─────────────────────────────────────
  document.getElementById('btn-view-ticket').addEventListener('click', () => {
    openOutputTab('ticket.html');
  });

  // ── Step 5 (done) — view payload tab ────────────────────────────────────
  document.getElementById('btn-view-payload').addEventListener('click', () => {
    openOutputTab('payload.html');
  });

  // ── Step 5 (done) — download PDF ────────────────────────────────────────
  document.getElementById('btn-download-pdf').addEventListener('click', () => {
    if (!state.ticket) return;
    // Default: no transcript. A toggle can be added in Phase 5.
    downloadTicketPDF(state.ticket, false);
  });

  // ── Step 5 (done) — start over ───────────────────────────────────────────
  document.getElementById('btn-start-over').addEventListener('click', () => {
    resetState();
    showStep('identity');
  });

  // ── Graceful exit — restart ──────────────────────────────────────────────
  document.getElementById('btn-exit-restart').addEventListener('click', () => {
    resetState();
    showStep('identity');
  });
}

// ---------------------------------------------------------------------------
// Step runners — these will call the API in Phase 3.
// For Phase 1 they are stubs that show what will happen.
// ---------------------------------------------------------------------------

async function runClassification() {
  try {
    const result = await classifyIssue(state.raw_description);
    state.category           = result.category;
    state.subcategory        = result.subcategory;
    state.priority           = result.llmPriority;
    state.priority_rationale = result.priorityRationale;

    renderClassification(result, state.requester_priority_self_reported);
  } catch (err) {
    handleStepError('classify-result', 'classify', err);
  }
}

async function runFollowUp() {
  try {
    state.intake_round_count += 1;

    const result = await fetchQuestions({
      category:     state.category,
      description:  state.raw_description,
      round:        state.intake_round_count,
      priorAnswers: state.follow_up_rounds.flatMap(r => r.answers),
    });

    // Record this round (answers will be filled in on submit)
    state.follow_up_rounds.push({
      round:     state.intake_round_count,
      questions: result.questions,
      answers:   [],
    });

    renderQuestions(result.questions, state.intake_round_count, MAX_ROUNDS);
  } catch (err) {
    handleStepError('followup-result', 'followup', err);
  }
}

async function runReflection() {
  try {
    const result = await fetchReflection({
      category:    state.category,
      description: state.raw_description,
      rounds:      state.follow_up_rounds,
    });

    renderReflection(result.summary, state.intake_round_count, MAX_ROUNDS);
  } catch (err) {
    handleStepError('reflect-result', 'reflect', err);
  }
}

async function runGenerateTicket() {
  try {
    const ticket = await generateTicket(buildIntakePayload());
    state.ticket = ticket;

    // Store in localStorage so output tabs can read it
    localStorage.setItem('helpdesk_ticket', JSON.stringify(ticket));

    // Render done state
    document.getElementById('done-ticket-id').textContent = ticket.ticket_id || 'INC-000000';
    document.getElementById('done-email').textContent      = state.requester_email;

    showStep('done');
  } catch (err) {
    // Fall back to issue step with error
    showStep('issue');
    showError('form-issue', `Ticket generation failed: ${err.message}. Please try again.`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildIntakePayload() {
  return {
    requester_name:                    state.requester_name,
    requester_email:                   state.requester_email,
    requester_username:                state.requester_username,
    requester_domain:                  state.requester_domain,
    raw_description:                   state.raw_description,
    category:                          state.category,
    subcategory:                       state.subcategory,
    priority:                          state.priority,
    priority_rationale:                state.priority_rationale,
    requester_priority_self_reported:  state.requester_priority_self_reported,
    affected_device:                   state.affected_device,
    user_location:                     state.user_location,
    follow_up_rounds:                  state.follow_up_rounds,
    intake_round_count:                state.intake_round_count,
    confirmation_status:               state.confirmation_status || 'confirmed',
  };
}

function openOutputTab(page) {
  window.open(`/${page}`, '_blank');
}

function resetState() {
  Object.assign(state, {
    requester_name: '', requester_email: '', raw_description: '',
    requester_priority_self_reported: '', category: '', subcategory: '',
    priority: '', priority_rationale: '', follow_up_rounds: [],
    intake_round_count: 0, ticket: null, confirmation_status: '',
  });
  localStorage.removeItem('helpdesk_ticket');
}

function handleStepError(resultContainerId, stepName, err) {
  // Show the result container so the error is visible
  document.getElementById(`${stepName}-loading`)?.classList.add('hidden');
  document.getElementById(resultContainerId)?.classList.remove('hidden');
  showError(resultContainerId, `Something went wrong: ${err.message}`);
  console.error(`[${stepName}]`, err);
}

function getInputValue(id) {
  return document.getElementById(id)?.value ?? '';
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
init();
