# Mac Mini AI Agent Setup — Day 1 Guide

> Everything you need to go from powered-on Mac Mini to a running AI build team

**Estimated time:** 2-3 hours
**Target outcome:** Telegram bot running, first 3 agents spawned, Express API online, dashboard polling successfully

---

## Pre-flight Checklist

Before you sit at the Mac Mini, gather these items on your laptop:

- [ ] Telegram bot token (from @BotFather)
- [ ] Telegram chat ID (your personal DM ID)
- [ ] Anthropic API key (from console.anthropic.com)
- [ ] GitHub Personal Access Token (with repo, gist, workflow scopes)
- [ ] SSH key pair (public key should be in `~/.ssh/id_rsa.pub` on Mac Mini)
- [ ] Mac Mini IP address or hostname (will find during setup)
- [ ] Vercel dashboard URL (already deployed)
- [ ] This guide printed or on secondary monitor

If anything is missing, do NOT proceed — get it first.

---

## Part 1: Mac Mini System Setup

### Step 1: Enable SSH & Remote Access

Open System Settings on the Mac Mini:

```bash
# System Settings → General → Sharing → Remote Login
# Enable "Remote Login"
# This allows SSH access from your laptop
```

Find the Mac Mini's IP address:

```bash
ifconfig getifaddr en0
# Output: something like 192.168.1.50 or 10.0.0.x
# Write this down — you'll use it repeatedly
```

Test SSH from your laptop (not from Mac Mini):

```bash
# On your laptop:
ssh-keygen -t ed25519 -f ~/.ssh/mac-mini-key -N ""
# Copy the public key to Mac Mini (you'll need to enter your Mac password once)
ssh-copy-id -i ~/.ssh/mac-mini-key.pub username@<MAC_MINI_IP>
# Test connection
ssh -i ~/.ssh/mac-mini-key username@<MAC_MINI_IP> "echo 'SSH works!'"
```

If SSH works, great. If not, troubleshoot before proceeding.

### Step 2: Install Homebrew & Core Tools

Run these commands on the Mac Mini:

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add Homebrew to PATH (if on Apple Silicon)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# Install required tools
brew install node git tmux gh jq curl wget

# Verify installations
node --version     # Should be v18+
git --version      # Should be 2.40+
tmux -V            # Should be 3.3+
gh --version       # Should be 2.40+
```

### Step 3: Install Claude Code

On the Mac Mini:

```bash
# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version

# Set your Anthropic API key as an environment variable
# Add to ~/.zprofile (or ~/.bash_profile if using bash)
echo 'export ANTHROPIC_API_KEY="sk-ant-YOUR_KEY_HERE"' >> ~/.zprofile
source ~/.zprofile

# Test Claude Code
claude --help
```

Replace `YOUR_KEY_HERE` with your actual Anthropic API key from the pre-flight checklist.

### Step 4: Configure GitHub

On the Mac Mini:

```bash
# Authenticate GitHub CLI
gh auth login
# Choose: GitHub.com
# Choose: SSH
# Choose: Yes for uploading SSH key (or provide existing)
# Authenticate in browser when prompted

# Verify authentication
gh auth status

# Test GitHub access
gh repo list --limit 5
```

---

## Part 2: Project Structure & Repository Setup

### Step 5: Create the View1 Studio Monorepo

On the Mac Mini, create the full directory structure:

```bash
# Create root directory
mkdir -p ~/view1-studio

# Create all subdirectories
mkdir -p ~/view1-studio/apps/photo-sorter
mkdir -p ~/view1-studio/apps/content-hub
mkdir -p ~/view1-studio/apps/brief-builder

mkdir -p ~/view1-studio/packages/ui
mkdir -p ~/view1-studio/packages/config
mkdir -p ~/view1-studio/packages/types

mkdir -p ~/view1-studio/agents/telegram-bot
mkdir -p ~/view1-studio/agents/tasks
mkdir -p ~/view1-studio/agents/results
mkdir -p ~/view1-studio/agents/scripts

mkdir -p ~/view1-studio/docs/strategy
mkdir -p ~/view1-studio/docs/business
mkdir -p ~/view1-studio/docs/operations

mkdir -p ~/view1-studio/supabase
mkdir -p ~/view1-studio/.github/workflows

# Initialize git repository
cd ~/view1-studio
git init
git config user.name "Kyle"
git config user.email "kyle@view1studio.com"

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment
.env
.env.local
.env.*.local

# Build outputs
.next/
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*

# OS
.DS_Store
Thumbs.db

# Agent state
agents/results/*
!agents/results/.gitkeep

# Turbo
.turbo/
EOF

# Create initial commit
git add .gitignore
git commit -m "Initial monorepo setup"
```

### Step 6: Copy Bot Files from Laptop to Mac Mini

On your laptop, transfer the existing bot code:

```bash
# On your laptop:
# Adjust these paths to match your actual bot location

# Copy telegram-bot directory
scp -i ~/.ssh/mac-mini-key -r ~/path/to/telegram-bot \
  username@<MAC_MINI_IP>:~/view1-studio/agents/

# Copy CLAUDE.md (root handbook)
scp -i ~/.ssh/mac-mini-key ~/path/to/CLAUDE.md \
  username@<MAC_MINI_IP>:~/view1-studio/

# Copy helper scripts
scp -i ~/.ssh/mac-mini-key ~/path/to/notify.sh \
  username@<MAC_MINI_IP>:~/view1-studio/agents/scripts/

scp -i ~/.ssh/mac-mini-key ~/path/to/launch-agent.sh \
  username@<MAC_MINI_IP>:~/view1-studio/agents/scripts/
```

On the Mac Mini, verify the files arrived:

```bash
cd ~/view1-studio
find . -type f -name "*.js" -o -name "*.sh" -o -name "*.md" | head -20
```

---

## Part 3: Telegram Bot Activation

### Step 7: Configure .env File

On the Mac Mini, create the environment file:

```bash
cd ~/view1-studio/agents/telegram-bot

cat > .env << 'EOF'
# Telegram Configuration
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
TELEGRAM_CHAT_ID=YOUR_CHAT_ID_HERE

# AI Configuration
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE

# GitHub Configuration
GITHUB_TOKEN=YOUR_GITHUB_PAT_HERE

# Project Paths
PROJECT_DIR=/Users/username/view1-studio
AGENTS_DIR=/Users/username/view1-studio/agents
RESULTS_DIR=/Users/username/view1-studio/agents/results

# API Configuration
BOT_API_PORT=3847
BOT_WEBHOOK_URL=http://localhost:3847

# Agent Configuration
MAX_AGENTS=22
AGENT_TIMEOUT=3600
ENABLE_AUTO_MERGE=false
EOF
```

Replace all `YOUR_*_HERE` values with actual credentials from your pre-flight checklist.
Replace `username` with your actual Mac username (find it with `whoami`).

Verify the file:

```bash
cat .env
# Should show all your credentials (keep this file secure!)
```

### Step 8: Install Dependencies & Test Bot

On the Mac Mini:

```bash
cd ~/view1-studio/agents/telegram-bot

# Install dependencies
npm install

# Verify package.json has correct scripts
cat package.json | grep -A 5 '"scripts"'

# Start the bot
node bot.js

# You should see:
# Bot started successfully!
# Listening on port 3847
# Waiting for Telegram messages...

# Leave this running and test from your Telegram
```

Open Telegram and send a message to your bot:

```
/help
```

You should see the bot respond with available commands. Commands should include:
- `/help` — List all commands
- `/status` — Show bot and agent status
- `/agents` — List all 22 agents
- `/task` — Create a new task
- `/logs` — View agent logs
- `/approve` — Approve agent PR
- `/merge` — Merge agent PR

If the bot responds, press `Ctrl+C` to stop it. We'll set it up for auto-start next.

If the bot doesn't respond:
- Check the .env file (verify token and chat ID are correct)
- Check Node version: `node --version` (should be 18+)
- Check dependencies: `npm list | head -20`
- Check bot.js has no syntax errors: `node -c bot.js`

### Step 9: Set Up Auto-start with launchd

Create a launchd plist file to auto-start the bot:

```bash
# Create the plist file
sudo tee /Library/LaunchDaemons/com.view1.telegram-bot.plist > /dev/null << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.view1.telegram-bot</string>

    <key>Program</key>
    <string>/usr/local/bin/node</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/username/view1-studio/agents/telegram-bot/bot.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/Users/username/view1-studio/agents/telegram-bot</string>

    <key>StandardOutPath</key>
    <string>/tmp/telegram-bot.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/telegram-bot-error.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>TELEGRAM_BOT_TOKEN</key>
        <string>YOUR_TOKEN</string>
        <key>TELEGRAM_CHAT_ID</key>
        <string>YOUR_CHAT_ID</string>
        <key>ANTHROPIC_API_KEY</key>
        <string>YOUR_API_KEY</string>
        <key>GITHUB_TOKEN</key>
        <string>YOUR_GITHUB_TOKEN</string>
        <key>PROJECT_DIR</key>
        <string>/Users/username/view1-studio</string>
        <key>AGENTS_DIR</key>
        <string>/Users/username/view1-studio/agents</string>
        <key>RESULTS_DIR</key>
        <string>/Users/username/view1-studio/agents/results</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>

    <key>KeepAlive</key>
    <true/>

    <key>RunAtLoad</key>
    <true/>

    <key>Restart</key>
    <string>on-failure</string>

    <key>RestartDelay</key>
    <integer>10</integer>
</dict>
</plist>
EOF
```

Replace `username` and all credentials with actual values.

Load the service:

```bash
# Load the plist
sudo launchctl load /Library/LaunchDaemons/com.view1.telegram-bot.plist

# Verify it loaded
sudo launchctl list | grep view1

# Check logs
tail -f /tmp/telegram-bot.log

# Tail error log (if needed)
tail -f /tmp/telegram-bot-error.log
```

To unload (if you need to restart):

```bash
sudo launchctl unload /Library/LaunchDaemons/com.view1.telegram-bot.plist
sudo launchctl load /Library/LaunchDaemons/com.view1.telegram-bot.plist
```

---

## Part 4: Agent Infrastructure

### Step 10: Create notify.sh — Telegram Notification Script

On the Mac Mini:

```bash
cat > ~/view1-studio/agents/scripts/notify.sh << 'EOF'
#!/bin/bash

# notify.sh — Send Telegram notifications from agents
# Usage: ./notify.sh "Agent Name" "Message" "status"
# Status: success, warning, error, info

AGENT_NAME="${1:-Unknown}"
MESSAGE="${2:-No message}"
STATUS="${3:-info}"
CHAT_ID="${TELEGRAM_CHAT_ID}"
BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"

# Emoji based on status
case "$STATUS" in
    success) EMOJI="✅" ;;
    error)   EMOJI="❌" ;;
    warning) EMOJI="⚠️" ;;
    info)    EMOJI="ℹ️" ;;
    *)       EMOJI="📝" ;;
esac

# Format timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Build message
FULL_MESSAGE="$EMOJI *$AGENT_NAME* [$STATUS]
━━━━━━━━━━━━━━━━━━━━━━━
$MESSAGE
📅 $TIMESTAMP"

# Send to Telegram
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d "chat_id=${CHAT_ID}" \
  -d "text=${FULL_MESSAGE}" \
  -d "parse_mode=Markdown" > /dev/null

if [ $? -eq 0 ]; then
    echo "[notify] Sent to Telegram"
else
    echo "[notify] Failed to send to Telegram"
fi
EOF

# Make it executable
chmod +x ~/view1-studio/agents/scripts/notify.sh

# Test it
~/view1-studio/agents/scripts/notify.sh "Test Agent" "Hello from Mac Mini" "success"
```

After running the test, check Telegram — you should receive a notification. If you do, the script works.

### Step 11: Create launch-agent.sh — tmux Agent Launcher

On the Mac Mini:

```bash
cat > ~/view1-studio/agents/scripts/launch-agent.sh << 'EOF'
#!/bin/bash

# launch-agent.sh — Launch a Claude Code agent in an isolated tmux session
# Usage: ./launch-agent.sh <agent_id> <task_file>
# Example: ./launch-agent.sh eng-arch tasks/eng-arch-scaffold.md

set -e

AGENT_ID="${1}"
TASK_FILE="${2}"
PROJECT_DIR="${PROJECT_DIR:-/Users/username/view1-studio}"
AGENTS_DIR="${AGENTS_DIR:-$PROJECT_DIR/agents}"
RESULTS_DIR="${RESULTS_DIR:-$AGENTS_DIR/results}"

# Validate inputs
if [ -z "$AGENT_ID" ] || [ -z "$TASK_FILE" ]; then
    echo "Usage: launch-agent.sh <agent_id> <task_file>"
    exit 1
fi

if [ ! -f "$TASK_FILE" ]; then
    echo "Error: Task file not found: $TASK_FILE"
    exit 1
fi

# Create results directory if needed
mkdir -p "$RESULTS_DIR"

# Session name (sanitized)
SESSION_NAME="agent-${AGENT_ID}"
LOG_FILE="$RESULTS_DIR/${AGENT_ID}.log"
LOCK_FILE="$RESULTS_DIR/${AGENT_ID}.lock"

# Check if agent is already running
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Agent $AGENT_ID already running. Kill it first:"
    echo "  tmux kill-session -t $SESSION_NAME"
    exit 1
fi

echo "[launcher] Starting agent: $AGENT_ID"
echo "[launcher] Task file: $TASK_FILE"
echo "[launcher] Log file: $LOG_FILE"

# Create tmux session
tmux new-session -d -s "$SESSION_NAME" -x 200 -y 50

# Send init commands to tmux
tmux send-keys -t "$SESSION_NAME" "cd $PROJECT_DIR" Enter
tmux send-keys -t "$SESSION_NAME" "export ANTHROPIC_API_KEY='${ANTHROPIC_API_KEY}'" Enter
tmux send-keys -t "$SESSION_NAME" "export GITHUB_TOKEN='${GITHUB_TOKEN}'" Enter

# Start Claude Code with the task file
# The agent reads CLAUDE.md automatically
# Use --worktree for isolated development environment
TASK_CONTENT=$(cat "$TASK_FILE")

tmux send-keys -t "$SESSION_NAME" "claude --worktree" Enter

# Wait a moment for Claude to initialize
sleep 2

# Send the task content to Claude's input
echo "$TASK_CONTENT" | tmux send-keys -t "$SESSION_NAME" -

# Capture output to log file
tmux capture-pane -t "$SESSION_NAME" -p > "$LOG_FILE"

echo "[launcher] Agent $AGENT_ID launched in tmux session: $SESSION_NAME"
echo "[launcher] Monitor with: tmux attach-session -t $SESSION_NAME"
echo "[launcher] View logs: tail -f $LOG_FILE"

# Send notification
~/view1-studio/agents/scripts/notify.sh "$AGENT_ID" "Agent launched" "info"

exit 0
EOF

# Make it executable
chmod +x ~/view1-studio/agents/scripts/launch-agent.sh
```

Test the launcher:

```bash
# First create a dummy task
mkdir -p ~/view1-studio/agents/tasks
cat > ~/view1-studio/agents/tasks/test-task.md << 'EOF'
# Test Agent Task

List the files in the current directory.
EOF

# Try launching (it should fail gracefully if Claude Code isn't ready)
# ~/view1-studio/agents/scripts/launch-agent.sh test-agent tasks/test-task.md
```

We'll use this in Part 5 for real agent launches.

### Step 12: Write CLAUDE.md — Agent Handbook

This is the critical file every agent reads. Create it:

```bash
cat > ~/view1-studio/CLAUDE.md << 'EOF'
# View1 Studio — Agent Handbook

## Your Role

You are one of 22 AI agents on the View1 Studio build team. You work in isolation using Claude Code (`claude --worktree`) to accomplish assigned tasks. You report progress to the engineering team via Telegram.

**Your team departments:**
- Engineering (6 agents): Architecture, Backend, Frontend, DevOps, Database, Security
- Marketing (4 agents): Content Strategy, Social, Campaigns, Analytics
- Content (4 agents): Blog, Video Scripts, Email, Guides
- QA (3 agents): Testing, Performance, UX
- Research (3 agents): Market, User, Competitive
- Business (2 agents): Operations, Finance

---

## Project Context

**View1 Studio** is an AI-powered photo sorting and management platform. Users upload photos; our AI organizes them by date, location, subject, and quality. The platform is built as a monorepo with:

- Next.js frontend (photo-sorter app)
- Express backend (agent API)
- Supabase for auth and data
- Claude AI for intelligent sorting
- Vercel for deployment
- Telegram bot for orchestration

**Core tech stack:**
- **Frontend:** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Express.js, Node.js 18+
- **Database:** Supabase PostgreSQL
- **AI:** Claude API via @anthropic-ai/sdk
- **DevOps:** Docker, GitHub Actions, Vercel
- **Monitoring:** Telegram bot integration, Error tracking

---

## Code Standards

### TypeScript First
- All new code is TypeScript (`.ts`, `.tsx`)
- Use strict `tsconfig.json` settings
- No `any` types without justification
- Export types alongside implementations

### Next.js App Router
- All new pages use App Router (not Pages Router)
- Use `app/` directory structure
- Implement proper loading.tsx and error.tsx boundaries
- Use Server Components by default, `'use client'` only when needed

### Styling
- Use Tailwind CSS exclusively
- No inline styles except in special cases
- Follow utility-first approach
- Use shadcn/ui components for consistency

### Database
- Use Supabase client libraries
- Define migrations in `supabase/migrations/`
- Document schema changes in commit messages
- Use Row Level Security (RLS) for auth

### File Naming
- Use kebab-case for file names: `user-profile.tsx`, not `userProfile.tsx`
- Use PascalCase for component exports
- Group related files in feature folders

### Git Workflow
- Create feature branches: `feature/short-description`
- Commit messages: `[scope] Brief description` (e.g., `[auth] Add OAuth provider`)
- Keep commits atomic and logical
- Push to origin, create PRs (never push directly to main)

---

## Testing Requirements

- Write tests for all business logic
- Aim for 80%+ coverage on critical paths
- Use Jest for unit tests, Playwright for E2E
- Test file location: `__tests__/` or `.test.ts` suffix
- Run tests before committing: `npm run test`

---

## What You Must NOT Do

🚫 **Never:**
- Delete files without explicit approval
- Modify environment variables or secrets
- Commit directly to `main` or `develop`
- Change database schema without migration files
- Modify `.env` files (they're generated from secrets)
- Disable type checking or linting
- Merge your own PRs (wait for code review)
- Work outside the `/Users/username/view1-studio` directory
- Use deprecated dependencies
- Hardcode API keys or tokens in code

---

## Workflow for Agents

### 1. Read This Handbook
First thing you do when you start — read this entire file.

### 2. Get Your Task
You'll receive a markdown task file with:
- **Objective:** What you need to accomplish
- **Acceptance criteria:** How to know when you're done
- **Time estimate:** How long this should take
- **Dependencies:** Other agents or code this depends on

### 3. Understand the Codebase
```bash
# Navigate to project root
cd /Users/username/view1-studio

# List key directories
ls -la apps/ agents/ packages/ docs/

# Review recent commits
git log --oneline -10

# Check current branches
git branch -a
```

### 4. Create a Feature Branch
```bash
git checkout -b feature/your-short-description
```

### 5. Do Your Work
Use `claude --worktree` for isolated development environment. This ensures:
- Separate file system sandbox
- No interference with other agents
- Clean rollback if something goes wrong

### 6. Test Your Changes
```bash
# Run tests
npm run test

# Build if frontend
npm run build

# Check types
npm run typecheck
```

### 7. Commit Your Changes
```bash
git add .
git commit -m "[scope] Description of changes"
git push origin feature/your-branch
```

### 8. Create a Pull Request
```bash
gh pr create \
  --title "[scope] Description" \
  --body "What you changed and why"
```

### 9. Wait for Approval
Post the PR link in Telegram. Kyle will review, request changes, or approve. Do NOT merge your own PR.

### 10. Celebrate
Once approved and merged, notify the team and move to the next task.

---

## Useful Commands

### Git
```bash
git status                    # Current branch status
git log --oneline -5          # Recent commits
git diff HEAD~1               # See your changes
git branch -a                 # All branches
git pull origin main          # Update from main
```

### Node/npm
```bash
npm list                      # Show dependencies
npm run build                 # Build the project
npm run test                  # Run tests
npm run lint                  # Check code style
npm run type-check            # TypeScript check
```

### Claude Code
```bash
claude --version              # Check version
claude --help                 # All commands
claude --worktree             # Start isolated session
exit                          # Exit Claude session
```

### Project Structure
```bash
# View1 Studio root
~/view1-studio/

# Your work area
~/view1-studio/apps/photo-sorter/

# Agent management
~/view1-studio/agents/
  - telegram-bot/    # Bot server (don't touch)
  - tasks/           # Task definitions (read your assignment)
  - results/         # Logs and output
  - scripts/         # notify.sh, launch-agent.sh

# Shared code
~/view1-studio/packages/ui/
~/view1-studio/packages/config/
~/view1-studio/packages/types/
```

---

## Signals & Notifications

### Notify the Team
When your work is done, call this script:

```bash
~/view1-studio/agents/scripts/notify.sh \
  "Your Agent Name" \
  "I completed [what you did]. PR: [link]" \
  "success"
```

Status options: `success`, `warning`, `error`, `info`

### Monitor Other Agents
Check Telegram for updates from other agents. Use `/status` command to see who's working on what.

### Report Blockers
If you're stuck or blocked:

```bash
~/view1-studio/agents/scripts/notify.sh \
  "Your Agent Name" \
  "BLOCKED: [reason]. Waiting on [who/what]" \
  "warning"
```

---

## Common Issues & Solutions

**Q: My changes aren't showing up**
A: Make sure you `git add` and `git commit` before exiting Claude.

**Q: I got a merge conflict**
A: Pull from main, resolve conflicts, commit, and push:
```bash
git pull origin main
# Fix conflicts in editor
git add .
git commit -m "[fix] Resolve merge conflicts"
git push origin feature/your-branch
```

**Q: Type errors won't go away**
A: Check if you need to restart TypeScript language server or update tsconfig.

**Q: How do I see the Telegram bot status?**
A: Send `/status` in Telegram. The bot will show all running agents.

**Q: Can I deploy to production?**
A: No. Only Kyle can merge to main and trigger production deploys. Your job is to create PRs.

---

## Success Metrics

You've done your job well when:

✅ Your PR passes all tests
✅ No TypeScript errors
✅ Code follows the style guide
✅ You've documented changes in the commit message
✅ PR is reviewed and merged
✅ Team gets a success notification
✅ Next agent can pick up where you left off

---

## Questions?

This handbook covers 90% of what you need. For anything else:
1. Check the task file you were assigned
2. Look at similar code in the repo
3. Review recent PRs for patterns
4. Send a warning notification if you're truly stuck

Good luck, agent. Let's build something great.
EOF

# Verify the file was created
cat ~/view1-studio/CLAUDE.md | head -20
```

This handbook is now available to all agents via `claude --worktree`. They'll read it automatically.

---

## Part 5: First Agent Launch

### Step 13: Create Your First Task File

Create a task for the architect agent to scaffold the Next.js app:

```bash
cat > ~/view1-studio/agents/tasks/eng-arch-scaffold.md << 'EOF'
# Task: Engineering Architecture — Next.js Scaffold

**Agent:** eng-arch (Architecture)
**Time estimate:** 1.5 hours
**Status:** Ready

## Objective

Set up the foundational Next.js application with TypeScript, Tailwind CSS, shadcn/ui, and Supabase integration. This is the starting point for all frontend development.

## Acceptance Criteria

- [ ] Next.js 14+ app created in `/Users/username/view1-studio/apps/photo-sorter`
- [ ] TypeScript strict mode enabled
- [ ] Tailwind CSS configured
- [ ] shadcn/ui initialized with Button and Card components
- [ ] Supabase client configured but not authenticated yet
- [ ] Root `_app.tsx` or `layout.tsx` created with basic structure
- [ ] `package.json` in `apps/photo-sorter` lists all dependencies
- [ ] `tsconfig.json` with strict settings
- [ ] `.env.example` showing required environment variables
- [ ] Git branch created: `feature/nextjs-scaffold`
- [ ] PR created and link posted in Telegram

## Implementation Notes

1. Use `create-next-app` for initial scaffold
2. Choose TypeScript, Tailwind, ESLint during setup
3. Install shadcn/ui: `npx shadcn-ui@latest init`
4. Configure Supabase client in `lib/supabase.ts`
5. Create basic layout with navigation placeholder
6. Do NOT implement authentication yet (that's a separate task)

## Blockers / Dependencies

- Requires Supabase project to be created (ask Kyle if not done)
- Requires Node 18+ on Mac Mini (verify first)

## Done Signal

Post in Telegram: `/approve eng-arch-scaffold`

EOF

# Verify
cat ~/view1-studio/agents/tasks/eng-arch-scaffold.md
```

### Step 14: Launch the Architect Agent

Before you launch the agent, make sure:

1. The bot is running (should be auto-started from Step 9)
2. The CLAUDE.md file exists at `~/view1-studio/CLAUDE.md`
3. The task file exists at `~/view1-studio/agents/tasks/eng-arch-scaffold.md`

Then launch the agent:

```bash
# List running tmux sessions
tmux list-sessions

# If telegram-bot session doesn't exist, start it manually
# tmux new-session -d -s telegram-bot
# tmux send-keys -t telegram-bot 'cd ~/view1-studio/agents/telegram-bot && node bot.js' Enter

# Launch the architect agent
~/view1-studio/agents/scripts/launch-agent.sh eng-arch ~/view1-studio/agents/tasks/eng-arch-scaffold.md

# Verify the session started
tmux list-sessions

# Attach to the session to see Claude working
tmux attach-session -t agent-eng-arch

# To detach: Ctrl+B then D
```

The agent will now:
1. Read the CLAUDE.md handbook
2. Create a Next.js app in the correct location
3. Configure TypeScript and Tailwind
4. Create a git branch and push
5. Open a PR on GitHub
6. Post a notification in Telegram

### Step 15: Monitor and Approve

While the agent is working:

```bash
# Check the log file
tail -f ~/view1-studio/agents/results/eng-arch.log

# Check tmux session
tmux capture-pane -t agent-eng-arch -p

# Check what's happening on GitHub
gh pr list

# Find the PR from eng-arch
gh pr list | grep feature/nextjs-scaffold
```

When the agent is done (watch for Telegram notification):

```bash
# View the PR details
gh pr view <PR_NUMBER>

# If it looks good, approve it
gh pr review <PR_NUMBER> --approve

# Merge the PR
gh pr merge <PR_NUMBER> --auto --squash

# Telegram bot will also let you approve:
# /approve eng-arch-scaffold
```

---

## Part 6: Dashboard Connection

### Step 16: Connect Vercel Dashboard to Mac Mini Bot

The Telegram bot's Express API runs on port 3847. The Vercel dashboard needs to poll this for data.

First, test the API is responding:

```bash
curl http://localhost:3847/api/status
# Should return JSON like:
# {"status": "ok", "bot": "online", "agents": {...}}

curl http://localhost:3847/api/events
# Should return recent events
```

Now configure the dashboard. You have two options:

**Option A: Local Network (if Mac Mini and dashboard are on same network)**

In your Vercel dashboard config, set the bot API URL to:

```
http://192.168.1.50:3847
```

(Replace `192.168.1.50` with your actual Mac Mini IP from Step 1)

**Option B: Remote Access via Cloudflare Tunnel (for external access)**

If you need to access the bot from outside your home network:

```bash
# On Mac Mini, install Cloudflare Tunnel
brew install cloudflare/cloudflare/cf

# Authenticate
cf tunnel login

# Create a tunnel named "view1-studio"
cf tunnel create view1-studio

# Route the tunnel
cf tunnel route dns view1-studio bot.yourdomain.com

# Start the tunnel
cf tunnel run view1-studio \
  --url http://localhost:3847
```

Then in Vercel dashboard, use: `https://bot.yourdomain.com`

**Option C: ngrok (for quick testing)**

```bash
# Install ngrok
brew install ngrok/ngrok/ngrok

# Start a tunnel to port 3847
ngrok http 3847

# ngrok will give you a URL like: https://abc123.ngrok.io
# Use this URL in your dashboard config
```

Verify the dashboard can reach your bot:

```bash
# From your laptop
curl https://your-dashboard-url.vercel.app/api/status

# Should return bot status
```

---

## Part 7: Layer 1 Build Sprint

### Step 17: Launch Layer 1 Agents

These are your first batch of agents for the Demo MVP:

**Agent 1: Architecture (eng-arch)** — Already launched in Step 14
**Agent 2: Backend Setup (eng-backend)**
**Agent 3: Frontend UI Components (eng-ui)**
**Agent 4: Database Schema (eng-database)**

Create tasks for the remaining three:

```bash
# Backend task
cat > ~/view1-studio/agents/tasks/eng-backend-api.md << 'EOF'
# Task: Engineering Backend — Express API Setup

**Agent:** eng-backend
**Depends on:** eng-arch-scaffold (needs Next.js app)
**Time:** 2 hours

## Objective

Set up Express API server with endpoints for photo operations. Create `/api/upload`, `/api/list`, `/api/organize` handlers.

## Acceptance Criteria

- [ ] Express server created in `apps/api/` (separate from Next.js)
- [ ] Port 3000 running without conflicts
- [ ] TypeScript configured
- [ ] Basic CRUD endpoints for photos
- [ ] Supabase client initialized
- [ ] Error handling middleware
- [ ] CORS configured for Next.js frontend
- [ ] API documentation in `apps/api/README.md`
- [ ] PR created

## Note

Kyle will review the API design before you implement AI integration.

EOF

# UI Components task
cat > ~/view1-studio/agents/tasks/eng-ui-components.md << 'EOF'
# Task: Engineering Frontend — UI Components & Layout

**Agent:** eng-ui
**Depends on:** eng-arch-scaffold (needs Next.js app)
**Time:** 2 hours

## Objective

Create reusable UI components and page layouts for the photo sorter app. Set up the main dashboard, upload area, and photo grid.

## Acceptance Criteria

- [ ] `components/` folder structure created
- [ ] PhotoGrid component (responsive grid display)
- [ ] UploadZone component (drag-and-drop)
- [ ] PhotoCard component (with metadata display)
- [ ] Sidebar navigation component
- [ ] All components use shadcn/ui and Tailwind
- [ ] Storybook stories for all components (optional)
- [ ] Pages created: `/dashboard`, `/upload`, `/results`
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] PR created

## Notes

Do NOT connect to API yet (backend team is building that).

EOF

# Database task
cat > ~/view1-studio/agents/tasks/eng-database-schema.md << 'EOF'
# Task: Engineering Database — Supabase Schema

**Agent:** eng-database
**Depends on:** None (independent)
**Time:** 1.5 hours

## Objective

Design and create the Supabase PostgreSQL schema for storing photos, metadata, and user data.

## Acceptance Criteria

- [ ] `supabase/migrations/` folder created
- [ ] Migration files for: users, photos, tags, folders, sorting_results
- [ ] Row Level Security (RLS) policies for all tables
- [ ] Indexes on frequently-queried columns
- [ ] Foreign key relationships defined
- [ ] Database documentation in `docs/database/schema.md`
- [ ] PR created

## Schema Overview (you define details)

- **users** table (auth handled by Supabase Auth)
- **photos** table (filename, mime_type, uploaded_at, user_id)
- **tags** table (many-to-many with photos)
- **folders** table (organize photos by date/location)
- **sorting_results** table (AI predictions and confidence)

EOF

echo "[setup] Task files created"
```

Now launch all three remaining agents:

```bash
# Agent 2: Backend
tmux new-session -d -s agent-eng-backend
tmux send-keys -t agent-eng-backend "cd ~/view1-studio && ~/view1-studio/agents/scripts/launch-agent.sh eng-backend ~/view1-studio/agents/tasks/eng-backend-api.md" Enter

# Agent 3: UI
tmux new-session -d -s agent-eng-ui
tmux send-keys -t agent-eng-ui "cd ~/view1-studio && ~/view1-studio/agents/scripts/launch-agent.sh eng-ui ~/view1-studio/agents/tasks/eng-ui-components.md" Enter

# Agent 4: Database
tmux new-session -d -s agent-eng-database
tmux send-keys -t agent-eng-database "cd ~/view1-studio && ~/view1-studio/agents/scripts/launch-agent.sh eng-database ~/view1-studio/agents/tasks/eng-database-schema.md" Enter

# Verify all started
tmux list-sessions
```

### Step 18: Monitor the Build

Use these Telegram commands to track progress:

```
/status           — See which agents are running and their status
/agents           — List all 22 agents (only Layer 1 will be active)
/logs eng-backend — View specific agent's output
```

Check the Vercel dashboard — it should start showing agent activity as Express API reports updates via `/api/events`.

Also monitor tmux:

```bash
# View all agent sessions
tmux list-sessions

# Attach to any agent to see output
tmux attach-session -t agent-eng-ui

# Check logs
tail -f ~/view1-studio/agents/results/eng-backend.log
tail -f ~/view1-studio/agents/results/eng-ui.log
tail -f ~/view1-studio/agents/results/eng-database.log
```

Watch for PRs from each agent:

```bash
gh pr list
```

As they complete, use `/approve` and `/merge` in Telegram to merge their work.

### Step 19: End of Day 1 Checklist

By end of day, you should have:

- [x] SSH access to Mac Mini verified
- [x] Homebrew, Node, git, tmux installed
- [x] Claude Code installed and authenticated
- [x] Monorepo structure created
- [x] Telegram bot running and auto-starting via launchd
- [x] Bot tested (responds to /help)
- [x] notify.sh working (sends Telegram messages)
- [x] launch-agent.sh working (spawns tmux sessions)
- [x] CLAUDE.md handbook in place (all agents read it)
- [x] 4 Layer 1 agents launched (arch, backend, ui, database)
- [x] All agents completed their tasks and opened PRs
- [x] At least 2 PRs merged into main
- [x] Express API online and responding to /api/status
- [x] Vercel dashboard showing bot updates via API
- [x] Git history shows 4+ commits from agents
- [x] No errors in agent logs
- [x] Telegram notifications working end-to-end

If anything is incomplete, don't worry — you have a working foundation. Day 2 can focus on the next batch of agents.

---

## Appendix A: Troubleshooting

### Bot Won't Start

**Symptom:** `node bot.js` fails or doesn't connect

**Debug steps:**

```bash
# Check Node version
node --version  # Should be 18+

# Check .env file exists and has values
cat ~/view1-studio/agents/telegram-bot/.env | grep TELEGRAM_BOT_TOKEN

# Verify token is valid (should be long string)
# If empty, add it

# Check dependencies
cd ~/view1-studio/agents/telegram-bot
npm list node-telegram-bot-api  # Should be 0.58+
npm list express                 # Should be 4.18+

# Try starting with verbose logging
DEBUG=* node bot.js

# Check if port 3847 is in use
lsof -i :3847

# If something else is using it
sudo lsof -i :3847
kill -9 <PID>
```

### Agent Stuck or Frozen

**Symptom:** Agent hasn't updated in 30+ minutes

```bash
# Check if process is alive
tmux list-sessions | grep agent-eng-arch

# View last output
tmux capture-pane -t agent-eng-arch -p | tail -30

# Check Claude Code timeout
# Default is 3600 seconds (1 hour)
# If task is complex, increase timeout in launch-agent.sh

# Kill stuck agent
tmux kill-session -t agent-eng-arch

# Restart it
~/view1-studio/agents/scripts/launch-agent.sh eng-arch ~/view1-studio/agents/tasks/eng-arch-scaffold.md
```

### Dashboard Can't Reach Bot

**Symptom:** Dashboard shows "Bot offline" or connection refused

```bash
# Verify bot is running
curl http://localhost:3847/api/status

# Check if it's listening
netstat -tulpn | grep 3847
# or
lsof -i :3847

# If not listening, restart bot
sudo launchctl unload /Library/LaunchDaemons/com.view1.telegram-bot.plist
sudo launchctl load /Library/LaunchDaemons/com.view1.telegram-bot.plist

# Check logs
tail -f /tmp/telegram-bot.log

# If using ngrok/Cloudflare Tunnel, verify tunnel is active
# For ngrok:
ps aux | grep ngrok

# For Cloudflare:
ps aux | grep "cf tunnel"
```

### Claude Code Rate Limited

**Symptom:** Agent shows "Rate limit exceeded" or "quota exceeded"

```bash
# Check your API usage
# In terminal: echo $ANTHROPIC_API_KEY
# Then check: https://console.anthropic.com/account/usage

# If limited, wait a few minutes or upgrade plan
# In interim, reduce number of concurrent agents
tmux list-sessions  # See which are running
tmux kill-session -t agent-name  # Stop less urgent ones
```

### Git Push Fails

**Symptom:** Agent can't push to GitHub

```bash
# Check GitHub auth
gh auth status

# Verify SSH keys
ssh -T git@github.com
# Should say: "Hi <username>! You've successfully authenticated"

# If not authenticated, redo auth
gh auth login

# Check that repository exists
gh repo view

# If repo doesn't exist, create it
gh repo create view1-studio --public
```

### TypeScript Errors in Agent Output

**Symptom:** Agent complains about type errors

```bash
# Verify tsconfig.json is valid
cd ~/view1-studio
cat tsconfig.json

# Check for duplicate or conflicting tsconfig files
find . -name "tsconfig.json" -type f

# Update types package if needed
npm install --save-dev @types/node@latest
```

---

## Appendix B: Quick Reference

### Useful File Paths

```
~/view1-studio/                              # Project root
  apps/photo-sorter/                         # Next.js frontend
  agents/telegram-bot/bot.js                 # Bot entry point
  agents/telegram-bot/.env                   # Bot config
  agents/tasks/                              # Task definitions
  agents/results/                            # Agent logs
  agents/scripts/notify.sh                   # Telegram notifier
  agents/scripts/launch-agent.sh             # Agent launcher
  CLAUDE.md                                  # Agent handbook
  package.json                               # Monorepo root
  .github/                                   # GitHub Actions

/Library/LaunchDaemons/com.view1.telegram-bot.plist   # Bot auto-start
/tmp/telegram-bot.log                                 # Bot log
/tmp/telegram-bot-error.log                           # Bot errors
```

### tmux Quick Commands

```bash
tmux new-session -d -s name              # Create detached session
tmux list-sessions                       # List all sessions
tmux attach-session -t name              # Attach to session
tmux send-keys -t name "command" Enter   # Send command to session
tmux capture-pane -t name -p             # View pane output
tmux kill-session -t name                # Kill session
Ctrl+B then D                            # Detach (while attached)
Ctrl+B then [                            # Enter scroll mode
```

### Telegram Bot Commands

```
/help              List all commands
/status            Show bot and agent status
/agents            List all 22 agents
/launch            Spawn a new agent (usage: /launch <agent_id> <task>)
/logs <agent_id>   View specific agent's logs
/approve <task>    Approve an agent's work
/merge <pr_number> Merge an approved PR
/stop <agent_id>   Kill a running agent session
/restart           Restart the bot
/settings          Show current configuration
```

### GitHub Commands

```bash
gh auth login                          # Authenticate
gh auth status                         # Check status
gh repo list                           # Show repos
gh repo view                           # View current repo
gh pr list                             # List open PRs
gh pr view <number>                    # View specific PR
gh pr create --title "T" --body "B"    # Create PR
gh pr review <number> --approve        # Approve PR
gh pr merge <number> --auto --squash   # Merge PR
gh issue list                          # List issues
```

### SSH from Laptop to Mac Mini

```bash
# Find Mac Mini IP
ipconfig getifaddr en0  # On Mac Mini

# SSH from laptop
ssh -i ~/.ssh/mac-mini-key username@<MAC_IP>

# Copy files to Mac Mini
scp -i ~/.ssh/mac-mini-key /path/to/file username@<MAC_IP>:~/destination/

# Copy files from Mac Mini
scp -i ~/.ssh/mac-mini-key username@<MAC_IP>:/path/to/file ./local/destination/
```

### Port Usage

```bash
# Check what's using a port
lsof -i :<port>

# Kill process using port
kill -9 <PID>

# Check if port is open
nc -zv localhost <port>
```

### Environment Variables (for reference)

These should be in `.env` and loaded by bot:

```
TELEGRAM_BOT_TOKEN=<long_string_from_botfather>
TELEGRAM_CHAT_ID=<your_telegram_user_id>
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
PROJECT_DIR=/Users/username/view1-studio
AGENTS_DIR=/Users/username/view1-studio/agents
RESULTS_DIR=/Users/username/view1-studio/agents/results
BOT_API_PORT=3847
```

---

## Appendix C: Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Mac Mini                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Telegram Bot (Node.js + Express)               │ │
│  │         Port 3847                                      │ │
│  │         Auto-start via launchd                         │ │
│  │         Receives commands from Kyle's Telegram         │ │
│  └──────┬─────────────────────────┬──────────────────────┘ │
│         │                         │                         │
│         ▼                         ▼                         │
│  ┌─────────────────┐    ┌────────────────────┐            │
│  │  notify.sh      │    │  launch-agent.sh   │            │
│  │  Sends updates  │    │  Spawns tmux       │            │
│  │  to Telegram    │    │  + Claude Code     │            │
│  └─────────────────┘    └────────┬───────────┘            │
│                                   │                         │
│                        ┌──────────┴──────────┐             │
│                        │                     │             │
│         ┌──────────────▼───┐    ┌────────────▼────────┐   │
│         │  tmux session    │    │  tmux session      │   │
│         │  eng-arch        │    │  eng-backend       │   │
│         │  (Claude --      │    │  (Claude --        │   │
│         │   worktree)      │    │   worktree)        │   │
│         └────────┬─────────┘    └────────┬───────────┘   │
│                  │                       │               │
│         ┌────────▼───────────────────────▼───────┐       │
│         │                                         │       │
│         │    ~/view1-studio                       │       │
│         │    ├── apps/photo-sorter/              │       │
│         │    ├── agents/telegram-bot/            │       │
│         │    ├── agents/tasks/                   │       │
│         │    ├── agents/results/ (logs)          │       │
│         │    ├── CLAUDE.md (handbook)            │       │
│         │    └── package.json                    │       │
│         │                                         │       │
│         └─────────────────────────────────────────┘       │
│                                                            │
└──────────────────────────────────────────────────────────┘
          ▲                                ▲
          │ Telegram messages              │ API polls
          │ from Kyle                      │ from Vercel
          │                                │
    ┌─────┴────────┐              ┌───────┴──────┐
    │   Telegram   │              │    Vercel    │
    │   (Desktop)  │              │   Dashboard  │
    └──────────────┘              └──────────────┘
```

---

**End of Mac Mini AI Agent Setup Guide**

Good luck on Day 1, Kyle. Your bot is ready, your agents are standing by. Let's build View1 Studio.
