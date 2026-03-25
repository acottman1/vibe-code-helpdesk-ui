require('dotenv').config();

const express = require('express');
const path    = require('path');
const OpenAI  = require('openai');

const { buildClassifyPrompt }       = require('./prompts/classify');
const { buildQuestionsPrompt }      = require('./prompts/questions');
const { buildReflectPrompt }        = require('./prompts/reflect');
const { buildGenerateTicketPrompt } = require('./prompts/generate-ticket');

const app  = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// OpenAI client
// Initialised once at startup. Routes check for its presence before calling.
// ---------------------------------------------------------------------------
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Model used for all completions.
// gpt-4o-mini: fast, low-cost, supports JSON mode — right choice for a prototype.
const MODEL = 'gpt-4o-mini';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Shared OpenAI helper
// Calls the chat completions API with JSON mode enforced.
// All prompts already instruct the model to respond with JSON only,
// which is required for response_format: json_object to work.
// temperature: 0.3 keeps output consistent and focused.
// ---------------------------------------------------------------------------
async function callOpenAI(messages, temperature = 0.5) {
  if (!openai) {
    throw new Error('OPENAI_API_KEY is not set. Add it to your .env file and restart the server.');
  }

  const completion = await openai.chat.completions.create({
    model:           MODEL,
    messages,
    response_format: { type: 'json_object' },
    temperature,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('OpenAI returned an empty response.');

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('OpenAI response was not valid JSON. Raw: ' + raw.slice(0, 200));
  }
}

// ---------------------------------------------------------------------------
// /api/user-context
// Reads Windows environment variables to pre-fill the intake form.
// ---------------------------------------------------------------------------
app.get('/api/user-context', (req, res) => {
  const username = process.env.USERNAME     || '';
  const domain   = process.env.USERDNSDOMAIN || process.env.USERDOMAIN || '';
  const computer = process.env.COMPUTERNAME || '';

  const email = (username && domain && domain.includes('.'))
    ? `${username}@${domain.toLowerCase()}`
    : '';

  res.json({ username, domain, computer, displayName: username, email });
});

// ---------------------------------------------------------------------------
// POST /api/classify
// Classifies a raw issue description into one of 6 categories and assesses
// priority. Returns category, subcategory, llmPriority, priorityRationale.
// ---------------------------------------------------------------------------
app.post('/api/classify', async (req, res) => {
  const { description } = req.body;

  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'description is required.' });
  }

  try {
    const messages = buildClassifyPrompt(description.trim());
    const result   = await callOpenAI(messages);

    // Validate required fields — don't trust the model blindly
    const VALID_CATEGORIES = [
      'login_access', 'email_collab', 'network_connectivity',
      'files_drives', 'device_workstation', 'software_apps',
    ];
    const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

    if (!VALID_CATEGORIES.includes(result.category)) {
      // Graceful fallback rather than crashing
      result.category = 'device_workstation';
    }
    if (!VALID_PRIORITIES.includes(result.llmPriority)) {
      result.llmPriority = 'Medium';
    }

    result.categoryLabel    = result.categoryLabel    || result.category;
    result.subcategory      = result.subcategory      || '';
    result.priorityRationale = result.priorityRationale || '';

    res.json(result);

  } catch (err) {
    console.error('[/api/classify]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/questions
// Generates 3–5 follow-up questions for a given category and round.
// Accepts prior answers to avoid repeating covered ground.
// ---------------------------------------------------------------------------
app.post('/api/questions', async (req, res) => {
  const { category, description, round, priorAnswers } = req.body;

  if (!category || !description) {
    return res.status(400).json({ error: 'category and description are required.' });
  }

  try {
    const messages = buildQuestionsPrompt({
      category,
      description,
      round:        round    || 1,
      priorAnswers: priorAnswers || [],
    });
    const result = await callOpenAI(messages, 0.4);

    // Validate: must be an array, clamp to 3–5 items
    if (!Array.isArray(result.questions) || result.questions.length === 0) {
      throw new Error('Model did not return a valid questions array.');
    }

    result.questions = result.questions
      .filter(q => typeof q === 'string' && q.trim())
      .slice(0, 5);

    if (result.questions.length < 3) {
      throw new Error('Model returned fewer than 3 questions. Try again.');
    }

    res.json({ questions: result.questions });

  } catch (err) {
    console.error('[/api/questions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/reflect
// Generates a plain-language summary of the issue from all collected answers.
// ---------------------------------------------------------------------------
app.post('/api/reflect', async (req, res) => {
  const { category, description, rounds } = req.body;

  if (!category || !description) {
    return res.status(400).json({ error: 'category and description are required.' });
  }

  try {
    const messages = buildReflectPrompt({
      category,
      description,
      rounds: rounds || [],
    });
    const result = await callOpenAI(messages, 0.7);

    if (!result.summary || typeof result.summary !== 'string') {
      throw new Error('Model did not return a valid summary string.');
    }

    res.json({ summary: result.summary.trim() });

  } catch (err) {
    console.error('[/api/reflect]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/generate-ticket
// Generates the final structured ticket from all collected intake data.
// The LLM produces all narrative fields; structured data (follow_up_rounds,
// requester info, counts) is merged in from the original intake payload so
// those values are always accurate regardless of what the model returns.
// ---------------------------------------------------------------------------
app.post('/api/generate-ticket', async (req, res) => {
  const intakeData = req.body;

  if (!intakeData || !intakeData.category || !intakeData.raw_description) {
    return res.status(400).json({ error: 'Incomplete intake data.' });
  }

  try {
    const messages = buildGenerateTicketPrompt(intakeData);
    const result   = await callOpenAI(messages);

    // Validate that the LLM produced the key narrative fields
    if (!result.issue_summary || !result.detailed_description) {
      throw new Error('Model did not return required ticket fields.');
    }

    // Merge: trust the LLM for narrative fields; enforce accuracy for
    // structured fields by overwriting with values from intake state.
    // This prevents the model from hallucinating the requester's name,
    // email, or follow-up answers.
    const ticket = {
      ...result,

      // Always use real intake data for these — never trust the model
      ticket_id:                         result.ticket_id || 'INC-' + String(Math.floor(100000 + Math.random() * 900000)),
      timestamp:                         new Date().toISOString(),
      requester_name:                    intakeData.requester_name,
      requester_email:                   intakeData.requester_email,
      category:                          intakeData.category,
      requester_priority_self_reported:  intakeData.requester_priority_self_reported,
      affected_device:                   intakeData.affected_device  || result.affected_device  || 'Unknown',
      user_location:                     intakeData.user_location    || result.user_location    || 'Not specified',
      follow_up_rounds:                  intakeData.follow_up_rounds,
      intake_round_count:                intakeData.intake_round_count,
      confirmation_status:               intakeData.confirmation_status,
      raw_description:                   intakeData.raw_description,
    };

    res.json(ticket);

  } catch (err) {
    console.error('[/api/generate-ticket]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Catch-all — serve index.html for any unmatched route
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n  Helpdesk Intake Assistant running at http://localhost:${PORT}\n`);
  console.log(`  Environment:`);
  console.log(`    USERNAME       = ${process.env.USERNAME      || '(not set)'}`);
  console.log(`    USERDNSDOMAIN  = ${process.env.USERDNSDOMAIN || '(not set)'}`);
  console.log(`    COMPUTERNAME   = ${process.env.COMPUTERNAME  || '(not set)'}`);
  console.log(`    OPENAI_API_KEY = ${process.env.OPENAI_API_KEY ? '(set ✓)' : '⚠️  NOT SET — add to .env'}`);
  console.log(`    MODEL          = ${MODEL}`);
  console.log('');
});
