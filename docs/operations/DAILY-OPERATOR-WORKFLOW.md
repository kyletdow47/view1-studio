# Daily Operator Workflow — View1 Studio

**Your role:** Architect, Product Manager, Creative Director. Agents do the building.
**Primary interface:** Telegram Bot (View1 Build Manager Bot)
**SSH:** Only for major operations (emergencies, complex troubleshooting, infrastructure changes)
**Target time:** ~1.5 hours/day during build phase | ~45 min/day post-launch

---

## Telegram Bot Quick Reference

### Core Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/launch [agent]` | Start an agent task | `/launch content-social` |
| `/status` | See all running agents | `/status` |
| `/logs [agent]` | View last agent output | `/logs eng-auth` |
| `/report` | Weekly metrics (auto Fri 5 PM) | `/report` |
| `/pr-status` | List open PRs | `/pr-status` |
| `/metrics` | Test status & deployment health | `/metrics` |
| `/roadmap` | Show this week's priorities | `/roadmap` |
| `/nightly-check` | Trigger security scan & tests | `/nightly-check` |
| `/help` | List all commands | `/help` |

### Inline Actions (in Telegram messages)
- ✅ **Approve** — Merge a PR
- 🔍 **Review** — Open PR in browser for detailed review
- ⚠️ **Request Changes** — Leave feedback on PR
- 🚀 **Deploy** — Trigger deployment to production
- 📋 **See Details** — Expand truncated logs or PRs

---

## Daily Schedule

### Morning Block (30 min) — From Bed / Phone ☀️

#### 8:00 AM — Check Morning Briefing
**Activity:** Review overnight automated summary from Telegram

The bot auto-sends a digest at 8 AM containing:
- ✅ Completed tasks (agents that finished)
- ❌ Failed tasks (with reason)
- ⏳ Pending PRs (waiting for review)
- 🔔 Critical alerts (test failures, deployments, security issues)

**Your actions:**
1. Open Telegram, scan the briefing
2. Tap ✅ **Approve** buttons on ready-to-merge PRs (usually 1-3 per morning)
3. For PRs marked ⚠️ **Needs Review**, open in Telegram and skim the diff
4. Reply to any agent questions in PR comments (use GitHub mobile app if needed)
5. Note any failures — you'll address these in the Midday Block

**Time:** 8-10 minutes

#### 8:15 AM — Launch Today's Agents
**Activity:** Kickstart the day's agent tasks

Before launching:
1. Open your roadmap or check the Telegram `/roadmap` command
2. Identify today's top 3-4 priority agents

**Your launches (example Monday):**
```
/launch eng-api-endpoints      # Complete REST API
/launch content-social         # Draft social posts
/launch design-landing-page    # Update landing page copy
/launch marketing-competitor   # Gather competitor intel
```

**Confirmation:**
```
/status
```

You should see 4-5 agents running. Telegram confirms: "✅ All agents launched and running."

**Time:** 8-10 minutes

#### 8:25 AM — Content Review (async)
**Activity:** Review content agent drafts while doing other things

If the content agent finished yesterday:
1. Check `content/social/` folder via GitHub mobile (or Telegram will send preview)
2. Scan the drafts:
   - Are they on-brand? ✓
   - Correct tone? ✓
   - Any typos? ✓
3. Approve or reply with edits in GitHub
   - "✅ Post this one" → agent schedules it
   - "Edit: Change X to Y" → agent revises and resubmits
4. Approved content goes to Buffer (social scheduler) or posts live depending on agent setup

**Note:** This happens *while* you're doing other morning tasks. Don't deep-dive — quick scan and approve.

**Time:** 5-10 minutes (overlaps with other tasks)

---

### Midday Block (30 min) — At Computer 💻

#### 12:00 PM — PR Review & Merge
**Activity:** Deep review and merge any PRs from morning/overnight

**Step 1: Check `/pr-status`**
```
Telegram output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 OPEN PRs (3):
  #14 - eng-stripe: Add payment webhook handler
  #15 - eng-auth: Implement passwordless login
  #16 - content: Blog post templates
```

**Step 2: Categorize by complexity**
- 🟢 Simple (documentation, content, UI tweaks) → Merge via Telegram ✅ button
- 🟡 Medium (feature PRs, refactoring) → Review on desktop, then merge
- 🔴 Complex (Stripe, auth, security, critical logic) → Detailed review + test locally if needed

**Step 3: For complex PRs, review locally**

If PR #14 (Stripe payment webhook) needs testing:
```bash
ssh mini
cd ~/view1-studio
gh pr checkout 14
npm test                    # Run full test suite
npm run test:stripe         # Run Stripe-specific tests
# Check webhook handling:
npx stripe events list --limit 5
```

If tests pass:
```bash
gh pr merge 14 --squash     # Merge with clean history
```

Return to Telegram: ✅ Approve the merge button.

**If tests fail:**
```bash
/launch qa-test             # Launch QA agent to investigate
```

**Step 4: Monitor for conflicts**
If a merge creates conflicts:
- Telegram alerts you: ⚠️ "Merge conflict detected in PR #15"
- SSH in: `gh pr checkout 15`, manually resolve, push, merge
- Or reply: "👀 Review conflict" for agent to investigate

**Time:** 12-15 minutes

#### 12:15 PM — Integration Check
**Activity:** Ensure nothing broke after merges

**Run:**
```
/metrics
```

Telegram returns:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Tests: 287/290 passing (99%)
⏳ Deploy: In progress (3 min remaining)
🟢 Uptime: 99.98%
🔴 Errors: 3 (check logs)
```

**If tests are down:**
- 🔴 <95% passing? `/launch qa-test` to auto-investigate
- Green? Continue to next step

**If deployment is failing:**
- Check Vercel logs: `ssh mini` → `cd ~/view1-studio && vercel logs --follow`
- Or check Telegram logs: `/logs deploy`

**Time:** 5 minutes

#### 12:25 PM — Content Creation (Personal)
**Activity:** Record and write daily build-in-public updates

You have a few minutes while agents work. Pick one:

1. **Record a quick video** (2-3 min)
   - Show off a new feature from today's builds
   - Screen record on Mac, save to `content/videos/`
   - Agent or you edit and post to YouTube

2. **Write a personal post** for X/Twitter
   - "Just shipped: Passwordless login using magic links. Our engineering team (Claude agents) completed this in 6 hours."
   - Post from your X account or save to `content/social/personal-x/`

3. **Review blog draft**
   - Check `content/blog/` folder
   - Approve or edit the blog agent's post drafts
   - Scheduled posts appear on blog automatically

**Time:** 10 minutes (optional if busy)

---

### Evening Block (30 min) — Phone or Computer 🌙

#### 6:00 PM — End of Day Review
**Activity:** Check all agent completions and prepare for tomorrow

**Run:**
```
/status
```

Telegram shows:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 COMPLETED TODAY:
  ✅ eng-api-endpoints: REST API (20 endpoints, 4 PRs)
  ✅ content-social: 5 posts drafted
  ✅ design-landing-page: New copy uploaded
  ⏳ marketing-competitor: 80% complete (overnight finish)

📋 PENDING PRs: 2 (see /pr-status)
```

**Your actions:**
1. Review any new PRs: `/pr-status` → approve or request changes
2. Check tomorrow's roadmap: `/roadmap`
3. If critical failures: note them (address tomorrow morning)

**Time:** 5-10 minutes

#### 6:15 PM — Content & Community
**Activity:** Engage with your audience

1. **Reply to social comments** (via X/Instagram/LinkedIn)
   - "Thanks for signing up! What features interest you most?"
   - Engage with your waitlist signups

2. **Reply to photographer DMs** (if applicable)
   - Your View1 customers or collaborators
   - Keep momentum going

3. **Post evening build update**
   - Quick X/Twitter post summarizing the day: "Today: shipped API, designed landing page copy, gathered competitive intel. All via AI agents. What's next? You vote."

**Time:** 10 minutes

#### 6:25 PM — Plan Tomorrow
**Activity:** Set yourself up for success tomorrow morning

1. **Send yourself a Telegram message** with tomorrow's top 3 priorities:
   ```
   Tomorrow (Tuesday):
   1. Merge remaining Stripe PRs
   2. Launch email design agent
   3. Record YouTube update
   ```

2. **Pre-write task files** (if agents need specific instructions)
   - Create a quick `.md` file in `agents/tasks/` with agent-specific instructions
   - Example: `agents/tasks/design-email-templates.md` with brand guidelines

3. **Verify cron jobs** (check Telegram's nightly schedule)
   - `/nightly-check` confirms security scan & tests are scheduled for 2 AM

4. **Optional: SSH for setup**
   - If you need to update `.env` files or configure overnight tasks:
   ```bash
   ssh mini
   cd ~/view1-studio
   nano .env           # Edit environment variables
   git add .env && git commit -m "Update config for email agent"
   git push
   ```

**Time:** 5-10 minutes

---

## Weekly Schedule

### Monday — Sprint Planning 📋

| Time | Activity | Tool | Duration |
|------|----------|------|----------|
| 8:00 AM | Check weekend report | `/report` | 5 min |
| 8:15 AM | Review competitor intel | `docs/marketing/COMPETITOR-INTEL.md` (GitHub mobile) | 10 min |
| 8:30 AM | Plan week's agent tasks | Create files in `agents/tasks/` | 15 min |
| 9:00 AM | Launch week's first wave | `/launch [agents]` | 10 min |
| 10:00 AM | Review trend research | `docs/marketing/TREND-REPORT.md` | 10 min |

**Total Monday:** ~50 minutes

**Monday Output:**
- Week's roadmap finalized
- All task files created for agents
- First 5-6 agents launched
- Telegram reminder sent for Fri deadline

---

### Tuesday–Thursday — Execution 🚀

**Follow the daily schedule above (3 × ~1.5 hours).**

No special activities — just normal daily blocks:
- Morning: briefing, launch, content review
- Midday: PR review, integration check, personal content
- Evening: status, community, plan next day

---

### Friday — Metrics & Reporting 📊

| Time | Activity | Tool | Duration |
|------|----------|------|----------|
| 8:00 AM | Review weekly metrics report | Telegram auto-sends, tap `/report` | 5 min |
| 8:30 AM | Review financial metrics | `docs/business/WEEKLY-FINANCE.md` | 10 min |
| 9:00 AM | Record weekly YouTube recap | Screen recording + script from agent | 15 min |
| 10:00 AM | Write weekly X thread recap | Compose in `content/social/twitter/` | 15 min |
| 11:00 AM | Batch-review content for next week | Scan `content/` folder, approve drafts | 15 min |
| 12:00 PM | Update ROADMAP.md with progress | Mark completed items, add next week's | 10 min |

**Total Friday:** ~1.5 hours

**Friday Output:**
- Weekly report sent to yourself (Telegram) and via email
- YouTube recap published
- Social content queued for next week
- Roadmap updated for next sprint

---

### Saturday — Content Batching (Optional) 📝

**Time:** 1 hour (optional)

**Activities:**
- Batch-review content agent's entire weekly output
- Plan next week's social calendar (holidays, themes, trends)
- Write personal/reflective content (behind-the-scenes posts)
- Respond to community messages that piled up

---

### Sunday — Rest 😴

**No obligations.** (Unless there's an emergency or you want to record personal content.)

---

## Weekly Reports (Auto-Generated)

### Telegram Weekly Report (Auto-sent Friday 5 PM)

```
📊 Week [N] Report — View1 Studio
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏗️ ENGINEERING:
   PRs Merged: 12
   Lines Changed: +2,847 / -156
   Features Shipped:
     • Passwordless login (auth agent)
     • Stripe payment webhooks (payments agent)
     • REST API v1 (api agent)
   In Progress:
     • Email templates (design agent, 75%)
     • Blog post CMS (backend agent, 50%)
   Tests: 287/290 passing (99%)
   Blocking Issues: None

📱 MARKETING & CONTENT:
   Social Posts Published: 18
   Blog Posts Written: 3
   Waitlist Signups: +47 (Total: 234)
   Top Performing Content:
     • "We built X using AI agents" — 2.3K likes
     • Founder story post — 1.8K retweets

📈 BUSINESS METRICS:
   Users: 342 (+56 this week)
   Paid Users: 12 (+2 this week)
   MRR: $1,240 (+15% WoW)
   Monthly Burn: -$2,100 (efficient!)
   Cash Runway: 8 months

🔒 SECURITY & QA:
   Vulnerabilities: 0 critical, 1 high (snyk report)
   Test Coverage: 87%
   Uptime: 99.97%
   Incident Reports: 0

📋 NEXT WEEK PRIORITIES:
   1. Email campaign feature (finish & ship)
   2. Fix high severity vulnerability
   3. YouTube content series launch

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[View Dashboard] [See PRs] [Roadmap]
```

**Sent to:** Telegram chat (bot auto-sends)

---

### Email Weekly Report (Auto-sent Friday 5 PM)

**Recipient:** kyle@view1media.com

**Format:** HTML email via Resend (matching Telegram content above)

**Includes:**
- All Telegram report content (formatted as email)
- Key metrics charts (optional PDF attachment after launch)
- Links:
  - Open PRs on GitHub
  - Latest deployment on Vercel
  - Analytics dashboard
  - Roadmap doc

---

### Monthly Report (First Monday of Month)

**Time:** 30 minutes (part of normal Monday planning)

**Content:** Extended version with:
- Month-over-month financial comparison (MRR, churn, CAC)
- LTV vs. CAC analysis
- Cohort churn rates
- Roadmap progress (% complete per phase)
- Competitive landscape changes
- **Decisions needed from Kyle:** (e.g., "Hire contract designer?" "Pivot to B2B?")

**Sent to:** Telegram + Email

---

## When to SSH Into Mac Mini 🖥️

**Philosophy:** SSH only when necessary. 90% of operations happen via Telegram.

### Situations Requiring SSH

1. **Complex merge conflicts** (can't resolve via GitHub web UI)
   ```bash
   ssh mini
   cd ~/view1-studio
   gh pr checkout 15
   # Manually edit conflicted files
   git add .
   git commit -m "Resolve merge conflict"
   git push
   gh pr merge 15
   ```

2. **Testing Stripe webhooks locally**
   ```bash
   ssh mini
   cd ~/view1-studio
   npx stripe listen --forward-to localhost:3000/api/webhooks/stripe
   # Send test events from Stripe dashboard
   ```

3. **Debugging a stuck agent**
   ```bash
   ssh mini
   tmux list-sessions                # See all agent sessions
   tmux attach -t eng-auth           # Watch a specific agent's output
   # Ctrl+C to kill, or Ctrl+B D to detach
   ```

4. **Updating environment variables**
   ```bash
   ssh mini
   cd ~/view1-studio
   nano .env                         # Edit variables
   git add .env && git commit -m "Update API keys"
   git push
   # Agents auto-restart with new config
   ```

5. **Major infrastructure changes**
   - Installing new tools
   - Updating Claude Code version
   - Database migrations
   - Changing system settings

6. **Viewing large agent output** (>Telegram's 4MB limit)
   ```bash
   ssh mini
   tail -200 agents/results/eng-payment-*.json    # Last 200 lines of output
   less agents/results/eng-payment-*.json         # Page through output
   ```

### Quick SSH Commands Reference

```bash
# Connection
ssh mini                                          # SSH into Mac Mini

# Session management
tmux list-sessions                                # See all agents
tmux attach -t eng-stripe                         # Watch specific agent
tmux new-session -d -s test-agent -c ~/view1-studio  # Start a new session
tmux kill-session -t eng-broken                   # Kill stuck agent
tmux send-keys -t eng-auth "C-c"                  # Send Ctrl+C to agent

# Code & testing
cd ~/view1-studio
npm test                                          # Run all tests
npm run test:stripe                               # Stripe-specific tests
npm run test:auth                                 # Auth-specific tests
gh pr list --state open                           # See all open PRs
gh pr diff 14                                     # View PR #14 diff
git log --oneline -10                             # Last 10 commits

# Logs
tail -100 agents/results/*.json                   # Read agent output
tail -f agents/results/eng-latest.json            # Follow live agent output
vercel logs --follow                              # Vercel deployment logs
pm2 logs                                          # All agent logs (if using PM2)

# Deployment
git push origin main                              # Push changes
vercel deploy --prod                              # Deploy to production
vercel logs --prod                                # Production logs

# Stripe
npx stripe events list --limit 10                 # Recent Stripe events
npx stripe webhooks trigger payment_intent.succeeded  # Test webhook

# Environment
nano .env                                         # Edit config
source ~/.zshrc                                   # Reload shell config
```

---

## Emergency Procedures 🚨

### Agent Stuck (Running 2+ Hours on 30-Min Task)

**Symptom:** Agent started 2+ hours ago, `/status` still shows it running, no recent updates

**Step 1: Check what it's doing**
```
/logs eng-stuck
```

Telegram shows last 100 lines of output. If you see:
- Repeating error → agent is in a loop
- Long silence → agent is waiting for something
- Unintelligible output → agent crashed

**Step 2: Investigate (may not need SSH)**
- Check `/pr-status` — did it get stuck on a PR review?
- Check Telegram for messages from other agents blocking it
- If still unclear, SSH in

**Step 3: SSH if needed**
```bash
ssh mini
tmux attach -t eng-stuck
# Watch live output — press Ctrl+C to interrupt
# Or just leave it and kill from Telegram
```

**Step 4: Restart via Telegram**
```
/kill eng-stuck
/launch eng-stuck
```

Agent restarts fresh.

---

### Tests Failing After Merge

**Symptom:** Merged PR #14, `/metrics` shows tests dropped to 85%

**Step 1: Check which tests failed**
```
/metrics
```

Telegram shows failing tests:
- `tests/stripe/webhook.test.ts` — Payment webhook handler
- `tests/auth/passwordless.test.ts` — Login flow

**Step 2: Auto-investigate**
```
/launch qa-test
```

QA agent:
- Identifies broken test(s)
- Reverts problematic commit OR fixes the code
- Submits a new PR for your review
- Updates you: "Tests restored to 99%. Reverted commit XYZ or applied fix ABC."

**Step 3: Review & merge**
- `/pr-status` to see QA's PR
- Review changes, then ✅ merge

---

### Production Is Down

**Symptom:** Website returns 500, `/metrics` shows red, Telegram alert: "🚨 DOWNTIME ALERT"

**Step 1: Check logs (fast)**
```bash
ssh mini
cd ~/view1-studio
vercel logs --follow        # See real-time requests & errors
```

**Step 2: Identify the issue**
- Database down? Check Supabase dashboard (browser)
- Code error? Look for stack traces in Vercel logs
- Rate limited? Check Stripe/payment provider status

**Step 3: Fix & deploy**
```bash
# If a recent commit broke it, revert:
git revert HEAD
git push

# Or fix the bug:
# (edit file, commit, push)
git add .
git commit -m "Fix: production error"
git push

# Vercel auto-deploys, or manually:
vercel deploy --prod
```

**Step 4: Verify recovery**
```
/metrics
# Wait for green checkmarks
```

---

### Stripe Payment Issue

**Symptom:** Customer can't pay, Telegram alert: "🚨 STRIPE WEBHOOK FAILED"

**Step 1: Check recent events**
```bash
ssh mini
cd ~/view1-studio
npx stripe events list --limit 10
npx stripe webhooks trigger payment_intent.succeeded  # Test webhook
```

**Step 2: Review webhook handler**
```bash
# Check logs for webhook errors
tail -50 agents/results/*stripe*.json
# Or look at code:
cat src/api/webhooks/stripe.ts
```

**Step 3: Fix in code**
- Update webhook handler
- Test locally with `stripe listen`
- Commit, push, verify via `/metrics`

**Step 4: Alert customer** (via email/support channel)
- "We identified & fixed a payment processing issue. Please try again."

---

### Agent Missing Approval/Stuck Waiting for You

**Symptom:** Agent PR open for 3+ hours, Telegram reminder: "⏳ PR #16 waiting for review"

**Your action:**
1. Review PR via `/pr-status` → 🔍 **Review** button → GitHub link
2. Approve with ✅ or request changes
3. Agent auto-merges or revises based on feedback

**Fast path:** Don't read the full PR details — scan the diff quickly, approve if reasonable.

---

## Daily Checklists

### Morning Checklist (8 AM)
- [ ] Open Telegram, read briefing
- [ ] Approve/merge simple PRs (✅ button)
- [ ] `/status` to confirm agents are running
- [ ] Scan content drafts, approve or request edits
- [ ] Verify no 🚨 alerts

### Midday Checklist (12 PM)
- [ ] Deep review complex PRs (Stripe, auth, security)
- [ ] Test locally if needed (`npm test`)
- [ ] Merge approved PRs
- [ ] Run `/metrics` to check test health
- [ ] Fix any failing tests (or `/launch qa-test`)
- [ ] Create personal content or record video (optional)

### Evening Checklist (6 PM)
- [ ] `/status` to see completed tasks
- [ ] `/pr-status` to review new PRs
- [ ] Engage with social comments
- [ ] Send Telegram message with tomorrow's priorities
- [ ] Pre-write any agent task files
- [ ] Verify `/nightly-check` is scheduled

### Friday Checklist (Weekly Reporting)
- [ ] Review `/report`
- [ ] Check `docs/business/WEEKLY-FINANCE.md`
- [ ] Record YouTube recap
- [ ] Write X thread
- [ ] Batch-review content for next week
- [ ] Update `docs/strategy/ROADMAP.md`
- [ ] Send personal wrap-up post

---

## Key Folders & Files to Know

```
~/view1-studio/
├── agents/                          # Agent task definitions
│   ├── eng-*/                       # Engineering agents
│   ├── content-*/                   # Content agents
│   ├── design-*/                    # Design agents
│   ├── marketing-*/                 # Marketing agents
│   ├── tasks/                       # Task files (create here)
│   └── results/                     # Agent output logs
├── src/                             # Application source code
│   ├── api/                         # API routes
│   └── pages/                       # Website pages
├── content/                         # Content drafts & assets
│   ├── social/                      # Social media drafts
│   ├── blog/                        # Blog posts
│   └── videos/                      # Video recordings
├── docs/                            # Documentation
│   ├── strategy/                    # Roadmap, strategic docs
│   ├── business/                    # Finance, metrics
│   ├── marketing/                   # Competitor intel, trends
│   └── operations/                  # (This file)
├── .env                             # Environment variables (SSH to edit)
├── package.json                     # Dependencies
└── vercel.json                      # Deployment config
```

---

## Time Blocking Example Week

```
MONDAY
8:00-9:00     Sprint Planning + launch wave 1
9:00-12:00    Deep work (or other meetings)
12:00-1:00    PR review + metrics check
1:00-6:00     Deep work
6:00-6:30     Evening review + plan tomorrow

TUESDAY–THURSDAY (same structure)
8:00-8:30     Morning briefing + launch
8:30-12:00    Deep work
12:00-1:00    PR review + integration check
1:00-6:00     Deep work
6:00-6:30     Evening review

FRIDAY
8:00-9:00     Weekly metrics + financial review
9:00-10:00    YouTube recap + write X thread
10:00-11:00   Content batch review
11:00-12:00   Roadmap update + prep next week
Afternoon     Free
6:00-6:30     Weekend planning
```

---

## Post-Launch Optimization

Once View1 Studio is live and the product is stable:

**Reduce daily time from 1.5 hours to 45 minutes:**
- Remove personal content creation (unless specific campaigns)
- Reduce PR review depth (trust agent quality more)
- Shorter content review cycles (agents learn your taste)
- Weekly reporting only (not daily)
- Launch agents on fixed schedule vs. manual

**Telegram commands become:**
- `/status` (quick check, 1 min)
- `/pr-status` (approve/merge, 5 min)
- `/report` (once/week, 5 min)
- `/help` (for rare troubleshooting)

**SSH nearly never needed** — agents handle everything.

---

## Notes & Tips

1. **Batch decisions:** Review all PRs at once (midday block) rather than throughout the day
2. **Telegram is your dashboard:** Don't SSH unless you need to. Telegram is faster for 95% of operations.
3. **Content review is async:** Approve/reject drafts while doing other things. Don't deep-edit.
4. **Tests = safety net:** If `/metrics` is green, you can trust merges. Red? Use QA agent.
5. **Cron jobs are your friend:** Schedule nightly tests, security scans, and reports. Telegram alerts you if they fail.
6. **Build in public:** Your daily/weekly posts compound over time. Make it a habit.
7. **Agent learning:** Agents improve with feedback. Always leave detailed PR comments so they learn your standards.
8. **Stripe integration is critical:** Test webhook handling carefully. Use `stripe listen` locally.
9. **Backup agents:** If one agent is stuck, you have 21 others. Don't panic — just restart it.
10. **Sleep matters:** Agents run 24/7. You don't need to. 1.5 hours/day is enough. Trust the system.

---

**Last Updated:** 2026-03-25
**Document Owner:** Kyle (View1 Studio Founder)
**Review Frequency:** Monthly (or as operations scale)
