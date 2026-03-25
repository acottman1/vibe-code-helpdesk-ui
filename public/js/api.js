// api.js — All fetch() calls to the backend
// Each function returns a parsed JSON object or throws an Error.

/**
 * Fetch pre-filled identity data from Windows environment variables.
 * @returns {{ username, domain, computer, displayName, email }}
 */
export async function fetchUserContext() {
  const res = await fetch('/api/user-context');
  if (!res.ok) throw new Error('Could not load user context');
  return res.json();
}

/**
 * Classify a raw issue description into one of 6 categories.
 * @param {string} description
 * @returns {{ category, categoryLabel, subcategory, llmPriority, priorityRationale }}
 */
export async function classifyIssue(description) {
  const res = await fetch('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Classification failed (${res.status})`);
  }
  return res.json();
}

/**
 * Generate follow-up questions for a given category and context.
 * @param {{ category, description, round, priorAnswers }} payload
 * @returns {{ questions: string[] }}
 */
export async function fetchQuestions(payload) {
  const res = await fetch('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Question generation failed (${res.status})`);
  }
  return res.json();
}

/**
 * Generate a reflection summary from all collected answers so far.
 * @param {{ category, description, rounds }} payload
 * @returns {{ summary: string }}
 */
export async function fetchReflection(payload) {
  const res = await fetch('/api/reflect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Reflection failed (${res.status})`);
  }
  return res.json();
}

/**
 * Generate the final structured ticket.
 * @param {object} intakeData — full intake state object
 * @returns {object} — complete ticket matching the controlled schema
 */
export async function generateTicket(intakeData) {
  const res = await fetch('/api/generate-ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intakeData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Ticket generation failed (${res.status})`);
  }
  return res.json();
}
