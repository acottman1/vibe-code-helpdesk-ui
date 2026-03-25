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

  // Category badge (with Change button)
  renderCategoryBadge(data.category, data.subcategory);

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
 * Render (or re-render) just the category badge and Change button.
 * Called by renderClassification and after a category override.
 * @param {string} categoryKey
 * @param {string} subcategory
 * @param {string} [displayLabelOverride] — shown in badge instead of canonical label (e.g. 'Other')
 */
export function renderCategoryBadge(categoryKey, subcategory, displayLabelOverride) {
  const meta = CATEGORY_META[categoryKey] || { label: displayLabelOverride || categoryKey, icon: '🎫' };
  const label = displayLabelOverride || meta.label;
  document.getElementById('category-display').innerHTML = `
    <div style="display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap;">
      <div class="category-badge">
        <span class="category-badge__icon" aria-hidden="true">${meta.icon}</span>
        <span>${label}</span>
        ${subcategory ? `<span style="opacity:0.6">— ${subcategory}</span>` : ''}
      </div>
      <button type="button" class="btn btn--ghost btn--sm" id="btn-change-category">
        Change
      </button>
    </div>
  `;
}

/**
 * Open the category-override modal.
 * @param {string} currentKey — currently selected category key
 * @param {function(string)} onConfirm — called with selected key or 'other'
 */
export function openCategoryModal(currentKey, onConfirm) {
  const ALL_CATEGORIES = [
    { key: 'login_access',         label: 'Login & Access',          icon: '🔐' },
    { key: 'email_collab',         label: 'Email & Collaboration',   icon: '📧' },
    { key: 'network_connectivity', label: 'Network & Connectivity',  icon: '🌐' },
    { key: 'files_drives',         label: 'Files & Shared Drives',   icon: '📁' },
    { key: 'device_workstation',   label: 'Device & Workstation',    icon: '💻' },
    { key: 'software_apps',        label: 'Software & Applications', icon: '⚙️' },
    { key: 'other',                label: 'Other',                   icon: '🎫' },
  ];

  // Remove any existing modal
  document.getElementById('category-modal-overlay')?.remove();

  let selectedKey = currentKey;

  function buildOptions(filter) {
    const lower = (filter || '').toLowerCase();
    const visible = lower
      ? ALL_CATEGORIES.filter(c => c.label.toLowerCase().includes(lower))
      : ALL_CATEGORIES;

    if (visible.length === 0) {
      return `<p class="modal-no-results">No matching categories</p>`;
    }
    return visible.map(c => `
      <div class="category-option ${c.key === selectedKey ? 'is-selected' : ''}"
           role="option"
           aria-selected="${c.key === selectedKey}"
           data-key="${c.key}">
        <span class="category-option__icon">${c.icon}</span>
        <span class="category-option__name">${c.label}</span>
        ${c.key === selectedKey ? '<span class="category-option__check">✓</span>' : ''}
      </div>
    `).join('');
  }

  const overlay = document.createElement('div');
  overlay.id = 'category-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__header">
        <h2 class="modal__title">Change Category</h2>
        <button class="modal__close" id="modal-close-btn" aria-label="Close">✕</button>
      </div>
      <div class="modal__search">
        <input type="text" class="form-input" id="modal-search-input"
               placeholder="Search categories…" autocomplete="off" />
      </div>
      <div class="modal__list" id="modal-category-list" role="listbox">
        ${buildOptions('')}
      </div>
      <div class="modal__footer">
        <button class="btn btn--secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn--primary" id="modal-confirm-btn">Confirm selection</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const list     = overlay.querySelector('#modal-category-list');
  const search   = overlay.querySelector('#modal-search-input');

  function wireItems() {
    list.querySelectorAll('.category-option').forEach(el => {
      el.addEventListener('click', () => {
        selectedKey = el.dataset.key;
        list.innerHTML = buildOptions(search.value);
        wireItems();
      });
    });
  }
  wireItems();

  search.addEventListener('input', () => {
    list.innerHTML = buildOptions(search.value);
    wireItems();
  });

  function closeModal() { overlay.remove(); }

  overlay.querySelector('#modal-close-btn').addEventListener('click', closeModal);
  overlay.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  overlay.querySelector('#modal-confirm-btn').addEventListener('click', () => {
    if (selectedKey) onConfirm(selectedKey);
    closeModal();
  });

  // Escape key closes
  function onKeyDown(e) {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKeyDown); }
  }
  document.addEventListener('keydown', onKeyDown);

  setTimeout(() => search.focus(), 50);
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
