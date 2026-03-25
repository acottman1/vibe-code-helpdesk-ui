// pdf.js — jsPDF ticket summary generation
// Runs entirely in the browser. No server involvement.

/**
 * Generate and download a PDF summary of the ticket.
 * @param {object} ticket — the full ticket object from the controlled schema
 * @param {boolean} includeTranscript — whether to append Q&A at the bottom
 */
export function downloadTicketPDF(ticket, includeTranscript = false) {
  // jsPDF is loaded via CDN script tag in index.html as window.jspdf
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const pageW   = doc.internal.pageSize.getWidth();
  const marginL = 48;
  const marginR = 48;
  const contentW = pageW - marginL - marginR;
  let y = 48; // current y cursor

  // ── Helpers ──────────────────────────────────────────────────────────────

  function addPage() {
    doc.addPage();
    y = 48;
  }

  function checkPageBreak(neededHeight = 40) {
    if (y + neededHeight > doc.internal.pageSize.getHeight() - 48) {
      addPage();
    }
  }

  function drawText(text, x, fontSize, fontStyle = 'normal', color = [17, 24, 39]) {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || ''), contentW - (x - marginL));
    doc.text(lines, x, y);
    y += lines.length * (fontSize * 1.4);
    return lines.length;
  }

  function drawSectionRule() {
    checkPageBreak(24);
    y += 8;
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.line(marginL, y, pageW - marginR, y);
    y += 16;
  }

  function drawField(label, value, indentX = marginL) {
    if (!value) return;
    checkPageBreak(40);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(label.toUpperCase(), indentX, y);
    y += 13;
    drawText(value, indentX, 10, 'normal', [17, 24, 39]);
    y += 6;
  }

  // ── Header band ──────────────────────────────────────────────────────────

  // VT Maroon header rectangle
  doc.setFillColor(134, 31, 65); // VT Chicago Maroon
  doc.rect(0, 0, pageW, 72, 'F');
  // VT Burnt Orange accent strip
  doc.setFillColor(229, 117, 31);
  doc.rect(0, 72, pageW, 4, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 200, 170); // warm tint on maroon
  doc.text('HOKIE HACKERS — IT HELP DESK', marginL, 26);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(ticket.issue_summary || 'Support Request', marginL, 46);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 210, 255);
  doc.text(`${ticket.ticket_id || ''}   ·   ${formatTimestamp(ticket.timestamp)}`, marginL, 62);

  y = 100;

  // ── Requester ────────────────────────────────────────────────────────────

  drawText('Requester Information', marginL, 11, 'bold', [17, 24, 39]);
  y += 4;
  drawSectionRule();

  drawField('Name',   ticket.requester_name);
  drawField('Email',  ticket.requester_email);
  drawField('Device', ticket.affected_device);
  drawField('Location', ticket.user_location);

  y += 8;

  // ── Issue ────────────────────────────────────────────────────────────────

  drawText('Issue Details', marginL, 11, 'bold', [17, 24, 39]);
  y += 4;
  drawSectionRule();

  drawField('Category',    ticket.category ? labelFromCategory(ticket.category) : '');
  drawField('Subcategory', ticket.subcategory);
  drawField('Issue started', ticket.issue_started_at);
  drawField('Affected Service / System', ticket.affected_service);
  drawField('Who is affected', ticket.single_or_multi_user);

  y += 8;

  // ── Priority & Impact ────────────────────────────────────────────────────

  drawText('Priority & Business Impact', marginL, 11, 'bold', [17, 24, 39]);
  y += 4;
  drawSectionRule();

  drawField('Priority (System)',        ticket.priority);
  drawField('Priority Rationale',       ticket.priority_rationale);
  drawField('Your reported urgency',    ticket.requester_priority_self_reported);
  drawField('Business impact',          ticket.business_impact);

  y += 8;

  // ── Description ──────────────────────────────────────────────────────────

  drawText('Description', marginL, 11, 'bold', [17, 24, 39]);
  y += 4;
  drawSectionRule();

  drawField('Detailed description', ticket.detailed_description);
  drawField('Routing team',         ticket.routing_team);

  // ── Optional transcript ───────────────────────────────────────────────────

  if (includeTranscript && ticket.follow_up_rounds && ticket.follow_up_rounds.length > 0) {
    y += 8;
    checkPageBreak(48);
    drawText('Intake Q&A Transcript', marginL, 11, 'bold', [17, 24, 39]);
    y += 4;
    drawSectionRule();

    ticket.follow_up_rounds.forEach(round => {
      checkPageBreak(32);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(107, 114, 128);
      doc.text(`ROUND ${round.round}`, marginL, y);
      y += 16;

      round.answers.forEach(qa => {
        checkPageBreak(48);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(107, 114, 128);
        const qLines = doc.splitTextToSize(`Q: ${qa.question}`, contentW);
        doc.text(qLines, marginL, y);
        y += qLines.length * 12 + 4;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(17, 24, 39);
        const aLines = doc.splitTextToSize(`A: ${qa.answer || '(no answer provided)'}`, contentW);
        doc.text(aLines, marginL, y);
        y += aLines.length * 12 + 10;
      });
    });
  }

  // ── Footer on each page ───────────────────────────────────────────────────

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`IT Help Desk Intake Assistant — Prototype`, marginL, pageH - 24);
    doc.text(`Page ${p} of ${totalPages}`, pageW - marginR, pageH - 24, { align: 'right' });
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const safeId = (ticket.ticket_id || 'ticket').replace(/[^a-z0-9-]/gi, '-');
  doc.save(`${safeId}-summary.pdf`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function labelFromCategory(key) {
  const map = {
    login_access:         'Login & Access',
    email_collab:         'Email & Collaboration',
    network_connectivity: 'Network & Connectivity',
    files_drives:         'Files & Shared Drives',
    device_workstation:   'Device & Workstation',
    software_apps:        'Software & Applications',
  };
  return map[key] || key;
}
