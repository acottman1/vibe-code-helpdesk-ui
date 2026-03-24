// payload.js — Renders the mock API JSON payload in payload.html

function init() {
  const raw = localStorage.getItem('helpdesk_ticket');

  if (!raw) {
    document.getElementById('payload-content').textContent =
      '// No ticket data found.\n// Please complete the intake form first.';
    return;
  }

  let ticket;
  try {
    ticket = JSON.parse(raw);
  } catch {
    document.getElementById('payload-content').textContent =
      '// Could not parse ticket data.';
    return;
  }

  document.title = `${ticket.ticket_id || 'Payload'} — Mock API Payload`;
  renderPayload(ticket);
  wireEvents(raw);
}

function renderPayload(ticket) {
  const pretty = JSON.stringify(ticket, null, 2);
  const highlighted = syntaxHighlight(pretty);
  document.getElementById('payload-content').innerHTML = highlighted;
}

function wireEvents(rawJson) {
  document.getElementById('btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      const btn = document.getElementById('btn-copy');
      const original = btn.innerHTML;
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Copied!
      `;
      setTimeout(() => { btn.innerHTML = original; }, 2000);
    } catch {
      alert('Copy failed — please select and copy manually.');
    }
  });
}

/**
 * Very lightweight JSON syntax highlighter.
 * Wraps keys, strings, numbers, booleans, and null in styled spans.
 */
function syntaxHighlight(json) {
  // Escape HTML first
  json = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    match => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

init();
