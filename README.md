# View1 Studio

AI-powered media sorting and client delivery platform for professional photographers.

## Products

| App | Description |
|-----|-------------|
| **photo-sorter** | AI-powered image classification and workspace management |
| **content-hub** | Client-facing gallery with watermarking and delivery |
| **brief-builder** | Shot list & shot management _(future)_ |

## Tech Stack

| Technology | Role |
|------------|------|
| Next.js 14+ (App Router) | Frontend & API routes |
| TypeScript 5+ (strict) | Type safety |
| Tailwind CSS 3+ | Utility-first styling |
| Supabase | PostgreSQL, Auth, Storage, Edge Functions, RLS |
| Stripe | Subscriptions & Connect payouts |
| Cloudflare Images | Transforms, thumbnails, watermarking |
| SigLIP + Transformers.js | Browser-side zero-shot image classification |
| Turborepo | Monorepo task orchestration |
| Vitest | Unit testing |

## Repository Structure

```
view1-studio/
├── apps/
│   ├── photo-sorter/     # Main Next.js app
│   ├── content-hub/      # Client gallery app (future)
│   └── brief-builder/    # Shot list app (future)
├── packages/
│   ├── ui/               # Shared React components
│   ├── config/           # Shared ESLint/TypeScript configs
│   └── types/            # Shared TypeScript types
├── supabase/
│   ├── migrations/       # SQL migrations
│   └── functions/        # Supabase Edge Functions
└── agents/
    ├── telegram-bot/     # Agent orchestration bot
    └── tasks/            # Agent task definitions
```

## Setup

### Prerequisites

- Node.js 18+
- npm 10+

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp apps/photo-sorter/.env.local.example apps/photo-sorter/.env.local
# Edit .env.local with your Supabase, Stripe, and Cloudflare credentials
```

### Run development server

```bash
npm run dev
# photo-sorter available at http://localhost:3000
```

### Run all checks

```bash
npm run lint      # ESLint across all apps
npm run test      # Vitest across all apps
npm run build     # Production build
```

## Environment Variables

See `apps/photo-sorter/.env.local.example` for all required variables.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `STRIPE_SECRET_KEY` | Stripe secret key (server-only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Images API token (server-only) |
| `RESEND_API_KEY` | Resend API key for transactional email |

## Agent Engineering Team

| Agent ID | Responsibility |
|----------|---------------|
| eng-arch | Monorepo scaffold, DB schema, Supabase setup |
| eng-auth | Supabase Auth, JWT, OAuth flows |
| eng-ui | Shared component library (Tailwind) |
| eng-ai | SigLIP image classification (Transformers.js) |
| eng-upload | Cloudflare Images upload pipeline |
| eng-gallery | Client gallery, watermarking, download controls |
| eng-stripe | Stripe Billing, Connect, webhooks |
| eng-workspace | Workspace management, roles, invitations |
