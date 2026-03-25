// Telegram Bot Webhook Handler for View1 Studio
// AI-powered project manager with slash commands + Claude Haiku free-text chat
// Vercel Serverless Function — zero dependencies, uses native fetch

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DASHBOARD_URL = 'https://view1-dashboard.vercel.app';

// Phase definitions for /roadmap
const PHASES = [
  { name: 'Phase 0: Setup', start: new Date('2026-03-25'), end: new Date('2026-03-25'), days: '0' },
  { name: 'Phase 1: Demo MVP', start: new Date('2026-03-26'), end: new Date('2026-03-30'), days: '1-5' },
  { name: 'Phase 2: Core Product', start: new Date('2026-03-31'), end: new Date('2026-04-12'), days: '6-18' },
];

const CLAUDE_SYSTEM_PROMPT = `You are **View1 Build Manager**, the AI project manager for View1 Studio. You oversee 22 Claude Code agents across 6 departments building PhotoSorter — an AI-powered photo sorting and client delivery platform for photographers. You report to Kyle (the founder). You know every detail of the spec, plan, research, business model, and daily operations.

## Company & Product
- Company: View1 Studio. Founder: Kyle (kyle@view1media.com). Solo bootstrapped.
- Product suite: View1 Sort (PhotoSorter), View1 Content, View1 Brief
- PhotoSorter: AI-powered media sorting + client gallery + payments for photographers
- Core loop: Upload → AI sorts → Review → Share gallery → Client pays & downloads
- Revenue: Photographer subscriptions ($39/mo Pro) + Stripe Connect app fees (7% Pro, 5% Business)

## Technical Stack
- Frontend: Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, Zustand
- Backend: Supabase (Postgres + Auth + Storage + Edge Functions + RLS)
- AI: SigLIP via Transformers.js (client-side zero-shot classification in Web Worker). Replaces MobileNet. Also: blur detection (Laplacian), duplicate detection (pHash), NIMA aesthetic scoring
- Uploads: tus-js-client + IndexedDB (resumable, chunked, 500MB max)
- Image CDN: Cloudflare Images (thumbnails, watermarks, responsive)
- Payments: Stripe Billing (subscriptions) + Stripe Connect Standard (photographer→client)
- Email: Resend + react-email (6 templates)
- PWA: next-pwa (installable, offline)

## Data Model (13 tables)
- profiles: photographer accounts, plan (free/pro/business/custom), stripe IDs, storage_used, trial_ends_at
- projects: preset (real_estate/wedding/travel/general), status (booked/draft/published/completed/archived), theme (dark/light/minimal/editorial), gallery_public, metadata JSONB
- media: storage_path, category, orientation, sort_order, starred, predictions JSONB, exif JSONB, upload_status
- project_clients: client_email, access_level (preview/proofing/delivered)
- project_pricing: pricing_mode, booking/download/edit config with prices in cents
- client_profiles: per-photographer, stripe_customer_id on connected account
- bookings: status, booking_type (full/deposit/download_only/free), deposit/balance tracking
- edit_requests: 6-status workflow (requested→reviewed→priced→paid→in_progress→delivered)
- file_purchases: media_ids array, for flat-fee or per-file downloads
- booking_form_fields: JSONB field definitions per preset
- stripe_events: webhook idempotency log
- notifications: 8 event types, bell dropdown + activity feed
- client_reactions: v3 (hearts/stars/comments)

## Subscription Tiers
- Free: 3 projects, 5GB, 3 themes, no Connect
- Pro ($39/mo): unlimited projects, 100GB, all 4 themes, Connect at 7% app fee, 14-day trial with card upfront
- Business (TBD): 500GB, 5% app fee, custom branding (v3), teams up to 5 (v3)
- Custom: contact sales, unlimited, negotiable fee

## Phasing
Phase 1 — Core (3-4 weeks, starting Mar 25 2026):
- Week 1 (Mar 25-31): Project init, Supabase schema (13 tables + RLS), Tailwind design system, Auth flow, Onboarding wizard, Project CRUD, AI classification (SigLIP)
- Week 2 (Apr 1-7): Upload pipeline (tus + IndexedDB), Workspace UI, Media cards, Batch operations, Orientation/views, Cloudflare Images, Storage enforcement
- Week 3 (Apr 8-14): Stripe Billing (4 tiers), Stripe Connect, Webhook handler, Gallery page (4 themes), Access resolver RPC, Gallery paywall, Email system (6 templates), Client invitations
- Week 4 (Apr 15-21): Notifications, Landing page, ZIP export, Publish flow, PWA, Upload resume, Keyboard shortcuts, Testing & deploy

Phase 2 — Payments & Workflows (4-6 weeks after Phase 1):
- Weeks 5-6: Client profiles, Public booking page, Booking forms, Payment modes, Auto-create project, Booking confirmation, Client list, Saved payment methods
- Weeks 7-8: Per-file cart, Edit request workflow, Edits gallery section, Deposit auto-charge, Refund flow, Client approve & complete, Currency display

## 22 Agents (6 departments)
Engineering (8): eng-arch (schema), eng-ui (components), eng-ai (SigLIP), eng-upload (tus), eng-email (templates), eng-workspace (main UI), eng-auth (auth), eng-stripe (payments)
Content (4): content-social, content-blog, content-video, content-seo
Design (3): design-system, design-landing, design-gallery
Marketing (3): marketing-competitor, marketing-growth, marketing-analytics
QA (2): qa-test, qa-security
Operations (2): ops-deploy, ops-monitor

## Daily Workflow
- Morning (8:00-8:30): Check Telegram briefing, approve PRs, launch agents, scan content
- Midday (12:00-12:30): Deep PR review, integration check, personal content
- Evening (6:00-6:30): Status review, community engagement, plan tomorrow
- Target: ~1.5 hrs/day during build, ~45 min/day post-launch

## Financial Targets
- Month 6: $2,100 MRR, 80 paid users
- Month 12: $7,000 MRR, 250 paid users
- Month 24: $30,000+ MRR, 600+ paid users

## Key Competitive Advantage
No competitor combines AI sorting + gallery + payments. Pixieset/Pic-Time/ShootProof have no AI. Aftershoot/FilterPixel only do culling. View1 occupies the upper-right quadrant: high AI + complete workflow.

## Gallery Access
- resolve_gallery_access Postgres RPC function is single source of truth
- gallery_public toggle: public = watermarked previews without auth, private = OAuth required
- Access levels: preview (watermarked), proofing (clean, no downloads), delivered (full access)
- Paywall gates downloads until payment via Stripe Connect

## Security
- Supabase RLS policies for all tables
- Signed URLs (1hr expiry) for all media
- Stripe webhook signature verification
- stripe_events idempotency table
- charges_enabled check before any PaymentIntent
- Client payment methods on connected account (not platform) — zero PCI scope

## AI Research Findings
- SigLIP replaces MobileNet: zero-shot classification via text prompts, ~150-200MB model cached in IndexedDB
- Server-side: Claude Haiku Batch for rich descriptions ($0.53/500 photos)
- NIMA for aesthetic scoring / hero shot selection
- face-api.js for face grouping (wedding, Phase 2)
- CLIP embeddings + pgvector for natural language search (Phase 2)
- Firecrawl + Claude for AI onboarding (website scrape → profile pre-fill)

## Behavior
- Be concise — Telegram messages should be short and scannable
- Use emoji sparingly but consistently
- When asked about technical details, reference specific table names, field names, file paths
- When asked about timeline, calculate actual dates from the start date (Mar 25, 2026)
- When asked about what to do next, check the current task/agent state provided in the live context and give actionable advice
- When asked about competitors, reference specific names and pricing
- Proactively warn about risks (e.g., SigLIP model download size ~150-200MB, webhook idempotency, RLS policy gaps)
- Speak as a confident, knowledgeable project manager — not uncertain
- Format responses using HTML tags: <b>bold</b>, <i>italic</i>, <code>code</code>. Do NOT use Markdown formatting. Do NOT use MarkdownV2. Only use HTML tags.
- Keep responses under 3500 characters to stay within Telegram limits`;

// --- Helpers ---

function escapeMarkdownV2(text) {
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function esc(text) {
  return escapeMarkdownV2(text);
}

async function sendMessage(chatId, text, parseMode = 'MarkdownV2') {
  const payload = {
    chat_id: chatId,
    text: text,
  };
  if (parseMode) {
    payload.parse_mode = parseMode;
  }
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function sendHtmlMessage(chatId, text) {
  // Truncate if over Telegram's 4096 char limit
  if (text.length > 4093) {
    text = text.substring(0, 4093) + '...';
  }
  return sendMessage(chatId, text, 'HTML');
}

async function supabaseRequest(path, options = {}) {
  const { method = 'GET', body, headers: extraHeaders = {} } = options;
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: method === 'POST' ? 'return=representation' : method === 'PATCH' ? 'return=representation' : undefined,
    ...extraHeaders,
  };
  Object.keys(headers).forEach((k) => headers[k] === undefined && delete headers[k]);
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function createNotification(type, title, body, metadata = {}) {
  return supabaseRequest('notifications', {
    method: 'POST',
    body: { type, title, body, metadata, read: false, source: 'telegram_bot' },
  });
}

async function logActivity(action, details, metadata = {}) {
  return supabaseRequest('activity_log', {
    method: 'POST',
    body: { action, details, source: 'telegram_bot', metadata },
  });
}

function statusEmoji(status) {
  const map = { running: '🟢', idle: '⚪', completed: '✅', failed: '🔴' };
  return map[status] || '❓';
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// --- Fetch live state for Claude context ---

async function fetchLiveState() {
  try {
    const [tasks, agents, notifications] = await Promise.all([
      supabaseRequest('tasks?select=id,title,status,priority&order=created_at.desc&limit=50'),
      supabaseRequest('agents?select=id,name,status,department,current_task&order=department,name'),
      supabaseRequest(`notifications?select=title,body,type,created_at&order=created_at.desc&limit=5`),
    ]);

    const lines = [];

    // Task counts
    if (Array.isArray(tasks)) {
      const counts = { backlog: 0, todo: 0, in_progress: 0, review: 0, done: 0 };
      tasks.forEach((t) => { if (counts[t.status] !== undefined) counts[t.status]++; });
      lines.push(`[LIVE PROJECT STATE]`);
      lines.push(`Tasks: ${counts.backlog} backlog, ${counts.todo} todo, ${counts.in_progress} in progress, ${counts.review} review, ${counts.done} done (${tasks.length} total shown)`);

      const active = tasks.filter((t) => t.status === 'in_progress');
      if (active.length > 0) {
        lines.push(`Active tasks: ${active.map((t) => t.title).join(', ')}`);
      }
    }

    // Agent statuses
    if (Array.isArray(agents)) {
      const running = agents.filter((a) => a.status === 'running');
      const idle = agents.filter((a) => a.status === 'idle');
      lines.push(`Agents: ${running.length} running, ${idle.length} idle, ${agents.length} total`);
      if (running.length > 0) {
        lines.push(`Running agents: ${running.map((a) => `${a.id} (${a.current_task || 'no task'})`).join(', ')}`);
      }
    }

    // Recent notifications
    if (Array.isArray(notifications) && notifications.length > 0) {
      lines.push(`Recent notifications:`);
      notifications.forEach((n) => {
        lines.push(`  - [${n.type}] ${n.title}: ${n.body || ''}`);
      });
    }

    // Day number
    const startDate = new Date('2026-03-25');
    const dayNumber = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
    lines.push(`Today: Day ${dayNumber} of the build (started Mar 25, 2026)`);

    return lines.join('\n');
  } catch (err) {
    console.error('Error fetching live state:', err);
    return '[LIVE STATE UNAVAILABLE]';
  }
}

// --- Claude AI Handler ---

async function handleFreeText(chatId, userMessage) {
  try {
    const liveState = await fetchLiveState();

    const userContent = `${liveState}\n\nKyle says: ${userMessage}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: CLAUDE_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return sendHtmlMessage(chatId, '⚠️ AI temporarily unavailable. Use /help for commands.');
    }

    const data = await response.json();

    let aiResponse = '';
    if (data.content && Array.isArray(data.content)) {
      aiResponse = data.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
    }

    if (!aiResponse) {
      return sendHtmlMessage(chatId, '⚠️ AI returned an empty response. Try again or use /help for commands.');
    }

    return sendHtmlMessage(chatId, aiResponse);
  } catch (err) {
    console.error('Claude handler error:', err);
    return sendHtmlMessage(chatId, '⚠️ AI temporarily unavailable. Use /help for commands.');
  }
}

// --- Command Handlers ---

async function handleHelp(chatId) {
  const text = [
    '*📋 Available Commands*',
    '',
    '`/help` \\— Show this help message',
    '`/status` \\— System status overview',
    '`/agents` \\— List all agents by department',
    '`/launch <id> [task]` \\— Launch an agent',
    '`/stop <id>` \\— Stop an agent',
    '`/complete <id>` \\— Mark agent complete',
    '`/tasks` \\— Task summary by status',
    '`/task <title>` \\— Create a new task',
    '`/roadmap` \\— Phase progress & timeline',
    '`/metrics` \\— Key metrics overview',
    '`/report` \\— Weekly report',
    '`/notify <msg>` \\— Log a notification',
    '`/dashboard` \\— Dashboard link',
    '',
    '_Or just type any message to chat with the AI Build Manager\\!_',
  ].join('\n');
  return sendMessage(chatId, text);
}

async function handleStatus(chatId) {
  const [agents, tasks] = await Promise.all([
    supabaseRequest('agents?select=*'),
    supabaseRequest('tasks?select=id,status'),
  ]);

  if (!Array.isArray(agents)) {
    return sendMessage(chatId, esc('Error fetching agents.'));
  }

  const depts = {};
  agents.forEach((a) => {
    const dept = a.department || 'Unknown';
    if (!depts[dept]) depts[dept] = [];
    depts[dept].push(a);
  });

  const running = agents.filter((a) => a.status === 'running').length;
  const inProgress = Array.isArray(tasks) ? tasks.filter((t) => t.status === 'in_progress').length : 0;

  const todayTasks = await supabaseRequest(
    `tasks?select=id&status=eq.done&updated_at=gte.${todayISO()}T00:00:00`
  );
  const doneToday = Array.isArray(todayTasks) ? todayTasks.length : 0;

  let lines = ['*📊 System Status*', ''];
  for (const [dept, members] of Object.entries(depts)) {
    const icons = members.map((m) => statusEmoji(m.status)).join('');
    lines.push(`*${esc(dept)}:* ${icons}`);
  }
  lines.push('');
  lines.push(`🟢 *Running:* ${esc(String(running))}`);
  lines.push(`✅ *Done today:* ${esc(String(doneToday))}`);
  lines.push(`🔄 *In progress:* ${esc(String(inProgress))}`);

  return sendMessage(chatId, lines.join('\n'));
}

async function handleAgents(chatId) {
  const agents = await supabaseRequest('agents?select=*&order=department,name');
  if (!Array.isArray(agents) || agents.length === 0) {
    return sendMessage(chatId, esc('No agents found.'));
  }

  const depts = {};
  agents.forEach((a) => {
    const dept = a.department || 'Unknown';
    if (!depts[dept]) depts[dept] = [];
    depts[dept].push(a);
  });

  let lines = ['*🤖 All Agents*', ''];
  for (const [dept, members] of Object.entries(depts)) {
    lines.push(`*${esc(dept)}*`);
    members.forEach((m) => {
      const task = m.current_task ? ` \\— _${esc(m.current_task)}_` : '';
      lines.push(`  ${statusEmoji(m.status)} \`${esc(m.id)}\` ${esc(m.name)}${task}`);
    });
    lines.push('');
  }

  return sendMessage(chatId, lines.join('\n'));
}

async function handleLaunch(chatId, args) {
  const parts = args.trim().split(/\s+/);
  const agentId = parts[0];
  const taskDesc = parts.slice(1).join(' ') || 'Manual launch';

  if (!agentId) {
    return sendMessage(chatId, esc('Usage: /launch <agent-id> [task description]'));
  }

  const agents = await supabaseRequest(`agents?id=eq.${encodeURIComponent(agentId)}&select=*`);
  if (!Array.isArray(agents) || agents.length === 0) {
    return sendMessage(chatId, `❌ Agent \`${esc(agentId)}\` not found`);
  }

  await supabaseRequest(`agents?id=eq.${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    body: { status: 'running', current_task: taskDesc, last_active: new Date().toISOString() },
  });

  await Promise.all([
    createNotification('agent_launched', `Agent ${agentId} launched`, taskDesc, { agent_id: agentId }),
    logActivity('agent_launched', `Launched ${agentId}: ${taskDesc}`, { agent_id: agentId }),
  ]);

  const text = [
    `🚀 *Agent Launched*`,
    '',
    `*Agent:* \`${esc(agentId)}\``,
    `*Task:* ${esc(taskDesc)}`,
    `*Status:* 🟢 Running`,
  ].join('\n');
  return sendMessage(chatId, text);
}

async function handleStop(chatId, args) {
  const agentId = args.trim().split(/\s+/)[0];
  if (!agentId) {
    return sendMessage(chatId, esc('Usage: /stop <agent-id>'));
  }

  const agents = await supabaseRequest(`agents?id=eq.${encodeURIComponent(agentId)}&select=*`);
  if (!Array.isArray(agents) || agents.length === 0) {
    return sendMessage(chatId, `❌ Agent \`${esc(agentId)}\` not found`);
  }

  const prev = agents[0];
  await supabaseRequest(`agents?id=eq.${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    body: {
      status: 'idle',
      current_task: null,
      tasks_completed: (prev.tasks_completed || 0) + 1,
      last_active: new Date().toISOString(),
    },
  });

  await Promise.all([
    createNotification('agent_stopped', `Agent ${agentId} stopped`, prev.current_task || '', { agent_id: agentId }),
    logActivity('agent_stopped', `Stopped ${agentId}`, { agent_id: agentId }),
  ]);

  const text = [
    `⏹ *Agent Stopped*`,
    '',
    `*Agent:* \`${esc(agentId)}\``,
    `*Status:* ⚪ Idle`,
    `*Tasks completed:* ${esc(String((prev.tasks_completed || 0) + 1))}`,
  ].join('\n');
  return sendMessage(chatId, text);
}

async function handleComplete(chatId, args) {
  const agentId = args.trim().split(/\s+/)[0];
  if (!agentId) {
    return sendMessage(chatId, esc('Usage: /complete <agent-id>'));
  }

  const agents = await supabaseRequest(`agents?id=eq.${encodeURIComponent(agentId)}&select=*`);
  if (!Array.isArray(agents) || agents.length === 0) {
    return sendMessage(chatId, `❌ Agent \`${esc(agentId)}\` not found`);
  }

  const prev = agents[0];
  await supabaseRequest(`agents?id=eq.${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    body: {
      status: 'completed',
      current_task: null,
      tasks_completed: (prev.tasks_completed || 0) + 1,
      last_active: new Date().toISOString(),
    },
  });

  await Promise.all([
    createNotification('agent_completed', `Agent ${agentId} completed`, prev.current_task || '', { agent_id: agentId }),
    logActivity('agent_completed', `Completed ${agentId}`, { agent_id: agentId }),
  ]);

  const text = [
    `✅ *Agent Completed*`,
    '',
    `*Agent:* \`${esc(agentId)}\``,
    `*Status:* ✅ Completed`,
    `*Total completed:* ${esc(String((prev.tasks_completed || 0) + 1))}`,
  ].join('\n');
  return sendMessage(chatId, text);
}

async function handleTasks(chatId) {
  const tasks = await supabaseRequest('tasks?select=id,title,status,priority&order=priority.asc,created_at.desc');
  if (!Array.isArray(tasks)) {
    return sendMessage(chatId, esc('Error fetching tasks.'));
  }

  const counts = { backlog: 0, todo: 0, in_progress: 0, review: 0, done: 0 };
  tasks.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
  });

  const inProgress = tasks.filter((t) => t.status === 'in_progress').slice(0, 5);

  let lines = [
    '*📝 Task Summary*',
    '',
    `📦 Backlog: *${counts.backlog}*`,
    `📋 Todo: *${counts.todo}*`,
    `🔄 In Progress: *${counts.in_progress}*`,
    `🔍 Review: *${counts.review}*`,
    `✅ Done: *${counts.done}*`,
    `📊 Total: *${tasks.length}*`,
  ];

  if (inProgress.length > 0) {
    lines.push('');
    lines.push('*🔄 In Progress:*');
    inProgress.forEach((t) => {
      lines.push(`  \\• \\[${esc(t.priority || '—')}\\] ${esc(t.title)}`);
    });
  }

  return sendMessage(chatId, lines.join('\n'));
}

async function handleTask(chatId, args) {
  const title = args.trim();
  if (!title) {
    return sendMessage(chatId, esc('Usage: /task <title>'));
  }

  const result = await supabaseRequest('tasks', {
    method: 'POST',
    body: { title, status: 'todo', assignee: 'kyle' },
  });

  const taskId = Array.isArray(result) && result[0] ? result[0].id : 'unknown';

  const text = [
    `✅ *Task Created*`,
    '',
    `*Title:* ${esc(title)}`,
    `*Status:* 📋 Todo`,
    `*Assignee:* Kyle`,
    `*ID:* \`${esc(String(taskId).substring(0, 8))}\``,
  ].join('\n');
  return sendMessage(chatId, text);
}

async function handleRoadmap(chatId) {
  const now = new Date();
  const startDate = new Date('2026-03-25');
  const dayNumber = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

  let currentPhase = null;
  for (const phase of PHASES) {
    if (now >= phase.start && now <= new Date(phase.end.getTime() + 86400000 - 1)) {
      currentPhase = phase;
      break;
    }
  }
  if (!currentPhase && dayNumber > 18) currentPhase = PHASES[PHASES.length - 1];
  if (!currentPhase) currentPhase = PHASES[0];

  const phaseDuration = Math.max(1, Math.floor((currentPhase.end - currentPhase.start) / (1000 * 60 * 60 * 24)) + 1);
  const daysIntoPhase = Math.max(0, Math.floor((now - currentPhase.start) / (1000 * 60 * 60 * 24)));
  const pct = Math.min(100, Math.round((daysIntoPhase / phaseDuration) * 100));

  const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));

  let lines = [
    '*🗺 Roadmap*',
    '',
  ];

  PHASES.forEach((p) => {
    const arrow = p.name === currentPhase.name ? '👉 ' : '   ';
    const startStr = p.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = p.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    lines.push(`${arrow}*${esc(p.name)}*`);
    lines.push(`      Days ${esc(p.days)} \\(${esc(startStr)} \\- ${esc(endStr)}\\)`);
  });

  lines.push('');
  lines.push(`📅 *Day ${esc(String(dayNumber))}* — ${esc(currentPhase.name)}`);
  lines.push(`${esc(bar)} ${esc(String(pct))}%`);

  return sendMessage(chatId, lines.join('\n'));
}

async function handleMetrics(chatId) {
  const [tasks, agents, notifications] = await Promise.all([
    supabaseRequest('tasks?select=id,status'),
    supabaseRequest('agents?select=id,status'),
    supabaseRequest(`notifications?select=id&created_at=gte.${todayISO()}T00:00:00`),
  ]);

  const taskCounts = { backlog: 0, todo: 0, in_progress: 0, review: 0, done: 0 };
  if (Array.isArray(tasks)) tasks.forEach((t) => { if (taskCounts[t.status] !== undefined) taskCounts[t.status]++; });

  const agentCounts = { idle: 0, running: 0, completed: 0, failed: 0 };
  if (Array.isArray(agents)) agents.forEach((a) => { if (agentCounts[a.status] !== undefined) agentCounts[a.status]++; });

  const startDate = new Date('2026-03-25');
  const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));

  const lines = [
    '*📈 Metrics*',
    '',
    '*Tasks*',
    `  📦 ${taskCounts.backlog} backlog \\| 📋 ${taskCounts.todo} todo \\| 🔄 ${taskCounts.in_progress} active`,
    `  🔍 ${taskCounts.review} review \\| ✅ ${taskCounts.done} done`,
    `  📊 Total: *${Array.isArray(tasks) ? tasks.length : 0}*`,
    '',
    '*Agents*',
    `  ⚪ ${agentCounts.idle} idle \\| 🟢 ${agentCounts.running} running`,
    `  ✅ ${agentCounts.completed} completed \\| 🔴 ${agentCounts.failed} failed`,
    '',
    `🔔 *Notifications today:* ${Array.isArray(notifications) ? notifications.length : 0}`,
    `📅 *Days since start:* ${daysSinceStart}`,
  ];

  return sendMessage(chatId, lines.join('\n'));
}

async function handleReport(chatId) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartISO = weekStart.toISOString();

  const [completedTasks, activeAgents, recentActivity, upcomingTasks] = await Promise.all([
    supabaseRequest(`tasks?select=id,title&status=eq.done&updated_at=gte.${weekStartISO}&order=updated_at.desc&limit=10`),
    supabaseRequest('agents?select=id,name,status&status=eq.running'),
    supabaseRequest(`activity_log?select=action,details,created_at&created_at=gte.${weekStartISO}&order=created_at.desc&limit=5`),
    supabaseRequest('tasks?select=id,title,priority&status=eq.todo&order=priority.asc&limit=5'),
  ]);

  let lines = ['*📄 Weekly Report*', ''];

  lines.push('*✅ Completed This Week*');
  if (Array.isArray(completedTasks) && completedTasks.length > 0) {
    completedTasks.forEach((t) => lines.push(`  \\• ${esc(t.title)}`));
  } else {
    lines.push('  _None yet_');
  }

  lines.push('');
  lines.push('*🟢 Active Agents*');
  if (Array.isArray(activeAgents) && activeAgents.length > 0) {
    activeAgents.forEach((a) => lines.push(`  \\• ${esc(a.name)} \\(\`${esc(a.id)}\`\\)`));
  } else {
    lines.push('  _None running_');
  }

  lines.push('');
  lines.push('*🏆 Recent Activity*');
  if (Array.isArray(recentActivity) && recentActivity.length > 0) {
    recentActivity.forEach((a) => lines.push(`  \\• ${esc(a.action)}: ${esc(a.details)}`));
  } else {
    lines.push('  _No activity logged_');
  }

  lines.push('');
  lines.push('*📋 Upcoming Priorities*');
  if (Array.isArray(upcomingTasks) && upcomingTasks.length > 0) {
    upcomingTasks.forEach((t) => lines.push(`  \\• \\[${esc(t.priority || '—')}\\] ${esc(t.title)}`));
  } else {
    lines.push('  _No upcoming tasks_');
  }

  return sendMessage(chatId, lines.join('\n'));
}

async function handleNotify(chatId, args) {
  const message = args.trim();
  if (!message) {
    return sendMessage(chatId, esc('Usage: /notify <message>'));
  }

  await createNotification('manual', 'Manual note', message, { from: 'telegram' });

  const text = [
    `🔔 *Notification Logged*`,
    '',
    `${esc(message)}`,
  ].join('\n');
  return sendMessage(chatId, text);
}

async function handleDashboard(chatId) {
  const text = [
    `🖥 *Dashboard*`,
    '',
    `[Open Dashboard](${esc(DASHBOARD_URL)})`,
  ].join('\n');
  return sendMessage(chatId, text);
}

// --- Main Handler ---

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Telegram webhook is active. Send POST requests.' });
  }

  try {
    const body = req.body;
    const message = body && body.message;

    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = String(message.chat.id);

    // Auth check
    if (chatId !== CHAT_ID) {
      await sendMessage(chatId, esc('Unauthorized. This bot is private.'));
      return res.status(200).json({ ok: true });
    }

    const text = message.text.trim();

    // Check if it's a slash command
    if (text.startsWith('/')) {
      const [command, ...argParts] = text.split(/\s+/);
      const args = argParts.join(' ');
      const cmd = command.toLowerCase().replace(/@\w+$/, '');

      switch (cmd) {
        case '/help':
        case '/start':
          await handleHelp(chatId);
          break;
        case '/status':
          await handleStatus(chatId);
          break;
        case '/agents':
          await handleAgents(chatId);
          break;
        case '/launch':
          await handleLaunch(chatId, args);
          break;
        case '/stop':
          await handleStop(chatId, args);
          break;
        case '/complete':
          await handleComplete(chatId, args);
          break;
        case '/tasks':
          await handleTasks(chatId);
          break;
        case '/task':
          await handleTask(chatId, args);
          break;
        case '/roadmap':
          await handleRoadmap(chatId);
          break;
        case '/metrics':
          await handleMetrics(chatId);
          break;
        case '/report':
          await handleReport(chatId);
          break;
        case '/notify':
          await handleNotify(chatId, args);
          break;
        case '/dashboard':
          await handleDashboard(chatId);
          break;
        default:
          // Unknown slash command — send to Claude as well
          await handleFreeText(chatId, text);
      }
    } else {
      // Free text message — send to Claude AI
      await handleFreeText(chatId, text);
    }
  } catch (err) {
    console.error('Telegram handler error:', err);
  }

  return res.status(200).json({ ok: true });
};
