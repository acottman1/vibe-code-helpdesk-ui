// reflect.js — Prompt template for the reflection summary
// Used by server.js /api/reflect in Phase 3.

/**
 * Build the reflection prompt.
 * @param {{ category, description, rounds }} payload
 * @returns {string[]} — messages array for OpenAI chat completion
 */
function buildReflectPrompt({ category, description, rounds }) {
  const qaContext = rounds.flatMap(r =>
    r.answers.map(a => `Q: ${a.question}\nA: ${a.answer}`)
  ).join('\n\n');

  return [
    {
      role: 'system',
      content: `You are an IT help desk intake assistant. Based on the employee's original description and their answers to follow-up questions, write a clear, plain-language summary of the issue.

Rules:
- Start with "It sounds like you need help with..."
- Be specific — include the affected system, the symptom, and any relevant context from their answers.
- Keep it to 2–4 sentences maximum.
- Do not diagnose or suggest fixes.
- Write in second person (you/your).
- Respond with a single valid JSON object only. No markdown, no explanation.

Output format:
{
  "summary": "<your plain-language summary here>"
}`,
    },
    {
      role: 'user',
      content: `Original description: "${description}"

Category: ${category}

Follow-up Q&A:
${qaContext || '(No answers collected yet)'}

Write a summary of this employee's IT issue.`,
    },
  ];
}

module.exports = { buildReflectPrompt };
