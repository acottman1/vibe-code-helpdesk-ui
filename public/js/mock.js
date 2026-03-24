// mock.js — Realistic mock responses for Phase 2
// Replaces real API calls so the full intake flow can be tested without OpenAI.
// Phase 3: set USE_MOCKS = false in app.js to switch to real API calls.

// ---------------------------------------------------------------------------
// Simulated network delay — makes loading spinners visible and feel realistic
// ---------------------------------------------------------------------------
export const mockDelay = (ms = 900) => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Classification
// Keyword-based matching so the mock responds to what the user actually typed.
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORDS = {
  login_access:         ['login', 'log in', 'log-in', 'password', 'locked', 'lock', 'account', 'sign in', 'credentials', 'mfa', 'multi-factor', '2fa', 'authentication', 'reset', 'unlock', 'access denied'],
  email_collab:         ['email', 'outlook', 'teams', 'slack', 'calendar', 'mail', 'inbox', 'meeting', 'zoom', 'collaboration', 'onedrive', 'sharepoint', 'message', 'chat'],
  network_connectivity: ['internet', 'network', 'wifi', 'wi-fi', 'wireless', 'connect', 'vpn', 'connection', 'browser', 'website', 'online', 'offline', 'ethernet', 'no internet'],
  files_drives:         ['file', 'folder', 'drive', 'document', 'share', 'shared drive', 'storage', 'missing file', 'can\'t open', 'network drive', 'mapped drive'],
  device_workstation:   ['laptop', 'computer', 'pc', 'screen', 'monitor', 'keyboard', 'mouse', 'printer', 'hardware', 'boot', 'slow', 'frozen', 'crash', 'blue screen', 'restart', 'black screen', 'device', 'workstation'],
  software_apps:        ['app', 'application', 'software', 'install', 'program', 'error', 'crashing', 'update', 'license', 'plugin', 'excel', 'word', 'office', 'adobe', 'browser'],
};

const CATEGORY_META = {
  login_access:         { label: 'Login & Access',          routing: 'Identity & Access Management' },
  email_collab:         { label: 'Email & Collaboration',   routing: 'Collaboration Tools Support' },
  network_connectivity: { label: 'Network & Connectivity',  routing: 'Network & Remote Access Support' },
  files_drives:         { label: 'Files & Shared Drives',   routing: 'Storage & File Services' },
  device_workstation:   { label: 'Device & Workstation',    routing: 'End User Computing' },
  software_apps:        { label: 'Software & Applications', routing: 'Application Support' },
};

const SUBCATEGORY_MAP = {
  login_access:         ['Account Lockout', 'Password Reset', 'MFA / Two-Factor Auth', 'SSO Access Issue', 'New Account Request'],
  email_collab:         ['Outlook / Email Client', 'Teams / Chat', 'Shared Mailbox Access', 'Calendar Sync', 'Email Delivery Issue'],
  network_connectivity: ['Wi-Fi / Wireless', 'VPN / Remote Access', 'Wired Network', 'Internet Access', 'DNS / Site Unreachable'],
  files_drives:         ['Network / Mapped Drive', 'SharePoint / OneDrive', 'File Permissions', 'Missing or Deleted File', 'File Share Access'],
  device_workstation:   ['Laptop / Desktop Performance', 'Won\'t Power On', 'Display / Monitor', 'Peripheral Device', 'Hardware Damage'],
  software_apps:        ['Application Crashing', 'Software Installation', 'License / Activation', 'Application Error', 'Browser Issue'],
};

/**
 * Classify a description into a category using keyword matching.
 * Returns the same shape as the real /api/classify endpoint.
 */
export function mockClassify(description) {
  const lower = description.toLowerCase();

  // Score each category by keyword hits
  const scores = Object.entries(CATEGORY_KEYWORDS).map(([cat, keywords]) => ({
    category: cat,
    score: keywords.filter(kw => lower.includes(kw)).length,
  }));

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0].score > 0 ? scores[0].category : 'device_workstation';

  const meta = CATEGORY_META[best];
  const subcategories = SUBCATEGORY_MAP[best];
  const subcategory = subcategories[Math.floor(Math.random() * subcategories.length)];

  // Derive a plausible priority from the description
  const urgencyWords = ['can\'t work', 'blocked', 'urgent', 'asap', 'critical', 'nothing works', 'completely', 'all day', 'deadline'];
  const hasUrgency = urgencyWords.some(w => lower.includes(w));

  const priority = hasUrgency ? 'High' : 'Medium';
  const rationale = hasUrgency
    ? `Description suggests the employee is fully blocked from completing work tasks.`
    : `Issue is impacting productivity but does not indicate complete loss of work capability.`;

  return {
    category:         best,
    categoryLabel:    meta.label,
    subcategory,
    llmPriority:      priority,
    priorityRationale: rationale,
  };
}

// ---------------------------------------------------------------------------
// Follow-up questions — 4 questions per category, different sets per round
// ---------------------------------------------------------------------------
const QUESTIONS_BANK = {
  login_access: [
    [
      'Which system or application are you unable to log into?',
      'Are you seeing a specific error message? If so, what does it say?',
      'Did this start after a recent password change or account update?',
      'Are you able to log in on a different device or browser?',
    ],
    [
      'Have you tried resetting your password through the self-service portal?',
      'Is your account completely inaccessible, or does it fail only sometimes?',
      'Are you using a company-managed device or a personal device?',
    ],
  ],
  email_collab: [
    [
      'Which email or collaboration tool is affected — Outlook, Teams, or something else?',
      'Is the issue with sending, receiving, or accessing the application at all?',
      'Are you getting a specific error message when you try to open or use it?',
      'Are others on your team experiencing the same issue?',
    ],
    [
      'Does the issue happen on all devices, or only on one specific machine?',
      'Did this start after a recent system update or password change?',
      'Can you access the tool through a web browser as an alternative?',
    ],
  ],
  network_connectivity: [
    [
      'Are you unable to reach all websites, or only specific ones?',
      'Are you connecting via Wi-Fi or a wired ethernet connection?',
      'Are other devices nearby also affected, or just your computer?',
      'Are you in the office, at home, or working from another location?',
    ],
    [
      'Are you currently connected to the VPN? If so, does disconnecting change anything?',
      'Does restarting your computer or router make any difference?',
      'Are you able to access any internal company resources, such as the intranet?',
    ],
  ],
  files_drives: [
    [
      'Which file or drive are you trying to access — a specific folder, network share, or cloud drive?',
      'Are you getting an error message, or does the file or drive simply not appear?',
      'Were you able to access this before? If so, when did it stop working?',
      'Are other people on your team also unable to access the same resource?',
    ],
    [
      'Are you on the office network, or working remotely via VPN?',
      'Did your access change after a recent system update or organizational change?',
      'Can you access any part of the drive, or is access completely blocked?',
    ],
  ],
  device_workstation: [
    [
      'What exactly is happening — is the device frozen, slow, not turning on, or something else?',
      'When did this start, and did anything happen around that time such as an update, a drop, or a spill?',
      'Is the device completely unusable, or is the problem specific to certain functions?',
      'Have you tried restarting the device?',
    ],
    [
      'Is this a company-issued device, or a personal device used for work?',
      'Are there any error messages or unusual sounds when the issue occurs?',
      'Does the issue happen immediately, or only after the device has been running for a while?',
    ],
  ],
  software_apps: [
    [
      'Which application is affected?',
      'What exactly happens — does it crash, show an error message, or fail to open at all?',
      'Did this start after a recent update, new installation, or system change?',
      'Does the issue happen every time you use it, or only sometimes?',
    ],
    [
      'Are other people on your team having the same issue with this application?',
      'Does the problem happen on a specific file or document, or with the application overall?',
      'Have you tried restarting the application or your computer?',
    ],
  ],
};

/**
 * Return a set of follow-up questions for a category and round.
 * Round 1 returns the first bank, round 2+ returns the second bank.
 */
export function mockQuestions(category, round) {
  const bank = QUESTIONS_BANK[category] || QUESTIONS_BANK.device_workstation;
  const questions = bank[Math.min(round - 1, bank.length - 1)];
  return { questions };
}

// ---------------------------------------------------------------------------
// Reflection — builds from actual answers the user provided
// ---------------------------------------------------------------------------

/**
 * Generate a reflection summary from collected rounds.
 * Incorporates the user's own words where possible.
 */
export function mockReflect(category, description, rounds) {
  const meta = CATEGORY_META[category] || CATEGORY_META.device_workstation;

  // Pull the first substantive answer to personalize the summary
  const allAnswers = rounds.flatMap(r => r.answers || []);
  const firstAnswer = allAnswers.find(a => a.answer && a.answer.length > 2);
  const answerSnippet = firstAnswer ? ` You mentioned: "${firstAnswer.answer}."` : '';

  const summaries = {
    login_access:         `It sounds like you need help regaining access to a system or application where your login is failing or your account may be locked.${answerSnippet} This is preventing you from accessing resources you need for your work.`,
    email_collab:         `It sounds like you need help with an issue affecting your email or a collaboration tool such as Teams or Outlook.${answerSnippet} You are unable to send, receive, or access messages as expected.`,
    network_connectivity: `It sounds like you need help with a network or internet connectivity issue on your device.${answerSnippet} You are having trouble reaching online resources or network services.`,
    files_drives:         `It sounds like you need help accessing a file, folder, or network drive that you should have permission to reach.${answerSnippet} The resource is either not appearing or returning an access error.`,
    device_workstation:   `It sounds like you need help with a hardware or performance issue on your computer or workstation.${answerSnippet} The device is not behaving as expected and is affecting your ability to work.`,
    software_apps:        `It sounds like you need help with an application or software tool that is crashing, showing errors, or not functioning correctly.${answerSnippet} This is preventing you from completing tasks that depend on that software.`,
  };

  return { summary: summaries[category] || summaries.device_workstation };
}

// ---------------------------------------------------------------------------
// Ticket generation — builds the full schema from real intake state
// ---------------------------------------------------------------------------

/**
 * Generate a complete structured ticket from all collected intake data.
 * Mirrors the shape returned by the real /api/generate-ticket endpoint.
 */
export function mockGenerateTicket(intakeData) {
  const meta = CATEGORY_META[intakeData.category] || CATEGORY_META.device_workstation;

  // Build a short issue summary from the description
  const raw = intakeData.raw_description || '';
  const issueSummary = raw.length <= 80
    ? raw
    : raw.substring(0, 77).trim() + '…';

  // Build detailed description from description + answers
  const allAnswers = (intakeData.follow_up_rounds || []).flatMap(r => r.answers || []);
  const answerContext = allAnswers
    .filter(a => a.answer && a.answer.length > 2)
    .map(a => a.answer)
    .slice(0, 3)
    .join(' ');

  const detailed = `Employee reports: "${raw}". ${answerContext ? 'Additional context provided: ' + answerContext + '.' : ''} Intake completed in ${intakeData.intake_round_count} round(s) of clarifying questions.`.trim();

  // Infer affected service from subcategory or category
  const affectedService = intakeData.subcategory || meta.label;

  // Infer business impact from priority
  const impactMap = {
    Low:      'Minor inconvenience. Employee can continue most work with a workaround.',
    Medium:   'Employee is partially blocked and cannot complete specific tasks requiring this resource.',
    High:     'Employee is unable to perform their primary work duties until this is resolved.',
    Critical: 'Employee is fully blocked with a time-sensitive deadline. Immediate resolution required.',
  };
  const businessImpact = impactMap[intakeData.priority] || impactMap.Medium;

  // Mock ticket ID and timestamp
  const ticketId = 'INC-' + String(Math.floor(100000 + Math.random() * 900000));
  const timestamp = new Date().toISOString();

  return {
    ticket_id:                          ticketId,
    timestamp,
    requester_name:                     intakeData.requester_name,
    requester_email:                    intakeData.requester_email,
    category:                           intakeData.category,
    subcategory:                        intakeData.subcategory,
    priority:                           intakeData.priority,
    priority_rationale:                 intakeData.priority_rationale,
    requester_priority_self_reported:   intakeData.requester_priority_self_reported,
    business_impact:                    businessImpact,
    affected_service:                   affectedService,
    affected_device:                    intakeData.affected_device || 'Unknown',
    user_location:                      intakeData.user_location || 'Not specified',
    single_or_multi_user:               'Just me',
    issue_summary:                      issueSummary,
    detailed_description:               detailed,
    routing_team:                       meta.routing,
    follow_up_rounds:                   intakeData.follow_up_rounds,
    intake_round_count:                 intakeData.intake_round_count,
    confirmation_status:                intakeData.confirmation_status,
    raw_description:                    intakeData.raw_description,
  };
}
