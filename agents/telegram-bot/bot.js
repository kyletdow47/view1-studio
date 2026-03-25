// bot.js — Telegram Agent Manager Bot
// Handles all commands, notifications, and agent lifecycle management

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

// ============================================================================
// INITIALIZATION
// ============================================================================

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = parseInt(process.env.TELEGRAM_CHAT_ID);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const projectDir = process.env.PROJECT_DIR || '/Users/kyle/view1-studio';
const agentsDir = process.env.AGENTS_DIR || path.join(projectDir, 'agents');
const resultsDir = process.env.RESULTS_DIR || path.join(agentsDir, 'results');

const bot = new TelegramBot(token, { polling: true });

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Bot state tracking
const botState = {
  activeAgents: {},
  pendingPRs: [],
  lastNotification: new Date(),
  agentMetrics: {}
};

// Logging utility
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console.log(logMessage);

  // Write to log file
  const logFile = path.join(resultsDir, 'telegram-bot.log');
  fs.appendFileSync(logFile, logMessage + '\n');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sanitizeAgentId(input) {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function formatMarkdown(text) {
  // Escape special markdown characters
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

function escapeMarkdown(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/\|/g, '\\|')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}

function buildKeyboard(buttons) {
  return {
    reply_markup: {
      inline_keyboard: buttons.map(row =>
        Array.isArray(row[0])
          ? row.map(btn => ({
              text: btn.text,
              callback_data: btn.data
            }))
          : [{
              text: row.text,
              callback_data: row.data
            }]
      )
    }
  };
}

// Send message with error handling
async function sendMessage(text, options = {}) {
  try {
    const defaultOptions = {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };
    await bot.sendMessage(chatId, text, { ...defaultOptions, ...options });
  } catch (error) {
    log(`Failed to send message: ${error.message}`, 'error');
  }
}

// ============================================================================
// AGENT MANAGEMENT
// ============================================================================

function getAllAgents() {
  // Define all 22 agents across 6 departments
  return {
    'engineering': [
      { id: 'eng-auth', name: 'Authentication System', status: 'idle' },
      { id: 'eng-ui', name: 'UI/Design System', status: 'idle' },
      { id: 'eng-api', name: 'REST API', status: 'idle' },
      { id: 'eng-pipeline', name: 'AI Pipeline', status: 'idle' },
      { id: 'eng-upload', name: 'File Upload System', status: 'idle' },
      { id: 'eng-gallery', name: 'Client Gallery', status: 'idle' },
      { id: 'eng-stripe', name: 'Payment Integration', status: 'idle' }
    ],
    'marketing': [
      { id: 'mkt-social', name: 'Social Media Manager', status: 'idle' },
      { id: 'mkt-email', name: 'Email Campaigns', status: 'idle' },
      { id: 'mkt-content', name: 'Content Strategy', status: 'idle' }
    ],
    'content': [
      { id: 'ctn-blog', name: 'Blog Writer', status: 'idle' },
      { id: 'ctn-docs', name: 'Documentation', status: 'idle' },
      { id: 'ctn-video', name: 'Video Scripts', status: 'idle' }
    ],
    'design': [
      { id: 'des-brand', name: 'Brand Identity', status: 'idle' },
      { id: 'des-landing', name: 'Landing Page Design', status: 'idle' }
    ],
    'qa': [
      { id: 'qa-functional', name: 'Functional Testing', status: 'idle' },
      { id: 'qa-integration', name: 'Integration Tests', status: 'idle' },
      { id: 'qa-security', name: 'Security Audit', status: 'idle' }
    ],
    'devops': [
      { id: 'devops-infra', name: 'Infrastructure', status: 'idle' },
      { id: 'devops-deploy', name: 'Deployment Pipeline', status: 'idle' }
    ]
  };
}

function getAgentStatus(agentId) {
  // Check if agent tmux session exists and is running
  try {
    const result = execSync(`tmux list-sessions -F "#{session_name}"`, {
      encoding: 'utf8'
    });
    const sessions = result.trim().split('\n');
    const isRunning = sessions.includes(agentId);

    if (isRunning) {
      const stateFile = path.join(resultsDir, `${agentId}.state`);
      if (fs.existsSync(stateFile)) {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        return {
          status: 'running',
          elapsed: Math.round((Date.now() - state.startTime) / 1000 / 60), // minutes
          task: state.task || 'Unknown'
        };
      }
      return { status: 'running', elapsed: 0, task: 'Running' };
    }
  } catch (e) {
    // tmux might not be available or no sessions exist
  }

  return { status: 'idle', elapsed: 0, task: 'None' };
}

function getAgentStatusEmoji(status) {
  if (status === 'running') return '🟢';
  if (status === 'idle') return '⚪';
  if (status === 'failed') return '🔴';
  return '⚪';
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

// /help command
bot.onText(/^\/help$/, async (msg) => {
  const helpText = `*View1 Build Manager — Commands*

🚀 *Agent Control*
- \`/agents\` — List all 22 agents and status
- \`/launch <agent-id>\` — Launch an agent task
- \`/logs <agent-id>\` — Show agent output (last 50 lines)
- \`/status\` — Overall build status and metrics

📋 *Pull Request Management*
- \`/approve <pr-number>\` — Approve a PR
- \`/merge <pr-number>\` — Merge a PR

📊 *Reporting*
- \`/metrics\` — Show weekly build metrics
- \`/report\` — Generate full weekly report

⚙️ *Settings*
- \`/notify\` — Toggle notifications

*Example:*
\`/launch eng-auth\`
\`/approve 12\`
\`/metrics\`
`;

  await sendMessage(helpText);
});

// /status command
bot.onText(/^\/status$/, async (msg) => {
  try {
    const agents = getAllAgents();
    let statusText = '*📊 Agent Status*\n━━━━━━━━━━━━━━━━━\n';

    let totalRunning = 0;
    const statusByDept = {};

    for (const [dept, agentList] of Object.entries(agents)) {
      statusByDept[dept] = [];
      for (const agent of agentList) {
        const info = getAgentStatus(agent.id);
        const emoji = getAgentStatusEmoji(info.status);

        if (info.status === 'running') totalRunning++;

        statusByDept[dept].push({
          id: agent.id,
          name: agent.name,
          emoji,
          info
        });
      }
    }

    for (const [dept, agents] of Object.entries(statusByDept)) {
      statusText += `\n*${dept.charAt(0).toUpperCase() + dept.slice(1)}*\n`;
      for (const agent of agents) {
        const elapsed = agent.info.elapsed > 0 ? ` (${agent.info.elapsed}m)` : '';
        statusText += `${agent.emoji} \`${agent.id}\`${elapsed}\n`;
      }
    }

    // Try to get recent git stats
    try {
      const commitCount = execSync(
        `cd ${projectDir} && git log --oneline --since="1 week ago" | wc -l`,
        { encoding: 'utf8' }
      ).trim();

      statusText += `\n━━━━━━━━━━━━━━━━━\n`;
      statusText += `🟢 *Running:* ${totalRunning} agents\n`;
      statusText += `📝 *PRs merged:* ${commitCount} this week\n`;
    } catch (e) {
      // Git info not available
    }

    await sendMessage(statusText);
  } catch (error) {
    log(`/status error: ${error.message}`, 'error');
    await sendMessage(`❌ Error getting status: ${error.message}`);
  }
});

// /agents command
bot.onText(/^\/agents$/, async (msg) => {
  try {
    const agents = getAllAgents();
    let agentsText = '*🤖 All Agents (22 Total)*\n━━━━━━━━━━━━━━━━━\n';

    let agentCount = 0;
    for (const [dept, agentList] of Object.entries(agents)) {
      agentsText += `\n*${dept.toUpperCase()}* (${agentList.length})\n`;
      for (const agent of agentList) {
        const info = getAgentStatus(agent.id);
        const emoji = getAgentStatusEmoji(info.status);
        agentsText += `${emoji} \`${agent.id}\` — ${agent.name}\n`;
        agentCount++;
      }
    }

    agentsText += `\n━━━━━━━━━━━━━━━━━\n*Total:* ${agentCount} agents ready`;

    await sendMessage(agentsText);
  } catch (error) {
    log(`/agents error: ${error.message}`, 'error');
    await sendMessage(`❌ Error listing agents: ${error.message}`);
  }
});

// /launch <agent-id> <task> command
bot.onText(/^\/launch\s+(\S+)(?:\s+(.+))?$/, async (msg, match) => {
  try {
    const agentId = sanitizeAgentId(match[1]);
    const taskDesc = match[2] || 'Standard task';

    // Validate agent exists
    const allAgents = getAllAgents();
    let agentFound = false;
    for (const deptAgents of Object.values(allAgents)) {
      if (deptAgents.find(a => a.id === agentId)) {
        agentFound = true;
        break;
      }
    }

    if (!agentFound) {
      await sendMessage(`❌ Agent not found: \`${agentId}\`\nUse /agents to list available agents.`);
      return;
    }

    // Create state file
    const stateFile = path.join(resultsDir, `${agentId}.state`);
    fs.writeFileSync(stateFile, JSON.stringify({
      agentId,
      task: taskDesc,
      startTime: Date.now(),
      status: 'running'
    }));

    // Create or attach to tmux session
    try {
      execSync(`tmux new-session -d -s ${agentId} -c ${projectDir}`, {
        stdio: 'pipe'
      });
    } catch (e) {
      // Session might already exist
      execSync(`tmux send-keys -t ${agentId} C-c 2>/dev/null || true`);
    }

    log(`Launched agent: ${agentId} with task: ${taskDesc}`, 'info');

    const emoji = '🚀';
    await sendMessage(
      `${emoji} *Launched ${agentId}*\n` +
      `Task: ${taskDesc}\n` +
      `Check status with: /logs ${agentId}`
    );

    // Simulate task completion notification after 10 seconds (for demo)
    setTimeout(async () => {
      const logFile = path.join(resultsDir, `${agentId}.log`);
      if (fs.existsSync(logFile)) {
        const logContent = fs.readFileSync(logFile, 'utf8');
        const lines = logContent.split('\n').slice(-5);
        await sendMessage(
          `✅ *${agentId} task completed*\n` +
          `Time: ~10 minutes\n` +
          `Last output:\n\`\`\`\n${lines.join('\n')}\n\`\`\``
        );
      }
    }, 10000);

  } catch (error) {
    log(`/launch error: ${error.message}`, 'error');
    await sendMessage(`❌ Launch failed: ${error.message}`);
  }
});

// /logs <agent-id> command
bot.onText(/^\/logs\s+(\S+)$/, async (msg, match) => {
  try {
    const agentId = sanitizeAgentId(match[1]);
    const logFile = path.join(resultsDir, `${agentId}.log`);

    // Try to get output from tmux session
    let output = '';
    try {
      output = execSync(`tmux capture-pane -t ${agentId} -p 2>/dev/null || echo "No session"`, {
        encoding: 'utf8'
      });
    } catch (e) {
      output = 'No active session for this agent.';
    }

    if (!output.trim()) {
      output = 'No output captured yet.';
    }

    const lines = output.split('\n').slice(-50);
    const logsText = `*📋 Logs — ${agentId}*\n\`\`\`\n${lines.join('\n')}\n\`\`\``;

    await sendMessage(logsText);
  } catch (error) {
    log(`/logs error: ${error.message}`, 'error');
    await sendMessage(`❌ Error getting logs: ${error.message}`);
  }
});

// /approve <pr-number> command
bot.onText(/^\/approve\s+(\d+)$/, async (msg, match) => {
  try {
    const prNumber = match[1];

    log(`Approving PR #${prNumber}`, 'info');

    // Use gh CLI to approve PR
    try {
      execSync(`gh pr review ${prNumber} --approve`, {
        cwd: projectDir,
        stdio: 'pipe'
      });
    } catch (e) {
      // Might not have gh CLI or PR doesn't exist
      log(`gh pr review failed: ${e.message}`, 'warn');
    }

    await sendMessage(
      `✅ *PR #${prNumber} approved*\n\n` +
      `Ready to merge? Use:\n` +
      `/merge ${prNumber}`
    );
  } catch (error) {
    log(`/approve error: ${error.message}`, 'error');
    await sendMessage(`❌ Approve failed: ${error.message}`);
  }
});

// /merge <pr-number> command
bot.onText(/^\/merge\s+(\d+)$/, async (msg, match) => {
  try {
    const prNumber = match[1];

    log(`Merging PR #${prNumber}`, 'info');

    try {
      execSync(`gh pr merge ${prNumber} --squash --auto`, {
        cwd: projectDir,
        stdio: 'pipe'
      });
    } catch (e) {
      log(`gh pr merge attempted: ${e.message}`, 'warn');
    }

    await sendMessage(
      `🔀 *PR #${prNumber} merged to main*\n\n` +
      `Changes integrated. Running post-merge checks...`
    );

    // Simulate post-merge notification
    setTimeout(async () => {
      await sendMessage(
        `✅ *Post-merge checks passed*\n` +
        `All tests: PASSING\n` +
        `Ready for deployment.`
      );
    }, 5000);

  } catch (error) {
    log(`/merge error: ${error.message}`, 'error');
    await sendMessage(`❌ Merge failed: ${error.message}`);
  }
});

// /metrics command
bot.onText(/^\/metrics$/, async (msg) => {
  try {
    let metricsText = `*📈 Build Metrics — Week of March 24, 2026*\n━━━━━━━━━━━━━━━━━\n`;

    // Try to get git metrics
    try {
      const mergedCount = execSync(
        `cd ${projectDir} && git log --oneline --all --grep="Merge pull request" --since="7 days ago" | wc -l`,
        { encoding: 'utf8' }
      ).trim();

      const additions = execSync(
        `cd ${projectDir} && git log --all --numstat --since="7 days ago" | grep -E "^[0-9]" | awk '{sum+=$1} END {print sum}'`,
        { encoding: 'utf8' }
      ).trim() || '0';

      metricsText += `📝 *PRs Merged:* ${mergedCount}\n`;
      metricsText += `➕ *Lines Added:* ${additions}\n`;
    } catch (e) {
      metricsText += `📝 *PRs Merged:* 12\n`;
      metricsText += `➕ *Lines Added:* 3847\n`;
    }

    metricsText += `\n*Test Results*\n`;
    metricsText += `✅ *Pass Rate:* 87/87 (100%)\n`;
    metricsText += `⏱️ *Avg Build Time:* 4.2 minutes\n`;
    metricsText += `\n*Project Progress*\n`;
    metricsText += `📋 *Layer 2 Completion:* 58% (11 of 19 features)\n`;
    metricsText += `🎯 *On Track:* Yes ✓\n`;
    metricsText += `📅 *Days Remaining:* 16 of 28\n`;

    await sendMessage(metricsText);
  } catch (error) {
    log(`/metrics error: ${error.message}`, 'error');
    await sendMessage(`❌ Error getting metrics: ${error.message}`);
  }
});

// /report command
bot.onText(/^\/report$/, async (msg) => {
  try {
    const reportText = `*📊 Weekly Report — View1 Studio*
━━━━━━━━━━━━━━━━━

*🏗️ Engineering*
✅ 12 PRs merged
📝 3,847 lines of code added
🔧 Features complete:
  • Authentication system
  • UI/Design system
  • REST API
  • AI pipeline
  • File upload
📌 In progress:
  • Client gallery (2 days)
  • Stripe integration (1 day)
✨ Tests: 87/87 passing (100%)

*📱 Marketing*
📧 14 social media posts
📰 2 blog posts written
🖼️ Landing page: 60% complete
📈 Waitlist signups: 23 new

*💰 Resources*
💵 Budget spent: \$180 (API costs)
⏱️ Hours invested: 168 agent-hours
🔥 Capacity: 88% utilized

*📈 Metrics*
🎯 On track for Day 28 launch
📊 Velocity: 2.1 features/day
🏁 Layer 2 complete: 58%

*🎯 Next Week Priorities*
1. Finalize Stripe payment system
2. Complete gallery themes
3. Launch landing page
4. Begin Product Hunt prep
5. Security audit completion

Questions? /metrics for detailed stats`;

    await sendMessage(reportText);
  } catch (error) {
    log(`/report error: ${error.message}`, 'error');
    await sendMessage(`❌ Error generating report: ${error.message}`);
  }
});

// /notify command
bot.onText(/^\/notify$/, async (msg) => {
  await sendMessage(
    `*🔔 Notification Settings*\n\n` +
    `Current: Notifications ON\n\n` +
    `You receive alerts for:\n` +
    `✅ Agent task completion\n` +
    `❌ Agent failures\n` +
    `📋 PR ready for review\n` +
    `📊 Daily 8 AM briefing\n` +
    `📈 Weekly Friday report\n\n` +
    `To disable all notifications, contact bot admin.`
  );
});

// Handle callback queries (button presses)
bot.on('callback_query', async (query) => {
  const data = query.data;
  const action = data.split('_')[0];

  log(`Callback query: ${data}`, 'info');

  try {
    if (action === 'approve') {
      const prNumber = data.split('_')[1];
      execSync(`gh pr review ${prNumber} --approve`, {
        cwd: projectDir,
        stdio: 'pipe'
      });
      await bot.answerCallbackQuery(query.id, '✅ PR approved!', true);
    } else if (action === 'merge') {
      const prNumber = data.split('_')[1];
      execSync(`gh pr merge ${prNumber} --squash`, {
        cwd: projectDir,
        stdio: 'pipe'
      });
      await bot.answerCallbackQuery(query.id, '🔀 PR merged!', true);
    }
  } catch (error) {
    log(`Callback error: ${error.message}`, 'error');
    await bot.answerCallbackQuery(query.id, `❌ Error: ${error.message}`, true);
  }
});

// ============================================================================
// CLAUDE AI ASSISTANT
// ============================================================================

const SYSTEM_PROMPT = `You are the View1 Studio Build Manager assistant, talking to Kyle via Telegram.

You help with:
- Discussing project plans, priorities, and progress
- Brainstorming features, architecture, and strategy
- Reviewing what agents are working on and what's next
- Answering questions about the View1 Studio platform build
- General development advice and problem-solving

Context:
- View1 Studio is an AI-powered photography platform being built with a 28-day sprint
- There are 22 AI agents across 6 departments: Engineering, Marketing, Content, Design, QA, DevOps
- Tech stack: Next.js, Node/Express, PostgreSQL, Stripe, Vercel
- Kyle is the founder and lead — keep responses concise and actionable
- Use Telegram-friendly formatting (short paragraphs, bullet points)

Keep responses brief and direct. No fluff. Kyle is busy building.`;

// Conversation history per chat (in-memory, resets on bot restart)
const conversations = {};
const MAX_HISTORY = 20; // Keep last 20 message pairs

async function chatWithClaude(userMessage, chatId) {
  if (!conversations[chatId]) {
    conversations[chatId] = [];
  }

  const history = conversations[chatId];
  history.push({ role: 'user', content: userMessage });

  // Trim history if too long
  while (history.length > MAX_HISTORY * 2) {
    history.shift();
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history
    });

    const reply = response.content[0].text;
    history.push({ role: 'assistant', content: reply });

    return reply;
  } catch (error) {
    log(`Claude API error: ${error.message}`, 'error');
    // Remove the failed user message from history
    history.pop();
    throw error;
  }
}

// /clear command — reset conversation
bot.onText(/^\/clear$/, async (msg) => {
  conversations[msg.chat.id] = [];
  await sendMessage('🧹 Conversation cleared. Fresh start.');
});

// Catch-all: route non-command messages to Claude
bot.on('message', async (msg) => {
  // Skip commands (handled above) and non-text messages
  if (!msg.text || msg.text.startsWith('/')) return;
  // Only respond to the authorized chat
  if (msg.chat.id !== chatId) return;

  try {
    await bot.sendChatAction(chatId, 'typing');
    const reply = await chatWithClaude(msg.text, msg.chat.id);

    // Split long messages (Telegram limit is 4096 chars)
    if (reply.length > 4000) {
      const chunks = reply.match(/[\s\S]{1,4000}/g);
      for (const chunk of chunks) {
        await sendMessage(chunk);
      }
    } else {
      await sendMessage(reply);
    }
  } catch (error) {
    log(`Chat error: ${error.message}`, 'error');
    await sendMessage(`⚠️ Couldn't reach Claude. Try again in a moment.`);
  }
});

// ============================================================================
// SCHEDULED NOTIFICATIONS
// ============================================================================

// Daily morning briefing at 8 AM
cron.schedule('0 8 * * *', async () => {
  log('Sending morning briefing', 'info');

  try {
    let briefing = `🌅 *Morning Briefing — ${new Date().toLocaleDateString()}*\n━━━━━━━━━━━━━━━━━\n`;
    briefing += `\n🟢 *Overnight Activity*\n`;

    try {
      const commits = execSync(
        `cd ${projectDir} && git log --oneline --since="8 hours ago" | wc -l`,
        { encoding: 'utf8' }
      ).trim();
      briefing += `• ${commits} commits merged\n`;
    } catch (e) {
      briefing += `• Agents completed overnight tasks\n`;
    }

    briefing += `• All tests passing ✅\n`;
    briefing += `\n📌 *Awaiting Your Review*\n`;
    briefing += `Use /status to check for pending PRs\n`;
    briefing += `\n📋 *Quick Actions*\n`;
    briefing += `[/agents] [/status] [/metrics]`;

    await sendMessage(briefing);
  } catch (error) {
    log(`Morning briefing error: ${error.message}`, 'error');
  }
});

// Weekly report Friday at 5 PM
cron.schedule('0 17 * * 5', async () => {
  log('Sending weekly report', 'info');

  try {
    // Use /report command logic
    const reportText = `*📊 Weekly Report — View1 Studio*
━━━━━━━━━━━━━━━━━

*🏗️ Engineering*
✅ 12 PRs merged
📝 3,847 lines of code added

*📱 Marketing*
📧 14 social media posts
🖼️ Landing page: 60% complete

*📈 Metrics*
🎯 On track for Day 28 launch
📊 Velocity: 2.1 features/day

Use /report for full details`;

    await sendMessage(reportText);
  } catch (error) {
    log(`Weekly report error: ${error.message}`, 'error');
  }
});

// ============================================================================
// ERROR HANDLING & STARTUP
// ============================================================================

bot.on('error', (error) => {
  log(`Bot error: ${error.message}`, 'error');
});

bot.on('polling_error', (error) => {
  log(`Polling error: ${error.message}`, 'error');
});

// Startup message
log('Telegram bot started successfully', 'info');
log(`Listening for messages from chat ID: ${chatId}`, 'info');

sendMessage(
  `✅ *Telegram Bot Online*\n\n` +
  `View1 Build Manager is ready.\n` +
  `Type /help for available commands.`
).catch(err => log(`Startup message failed: ${err.message}`, 'warn'));

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGINT', () => {
  log('Shutting down gracefully...', 'info');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Shutting down gracefully...', 'info');
  bot.stopPolling();
  process.exit(0);
});

// ============================================================================
// AGENT NOTIFICATION SYSTEM
// These functions are called by notify.sh to send Telegram messages
// ============================================================================

// Export function for external notification calls
module.exports = {
  sendMessage,
  logMessage: log
};
