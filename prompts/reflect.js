// reflect.js — Prompt template for the reflection summary
// Used by server.js /api/reflect in Phase 3.

/**
 * Build the reflection prompt.
 * @param {{ category, description, rounds }} payload
 * @returns {string[]} — messages array for OpenAI chat completion
 */
function buildReflectPrompt({ category, description, rounds }) {
  const qaContext = rounds.map(r => {
    const pairs = r.answers
      .filter(a => a.answer && a.answer.trim())
      .map(a => `  Q: ${a.question}\n  A: ${a.answer}`)
      .join('\n\n');
    return pairs ? `Round ${r.round}:\n${pairs}` : null;
  }).filter(Boolean).join('\n\n');

  return [
    {
      role: 'system',
      content: `You are an IT help desk intake assistant. Based on the employee's original description and ALL of their follow-up answers across every round, write a clear, plain-language summary of the issue.

Rules:
- Start with "It sounds like you need help with..."
- Synthesize ALL rounds of Q&A — do not focus only on the most recent round.
- Be specific — include the affected system, the symptom, when it started, and any other relevant details the employee provided.
- Write as many sentences as the collected information warrants. More information collected = more detailed summary.
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

Follow-up Q&A (all rounds):
${qaContext || '(No answers collected yet)'}

Write a thorough summary of this employee's IT issue, incorporating details from every round above.`,
    },
  ];
}

module.exports = { buildReflectPrompt };
