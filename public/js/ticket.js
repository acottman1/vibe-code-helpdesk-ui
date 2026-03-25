// ticket.js — Renders the structured ticket view in ticket.html
// Reads ticket data from localStorage, written there by app.js at ticket generation.

const CATEGORY_LABELS = {
  login_access:         'Login & Access',
  email_collab:         'Email & Collaboration',
  network_connectivity: 'Network & Connectivity',
  files_drives:         'Files & Shared Drives',
  device_workstation:   'Device & Workstation',
  software_apps:        'Software & Applications',
};

function init() {
  const raw = localStorage.getItem('helpdesk_ticket');

  if (!raw) {
    showError('No ticket data found. Please complete the intake form first.');
    return;
  }

  let ticket;
  try {
    ticket = JSON.parse(raw);
  } catch {
    showError('Ticket data could not be read. Please try again.');
    return;
  }

  render(ticket);
}

function render(t) {
  document.title = `${t.ticket_id || 'Ticket'} — IT Support`;

  const priorityClass = `priority-pill--${(t.priority || 'low').toLowerCase()}`;

  const html = `
    <div class="ticket-document__header">
      <div class="ticket-document__header-left">
        <p class="ticket-document__org">Hokie Hackers — IT Help Desk</p>
        <h1 class="ticket-document__title">${esc(t.issue_summary || 'Support Request')}</h1>
        <p class="ticket-document__id">${esc(t.ticket_id || '')} &nbsp;·&nbsp; ${formatTs(t.timestamp)}</p>
      </div>
      <div class="ticket-document__header-right">
        <span class="ticket-document__status-badge">New · Pending Assignment</span>
        <span class="priority-pill ticket-document__header-priority ${priorityClass}">${esc(t.priority || '—')}</span>
      </div>
    </div>

    <div class="ticket-document__body">

      <!-- Requester -->
      <div class="ticket-section">
        <p class="ticket-section__title">Requester</p>
        <div class="ticket-fields">
          <div class="ticket-field">
            <span class="ticket-field__label">Name</span>
            <span class="ticket-field__value">${esc(t.requester_name || '—')}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Email</span>
            <span class="ticket-field__value">${esc(t.requester_email || '—')}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Device</span>
            <span class="ticket-field__value ticket-field__value--mono">${esc(t.affected_device || '—')}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Location</span>
            <span class="ticket-field__value">${esc(t.user_location || '—')}</span>
          </div>
        </div>
      </div>

      <!-- Classification -->
      <div class="ticket-section">
        <p class="ticket-section__title">Classification</p>
        <div class="ticket-fields">
          <div class="ticket-field">
            <span class="ticket-field__label">Category</span>
            <span class="ticket-field__value">${esc(CATEGORY_LABELS[t.category] || t.category || '—')}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Subcategory</span>
            <span class="ticket-field__value">${esc(t.subcategory || '—')}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Issue Started</span>
            <span class="ticket-field__value">${esc(t.issue_started_at || '—')}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Affected Service</span>
            <span class="ticket-field__value">${esc(t.affected_service || '—')}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Scope</span>
            <span class="ticket-field__value">${esc(t.single_or_multi_user || '—')}</span>
          </div>
        </div>
      </div>

      <!-- Priority -->
      <div class="ticket-section">
        <p class="ticket-section__title">Priority & Impact</p>
        <div class="ticket-fields">
          <div class="ticket-field">
            <span class="ticket-field__label">Priority</span>
            <span class="ticket-field__value">
              <span class="priority-pill ${priorityClass}">${esc(t.priority || '—')}</span>
            </span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Requester-reported urgency</span>
            <span class="ticket-field__value">${esc(t.requester_priority_self_reported || '—')}</span>
          </div>
          <div class="ticket-field" style="grid-column: 1 / -1;">
            <span class="ticket-field__label">Priority rationale</span>
            <span class="ticket-field__value">${esc(t.priority_rationale || '—')}</span>
          </div>
          <div class="ticket-field" style="grid-column: 1 / -1;">
            <span class="ticket-field__label">Business impact</span>
            <span class="ticket-field__value">${esc(t.business_impact || '—')}</span>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="ticket-section">
        <p class="ticket-section__title">Description</p>
        <div class="ticket-fields ticket-fields--full">
          <div class="ticket-field">
            <span class="ticket-field__label">Detailed description</span>
            <span class="ticket-field__value">${esc(t.detailed_description || '—')}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Original description (verbatim)</span>
            <span class="ticket-field__value" style="color: var(--color-text-secondary); font-style: italic;">${esc(t.raw_description || '—')}</span>
          </div>
        </div>
      </div>

      <!-- Routing -->
      <div class="ticket-section">
        <p class="ticket-section__title">Routing</p>
        <div class="ticket-fields">
          <div class="ticket-field">
            <span class="ticket-field__label">Assigned team</span>
            <span class="ticket-field__value">${esc(t.routing_team || '—')}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Intake rounds</span>
            <span class="ticket-field__value">${t.intake_round_count ?? '—'}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Confirmation status</span>
            <span class="ticket-field__value">${esc(t.confirmation_status || '—')}</span>
          </div>
          <div class="ticket-field">
            <span class="ticket-field__label">Timestamp</span>
            <span class="ticket-field__value ticket-field__value--mono">${formatTs(t.timestamp)}</span>
          </div>
        </div>
      </div>

      <!-- Q&A Transcript -->
      ${renderTranscript(t.follow_up_rounds)}

    </div>
  `;

  document.getElementById('ticket-loading').classList.add('hidden');
  const content = document.getElementById('ticket-content');
  content.classList.remove('hidden');
  content.innerHTML = html;
}

function renderTranscript(rounds) {
  if (!rounds || rounds.length === 0) return '';

  const roundsHtml = rounds.map(round => {
    const pairs = (round.answers || []).map(qa => `
      <div class="qa-pair">
        <span class="qa-pair__question">${esc(qa.question)}</span>
        <span class="qa-pair__answer">${esc(qa.answer || '(no answer provided)')}</span>
      </div>
    `).join('');

    return `
      <div class="qa-round">
        <p class="qa-round__label">Round ${round.round}</p>
        ${pairs}
      </div>
    `;
  }).join('');

  return `
    <div class="ticket-section">
      <p class="ticket-section__title">Intake Q&A Transcript</p>
      ${roundsHtml}
    </div>
  `;
}

function showError(message) {
  document.getElementById('ticket-loading').classList.add('hidden');
  const content = document.getElementById('ticket-content');
  content.classList.remove('hidden');
  content.innerHTML = `
    <div style="padding: var(--space-8); color: var(--color-danger); font-size: var(--text-sm);">
      ⚠️ ${esc(message)}
    </div>
  `;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTs(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
}

init();
