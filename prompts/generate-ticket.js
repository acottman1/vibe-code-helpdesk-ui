// generate-ticket.js — Prompt template for final structured ticket generation
// Used by server.js /api/generate-ticket in Phase 3.

/**
 * Build the ticket generation prompt.
 * @param {object} intakeData — full intake state payload from app.js
 * @returns {string[]} — messages array for OpenAI chat completion
 */
function buildGenerateTicketPrompt(intakeData) {
  const qaContext = (intakeData.follow_up_rounds || []).flatMap(r =>
    r.answers.map(a => `Q: ${a.question}\nA: ${a.answer}`)
  ).join('\n\n');

  const ROUTING_MAP = {
    login_access:         'Identity & Access Management',
    email_collab:         'Collaboration Tools Support',
    network_connectivity: 'Network & Remote Access Support',
    files_drives:         'Storage & File Services',
    device_workstation:   'End User Computing',
    software_apps:        'Application Support',
  };

  const defaultRouting = ROUTING_MAP[intakeData.category] || 'Level 1 Support';

  return [
    {
      role: 'system',
      content: `You are an IT help desk intake assistant. Based on all collected information, generate a complete, structured IT support ticket.

Rules:
- Be specific and factual — use only information provided.
- Do not invent details not present in the intake data.
- Write in third person (e.g. "Employee reports…").
- Keep issue_summary to one clear sentence (under 100 characters).
- detailed_description should be 2–4 sentences.
- business_impact should be one sentence.
- Respond with a single valid JSON object only. No markdown, no explanation, no code fences.

Required output format (all fields must be present):
{
  "ticket_id": "<generated: INC- followed by 6 random digits>",
  "timestamp": "<current ISO 8601 timestamp>",
  "requester_name": "<string>",
  "requester_email": "<string>",
  "category": "<string>",
  "subcategory": "<string>",
  "priority": "<Low|Medium|High|Critical>",
  "priority_rationale": "<string>",
  "requester_priority_self_reported": "<string>",
  "business_impact": "<string>",
  "issue_started_at": "<string — when user says issue began, or empty string if not provided>",
  "affected_service": "<string>",
  "affected_device": "<string>",
  "user_location": "<string>",
  "single_or_multi_user": "<Just me|Multiple people affected>",
  "issue_summary": "<string>",
  "detailed_description": "<string>",
  "routing_team": "<string>",
  "follow_up_rounds": <copy from input>,
  "intake_round_count": <number>,
  "confirmation_status": "<string>",
  "raw_description": "<string>"
}`,
    },
    {
      role: 'user',
      content: `Generate a structured IT support ticket from the following intake data.

Requester: ${intakeData.requester_name} <${intakeData.requester_email}>
Device: ${intakeData.affected_device || 'unknown'}
Location: ${intakeData.user_location || 'unknown'}

Original description: "${intakeData.raw_description}"
Issue started: ${intakeData.issue_started_at || 'not provided'}

Category: ${intakeData.category}
Subcategory: ${intakeData.subcategory || 'unknown'}
LLM Priority: ${intakeData.priority}
Priority rationale: ${intakeData.priority_rationale}
Self-reported urgency: ${intakeData.requester_priority_self_reported}

Follow-up Q&A:
${qaContext || '(none)'}

Default routing team: ${defaultRouting}
Intake rounds: ${intakeData.intake_round_count}
Confirmation: ${intakeData.confirmation_status}`,
    },
  ];
}

module.exports = { buildGenerateTicketPrompt };
