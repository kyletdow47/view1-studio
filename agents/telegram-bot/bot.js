#!/usr/bin/env node
// ============================================================================
// View1 Build Manager — Telegram Bot
// Controls 22 AI agents, manages PRs, sends reports, serves dashboard API
// ============================================================================

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const express = require('express');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIG
// ============================================================================

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = parseInt(process.env.TELEGRAM_CHAT_ID);
const PROJECT_DIR = process.env.PROJECT_DIR || '/Users/kyle/view1-studio';
const RESULTS_DIR = path.join(PROJECT_DIR, 'agents', 'results');
const TASKS_DIR = path.join(PROJECT_DIR, 'agents', 'tasks');
const STATE_FILE = path.join(RESULTS_DIR, 'bot-state.json');
const LOG_FILE = path.join(RESULTS_DIR, 'bot.log');
const API_PORT = 3847; // Dashboard API port

// Ensure dirs exist
[RESULTS_DIR, TASKS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ============================================================================
// AGENT DEFINITIONS
// ============================================================================

const AGENTS = {
  // Engineering
  'eng-arch':      { dept: 'Engineering', name: 'Architect',          icon: '🏗️' },
  'eng-auth':      { dept: 'Engineering', name: 'Auth Engineer',      icon: '🔐' },
  'eng-ui':        { dept: 'Engineering', name: 'UI Engineer',        icon: '🎨' },
  'eng-ai':        { dept: 'Engineering', name: 'AI Engineer',        icon: '🧠' },
  'eng-upload':    { dept: 'Engineering', name: 'Upload Engineer',    icon: '📤' },
  'eng-gallery':   { dept: 'Engineering', name: 'Gallery Engineer',   icon: '🖼️' },
  'eng-stripe':    { dept: 'Engineering', name: 'Payments Engineer',  icon: '💳' },
  'eng-workspace': { dept: 'Engineering', name: 'Workspace Engineer', icon: '📐' },
  // Marketing
  'mktg-landing':  { dept: 'Marketing',   name: 'Landing Page',      icon: '🌐' },
  'mktg-seo':      { dept: 'Marketing',   name: 'SEO Strategist',    icon: '🔍' },
  'mktg-email':    { dept: 'Marketing',   name: 'Email Marketer',    icon: '📧' },
  'mktg-research': { dept: 'Marketing',   name: 'Competitive Intel', icon: '🕵️' },
  // Content
  'content-social':{ dept: 'Content',     name: 'Social Media',      icon: '📱' },
  'content-blog':  { dept: 'Content',     name: 'Blog Writer',       icon: '✍️' },
  'content-video': { dept: 'Content',     name: 'Video Producer',    icon: '🎬' },
  'content-trend': { dept: 'Content',     name: 'Trend Research',    icon: '📈' },
  // QA & Security
  'qa-test':       { dept: 'QA',          name: 'QA Engineer',       icon: '🧪' },
  'qa-security':   { dept: 'QA',          name: 'Security Auditor',  icon: '🛡️' },
  'qa-review':     { dept: 'QA',          name: 'Code Reviewer',     icon: '👁️' },
  // Research
  'research-industry':  { dept: 'Research', name: 'Industry Analyst',icon: '🔬' },
  'research-analytics': { dept: 'Research', name: 'Data Analyst',    icon: '📊' },
  // Business
  'biz-strategy':  { dept: 'Business',    name: 'Strategist',        icon: '♟️' },
  'biz-finance':   { dept: 'Business',    name: 'Finance Monitor',   icon: '💰' },
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let state = {
  agents: {},       // { agentId: { status, startTime, task, branch, prNumber } }
  events: [],       // { time, type, agentId, message }
  metrics: { prsCreated: 0, prsMerged: 0, agentRuns: 0, totalMinutes: 0 },
  taskQueue: [],    // { id, agentId, prompt, priority, createdAt, status: 'queued'|'running'|'done' }
  delegationRules: [], // { fromAgent, toAgent, trigger: 'on_complete', taskPrompt }
  startedAt: new Date().toISOString(),
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) { log('Failed to load state: ' + e.message, 'warn'); }
}

function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) { log('Failed to save state: ' + e.message, 'warn'); }
}

function addEvent(type, agentId, message) {
  state.events.unshift({
    time: new Date().toISOString(),
    type,
    agentId,
    message
  });
  // Keep last 200 events
  if (state.events.length > 200) state.events = state.events.slice(0, 200);
  saveState();
}

// ============================================================================
// LOGGING
// ============================================================================

function log(msg, level = 'info') {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (e) {}
}

// ============================================================================
// SHELL HELPERS
// ============================================================================

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      cwd: PROJECT_DIR,
      timeout: opts.timeout || 30000,
      ...opts
    }).trim();
  } catch (e) {
    return e.stderr || e.message;
  }
}

function shAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: PROJECT_DIR, encoding: 'utf8', timeout: 300000 }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

function tmuxSessions() {
  try {
    return sh('tmux list-sessions -F "#{session_name}" 2>/dev/null').split('\n').filter(Boolean);
  } catch { return []; }
}

function isAgentRunning(agentId) {
  const sessions = tmuxSessions();
  if (!sessions.includes(agentId)) return false;
  // Check if claude is actively running in the session
  try {
    const pid = sh(`tmux list-panes -t "${agentId}" -F "#{pane_pid}" 2>/dev/null`);
    const children = sh(`pgrep -P ${pid} 2>/dev/null`);
    return children.length > 0;
  } catch { return false; }
}

function getOpenPRs() {
  try {
    const raw = sh('gh pr list --json number,title,headBranch,author,createdAt,additions,deletions --state open', { timeout: 15000 });
    return JSON.parse(raw || '[]');
  } catch { return []; }
}

// ============================================================================
// TELEGRAM BOT
// ============================================================================

const bot = new TelegramBot(TOKEN, { polling: true });

// Security: only respond to your chat
function auth(msg) {
  return msg.chat.id === CHAT_ID;
}

async function send(text, opts = {}) {
  try {
    return await bot.sendMessage(CHAT_ID, text, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...opts
    });
  } catch (e) {
    // Fallback: send without markdown if parsing fails
    try {
      return await bot.sendMessage(CHAT_ID, text.replace(/[*_`\[\]]/g, ''), opts);
    } catch (e2) { log('Send failed: ' + e2.message, 'error'); }
  }
}

async function sendHTML(text, opts = {}) {
  try {
    return await bot.sendMessage(CHAT_ID, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...opts
    });
  } catch (e) {
    log('Send HTML failed: ' + e.message, 'error');
  }
}

// ── /start & /help ──────────────────────────────────────────────────────────

bot.onText(/^\/(start|help)$/, (msg) => {
  if (!auth(msg)) return;
  send(`🤖 *View1 Build Manager*

*Agent Control*
/status — Dashboard overview
/agents — Full roster (22 agents)
/launch \`agent-id\` — Start an agent
/stop \`agent-id\` — Stop an agent
/logs \`agent-id\` — Last 50 lines of output

*Autonomous Delegation*
/delegate \`agent-id\` \`prompt\` — Assign a task (auto-launches or queues)
/chain \`agent1\` -> \`agent2\` \`prompt\` — Auto-launch agent2 when agent1 completes
/queue — View pending tasks & chains
/clearqueue — Clear all queued tasks & chains

*Pull Requests*
/prs — List open PRs
/approve \`number\` — Approve a PR
/merge \`number\` — Squash-merge a PR
/diff \`number\` — View PR diff summary

*Reports*
/metrics — Build metrics
/report — Weekly summary
/events — Recent events (last 20)

*System*
/health — Mac Mini system health
/sessions — Active tmux sessions`);
});

// ── /status ─────────────────────────────────────────────────────────────────

bot.onText(/^\/status$/, async (msg) => {
  if (!auth(msg)) return;

  const sessions = tmuxSessions();
  let running = 0, idle = 0;

  Object.keys(AGENTS).forEach(id => {
    if (isAgentRunning(id)) running++;
    else idle++;
  });

  const prs = getOpenPRs();

  let text = `📊 *View1 Status*\n\n`;
  text += `🟢 Running: *${running}*  ⚪ Idle: *${idle}*\n`;
  text += `📋 Open PRs: *${prs.length}*\n`;
  text += `📈 Total runs: *${state.metrics.agentRuns}*\n`;
  text += `✅ PRs merged: *${state.metrics.prsMerged}*\n\n`;

  // List running agents
  if (running > 0) {
    text += `*Active Agents:*\n`;
    Object.entries(AGENTS).forEach(([id, info]) => {
      if (isAgentRunning(id)) {
        const agentState = state.agents[id];
        const elapsed = agentState?.startTime
          ? Math.round((Date.now() - new Date(agentState.startTime).getTime()) / 60000)
          : '?';
        text += `${info.icon} \`${id}\` — ${elapsed}min\n`;
      }
    });
    text += '\n';
  }

  // List open PRs
  if (prs.length > 0) {
    text += `*Pending PRs:*\n`;
    prs.forEach(pr => {
      text += `#${pr.number} ${pr.title} (+${pr.additions}/-${pr.deletions})\n`;
    });
  }

  // Recent events
  const recent = state.events.slice(0, 5);
  if (recent.length > 0) {
    text += `\n*Recent:*\n`;
    recent.forEach(e => {
      const ago = Math.round((Date.now() - new Date(e.time).getTime()) / 60000);
      text += `${ago}m ago: ${e.message}\n`;
    });
  }

  send(text);
});

// ── /agents ─────────────────────────────────────────────────────────────────

bot.onText(/^\/agents$/, (msg) => {
  if (!auth(msg)) return;

  let text = `🤖 *Agent Roster*\n`;
  let currentDept = '';

  Object.entries(AGENTS).forEach(([id, info]) => {
    if (info.dept !== currentDept) {
      currentDept = info.dept;
      text += `\n*${currentDept}*\n`;
    }
    const running = isAgentRunning(id);
    const emoji = running ? '🟢' : '⚪';
    text += `${emoji} ${info.icon} \`${id}\` ${info.name}\n`;
  });

  send(text);
});

// ── /launch <agent-id> ──────────────────────────────────────────────────────

bot.onText(/^\/launch (.+)$/, async (msg, match) => {
  if (!auth(msg)) return;

  const agentId = match[1].trim().toLowerCase();

  if (!AGENTS[agentId]) {
    send(`❌ Unknown agent: \`${agentId}\`\nUse /agents to see the full roster.`);
    return;
  }

  if (isAgentRunning(agentId)) {
    send(`⚠️ \`${agentId}\` is already running. Use /stop ${agentId} first.`);
    return;
  }

  // Look for task file
  const dept = AGENTS[agentId].dept.toLowerCase();
  const taskDir = path.join(TASKS_DIR, dept);
  let taskFile = null;

  if (fs.existsSync(taskDir)) {
    const files = fs.readdirSync(taskDir).filter(f => f.includes(agentId.replace(`${dept.substring(0,3)}-`, '')));
    if (files.length > 0) taskFile = path.join(taskDir, files[0]);
  }

  if (!taskFile) {
    // Check for any task file matching agent ID
    const allTaskDirs = fs.existsSync(TASKS_DIR) ? fs.readdirSync(TASKS_DIR) : [];
    for (const dir of allTaskDirs) {
      const dirPath = path.join(TASKS_DIR, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      const files = fs.readdirSync(dirPath);
      const match = files.find(f => f.toLowerCase().includes(agentId.split('-').pop()));
      if (match) { taskFile = path.join(dirPath, match); break; }
    }
  }

  // Build the launch command
  let launchCmd;
  if (taskFile && fs.existsSync(taskFile)) {
    const task = fs.readFileSync(taskFile, 'utf8');
    send(`🚀 Launching \`${agentId}\` with task: ${path.basename(taskFile)}`);
    launchCmd = `claude --worktree -p "${task.replace(/"/g, '\\"').substring(0, 8000)}" --allowedTools "Read,Write,Edit,Bash,Glob,Grep"`;
  } else {
    send(`🚀 Launching \`${agentId}\` in interactive mode (no task file found in agents/tasks/)`);
    launchCmd = `claude`;
  }

  // Create/attach tmux session and run
  try {
    sh(`tmux kill-session -t ${agentId} 2>/dev/null || true`);
    sh(`tmux new-session -d -s ${agentId} -c "${PROJECT_DIR}"`);
    sh(`tmux send-keys -t ${agentId} '${launchCmd}' Enter`);

    state.agents[agentId] = {
      status: 'running',
      startTime: new Date().toISOString(),
      task: taskFile ? path.basename(taskFile) : 'interactive'
    };
    state.metrics.agentRuns++;
    addEvent('launch', agentId, `${AGENTS[agentId].icon} \`${agentId}\` launched`);

    send(`✅ \`${agentId}\` is now running in tmux session`);
  } catch (e) {
    send(`❌ Failed to launch: ${e.message}`);
  }
});

// ── /stop <agent-id> ────────────────────────────────────────────────────────

bot.onText(/^\/stop (.+)$/, (msg, match) => {
  if (!auth(msg)) return;
  const agentId = match[1].trim().toLowerCase();

  try {
    sh(`tmux kill-session -t ${agentId} 2>/dev/null`);
    if (state.agents[agentId]) {
      state.agents[agentId].status = 'stopped';
    }
    addEvent('stop', agentId, `⏹️ \`${agentId}\` stopped`);
    send(`⏹️ \`${agentId}\` stopped.`);
  } catch (e) {
    send(`❌ Couldn't stop \`${agentId}\`: ${e.message}`);
  }
});

// ── /logs <agent-id> ────────────────────────────────────────────────────────

bot.onText(/^\/logs (.+)$/, (msg, match) => {
  if (!auth(msg)) return;
  const agentId = match[1].trim().toLowerCase();

  try {
    const output = sh(`tmux capture-pane -t ${agentId} -p -S -50 2>/dev/null`);
    if (output) {
      // Truncate for Telegram's 4096 char limit
      const truncated = output.length > 3500 ? '...\n' + output.slice(-3500) : output;
      send(`📋 *Logs: ${agentId}*\n\`\`\`\n${truncated}\n\`\`\``);
    } else {
      send(`⚪ No output from \`${agentId}\` (session may be idle)`);
    }
  } catch {
    send(`❌ No active session for \`${agentId}\``);
  }
});

// ── /prs ────────────────────────────────────────────────────────────────────

bot.onText(/^\/prs$/, (msg) => {
  if (!auth(msg)) return;

  const prs = getOpenPRs();
  if (prs.length === 0) {
    send(`📋 No open PRs.`);
    return;
  }

  let text = `📋 *Open Pull Requests*\n\n`;
  prs.forEach(pr => {
    text += `*#${pr.number}* ${pr.title}\n`;
    text += `  Branch: \`${pr.headBranch}\`\n`;
    text += `  +${pr.additions} / -${pr.deletions}\n\n`;
  });

  const buttons = prs.map(pr => ([
    { text: `✅ Approve #${pr.number}`, data: `approve_${pr.number}` },
    { text: `🔀 Merge #${pr.number}`, data: `merge_${pr.number}` }
  ]));

  send(text, {
    reply_markup: { inline_keyboard: buttons }
  });
});

// ── /approve <number> ───────────────────────────────────────────────────────

bot.onText(/^\/approve (\d+)$/, async (msg, match) => {
  if (!auth(msg)) return;
  const pr = match[1];

  try {
    sh(`gh pr review ${pr} --approve -b "Approved via Telegram bot"`, { timeout: 15000 });
    addEvent('approve', null, `✅ PR #${pr} approved`);
    send(`✅ PR #${pr} approved!`);
  } catch (e) {
    send(`❌ Failed to approve PR #${pr}: ${e.message}`);
  }
});

// ── /merge <number> ─────────────────────────────────────────────────────────

bot.onText(/^\/merge (\d+)$/, async (msg, match) => {
  if (!auth(msg)) return;
  const pr = match[1];

  try {
    sh(`gh pr merge ${pr} --squash --delete-branch`, { timeout: 30000 });
    state.metrics.prsMerged++;
    addEvent('merge', null, `🔀 PR #${pr} merged`);
    saveState();
    send(`🔀 PR #${pr} merged and branch deleted!`);
  } catch (e) {
    send(`❌ Failed to merge PR #${pr}: ${e.message}`);
  }
});

// ── /diff <number> ──────────────────────────────────────────────────────────

bot.onText(/^\/diff (\d+)$/, async (msg, match) => {
  if (!auth(msg)) return;
  const pr = match[1];

  try {
    const diff = sh(`gh pr diff ${pr} --stat`, { timeout: 15000 });
    const truncated = diff.length > 3500 ? diff.slice(0, 3500) + '\n...' : diff;
    send(`📝 *PR #${pr} Diff*\n\`\`\`\n${truncated}\n\`\`\``);
  } catch (e) {
    send(`❌ Failed to get diff: ${e.message}`);
  }
});

// ── /metrics ────────────────────────────────────────────────────────────────

bot.onText(/^\/metrics$/, (msg) => {
  if (!auth(msg)) return;

  let text = `📈 *Build Metrics*\n\n`;
  text += `Agent runs: *${state.metrics.agentRuns}*\n`;
  text += `PRs created: *${state.metrics.prsCreated}*\n`;
  text += `PRs merged: *${state.metrics.prsMerged}*\n`;

  // Git stats
  try {
    const commits = sh('git log --oneline --since="7 days ago" | wc -l').trim();
    const lines = sh('git diff --stat HEAD~20 2>/dev/null | tail -1').trim();
    text += `Commits (7d): *${commits}*\n`;
    text += `Recent changes: ${lines}\n`;
  } catch {}

  // Disk & system
  try {
    const disk = sh('df -h / | tail -1 | awk \'{print $4}\'');
    text += `\nDisk free: *${disk}*\n`;
  } catch {}

  send(text);
});

// ── /events ─────────────────────────────────────────────────────────────────

bot.onText(/^\/events$/, (msg) => {
  if (!auth(msg)) return;

  const recent = state.events.slice(0, 20);
  if (recent.length === 0) {
    send(`📜 No events recorded yet.`);
    return;
  }

  let text = `📜 *Recent Events*\n\n`;
  recent.forEach(e => {
    const time = new Date(e.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    text += `\`${time}\` ${e.message}\n`;
  });

  send(text);
});

// ── /health ─────────────────────────────────────────────────────────────────

bot.onText(/^\/health$/, (msg) => {
  if (!auth(msg)) return;

  const uptime = sh('uptime');
  const memory = sh('vm_stat | head -5');
  const disk = sh('df -h / | tail -1');
  const nodeVer = sh('node -v');
  const sessions = tmuxSessions();

  send(`🖥️ *Mac Mini Health*

Uptime: \`${uptime}\`
Node: \`${nodeVer}\`
Disk: \`${disk}\`
tmux sessions: *${sessions.length}*
Bot uptime: since ${state.startedAt}`);
});

// ── /sessions ───────────────────────────────────────────────────────────────

bot.onText(/^\/sessions$/, (msg) => {
  if (!auth(msg)) return;
  const sessions = tmuxSessions();
  if (sessions.length === 0) {
    send(`⚪ No active tmux sessions.`);
    return;
  }
  send(`🖥️ *Active Sessions (${sessions.length})*\n\n\`\`\`\n${sessions.join('\n')}\n\`\`\``);
});

// ── /report ─────────────────────────────────────────────────────────────────

bot.onText(/^\/report$/, (msg) => {
  if (!auth(msg)) return;
  generateWeeklyReport();
});

async function generateWeeklyReport() {
  let text = `📊 *Weekly Report — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}*\n`;
  text += `━━━━━━━━━━━━━━━━━━\n\n`;

  // Engineering
  text += `🔧 *Engineering*\n`;
  text += `Agent runs: ${state.metrics.agentRuns}\n`;
  text += `PRs merged: ${state.metrics.prsMerged}\n`;
  try {
    const commits = sh('git log --oneline --since="7 days ago" | wc -l').trim();
    const authors = sh('git log --format="%an" --since="7 days ago" | sort -u | wc -l').trim();
    text += `Commits: ${commits}\n`;
  } catch {}

  // Tests
  try {
    const testResult = sh('cd apps/photo-sorter && npm test 2>&1 | tail -3', { timeout: 60000 });
    text += `\n🧪 *Tests*\n\`${testResult}\`\n`;
  } catch {
    text += `\n🧪 *Tests*: not configured yet\n`;
  }

  // Events summary
  const weekEvents = state.events.filter(e =>
    new Date(e.time) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  text += `\n📜 *Events this week:* ${weekEvents.length}\n`;

  // Open PRs
  const prs = getOpenPRs();
  text += `\n📋 *Open PRs:* ${prs.length}\n`;
  prs.forEach(pr => {
    text += `  #${pr.number} ${pr.title}\n`;
  });

  text += `\n_Report generated ${new Date().toLocaleString()}_`;

  send(text);

  // Also save to file
  const reportFile = path.join(RESULTS_DIR, `weekly-report-${new Date().toISOString().split('T')[0]}.md`);
  fs.writeFileSync(reportFile, text.replace(/\*/g, '').replace(/_/g, ''));
  log('Weekly report generated');
}

// ── /delegate <agent-id> <prompt> ──────────────────────────────────────────

bot.onText(/^\/delegate (\S+)\s+(.+)$/s, async (msg, match) => {
  if (!auth(msg)) return;

  const agentId = match[1].trim().toLowerCase();
  const prompt = match[2].trim();

  if (!AGENTS[agentId]) {
    send(`❌ Unknown agent: \`${agentId}\`\nUse /agents to see the roster.`);
    return;
  }

  const taskId = `task-${Date.now()}`;
  const task = { id: taskId, agentId, prompt, priority: 1, createdAt: new Date().toISOString(), status: 'queued' };

  if (!state.taskQueue) state.taskQueue = [];
  state.taskQueue.push(task);
  saveState();

  // If agent is idle, launch immediately
  if (!isAgentRunning(agentId)) {
    await launchAgentWithPrompt(agentId, prompt, taskId);
    send(`🚀 Delegated to \`${agentId}\`: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
  } else {
    const position = state.taskQueue.filter(t => t.agentId === agentId && t.status === 'queued').length;
    send(`📋 Queued for \`${agentId}\` (position #${position}): ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
  }

  addEvent('delegate', agentId, `📋 Task delegated to ${AGENTS[agentId].icon} \`${agentId}\``);
});

// ── /chain <agent1> -> <agent2> <prompt> ──────────────────────────────────

bot.onText(/^\/chain (\S+)\s*->\s*(\S+)\s+(.+)$/s, async (msg, match) => {
  if (!auth(msg)) return;

  const fromAgent = match[1].trim().toLowerCase();
  const toAgent = match[2].trim().toLowerCase();
  const taskPrompt = match[3].trim();

  if (!AGENTS[fromAgent]) { send(`❌ Unknown agent: \`${fromAgent}\``); return; }
  if (!AGENTS[toAgent]) { send(`❌ Unknown agent: \`${toAgent}\``); return; }

  if (!state.delegationRules) state.delegationRules = [];
  state.delegationRules.push({
    id: `rule-${Date.now()}`,
    fromAgent,
    toAgent,
    trigger: 'on_complete',
    taskPrompt,
    createdAt: new Date().toISOString(),
    active: true,
  });
  saveState();

  send(`🔗 Chain created: when \`${fromAgent}\` completes → auto-launch \`${toAgent}\`\nTask: ${taskPrompt.substring(0, 120)}${taskPrompt.length > 120 ? '...' : ''}`);
  addEvent('chain', fromAgent, `🔗 Chain: ${AGENTS[fromAgent].icon} \`${fromAgent}\` → ${AGENTS[toAgent].icon} \`${toAgent}\``);
});

// ── /queue — show pending tasks ───────────────────────────────────────────

bot.onText(/^\/queue$/, (msg) => {
  if (!auth(msg)) return;

  const queued = (state.taskQueue || []).filter(t => t.status === 'queued');
  const rules = (state.delegationRules || []).filter(r => r.active);

  if (queued.length === 0 && rules.length === 0) {
    send(`📋 No queued tasks or active chains.`);
    return;
  }

  let text = `📋 *Task Queue & Chains*\n\n`;

  if (queued.length > 0) {
    text += `*Queued Tasks (${queued.length}):*\n`;
    queued.forEach((t, i) => {
      text += `${i + 1}. ${AGENTS[t.agentId]?.icon || '🤖'} \`${t.agentId}\` — ${t.prompt.substring(0, 60)}${t.prompt.length > 60 ? '...' : ''}\n`;
    });
    text += '\n';
  }

  if (rules.length > 0) {
    text += `*Active Chains (${rules.length}):*\n`;
    rules.forEach(r => {
      text += `🔗 \`${r.fromAgent}\` → \`${r.toAgent}\`: ${r.taskPrompt.substring(0, 60)}${r.taskPrompt.length > 60 ? '...' : ''}\n`;
    });
  }

  send(text);
});

// ── /clearqueue — remove all queued tasks and chains ──────────────────────

bot.onText(/^\/clearqueue$/, (msg) => {
  if (!auth(msg)) return;
  const queuedCount = (state.taskQueue || []).filter(t => t.status === 'queued').length;
  const rulesCount = (state.delegationRules || []).filter(r => r.active).length;
  state.taskQueue = (state.taskQueue || []).filter(t => t.status !== 'queued');
  (state.delegationRules || []).forEach(r => { r.active = false; });
  saveState();
  send(`🗑️ Cleared ${queuedCount} queued tasks and ${rulesCount} chains.`);
});

// ── Autonomous delegation helpers ─────────────────────────────────────────

async function launchAgentWithPrompt(agentId, prompt, taskId) {
  try {
    sh(`tmux kill-session -t ${agentId} 2>/dev/null || true`);
    sh(`tmux new-session -d -s ${agentId} -c "${PROJECT_DIR}"`);

    const escapedPrompt = prompt.replace(/'/g, "'\\''").substring(0, 8000);
    const launchCmd = `claude --worktree -p '${escapedPrompt}' --allowedTools "Read,Write,Edit,Bash,Glob,Grep"`;
    sh(`tmux send-keys -t ${agentId} '${launchCmd}' Enter`);

    state.agents[agentId] = {
      status: 'running',
      startTime: new Date().toISOString(),
      task: prompt.substring(0, 200),
      taskId,
    };
    state.metrics.agentRuns++;

    // Mark task as running
    if (taskId) {
      const task = (state.taskQueue || []).find(t => t.id === taskId);
      if (task) task.status = 'running';
    }

    saveState();
    addEvent('launch', agentId, `${AGENTS[agentId].icon} \`${agentId}\` auto-launched`);
    return true;
  } catch (e) {
    log(`Failed to auto-launch ${agentId}: ${e.message}`, 'error');
    return false;
  }
}

function processAgentCompletion(agentId) {
  // Mark current task as done
  const agentState = state.agents[agentId];
  if (agentState?.taskId) {
    const task = (state.taskQueue || []).find(t => t.id === agentState.taskId);
    if (task) task.status = 'done';
  }

  // Check delegation chains: auto-launch chained agent
  const rules = (state.delegationRules || []).filter(r => r.active && r.fromAgent === agentId);
  rules.forEach(async (rule) => {
    const taskId = `task-${Date.now()}`;
    const task = {
      id: taskId, agentId: rule.toAgent, prompt: rule.taskPrompt,
      priority: 1, createdAt: new Date().toISOString(), status: 'queued',
    };
    state.taskQueue.push(task);

    if (!isAgentRunning(rule.toAgent)) {
      const launched = await launchAgentWithPrompt(rule.toAgent, rule.taskPrompt, taskId);
      if (launched) {
        send(`🔗 *Chain triggered:* \`${agentId}\` completed → auto-launching ${AGENTS[rule.toAgent].icon} \`${rule.toAgent}\`\nTask: ${rule.taskPrompt.substring(0, 100)}${rule.taskPrompt.length > 100 ? '...' : ''}`);
      }
    }
    // One-shot: deactivate rule after firing
    rule.active = false;
    saveState();
  });

  // Check task queue: auto-launch next queued task for this agent
  const nextTask = (state.taskQueue || []).find(t => t.agentId === agentId && t.status === 'queued');
  if (nextTask && !rules.length) {
    setTimeout(async () => {
      if (!isAgentRunning(agentId)) {
        const launched = await launchAgentWithPrompt(agentId, nextTask.prompt, nextTask.id);
        if (launched) {
          send(`📋 *Auto-delegated:* next queued task for ${AGENTS[agentId].icon} \`${agentId}\`\nTask: ${nextTask.prompt.substring(0, 100)}${nextTask.prompt.length > 100 ? '...' : ''}`);
        }
      }
    }, 5000); // Brief delay to let tmux session clean up
  }
}

// ── Inline keyboard callback handler ────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const data = query.data;

  if (data.startsWith('approve_')) {
    const pr = data.split('_')[1];
    try {
      sh(`gh pr review ${pr} --approve -b "Approved via Telegram"`, { timeout: 15000 });
      state.metrics.prsCreated++; // track approvals
      addEvent('approve', null, `✅ PR #${pr} approved`);
      bot.answerCallbackQuery(query.id, { text: `PR #${pr} approved!` });
      bot.editMessageText(
        query.message.text + `\n\n✅ *PR #${pr} approved*`,
        { chat_id: CHAT_ID, message_id: query.message.message_id, parse_mode: 'Markdown' }
      );
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: `Failed: ${e.message}` });
    }
  }

  if (data.startsWith('merge_')) {
    const pr = data.split('_')[1];
    try {
      sh(`gh pr merge ${pr} --squash --delete-branch`, { timeout: 30000 });
      state.metrics.prsMerged++;
      addEvent('merge', null, `🔀 PR #${pr} merged`);
      saveState();
      bot.answerCallbackQuery(query.id, { text: `PR #${pr} merged!` });
      bot.editMessageText(
        query.message.text + `\n\n🔀 *PR #${pr} merged*`,
        { chat_id: CHAT_ID, message_id: query.message.message_id, parse_mode: 'Markdown' }
      );
    } catch (e) {
      bot.answerCallbackQuery(query.id, { text: `Failed: ${e.message}` });
    }
  }
});

// ============================================================================
// SCHEDULED TASKS (CRON)
// ============================================================================

// Morning briefing — 8:00 AM daily
cron.schedule('0 8 * * *', () => {
  log('Sending morning briefing');

  let text = `🌅 *Morning Briefing — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}*\n\n`;

  // Overnight events
  const overnight = state.events.filter(e => {
    const t = new Date(e.time);
    const now = new Date();
    return (now - t) < 12 * 60 * 60 * 1000; // last 12 hours
  });

  if (overnight.length > 0) {
    text += `*Overnight Activity:*\n`;
    overnight.forEach(e => text += `• ${e.message}\n`);
    text += '\n';
  } else {
    text += `_No overnight activity._\n\n`;
  }

  // Open PRs
  const prs = getOpenPRs();
  if (prs.length > 0) {
    text += `*Awaiting Review (${prs.length}):*\n`;
    prs.forEach(pr => text += `• #${pr.number} ${pr.title}\n`);
    text += '\n';
  }

  // Running agents
  const running = Object.keys(AGENTS).filter(id => isAgentRunning(id));
  if (running.length > 0) {
    text += `*Currently Running:*\n`;
    running.forEach(id => text += `• ${AGENTS[id].icon} \`${id}\`\n`);
  } else {
    text += `⚪ No agents running. Use /launch to start today's work.\n`;
  }

  send(text);
});

// Weekly report — Friday 5:00 PM
cron.schedule('0 17 * * 5', () => {
  log('Generating weekly report');
  generateWeeklyReport();
});

// Agent health check — every 30 minutes
cron.schedule('*/30 * * * *', () => {
  Object.keys(AGENTS).forEach(id => {
    const agentState = state.agents[id];
    if (agentState?.status === 'running' && !isAgentRunning(id)) {
      // Agent was running but tmux session ended — it finished or crashed
      const elapsed = agentState.startTime
        ? Math.round((Date.now() - new Date(agentState.startTime).getTime()) / 60000)
        : 0;

      state.agents[id].status = 'completed';
      state.metrics.totalMinutes += elapsed;

      // Check if a PR was created
      const prs = getOpenPRs();
      const agentPR = prs.find(pr => pr.headBranch.includes(id));

      if (agentPR) {
        state.metrics.prsCreated++;
        addEvent('complete', id, `✅ ${AGENTS[id].icon} \`${id}\` done (${elapsed}min) — PR #${agentPR.number}`);

        send(`✅ *${AGENTS[id].icon} ${id} completed* in ${elapsed}min\n\nPR #${agentPR.number}: ${agentPR.title}\n+${agentPR.additions} / -${agentPR.deletions}`, {
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Approve', callback_data: `approve_${agentPR.number}` },
              { text: '🔀 Merge', callback_data: `merge_${agentPR.number}` }
            ]]
          }
        });
      } else {
        addEvent('complete', id, `⚪ ${AGENTS[id].icon} \`${id}\` finished (${elapsed}min) — no PR created`);
        send(`⚪ ${AGENTS[id].icon} \`${id}\` finished (${elapsed}min) but no PR was created. Check /logs ${id}`);
      }

      saveState();

      // Trigger autonomous delegation (queue + chains)
      processAgentCompletion(id);
    }
  });
});

// ============================================================================
// EXPRESS API (for Vercel Dashboard)
// ============================================================================

const app = express();
app.use(express.json());

// CORS for dashboard
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Dashboard data endpoint
app.get('/api/status', (req, res) => {
  const agentList = Object.entries(AGENTS).map(([id, info]) => ({
    id,
    ...info,
    running: isAgentRunning(id),
    state: state.agents[id] || { status: 'idle' }
  }));

  res.json({
    agents: agentList,
    events: state.events.slice(0, 50),
    metrics: state.metrics,
    prs: getOpenPRs(),
    startedAt: state.startedAt
  });
});

// Agent action endpoint (from dashboard)
app.post('/api/action', (req, res) => {
  const { action, agentId, prNumber } = req.body;

  try {
    if (action === 'launch' && agentId) {
      sh(`tmux new-session -d -s ${agentId} -c "${PROJECT_DIR}" 2>/dev/null || true`);
      sh(`tmux send-keys -t ${agentId} 'claude' Enter`);
      state.agents[agentId] = { status: 'running', startTime: new Date().toISOString() };
      state.metrics.agentRuns++;
      addEvent('launch', agentId, `${AGENTS[agentId]?.icon || '🤖'} \`${agentId}\` launched from dashboard`);
      saveState();
      res.json({ ok: true, message: `${agentId} launched` });
    } else if (action === 'stop' && agentId) {
      sh(`tmux kill-session -t ${agentId} 2>/dev/null`);
      addEvent('stop', agentId, `⏹️ \`${agentId}\` stopped from dashboard`);
      saveState();
      res.json({ ok: true, message: `${agentId} stopped` });
    } else if (action === 'approve' && prNumber) {
      sh(`gh pr review ${prNumber} --approve`, { timeout: 15000 });
      addEvent('approve', null, `✅ PR #${prNumber} approved from dashboard`);
      res.json({ ok: true });
    } else if (action === 'merge' && prNumber) {
      sh(`gh pr merge ${prNumber} --squash --delete-branch`, { timeout: 30000 });
      state.metrics.prsMerged++;
      addEvent('merge', null, `🔀 PR #${prNumber} merged from dashboard`);
      saveState();
      res.json({ ok: true });
    } else {
      res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delegation endpoint (from dashboard)
app.post('/api/delegate', async (req, res) => {
  const { agentId, prompt } = req.body;

  if (!agentId || !prompt) {
    return res.status(400).json({ error: 'agentId and prompt required' });
  }
  if (!AGENTS[agentId]) {
    return res.status(400).json({ error: `Unknown agent: ${agentId}` });
  }

  const taskId = `task-${Date.now()}`;
  const task = { id: taskId, agentId, prompt, priority: 1, createdAt: new Date().toISOString(), status: 'queued' };

  if (!state.taskQueue) state.taskQueue = [];
  state.taskQueue.push(task);

  if (!isAgentRunning(agentId)) {
    await launchAgentWithPrompt(agentId, prompt, taskId);
    res.json({ ok: true, taskId, message: `${agentId} launched with task` });
  } else {
    saveState();
    res.json({ ok: true, taskId, message: `Task queued for ${agentId}` });
  }
});

// Task queue endpoint
app.get('/api/queue', (req, res) => {
  res.json({
    queue: (state.taskQueue || []).filter(t => t.status === 'queued'),
    chains: (state.delegationRules || []).filter(r => r.active),
  });
});

// Events stream endpoint
app.get('/api/events', (req, res) => {
  res.json(state.events.slice(0, parseInt(req.query.limit) || 50));
});

app.listen(API_PORT, '0.0.0.0', () => {
  log(`Dashboard API running on http://0.0.0.0:${API_PORT}`);
});

// ============================================================================
// STARTUP
// ============================================================================

loadState();
log('View1 Build Manager bot started');
log(`Monitoring ${Object.keys(AGENTS).length} agents`);
log(`Dashboard API on port ${API_PORT}`);

send(`🤖 *View1 Build Manager online*
${Object.keys(AGENTS).length} agents registered
Dashboard API on port ${API_PORT}
Type /help for commands`);
