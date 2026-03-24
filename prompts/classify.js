// classify.js — Prompt template for issue classification
// Used by server.js /api/classify in Phase 3.

const CATEGORIES = [
  { key: 'login_access',         label: 'Login & Access' },
  { key: 'email_collab',         label: 'Email & Collaboration' },
  { key: 'network_connectivity', label: 'Network & Connectivity' },
  { key: 'files_drives',         label: 'Files & Shared Drives' },
  { key: 'device_workstation',   label: 'Device & Workstation' },
  { key: 'software_apps',        label: 'Software & Applications' },
];

/**
 * Build the classification prompt.
 * @param {string} description — raw user issue description
 * @returns {string[]} — messages array for OpenAI chat completion
 */
function buildClassifyPrompt(description) {
  const categoryList = CATEGORIES.map(c => `- ${c.key}: ${c.label}`).join('\n');

  return [
    {
      role: 'system',
      content: `You are an IT help desk intake assistant. Your job is to classify employee-reported IT issues into structured categories and assess their priority.

You must respond with a single valid JSON object. No markdown, no explanation, no code fences — only the JSON object.

Available categories:
${categoryList}

Priority levels: Low, Medium, High, Critical

Output format:
{
  "category": "<one of the category keys above>",
  "categoryLabel": "<human-readable label>",
  "subcategory": "<brief specific subcategory, e.g. 'VPN access' or 'Outlook not loading'>",
  "llmPriority": "<Low|Medium|High|Critical>",
  "priorityRationale": "<one sentence explaining the priority assessment>"
}`,
    },
    {
      role: 'user',
      content: `Classify this IT issue:\n\n"${description}"`,
    },
  ];
}

module.exports = { buildClassifyPrompt, CATEGORIES };
