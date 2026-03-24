// questions.js — Prompt template for follow-up question generation
// Used by server.js /api/questions in Phase 3.

// Per-category question banks give the LLM a starting scaffold.
// The model can adapt these based on prior answers and round number.
const QUESTION_HINTS = {
  login_access: [
    'Which system or application are you unable to log into?',
    'Are you seeing an error message? If so, what does it say?',
    'Did this start after a password change or account update?',
    'Are you able to log in on a different device or browser?',
    'Has your account been locked, or does it just fail silently?',
  ],
  email_collab: [
    'Which email or collaboration tool is affected (Outlook, Teams, Gmail, etc.)?',
    'Is the issue with sending, receiving, or accessing the application at all?',
    'Are you getting a specific error message?',
    'Are other people on your team experiencing the same issue?',
    'Did this start after a system update or change to your account settings?',
  ],
  network_connectivity: [
    'Are you unable to reach all websites, or specific ones?',
    'Are you working from the office, home, or another location?',
    'Are you connected via Wi-Fi or a wired (ethernet) connection?',
    'Are other devices on the same network also affected?',
    'Are you using a VPN? If so, does disconnecting from VPN change anything?',
  ],
  files_drives: [
    'Which file or drive are you trying to access (e.g. a specific shared folder or network drive)?',
    'Are you getting an error message, or does the file/drive simply not appear?',
    'Were you able to access this file or drive before? If so, when did it stop working?',
    'Are other people also unable to access the same file or drive?',
    'Are you working from the office or remotely?',
  ],
  device_workstation: [
    'What exactly is the device doing — or not doing?',
    'When did the issue start, and did anything change around that time (update, drop, spill)?',
    'Is the device completely unusable, or is the problem specific to certain functions?',
    'Have you tried restarting the device?',
    'Is this a company-issued device?',
  ],
  software_apps: [
    'Which application or software is affected?',
    'What exactly happens — does it crash, show an error, or simply not open?',
    'Did this start after a recent update or installation?',
    'Does the issue happen every time, or only sometimes?',
    'Are other people on your team experiencing the same issue with this application?',
  ],
};

/**
 * Build the follow-up questions prompt.
 * @param {{ category, description, round, priorAnswers }} payload
 * @returns {string[]} — messages array for OpenAI chat completion
 */
function buildQuestionsPrompt({ category, description, round, priorAnswers }) {
  const hints = QUESTION_HINTS[category] || [];
  const priorContext = priorAnswers && priorAnswers.length > 0
    ? `\n\nPrevious answers already collected:\n${priorAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}`
    : '';

  return [
    {
      role: 'system',
      content: `You are an IT help desk intake assistant. Your job is to ask a small number of targeted follow-up questions to clarify an employee's IT issue.

Rules:
- Generate between 3 and 5 questions. Never more than 5.
- Questions should be short, plain-language, and easy to answer.
- Do NOT ask questions already answered in prior rounds.
- Do NOT try to diagnose or fix the issue — only gather information.
- Focus on what a support technician would need to know to route and resolve the ticket.
- Respond with a single valid JSON object only. No markdown, no explanation.

Output format:
{
  "questions": ["question 1", "question 2", "question 3"]
}

Suggested question themes for category '${category}':
${hints.map(h => `- ${h}`).join('\n')}`,
    },
    {
      role: 'user',
      content: `Issue description: "${description}"

Category: ${category}
Round: ${round}${priorContext}

Generate ${round === 1 ? 'the first set of' : 'additional'} follow-up questions to clarify this issue.`,
    },
  ];
}

module.exports = { buildQuestionsPrompt };
