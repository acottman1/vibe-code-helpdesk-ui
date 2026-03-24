// ui.js — DOM rendering helpers
// Pure functions: receive data, return or mutate DOM, no state.

const CATEGORY_META = {
  login_access:         { label: 'Login & Access',          icon: '🔐' },
  email_collab:         { label: 'Email & Collaboration',   icon: '📧' },
  network_connectivity: { label: 'Network & Connectivity',  icon: '🌐' },
  files_drives:         { label: 'Files & Shared Drives',   icon: '📁' },
  device_workstation:   { label: 'Device & Workstation',    icon: '💻' },
  software_apps:        { label: 'Software & Applications', icon: '⚙️' },
};

/**
 * Show one step, hide all others.
 * @param {string} stepName — matches data-step attribute
 */
export function showStep(stepName) {
  document.querySelectorAll('.step').forEach(el => {
    el.classList.toggle('is-active', el.dataset.step === stepName);
  });
  // Scroll to top of page when switching steps
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Render the category badge and priority comparison after classification.
 * @param {{ category, categoryLabel, subcategory, llmPriority, priorityRationale }} data
 * @param {string} selfReportedPriority
 */
export function renderClassification(data, selfReportedPriority) {
  // Hide loading, show result
  document.getElementById('classify-loading').classList.add('hidden');
  document.getElementById('classify-result').classList.remove('hidden');

  // Category badge
  const meta = CATEGORY_META[data.category] || { label: data.categoryLabel || data.category, icon: '🎫' };
  document.getElementById('category-display').innerHTML = `
    <div class="category-badge">
      <span class="category-badge__icon" aria-hidden="true">${meta.icon}</span>
      <span>${meta.label}</span>
      ${data.subcategory ? `<span style="opacity:0.6">— ${data.subcategory}</span>` : ''}
    </div>
  `;

  // Priority comparison
  const llp = (data.llmPriority || '').toLowerCase();
  document.getElementById('priority-comparison').innerHTML = `
    <div class="priority-block">
      <p class="priority-block__label">Your assessment</p>
      <p class="priority-block__value priority--${selfReportedPriority.toLowerCase()}">${selfReportedPriority}</p>
    </div>
    <div class="priority-block">
      <p class="priority-block__label">System assessment</p>
      <p class="priority-block__value priority--${llp}">${data.llmPriority || '—'}</p>
      <p class="priority-block__rationale">${data.priorityRationale || ''}</p>
    </div>
  `;
}

/**
 * Render follow-up questions as labeled text inputs.
 * @param {string[]} questions
 * @param {number} roundNumber
 * @param {number} maxRounds
 */
export function renderQuestions(questions, roundNumber, maxRounds) {
  document.getElementById('followup-loading').classList.add('hidden');
  document.getElementById('followup-result').classList.remove('hidden');

  // Round badge
  document.getElementById('round-badge-container').innerHTML = `
    <div class="round-badge">
      Round ${roundNumber} of ${maxRounds}
    </div>
  `;

  // Question inputs
  const list = document.getElementById('questions-list');
  list.innerHTML = questions.map((q, i) => `
    <div class="question-item">
      <label class="question-item__label" for="q-${i}">
        <span class="question-item__number" aria-hidden="true">${i + 1}</span>${q}
      </label>
      <textarea
        class="form-textarea"
        id="q-${i}"
        name="q-${i}"
        rows="2"
        placeholder="Your answer…"
        data-question="${escapeAttr(q)}"
      ></textarea>
    </div>
  `).join('');
}

/**
 * Collect answers from the follow-up form.
 * @returns {Array<{ question: string, answer: string }>}
 */
export function collectAnswers() {
  const textareas = document.querySelectorAll('#questions-list textarea');
  return Array.from(textareas).map(ta => ({
    question: ta.dataset.question,
    answer: ta.value.trim(),
  }));
}

/**
 * Render the reflection summary card.
 * @param {string} summaryText
 * @param {number} roundNumber
 * @param {number} maxRounds
 */
export function renderReflection(summaryText, roundNumber, maxRounds) {
  document.getElementById('reflect-loading').classList.add('hidden');
  document.getElementById('reflect-result').classList.remove('hidden');

  document.getElementById('reflection-text').textContent = summaryText;

  const remaining = maxRounds - roundNumber;
  const counterEl = document.getElementById('round-counter-text');
  if (remaining > 0) {
    counterEl.textContent = `If this doesn't look right, we can ask up to ${remaining} more round${remaining > 1 ? 's' : ''} of questions.`;
  } else {
    counterEl.textContent = `This is the last round of clarifications available.`;
  }
}

/**
 * Reset loading states for a step (hide result, show spinner).
 * @param {'classify'|'followup'|'reflect'} step
 */
export function resetLoadingState(step) {
  document.getElementById(`${step}-loading`).classList.remove('hidden');
  document.getElementById(`${step}-result`).classList.add('hidden');
}

/**
 * Remove all inline error messages from the page.
 * Called on every step transition so errors don't bleed across steps.
 */
export function clearErrors() {
  document.querySelectorAll('.inline-error').forEach(el => el.remove());
}

/**
 * Show an inline error message near a button or form.
 * @param {string} containerId — element to append error to
 * @param {string} message
 */
export function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Remove any existing error
  const existing = container.querySelector('.inline-error');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.className = 'inline-error';
  div.setAttribute('role', 'alert');
  div.style.cssText = `
    margin-top: var(--space-4);
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-danger-light);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-md);
    color: var(--color-danger);
    font-size: var(--text-sm);
  `;
  div.textContent = message;
  container.appendChild(div);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
