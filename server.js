require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies
app.use(express.json());

// Serve everything in /public as static files
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// /api/user-context
// Reads Windows environment variables set by the OS or domain policy.
// Returns best-effort identity data to pre-fill the intake form.
// The frontend should always let the user correct these values.
// ---------------------------------------------------------------------------
app.get('/api/user-context', (req, res) => {
  const username = process.env.USERNAME || '';
  const domain   = process.env.USERDNSDOMAIN || process.env.USERDOMAIN || '';
  const computer = process.env.COMPUTERNAME || '';

  // Best-effort display name: Windows doesn't expose a "full name" env var
  // consistently, so we use the login name and let the user fill in their name.
  const displayName = username;

  // Construct email if we have both username and a DNS domain.
  // Example: jsmith + contoso.com → jsmith@contoso.com
  const email = (username && domain && domain.includes('.'))
    ? `${username}@${domain.toLowerCase()}`
    : '';

  res.json({
    username,
    domain,
    computer,
    displayName,
    email,
  });
});

// ---------------------------------------------------------------------------
// Placeholder routes — these will be wired to OpenAI in Phase 3
// Returning empty 501s now so the frontend can be built against them
// ---------------------------------------------------------------------------
app.post('/api/classify',        (req, res) => res.status(501).json({ error: 'Not implemented yet — Phase 3' }));
app.post('/api/questions',       (req, res) => res.status(501).json({ error: 'Not implemented yet — Phase 3' }));
app.post('/api/reflect',         (req, res) => res.status(501).json({ error: 'Not implemented yet — Phase 3' }));
app.post('/api/generate-ticket', (req, res) => res.status(501).json({ error: 'Not implemented yet — Phase 3' }));

// ---------------------------------------------------------------------------
// Catch-all: serve index.html for any unmatched route
// (supports direct navigation to /ticket and /payload in future if needed)
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Helpdesk Intake Assistant running at http://localhost:${PORT}\n`);
  console.log(`  User context will be read from environment:`);
  console.log(`    USERNAME      = ${process.env.USERNAME || '(not set)'}`);
  console.log(`    USERDNSDOMAIN = ${process.env.USERDNSDOMAIN || '(not set)'}`);
  console.log(`    COMPUTERNAME  = ${process.env.COMPUTERNAME || '(not set)'}`);
  console.log(`    OPENAI_API_KEY = ${process.env.OPENAI_API_KEY ? '(set ✓)' : '(NOT SET — add to .env)'}`);
  console.log('');
});
