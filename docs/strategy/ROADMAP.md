# View1 Studio — Master Roadmap
> From zero to $30K MRR in 18 months

**Start Date:** Day 0 = March 25, 2026 (Today)
**Target Completion:** Month 18 = September 2027

---

## Phase 0: Setup (Day 0 — March 25, 2026)

### Hardware & Environment Setup
- **Mac Mini Configuration**
  - Install HDMI dummy plug (headless operation)
  - Configure SSH for remote access
  - Enable Screen Sharing for Monterey+ remote desktop
  - Disable sleep and automatic restarts
  - Verify 16GB RAM, 500GB SSD capacity

### Core Tooling Installation
```bash
# Package manager
- Homebrew (latest stable)

# Runtime environment
- Node.js v22 (LTS)
- npm 10+

# Version control & CLI
- git (latest)
- GitHub CLI (gh) with auth token
- tmux (session management)

# Development tools
- Claude Code CLI (authenticated)
- Remotion CLI v4+
- Docker (optional for future)
```

### Bot & Notification Infrastructure
- **Telegram Bot Setup**
  - Create via BotFather (@BotFather)
  - Generate API token
  - Create private group for notifications
  - Deploy manager agent to handle /tasks and /status commands

- **Backup Notification System**
  - Set up ntfy.sh topic for email fallback
  - Test push notifications on all devices
  - Document subscriber list in `.env`

### Repository Initialization
- Create monorepo at `/mnt/photo-sorter/`
- Folder structure:
  ```
  photo-sorter/
  ├── apps/
  │   ├── web/                 (Vercel deployment)
  │   ├── api/                 (Backend functions)
  │   ├── content-hub/         (Week 8 feature)
  │   └── brief-builder/       (Week 11 feature)
  ├── packages/
  │   ├── ui/                  (Design system)
  │   ├── auth/                (Auth utilities)
  │   ├── schemas/             (Zod/TypeScript types)
  │   └── analytics/           (Event tracking)
  ├── docs/
  │   ├── strategy/            (Roadmap, OKRs, PRDs)
  │   ├── architecture/        (System design)
  │   └── user-guides/         (Feature documentation)
  ├── .github/
  │   └── workflows/           (CI/CD pipelines)
  ├── scripts/
  │   ├── agent-tasks/         (Agent task files)
  │   └── cron/                (Scheduled jobs)
  └── README.md
  ```

### Documentation & Agent Setup
- **CLAUDE.md** — Agent Handbook
  - Role definitions for 20+ parallel agents
  - Task decomposition patterns
  - PR review standards
  - Communication templates

- **Agent Task Files** (in `/scripts/agent-tasks/`)
  - `eng-arch.md` — Schema & database design
  - `eng-ui.md` — UI component library
  - `eng-ai.md` — ML integration (SigLIP)
  - `eng-upload.md` — File upload pipeline
  - `eng-email.md` — Email template system
  - `content-social.md` — Social media posting
  - One task file per agent (see Phase 1-3 breakdown)

### Notification System Configuration
- **Crontab Setup**
  ```bash
  # 9 AM daily — agent task assignment
  0 9 * * * /scripts/cron/assign-daily-tasks.sh

  # 6 PM daily — PR reminder notifications
  0 18 * * * /scripts/cron/pr-status-check.sh

  # Fridays 5 PM — weekly metrics summary
  0 17 * * 5 /scripts/cron/weekly-metrics.sh
  ```

- **Telegram Bot Commands**
  - `/tasks` — Show today's agent assignments
  - `/status` — Current build status
  - `/metrics` — Weekly MRR, user count, churn
  - `/deploy` — Trigger Vercel deployment
  - `/notify` — Manual test notification

### First Public Post (Day 0, Evening)
- **X (Twitter) Post**
  ```
  Starting tonight: Building a SaaS from zero to $30K MRR
  in 18 months with AI agents.

  20+ agents working in parallel on:
  - Photo sorting & AI labeling
  - Content creation & distribution
  - Product development & marketing

  Daily build-in-public updates 🧵

  #BuildInPublic #SaaS #AI
  ```

---

## Phase 1: Demo MVP (Days 1–5)

### Timeline
- **Day 1:** March 26, 2026 (Thursday)
- **Day 2:** March 27, 2026 (Friday)
- **Day 3:** March 28, 2026 (Saturday)
- **Day 4:** March 29, 2026 (Sunday)
- **Day 5:** March 30, 2026 (Monday)

### Engineering — 5 Parallel Agents

#### Agent: eng-arch (Day 1)
**Task:** Schema & database foundation
- Design PostgreSQL schema
  - `users` table (auth, profile, settings)
  - `workspaces` table (multi-tenant support)
  - `photos` table (file metadata, upload status, classification)
  - `classifications` table (AI label results)
  - `stripe_customers` table (billing integration)

- Set up Supabase project (free tier)
  - Enable RLS (row-level security) policies
  - Create service role for API
  - Enable real-time subscriptions

- Database migrations scaffolding (Drizzle ORM)
- Output: `packages/schemas/schema.ts`

#### Agent: eng-ui (Day 1)
**Task:** Design system & component library
- Create shadcn/ui + Tailwind base
- Components:
  - Button (4 variants: primary, secondary, ghost, danger)
  - Card (with header, content, footer)
  - Modal / Dialog
  - Spinner / Loading states
  - Toast notifications
  - Form inputs (text, email, file upload)
  - Badge (for classification tags)

- Storybook setup for visual documentation
- Color palette finalized (light/dark mode)
- Output: `packages/ui/components/`

#### Agent: eng-ai (Day 1)
**Task:** ML model integration (SigLIP)
- Research SigLIP-400M weights (Hugging Face)
- Node.js binding evaluation:
  - ONNX Runtime option
  - Python microservice option (FastAPI)
- Proof-of-concept classification pipeline
  - Input: image file (JPG/PNG)
  - Output: top 5 labels + confidence scores

- Create test image set for validation
- Output: `packages/ai/classifier.ts`

#### Agent: eng-upload (Day 1)
**Task:** File upload pipeline (TUS protocol)
- Set up TUS server (Node.js)
- Chunked upload configuration (5MB chunks)
- Resume on failure logic
- File validation (image MIME types only)
- Integration with Cloudflare R2 (future) or local storage (MVP)

- Output: `apps/api/routes/upload.ts`

#### Agent: eng-email (Day 1)
**Task:** Email template system
- Email service selection (SendGrid or Postmark)
- Template structure:
  - Welcome email
  - Verification code email
  - Subscription confirmation
  - Receipt email

- Template rendering in Node.js
- Testing with Mailhog (local SMTP)
- Output: `packages/email/templates/`

#### Agent: eng-workspace (Day 2)
**Task:** Demo MVP UI & orchestration
- React SPA (Vite)
- Pages:
  - `/` — Public landing
  - `/auth/signup` — Registration
  - `/auth/login` — Login
  - `/dashboard` — Simple workspace view
  - `/upload` — Drag-drop photo upload
  - `/gallery` — Photo grid with classifications

- Integration points:
  - TUS upload → API endpoint
  - API → SigLIP classifier
  - Classifications → Display in gallery
  - Auth flow → Supabase session

- Output: `apps/web/`

### Days 2–4: Integration & Refinement

**Day 2 (March 27) — Merge & Conflict Resolution**
- All 5 agents commit PRs to `dev` branch
- Resolve any merge conflicts
- Code review: engineering standards pass?
- Ensure environment variables are documented

**Day 3–4 (March 28–29) — Full Integration**
- Wire upload flow end-to-end:
  - User selects photos
  - TUS client uploads to API
  - API saves to storage
  - API calls SigLIP classifier
  - Results saved to DB
  - Frontend polls for results
  - Gallery displays classified photos with labels

- UI polish:
  - Loading states on all interactions
  - Error messages for failed uploads
  - Toast notifications for success/failure
  - Responsive design (mobile-first)

- Performance baseline:
  - Page load < 2s
  - Upload chunking smooth (visual feedback)
  - Classification latency < 5s per photo

### Day 5: Deployment & Validation

**Deployment (March 30)**
- Deploy frontend to Vercel preview URL
- Deploy API to Vercel Functions
- Set up environment variables (Supabase, SendGrid keys)
- Run smoke tests on staging

**Demo URL:** `https://view1-studio-demo.vercel.app`
- Add to GitHub repo as `DEMO_URL.txt`
- Share link in README

**Validation:**
- Email demo link to 10–20 photographers (personal network)
  - Friends from local photography community
  - Instagram/X followers
  - Reddit photography communities

- Feedback survey (5 questions):
  1. Does the upload experience feel smooth?
  2. Are the AI labels accurate for your photos?
  3. Would you pay $9/mo for this? (yes/no)
  4. What's the #1 missing feature?
  5. How likely to recommend (1–10)?

- Collect emails for waitlist (Supabase table: `waitlist`)

### Marketing — 1 Agent

#### Agent: content-social (Days 1–5)
**Task:** Daily build-in-public posts
- Day 1 (March 26): "Shipping the first MVP in 5 days. Here's the plan 🧵"
  - 1. Schema design complete
  - 2. UI components live in Storybook
  - 3. SigLIP integration working
  - 4. TUS upload ready
  - 5. Deployed by Monday

- Day 2 (March 27): PR merge celebration
  - Screenshot of GitHub activity graph
  - "5 parallel agents, all PRs merged by end of day"

- Day 3 (March 28): Integration update
  - GIF showing upload → classification → gallery flow
  - "Photo → AI labels in 5 seconds"

- Day 4 (March 29): Final polish
  - Mobile screenshot
  - "Responsive design complete, deploying tomorrow"

- Day 5 (March 30): Demo day
  - "MVP live: link in bio, feedback appreciated"
  - Embed photo from demo

**Platforms:** X (primary), LinkedIn (secondary)
**Hashtags:** #BuildInPublic #SaaS #AI #Photography

### Deliverables by End of Phase 1
- [ ] PostgreSQL schema (Supabase)
- [ ] Design system (Storybook)
- [ ] AI classifier (SigLIP proof-of-concept)
- [ ] TUS upload server
- [ ] Email templates
- [ ] React MVP (5 pages)
- [ ] Vercel deployment with live URL
- [ ] 10–20 user feedback responses
- [ ] 25–50 waitlist signups
- [ ] 5 build-in-public posts

---

## Phase 2: Core Product (Days 6–18)

### Timeline
- **Start:** Day 6 = March 31, 2026 (Tuesday)
- **End:** Day 18 = April 12, 2026 (Sunday)

### Engineering — 8 Parallel Agents

#### Agent: eng-auth (Days 6–8)
**Task:** Complete authentication system
- Supabase Auth integration:
  - Email/password signup
  - Email verification (6-digit code)
  - Login with session persistence
  - Password reset flow
  - Social login (Google OAuth, GitHub optional)

- Frontend auth context:
  - `useAuth()` hook for React components
  - Protected routes (ProtectedLayout)
  - Redirect unauthenticated users

- API authentication:
  - JWT verification middleware
  - Rate limiting on auth endpoints

- Output: `packages/auth/`, `apps/web/pages/auth/*`

#### Agent: eng-gallery (Days 6–8)
**Task:** Client gallery themes (4 variants)
- Gallery view modes:
  1. **Grid** (responsive 3-4 columns, masonry)
  2. **Light table** (filename, size, date, labels)
  3. **Card** (large preview, expanded labels, metadata)
  4. **Carousel** (full-screen slideshow)

- Per-theme features:
  - Sorting (date, size, labels, custom)
  - Filtering by classification (multi-select)
  - Search by filename or label
  - Bulk selection & actions

- Sharing (public gallery link):
  - Unique gallery URLs (e.g., `/gallery/abc123`)
  - Share settings: password protection, expiry date

- Output: `apps/web/components/Gallery/*`, `apps/web/pages/gallery/*`

#### Agent: eng-stripe (Days 9–12)
**Task:** Complete subscription & payment system
- Stripe integration:
  - Product creation (PhotoSorter tier, future: Content Hub, Brief Builder)
  - Price setup ($9/mo, annual option $89/yr = save 2 months)
  - Subscription creation flow

- Stripe Connect (photographer payouts):
  - Account linking flow
  - Commission calculation (15% platform fee)
  - Payout scheduling (weekly to photographer accounts)

- Webhooks:
  - `invoice.created` → Send receipt email
  - `customer.subscription.deleted` → Send win-back email
  - `charge.failed` → Retry logic + notification

- Billing dashboard:
  - Current plan display
  - Invoice history (downloadable PDFs)
  - Upgrade/downgrade links
  - Card management

- Output: `apps/api/routes/billing/*`, `apps/web/pages/billing/*`

#### Agent: eng-cloudflare (Days 9–12)
**Task:** Image processing & CDN
- Cloudflare Image Optimization:
  - Automatic format selection (WebP, AVIF)
  - Responsive image URLs (srcset generation)
  - Blur-up placeholder images

- Cloudflare Workers (optional):
  - Thumbnail generation on-the-fly
  - Rate limiting per user
  - Access control

- Storage migration:
  - Move from local FS → Cloudflare R2
  - Signed URLs for private gallery access

- Output: `packages/image-service/`, `apps/api/routes/images/*`

#### Agent: eng-workspace (Days 13–15)
**Task:** Full dashboard & project management
- Workspace dashboard:
  - Project creation & CRUD
  - Project settings (name, description, sharing)
  - Photo upload per project
  - Statistics (total photos, classified %, storage used)

- Project detail view:
  - Gallery (all 4 themes available)
  - Team members (add/remove permissions)
  - Export options (CSV, Zip all photos)
  - Delete project (confirmation modal)

- Batch operations:
  - Select multiple photos → Re-classify
  - Bulk download
  - Bulk move to another project
  - Bulk delete

- Output: `apps/web/pages/workspace/*`

#### Agents: Integration & Polish (Days 16–18)
- **eng-testing**: E2E test suite (Playwright)
  - Login flow
  - Upload → classify → gallery
  - Payment flow
  - Gallery sharing

- **eng-perf**: Performance optimization
  - Image lazy loading
  - Code splitting (route-based)
  - Bundle analysis
  - Database query optimization

- **eng-polish**: Edge cases & UX
  - Network error handling & retry logic
  - Empty states (no photos, no classifications)
  - Loading skeleton screens
  - Accessibility audit (a11y)

- **eng-docs**: README, API docs, deployment guide

### Marketing — 3 Parallel Agents

#### Agent: mktg-landing (Day 6)
**Task:** Marketing website & waitlist
- Landing page structure:
  - Hero section (headline, CTA, hero image)
  - Problem/solution (3 sections)
  - Features (6 key features with icons)
  - Pricing table (PhotoSorter, future tiers)
  - Testimonials (from Phase 1 beta testers)
  - FAQ section (5–7 questions)
  - Footer with social links

- Waitlist form:
  - Email capture
  - Optional: Occupation, company, interest level
  - Immediate confirmation email

- Analytics:
  - Vercel Analytics enabled
  - Google Analytics 4 tracking
  - Conversion tracking (waitlist signups)

- Output: `apps/web/pages/index.tsx`, `apps/web/pages/pricing.tsx`

#### Agent: mktg-seo (Day 8)
**Task:** SEO foundation & blog launch
- Blog platform setup:
  - Markdown files in `/content/blog/`
  - Auto-generation of RSS feed
  - OG image generation (Remotion or Vercel OG)

- 5 launch blog posts:
  1. "AI Photo Organization for Photographers: The Ultimate Guide"
     - Target: "photo organization AI", "auto photo tagging"
  2. "How to Bulk Organize Photos: Best Tools & Strategies"
     - Target: "organize photos by subject", "bulk rename photos"
  3. "The Complete Beginner's Guide to Photo Culling"
     - Target: "photo culling tips", "how to cull photos"
  4. "Building a SaaS with AI Agents (Case Study)"
     - Target: "AI agents development", personal brand
  5. "Photography Workflow Optimization: Save 10 Hours/Week"
     - Target: "photography workflow", "photo management"

- SEO optimization:
  - Meta titles, descriptions
  - H1/H2/H3 hierarchy
  - Internal linking strategy
  - Image alt text

- Tools: Google Search Console setup, keyword research (Ahrefs free)
- Output: `apps/web/blog/*`, `apps/web/sitemap.xml`

#### Agent: mktg-email (Day 10)
**Task:** Email marketing foundation
- Email sequences (via SendGrid/Postmark):
  1. **Welcome sequence** (Day 0–7)
     - Day 0: Welcome + product overview
     - Day 3: Feature deep-dive
     - Day 7: Customer success story

  2. **Conversion sequence** (Days 1–14 post-launch)
     - Day 1: Product Hunt launch announcement
     - Day 7: User success story
     - Day 14: Pricing/special offer

  3. **Win-back sequence** (Post-churn)
     - Day 1: "We'll miss you" + offer
     - Day 7: Feature announcement
     - Day 14: "Come back" incentive

- Segmentation:
  - Trial users vs. free users vs. paying
  - Engaged vs. inactive (7+ days no login)

- Analytics:
  - Open rate targets: 25%+ for welcome
  - Click-through targets: 5%+

- Output: `packages/email/sequences/`

### Content — 2 Parallel Agents

#### Agent: content-social (Daily)
**Task:** Build-in-public content calendar
- Daily posts (5 per week, M–F):
  - Monday: Week preview + team updates
  - Tuesday: Feature ship + screenshot
  - Wednesday: Metrics update
  - Thursday: Customer story or tip
  - Friday: Weekly recap + metrics deep-dive

- Platform strategy:
  - **X (Twitter)**: 1 long-form tweet + 1 quote retweet daily
  - **LinkedIn**: 2–3 posts/week (professional angle)
  - **IndieHackers**: Weekly engagement (comments, threads)
  - **Bluesky**: Mirror X content (growth channel testing)

- Format variety:
  - Text threads (process, learnings)
  - Screenshots (feature launches, metrics)
  - GIFs (demo workflows)
  - Video clips (5–15 sec of features)

- Output: Content calendar spreadsheet, published daily

#### Agent: content-video (Day 10)
**Task:** Product demo video (Remotion)
- Video specs:
  - Duration: 90 seconds
  - Resolution: 1920x1080 (16:9)
  - Voiceover: Auto-generated (ElevenLabs) or recorded

- Video structure:
  - 0–10s: Problem (photographers waste hours organizing)
  - 10–45s: Solution demo (upload → classify → gallery)
  - 45–75s: Features (sharing, export, themes)
  - 75–90s: CTA (Sign up for free at view1.studio)

- Remotion implementation:
  - Animated typography (problem statement)
  - Screen recording capture (product demo)
  - Transition effects (fade, slide)
  - Background music (royalty-free)

- Platforms: YouTube, X, LinkedIn, product page
- Output: `apps/video/demo.tsx` (Remotion component)

### Quality — 1 Agent

#### Agent: qa-test (Day 14)
**Task:** E2E test suite
- Playwright setup
- Test coverage:
  - User registration flow
  - Email verification
  - Login/logout
  - Photo upload (single + batch)
  - Gallery filtering & search
  - Photo sharing (public link)
  - Subscription creation
  - Invoice download
  - Settings page updates

- CI/CD integration:
  - GitHub Actions workflow
  - Run tests on every PR
  - Block merge if tests fail

- Output: `apps/web/tests/e2e/`, `.github/workflows/test.yml`

### Business Operations — 3 Tasks

#### Day 6: Form LLC
- **Entity:** View1 Studio LLC
- **State:** Delaware (or Wyoming for affordability)
- **Filing method:** Online via legalzoom.com or stripe.com/atlas
- **Cost:** ~$200–500
- **Deliverables:**
  - EIN number (obtain from IRS)
  - Operating agreement
  - Certificate of Good Standing

#### Day 8: Open Business Bank Account
- **Bank:** Mercury or Stripe Treasury
- **Requirements:**
  - EIN letter from IRS
  - LLC operating agreement
  - ID verification
- **Setup:**
  - Enable ACH transfers (for Stripe payouts)
  - Webhook integration with accounting
  - Connect to Wave Accounting (free)

#### Day 10: Legal Documents
- **Terms of Service:** Use Termly.io or Stripe template
  - Liability limits
  - Payment terms
  - Data privacy (GDPR compliant)

- **Privacy Policy:** Termly.io
  - Data collection disclosure
  - Third-party services (Stripe, Supabase, Cloudflare)
  - CCPA compliance

- **Deploy:** `/legal/` pages on website

### Deliverables by End of Phase 2
- [ ] Auth system (signup, email verification, login)
- [ ] 4 gallery themes + sharing
- [ ] Stripe subscriptions & Connect integration
- [ ] Cloudflare image optimization
- [ ] Full workspace dashboard
- [ ] E2E test suite (>80% coverage)
- [ ] Marketing website + waitlist
- [ ] 5 SEO blog posts
- [ ] Email sequences set up
- [ ] Daily social media posting (20+ posts)
- [ ] Product demo video
- [ ] LLC formed + EIN
- [ ] Business bank account open
- [ ] ToS & Privacy Policy live

---

## Phase 3: Launch Ready (Days 19–28)

### Timeline
- **Start:** Day 19 = April 13, 2026 (Monday)
- **End:** Day 28 = April 22, 2026 (Wednesday)

### Engineering — 4 Parallel Agents

#### Agent: eng-notifications (Days 19–21)
**Task:** Bell + activity feed
- Notification bell:
  - Real-time updates (Supabase real-time subscriptions)
  - Unread count badge
  - Dropdown menu (last 10 notifications)
  - Mark as read (individual or all)

- Activity feed page:
  - Full history of events
  - Filtering by type (uploads, shares, comments)
  - Pagination (20 per page)

- Notification types:
  - Photo uploaded successfully
  - Classification complete
  - Gallery shared with you
  - Comment on shared gallery
  - Payment received (photographer in Connect mode)

- Output: `apps/web/components/Notifications/`, `apps/api/routes/notifications/*`

#### Agent: eng-pwa (Days 22–23)
**Task:** Progressive Web App setup
- Web manifest:
  - App name, icon, theme color
  - Start URL, display mode
  - Screenshots (iOS, Android)

- Service Worker:
  - Offline support (cached assets)
  - Cache-first strategy for images
  - Background sync for failed uploads

- Install prompt:
  - iOS: Add to Home Screen (banner)
  - Android: Native PWA prompt

- Capabilities:
  - Installable to home screen
  - Works offline (read cached galleries)
  - Push notification support

- Output: `apps/web/public/manifest.json`, `apps/web/service-worker.ts`

#### Agent: eng-polish (Days 24–26)
**Task:** Bug fixes, perf, accessibility
- Bug squash sprint:
  - Review all open issues
  - Fix P0 (blocking users) and P1 (major UX issues)
  - Re-test fixed issues

- Performance optimization:
  - Lighthouse audit (target: 90+ all metrics)
  - Image optimization (use Cloudflare responsive)
  - Code splitting verification
  - Database query optimization (add indexes)

- Accessibility improvements:
  - WCAG 2.1 AA compliance
  - Keyboard navigation (all pages)
  - Screen reader testing (NVDA)
  - Color contrast (4.5:1 minimum)
  - Alt text on all images

- Output: Performance reports, accessibility audit docs

#### Agent: eng-deploy (Days 27–28)
**Task:** Final QA & production setup
- Staging → Production:
  - Final smoke test (all features)
  - Database backup before migration
  - Run E2E test suite in production (read-only)
  - Load testing (simulate 100 concurrent users)

- Production configuration:
  - Environment variables finalized
  - Stripe live mode enabled (not sandbox)
  - SendGrid templates live
  - Analytics tracking verified

- Monitoring setup:
  - Error tracking (Sentry)
  - Uptime monitoring (Uptime.com)
  - Analytics dashboard (Vercel + GA4)
  - Database backups automated (daily)

- Rollback plan:
  - Document rollback steps
  - Identify quick fixes for top 5 risk areas

- Output: Deployment checklist, monitoring dashboard

### Marketing — 4 Parallel Agents

#### Agent: mktg-ph (Day 19)
**Task:** Product Hunt launch preparation
- Product Hunt profile:
  - Logo + cover image
  - 1-2 sentence tagline
  - Detailed product description
  - Demo video (from Phase 2)
  - 5–10 product screenshots

- Hunter outreach:
  - Identify 3–5 potential hunters (high karma)
  - Send DM with launch date
  - Negotiate launch support (top-of-morning post)

- Community building (pre-launch):
  - Reply to all Product Hunt comments
  - Offer first-week discount (20% off for PH users)

- Output: PH product page, hunter agreement

#### Agent: mktg-email (Day 22)
**Task:** Waitlist launch email
- Segment waitlist by:
  - Beta testers (high engagement)
  - Early signups (early adopter mindset)
  - Refer source (how they heard)

- Email content:
  - Subject: "View1 Studio is live 🎉"
  - Hero image (demo screenshot)
  - Launch story (13-day journey)
  - Feature highlights (3 main benefits)
  - CTA: "Start free trial" (no credit card required)
  - Social proof: Beta feedback quotes

- Timing: Send 48 hours before PH launch
- Follow-up: +1 day if no signup, +7 days if signed up but not subscribed
- Output: Email template, send logs

#### Agent: mktg-social (Day 25)
**Task:** Launch week content blitz
- Pre-launch (Day 25–27):
  - Daily countdown posts on X
  - LinkedIn article: "Lessons from shipping in 4 weeks"
  - TikTok/IG Reels (if applicable): Behind-the-scenes clips

- Launch day (Day 28):
  - 1x 9 AM (launch announcement)
  - 1x 12 PM (PH update + encouragement to upvote)
  - 1x 5 PM (metrics update + thank you)
  - Reply to all mentions/comments

- Post-launch (Day 28+):
  - Daily updates (user feedback, features used most)
  - Weekly recap threads
  - Customer success stories (real photographers)

- Output: Content calendar, scheduled posts, engagement tracker

#### Agent: mktg-pr (Day 28)
**Task:** Press release & earned media
- Press release distribution:
  - Self-host on website
  - Distribute via PRweb, ePresswire, or free tier (HackerNews, Indie Hackers)
  - Pitch to photography blogs (Fred Miranda, DPReview)

- Pitch email to journalists:
  - Subject: "AI Photo Organization SaaS Launches (Founder Built in 4 Weeks)"
  - Angle: Technical achievement + business story
  - Inclusion: Demo link, founder availability for interview

- Output: Press release document, media contact list

### Content — 4 Parallel Agents

#### Agent: content-calendar (Launch week)
**Task:** Content strategy for launch week
- Content themes by day:
  - Day 1 (Mon 4/13): "We shipped it" + behind-the-scenes
  - Day 2 (Tue 4/14): Feature deep-dive #1 (AI classification)
  - Day 3 (Wed 4/15): Feature deep-dive #2 (Gallery themes)
  - Day 4 (Thu 4/16): User story from Phase 1 beta
  - Day 5 (Fri 4/17): Metrics recap + thank you
  - Day 6 (Sat 4/18): Sunday prep (team highlights)
  - Day 7 (Sun 4/19): Personal/behind-the-scenes content

- Output: Detailed content calendar, scheduled posts

#### Agent: content-blog (Day 19)
**Task:** Launch blog post
- Post: "How I Built a SaaS in 4 Weeks With AI Agents"
  - Part 1: The plan (roadmap breakdown)
  - Part 2: The build (parallel agents, GitHub activity)
  - Part 3: The launch (metrics, feedback, learnings)
  - Lessons learned (5–7 key insights)

- SEO optimization:
  - Target: "how to build SaaS", "AI agents development"
  - Internal links: Link to previous blog posts
  - External links: Link to tools used (Vercel, Supabase, etc.)

- Promotion:
  - Share on HackerNews (comments)
  - Post on Indie Hackers
  - Share to newsletter (future)

- Output: Published on blog, shared on social

#### Agent: content-video (Launch week)
**Task:** Launch video + YouTube deep-dive
- **Launch video** (30 sec):
  - Compilation of demo + metrics
  - Energy & excitement
  - CTA: "Try free"

- **YouTube deep-dive** (8–10 min):
  - Part 1: The problem (why Photo org matters)
  - Part 2: How it works (full feature demo)
  - Part 3: The journey (fast build story)
  - Part 4: Getting started (sign up, first photos)
  - Outro: Subscribe for weekly updates

- YouTube optimization:
  - Title: "I Built a Photo Organizing SaaS in 4 Weeks with AI | Full Demo"
  - Tags: photo, AI, SaaS, productivity, photography
  - Thumbnail: Bold design, founder face (credibility)
  - Playlist: "SaaS Build-in-Public" series

- Output: YouTube uploads, embeds on landing page

#### Agent: content-carousel (Day 22)
**Task:** Launch carousel for Instagram/X
- Canva design (10–15 slides):
  - Slide 1: "View1 Studio is live 🎉"
  - Slide 2: The problem
  - Slide 3–5: Feature showcase (3 screenshots)
  - Slide 6: Testimonial
  - Slide 7: Pricing
  - Slide 8: "Sign up free" CTA + link

- Variations:
  - IG carousel (optimized for IG ratio)
  - X thread (break into 10–15 tweets)

- Output: Canva designs, published posts

### Quality — 3 Parallel Agents

#### Agent: qa-security (Day 19)
**Task:** Full security audit
- Checklist:
  - [ ] SQL injection prevention (parameterized queries)
  - [ ] CSRF protection (tokens on forms)
  - [ ] XSS prevention (sanitize user input)
  - [ ] Authentication bypass (test edge cases)
  - [ ] Authorization checks (user X can't access user Y's data)
  - [ ] Sensitive data in logs (PII, tokens)
  - [ ] HTTPS enforced (no mixed content)
  - [ ] Dependency vulnerabilities (npm audit)

- Tools:
  - OWASP ZAP (free vulnerability scanner)
  - npm audit
  - Code review by another engineer

- Report:
  - Severity levels (critical, high, medium, low)
  - Fix timeline for each

- Output: Security audit report, remediation plan

#### Agent: qa-code-review (Day 22)
**Task:** Final PR review pass
- Review all open PRs:
  - [ ] Code quality (no dead code, clear naming)
  - [ ] Tests passing (E2E suite)
  - [ ] Documentation updated (README, API docs)
  - [ ] Performance impact (bundle size, queries)
  - [ ] Accessibility maintained

- Approve/request changes:
  - Request changes for blockers
  - Approve with suggestions for others

- Merge strategy:
  - Squash commits for cleanliness
  - Maintain clean main branch

- Output: All PRs merged or marked as post-launch

#### Agent: qa-regression (Day 25)
**Task:** Full regression test
- Manual testing of all features:
  - [ ] Auth (signup, email verification, login, password reset)
  - [ ] Upload (single file, multiple files, error handling)
  - [ ] Gallery (all 4 themes, filtering, search, sorting)
  - [ ] Sharing (create link, share with password, expiry)
  - [ ] Billing (subscribe, invoice, download)
  - [ ] Settings (profile update, password change, delete account)
  - [ ] Email (verify delivery, content check, links work)

- Devices tested:
  - Desktop (Chrome, Firefox, Safari)
  - Mobile (iOS Safari, Chrome on Android)
  - Tablet (iPad)

- Report: Pass/fail for each feature x browser combo
- Output: Regression test report, any P0/P1 issues found

### Business Operations — Day 28

#### Launch Day Checklist
- [ ] Stripe live mode active (not sandbox)
- [ ] Payment processing tested
- [ ] Email deliverability verified (warmup if needed)
- [ ] DNS records configured (custom domain if used)
- [ ] Analytics tracking live (GA4, Vercel)
- [ ] Support system ready (email address, response plan)
- [ ] Error monitoring active (Sentry)
- [ ] Database backups verified
- [ ] Slack/Discord launch channel ready for user support
- [ ] Team celebration plan 🎉

### Deliverables by End of Phase 3
- [ ] Notification system (bell + activity feed)
- [ ] PWA support (installable, offline)
- [ ] Performance audit (90+ Lighthouse)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Security audit (no critical vulnerabilities)
- [ ] E2E regression test pass
- [ ] Product Hunt profile + hunter secured
- [ ] Waitlist launch email sent
- [ ] Launch week content blitz (daily posts)
- [ ] Product Hunt launch successful (>500 upvotes target)
- [ ] Blog post: "How I Built a SaaS in 4 Weeks"
- [ ] YouTube launch video
- [ ] Press release distributed
- [ ] LLC + bank account fully operational
- [ ] Stripe live mode active
- [ ] First paying customers acquired

---

## Phase 4: Growth + Content Hub (Weeks 5–9)

### Timeline
- **Start:** Week 5 = April 23–29, 2026
- **End:** Week 9 = May 21–27, 2026

### Engineering — 2–3 Parallel Agents

#### Agent: eng-monorepo (Weeks 5–6)
**Task:** Refactor to monorepo + shared packages
- Extract shared utilities:
  - `@view1/types` — TypeScript types (User, Photo, Workspace)
  - `@view1/api-client` — Fetch wrapper + Supabase client
  - `@view1/ui` — Published design system (npm package)
  - `@view1/hooks` — React hooks (useAuth, useWorkspace, usePhotos)

- Workspace configuration:
  - Turborepo or pnpm workspaces
  - Shared build/lint/test configuration
  - Dependency management

- Output: Monorepo refactoring complete, publishing to npm registry

#### Agent: eng-content-hub (Weeks 7–8)
**Task:** Content Hub MVP (social media planner)
- Features:
  - Caption writing (with AI assist via OpenAI)
  - Post scheduling (queue for later)
  - Platform support (X, LinkedIn, Instagram)
  - Content calendar view
  - Analytics preview (estimated reach)

- Architecture:
  - New app: `apps/content-hub/`
  - Shared UI components
  - Cron job for scheduled posting
  - Integration with social platforms (APIs)

- MVP scope (Weeks 7–8):
  - X (Twitter) posting only (easiest API)
  - Manual AI caption assist
  - Simple calendar view
  - Scheduled posting (24-hour buffer)

#### Agent: eng-integration (Week 9)
**Task:** Content Hub integration with PhotoSorter
- Single dashboard:
  - PhotoSorter workspace (left sidebar)
  - Content Hub workspace (accessible from menu)
  - Shared auth context
  - Unified billing (both apps under one subscription)

- Data flow:
  - Content Hub can embed photos from PhotoSorter galleries
  - Shortcuts to share gallery links in captions

- Output: Seamless app switching, unified user experience

### Marketing — Scaled to 3 agents

#### Agent: mktg-product (Weeks 5–9)
**Task:** Product Hunt #2 launch (Content Hub)
- Content Hub positioning:
  - "The social media planner for photographers"
  - Cross-sell from PhotoSorter to existing users

- Launch plan:
  - Product Hunt submission (Week 9)
  - Target for #1 product that day

- Analytics post-PH:
  - Track Content Hub signups from PhotoSorter users
  - Conversion rate (PhotoSorter → Content Hub trial)

#### Agent: mktg-content (Weeks 5–9)
**Task:** Scaled content marketing
- Blog output: 3 posts/week (vs. 1 post/week Phase 2)
  - Topics: Photography workflows, content creation, AI tools
  - Guest posts: Collaboration with photography bloggers
  - Case study: First paying customer story

- SEO focus:
  - Long-tail keywords (e.g., "best photo organization for freelance photographers")
  - Internal linking strategy (PhotoSorter → Content Hub)
  - Backlink outreach (photography communities, forums)

#### Agent: mktg-case-study (Week 6–7)
**Task:** First customer case study
- Interview first major paying customer:
  - Background (how many photos, current workflow)
  - Problem they faced (pain points)
  - How PhotoSorter solved it
  - Results (time saved, revenue generated)
  - Quote + photo permission

- Formats:
  - Long-form blog post
  - 1-page PDF case study (downloadable)
  - Video interview (5–10 min)
  - LinkedIn article

- Output: Published on website, shared in marketing

### Content — Sustained Daily

#### Agent: content-social (Weeks 5–9)
**Task:** Daily content + launch preparation
- Format mix:
  - Monday: Build-in-public update
  - Tuesday: Photography tip
  - Wednesday: Metrics/growth update
  - Thursday: Customer story or user showcase
  - Friday: Weekly recap + metrics deep-dive
  - Saturday: Behind-the-scenes or personal
  - Sunday: Rest or preview of upcoming week

- Content Hub launch teaser:
  - Week 7: "Sneak peek at what's coming"
  - Week 8: "Feature walkthrough" (screenshot thread)
  - Week 9: "Content Hub launches tomorrow" (hype building)

#### Agent: content-video (Weeks 5–9)
**Task:** Weekly YouTube uploads
- Video ideas:
  - Week 5: "10 Photography Workflows You're Slowing Down"
  - Week 6: "PhotoSorter Deep Dive: Gallery Themes"
  - Week 7: "Best Tools for Photographers 2026"
  - Week 8: "Introducing Content Hub for Photographers"
  - Week 9: "Building a Photography SaaS: 6-Week Update"

- Format:
  - 8–12 min videos
  - Monetization: Enable (YouTube Partner Program)
  - Playlist: "Photography Tools & Workflows"

### Business Milestones

- **Week 5:** 100 users, 10 paying ($200 MRR)
  - Track: Daily active users (DAU), monthly active users (MAU)
  - Churn analysis: Why do users leave?

- **Week 7:** 200 users, 25 paying ($500 MRR)
  - Celebrate milestone on social
  - Share learnings (what converted users)

- **Week 9:** 350 users, 50 paying ($1,000 MRR)
  - Plan: Content Hub integration as next growth lever
  - Survey: Ask users what feature to build next

### Deliverables by End of Phase 4
- [ ] Monorepo refactoring complete
- [ ] Shared npm packages published
- [ ] Content Hub MVP (X scheduling)
- [ ] Content Hub integration (single dashboard)
- [ ] Content Hub Product Hunt launch
- [ ] Customer case study published (blog + PDF + video)
- [ ] 3 blog posts/week sustained
- [ ] Weekly YouTube uploads
- [ ] Weekly metrics reports (MRR, churn, CAC/LTV)
- [ ] 350 total users, 50 paying ($1K MRR)

---

## Phase 5: Brief Builder + Suite (Weeks 10–12)

### Timeline
- **Start:** Week 10 = May 28–June 3, 2026
- **End:** Week 12 = June 11–17, 2026

### Engineering — 2 Parallel Agents

#### Agent: eng-brief-builder (Weeks 10–11)
**Task:** Voice-chat brief builder for photographers
- Features:
  - Text or voice input (transcribe via Deepgram)
  - AI parses requirements (number of photos, style, deadline)
  - Generates project brief (structured data)
  - Integrates with PhotoSorter workspace

- Architecture:
  - New app: `apps/brief-builder/`
  - Voice API: Deepgram or Whisper (OpenAI)
  - LLM for parsing: OpenAI GPT-4
  - Database: Same Supabase instance

- Workflow:
  1. Photographer records voice memo (e.g., "I need 500 photos sorted for a wedding next week")
  2. Voice transcribed to text
  3. AI extracts: photo count, deadline, style/category
  4. Generate structured brief
  5. User reviews + edits
  6. Save as template for future projects

#### Agent: eng-suite (Week 12)
**Task:** Suite integration + shared billing
- Unified workspace:
  - All 3 tools under one account
  - Single auth system
  - Shared settings/profile

- Billing:
  - Unified pricing: $29/mo for all 3 apps
  - Annual plan: $290/yr (save 2 months)
  - Upgrade messaging (PhotoSorter → Suite)

- Analytics:
  - Cross-app usage tracking
  - Which tools drive retention?

- Output: Suite dashboard, unified settings, one subscription

### Marketing — 3 Agents

#### Agent: mktg-ph-3 (Weeks 10–12)
**Task:** Product Hunt #3 launch (full suite)
- Positioning:
  - "The complete photo & content management suite"
  - Emphasize bundle value ($29 = better than buying individually)

- Launch strategy:
  - Leverage existing user base for upvotes
  - Early access to beta users (Week 10)
  - Week 12: Product Hunt submission

- Target: #1 product that day, >1K upvotes

#### Agent: mktg-pricing (Weeks 10–11)
**Task:** Suite pricing announcement
- Blog post: "Introducing View1 Suite: $29/mo for everything"
  - PhotoSorter ($9/mo) + Content Hub ($9/mo) + Brief Builder ($9/mo) = $27/mo value
  - Suite offer: $29/mo (save bundling overhead)
  - Annual: $290/yr (save $58)

- Email campaign:
  - Segment by product usage
  - PhotoSorter users: "Unlock Content Hub & Brief Builder for $20/mo more"
  - Content Hub users: "Get PhotoSorter + Brief Builder for additional $20/mo"

- Social teaser:
  - Week 10: "Something big is coming"
  - Week 11: Pricing announcement

#### Agent: mktg-partner (Weeks 10–12)
**Task:** Partnership outreach
- Target partners:
  - Photography education platforms (MasterClass, CreativeLive)
  - Photography blogs/communities (DPIC, Fred Miranda)
  - Photography software (Capture One, Lightroom integrations)

- Pitch:
  - "White-label PhotoSorter for your platform"
  - Revenue share or integration fee
  - SDK available for embedding

- Goals:
  - 1–2 partnerships signed by Week 12
  - Distribution channel for user acquisition

### Content — Sustained Daily

#### Agent: content-suite (Weeks 10–12)
**Task:** Content calendar for suite launch
- Daily posts leading to Week 12 launch:
  - Feature sneak peeks (Brief Builder voice input demo)
  - User testimonials (2–3 posts)
  - "Why we built Brief Builder" (problem story)
  - Pricing announcement (Week 11)
  - Launch day hype (Week 12)

#### Agent: content-brief-builder-video (Week 11)
**Task:** Brief Builder demo video
- Video specs:
  - Duration: 60 seconds
  - Voice-over demo of recording brief
  - AI parsing visualization
  - Auto-generating project

- Platforms: YouTube, X, LinkedIn, product page

### Business Milestones

- **Week 10:** Beta testing Brief Builder with 20 users
  - Feedback: Does voice input solve the problem?
  - Refinements based on usage

- **Week 12:** Suite launch
  - Target: 100 paid Suite subscribers (on top of existing)
  - MRR impact: Suite @ $29/mo = significant boost
  - Target MRR: $2,100+ (100 suite @ $29 = $2,900 + legacy $200 = $3,100 estimate)

### Deliverables by End of Phase 5
- [ ] Brief Builder MVP (voice input, AI parsing)
- [ ] Suite integration (unified workspace, billing)
- [ ] Product Hunt #3 launch
- [ ] Suite pricing announced
- [ ] Partnership agreements (1–2 signed)
- [ ] Brief Builder video
- [ ] Suite launch content blitz
- [ ] 100 paid Suite subscribers
- [ ] $2,100+ MRR achieved

---

## Phase 6: Scale (Months 4–6)

### Timeline
- **Start:** Month 4 = June 18 – July 17, 2026
- **End:** Month 6 = August 18 – September 17, 2026

### Engineering — 3 Parallel Agents

#### Agent: eng-bookings (Month 4)
**Task:** Booking system for photographers
- Features:
  - Client booking link (from photographer workspace)
  - Calendar availability (photographer sets hours)
  - Automatic brief generation post-booking
  - Payment on booking (Stripe)
  - Client portal (view shoot details, share feedback)

#### Agent: eng-edits (Month 5)
**Task:** Edit requests + feedback loops
- Features:
  - Client revision requests (annotation on photos)
  - Photographer approval workflow
  - Revision history + versioning
  - Feedback templates (for photographers)

#### Agent: eng-cart (Month 6)
**Task:** Client cart checkout
- Features:
  - Photographers can sell prints
  - Cart + checkout (Stripe)
  - Payment to photographer (via Stripe Connect)
  - Order fulfillment (print vendor integration)

### Marketing — 3 Agents

- **Content marketing:** 3 blog posts/week (sustained)
- **YouTube:** 2 videos/week
- **Affiliate program:** Launch (5–10% commission per referral)
- **First case study:** Published & promoted

### Business Milestones

- **Month 4:** 500 users, 80 paid
  - Bookings feature driving new signups
  - Churn rate analysis (should be <5%)

- **Month 6:** 750 users, 130 paid
  - MRR target: $2,500+
  - CAC < $10 (organic + affiliate)
  - LTV > $100 (avg subscription 8+ months)

### Deliverables by End of Phase 6
- [ ] Booking system live
- [ ] Edit requests feature
- [ ] Cart + print checkout
- [ ] Affiliate program launched
- [ ] 750 users, 130 paid
- [ ] $2,500 MRR

---

## Phase 7: Maturity (Months 7–12)

### Timeline
- **Start:** Month 7 = September 18 – October 17, 2026
- **End:** Month 12 = December 18, 2026 – January 17, 2027

### Engineering

#### Phase 2 Features (Months 7–9)
- Mobile PWA improvements (native app feel)
- Print integration (Printful, Redbubble)
- API access (3rd-party integrations)
- Advanced analytics dashboard

#### Hiring (Month 7)
- **Part-time support engineer** ($2K–3K/month)
  - Respond to user issues
  - Bug triage
  - Feature feedback aggregation

### Business Milestones

- **Month 7:** 1,000 users, 150 paid
- **Month 9:** 1,500 users, 200 paid
  - MRR: $3,500+

- **Month 12:** 2,000 users, 250 paid
  - MRR: $7,000+
  - Churn rate: <5% monthly

- **Funding decision:** Evaluate seed funding vs. stay bootstrapped
  - If profitable: Continue bootstrap (higher founder equity)
  - If growth stalling: Explore seed round ($500K–$1M)

### Deliverables by End of Phase 7
- [ ] 2,000 users, 250 paid
- [ ] $7,000 MRR
- [ ] Part-time support engineer hired
- [ ] Advanced features (API, analytics, integrations)
- [ ] Funding decision documented

---

## Phase 8: Expansion (Months 13–18)

### Timeline
- **Start:** Month 13 = January 18 – February 17, 2027
- **End:** Month 18 = June 18 – July 17, 2027

### Engineering — 3 Major Features

#### Months 13–14: Business Tier
- Multi-photographer teams
- Team member roles + permissions
- Shared workspaces + galleries
- Team billing + cost-splitting

#### Months 15–16: Analytics Dashboard
- Usage statistics (photos sorted, hours saved)
- Revenue insights (for photographers in Connect mode)
- Client insights (most active clients, feedback trends)
- Export reports (PDF/CSV)

#### Months 17–18: International Expansion
- Multi-currency support (EUR, GBP, JPY, AUD)
- Localized UI (5 languages: ES, FR, DE, JP, PT)
- VAT/Tax handling per region
- Stripe global payouts

### Marketing — Global Expansion

- **Month 13:** Launch German version (European market)
- **Month 15:** Launch Spanish version (LATAM market)
- **Month 17:** Launch Japanese version (APAC market)
- **Localized content:** Blog posts + social in each language
- **Regional partnerships:** Collaborate with local photographers

### Business Milestones

- **Month 13:** 2,500 users, 300 paid
  - MRR: $8,700+

- **Month 15:** 3,500 users, 400 paid
  - MRR: $11,600+

- **Month 18:** 5,000 users, 1,000 paid
  - MRR: $30,000 target (could exceed)
  - Fully international operations
  - Potential for Series A if profitable

### Deliverables by End of Phase 8
- [ ] 5,000 users
- [ ] 1,000 paying customers
- [ ] **$30,000 MRR achieved** ✅
- [ ] Business tier launched
- [ ] Analytics dashboard
- [ ] International expansion (3+ languages, 3+ regions)
- [ ] <5% monthly churn rate
- [ ] CAC: <$5 (organic + word-of-mouth)
- [ ] LTV: >$200 (avg subscription 12+ months)

---

## Weekly Rhythm (Post-Launch)

### Team Meeting Schedule

| Day | Time | Focus | Attendees |
|-----|------|-------|-----------|
| **Monday** | 9:00 AM | Sprint planning, agent task assignment, competitor intel | All agents |
| **Tuesday** | 2:00 PM | PR reviews, technical blockers, architecture decisions | Eng agents |
| **Wednesday** | 10:00 AM | Content approval, social media strategy | Marketing + content agents |
| **Thursday** | 3:00 PM | User conversations, feedback analysis, feature prioritization | Product + marketing |
| **Friday** | 5:00 PM | Metrics review, finance report, weekly recap video | All agents + founder |
| **Saturday** | 10:00 AM | Content batching for next week, trend research | Content agents |
| **Sunday** | — | Rest + personal content (behind-the-scenes) | All |

### Daily Tasks

| Interval | Task | Owner | Status Check |
|----------|------|-------|--------------|
| Every 2 hours | GitHub PR auto-review | eng-code-quality bot | Green checkmarks |
| Daily 9 AM | Agent task assignment | Telegram bot | /tasks command |
| Daily 6 PM | Build status update | CI/CD pipeline | Slack notification |
| Daily evening | Social media posting | content-social agent | X, LinkedIn |
| Weekly Monday | Metrics dashboard update | analytics agent | Spreadsheet |
| Weekly Friday | Team financial recap | finance agent | P&L statement |

---

## Key Metrics to Track

### Primary Metrics (Daily)

| Metric | Tool | Target | Frequency |
|--------|------|--------|-----------|
| MRR (Monthly Recurring Revenue) | Stripe Dashboard | $30K by month 18 | Daily |
| Active Users (MAU) | Supabase + Vercel Analytics | 5K by month 18 | Daily |
| Churn Rate | Calculated from Stripe | <5% monthly | Daily |
| New Signups | Supabase | 20–50/day post-launch | Daily |
| Photos Processed (Volume) | Supabase query | Growth indicator | Daily |

### Secondary Metrics (Weekly)

| Metric | Tool | Target | Frequency |
|--------|------|--------|-----------|
| Connect Volume (photographer payouts) | Stripe Connect Dashboard | $2K+/week by month 6 | Weekly |
| Content Engagement (impressions, likes) | X Analytics, LinkedIn Analytics | 10K+ impressions/week by week 9 | Weekly |
| Blog Traffic | Google Analytics 4 | 1K+ visits/week by month 6 | Weekly |
| SEO Rankings (target keywords) | Google Search Console | Top 5 for 20+ keywords | Weekly |
| Email Engagement (open rate, CTR) | SendGrid | 25%+ open, 5%+ CTR | Weekly |
| GitHub PR Metrics | GitHub Actions | <1 day average review time | Weekly |

### Tertiary Metrics (Monthly)

| Metric | Tool | Calculation | Frequency |
|--------|------|-------------|-----------|
| Customer Acquisition Cost (CAC) | Calculated | Total marketing spend / new customers | Monthly |
| Customer Lifetime Value (LTV) | Calculated | Avg monthly revenue per customer × avg lifetime | Monthly |
| Gross Margin | Finance | (Revenue - COGS) / Revenue | Monthly |
| Payback Period | Calculated | CAC / (LTV / avg subscription months) | Monthly |
| Net Promoter Score (NPS) | In-app survey | Goal: >50 by month 6 | Monthly |

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation | Owner |
|------|-----------|-------|
| **AI classification accuracy** | Test with 1K+ photos; human-in-the-loop for corrections | eng-ai |
| **Scale beyond Vercel Functions** | Monitor invocation logs; migrate to VMs if needed by month 6 | eng-arch |
| **Database performance** | Index key tables; consider read replicas by month 12 | eng-db |
| **Third-party API outages** (Stripe, Supabase) | Implement fallback UI; cached data for offline | eng-resilience |

### Marketing Risks

| Risk | Mitigation | Owner |
|------|-----------|-------|
| **Product-market fit not found** | Daily user feedback; pivot if <20% "would miss it" by week 3 | mktg-research |
| **Low conversion (waitlist → paid)** | Email campaigns, pricing test, feature feedback | mktg-email |
| **Content doesn't drive traffic** | Weekly analytics review; test new topics | content-social |
| **Competition launches** | Monitor competitor features; accelerate differentiation | mktg-competitive |

### Business Risks

| Risk | Mitigation | Owner |
|------|-----------|-------|
| **Payment processing failure** | Stripe redundancy; monitor webhook logs | eng-stripe |
| **Stripe takes fees** | Price model: 15% marketplace commission covers Stripe | founder |
| **Support burden** | Hire part-time support by month 4 | founder |
| **Legal/compliance** | ToS, Privacy, GDPR ready by launch | founder |

---

## Success Criteria by Phase

### Phase 0: Setup (Day 0)
- [ ] All tools installed & configured
- [ ] Telegram bot responding
- [ ] Monorepo initialized with folder structure
- [ ] CLAUDE.md agent handbook written
- [ ] First X post published

### Phase 1: Demo MVP (Day 5)
- [ ] Live demo URL (Vercel)
- [ ] 10–20 user feedback responses
- [ ] 25–50 waitlist signups
- [ ] 5+ build-in-public posts
- [ ] **Success:** >50% feedback says "would pay"

### Phase 2: Core Product (Day 18)
- [ ] Full feature set (auth, billing, gallery, workspace)
- [ ] E2E test suite (>80% coverage)
- [ ] Marketing site + blog live
- [ ] LLC formed, bank account open
- [ ] **Success:** Launch ready, 100+ waitlist engaged

### Phase 3: Launch Ready (Day 28)
- [ ] Product Hunt #1 launch >500 upvotes
- [ ] First paying customers acquired
- [ ] Email sequences live
- [ ] **Success:** $200 MRR, strong media coverage

### Phase 4: Growth (Week 9)
- [ ] Content Hub MVP launched
- [ ] 350+ users, 50 paying
- [ ] $1K MRR achieved
- [ ] **Success:** Unit economics positive (LTV > 3× CAC)

### Phase 5: Suite (Week 12)
- [ ] Brief Builder live
- [ ] Suite Bundle launched
- [ ] **Success:** 100+ suite subscribers, $2,100 MRR

### Phase 6: Scale (Month 6)
- [ ] Bookings + edit requests live
- [ ] 750 users, 130 paying
- [ ] $2,500 MRR
- [ ] **Success:** Churn <5%, organic growth >40% month-over-month

### Phase 7: Maturity (Month 12)
- [ ] 2,000+ users, 250 paying
- [ ] $7,000 MRR
- [ ] Part-time support hired
- [ ] **Success:** Sustainable business, funding decision made

### Phase 8: Expansion (Month 18)
- [ ] 5,000+ users, 1,000 paying
- [ ] **$30,000 MRR achieved** ✅
- [ ] 3+ international markets
- [ ] **Success:** Global SaaS, venture-scale business

---

## Appendix: Agent Task File Template

Each agent gets a task file in `/scripts/agent-tasks/` following this structure:

```markdown
# [Agent Name] — Task Brief

**Role:** [Description of the agent's responsibility]
**Duration:** [Days/weeks assigned]
**Owner:** [Primary contact]

## Objective
[What should be delivered by the end of this assignment?]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Dependencies
- [ ] Task X must be complete first
- [ ] Requires access to [resource]

## Resources
- GitHub repo link
- Design docs
- API documentation
- References

## Communication
- Daily standup: X time in #chat
- Blockers: Tag @founder in Slack
- PR review: Requested from [agent]

## Deliverables
- GitHub PR with merged code
- Updated documentation
- [Other artifacts]
```

---

## Appendix: Key Tools & Costs

### Hosting & Infrastructure

| Tool | Cost | Notes |
|------|------|-------|
| **Vercel** (Hobby) | $0–$20/mo | Web hosting, functions, analytics |
| **Supabase** (Free tier) | $0 | PostgreSQL, auth, real-time |
| **Cloudflare** (Free) | $0 | CDN, image optimization, Workers |
| **Stripe** | 2.9% + $0.30 per txn | Payment processing |
| **SendGrid** | $0–$20/mo | Email delivery (100/day free) |

### Development Tools

| Tool | Cost | Notes |
|------|------|-------|
| **GitHub** | Free | Repository, CI/CD, Actions |
| **Sentry** | Free–$50/mo | Error tracking |
| **Google Analytics 4** | Free | Website analytics |
| **Telegram** | Free | Bot notifications |

### Business & Legal

| Tool | Cost | Notes |
|------|------|-------|
| **LLC Formation** | $200–500 | Delaware or Wyoming |
| **Mercury** (Business bank) | Free | Banking, ACH transfers |
| **Termly.io** | $20–50/mo | Legal docs generator |

### Content & Marketing

| Tool | Cost | Notes |
|------|------|-------|
| **ElevenLabs** | Free–$30/mo | Text-to-speech |
| **Remotion** | Free–$200/mo | Video rendering |
| **Canva** | Free–$10/mo | Design templates |
| **YouTube** | Free | Video hosting |

**Total Monthly Cost (Launch Phase):** ~$100–200/mo
**Total Monthly Cost (Growth Phase):** ~$500–1,000/mo (scales with Stripe volume)

---

**Document Version:** 1.0
**Last Updated:** March 25, 2026
**Next Review:** Weekly (Fridays 5 PM)
