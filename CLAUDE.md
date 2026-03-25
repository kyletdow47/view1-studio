# CLAUDE.md — View1 Studio Agent Handbook

Every Claude Code AI agent reads this file when starting work on the View1 Studio codebase. Follow these rules strictly.

## Project Overview

**View1 Studio** is an AI-powered media sorting and client delivery platform designed for professional photographers. It automates the tedious post-shoot workflow: automatically categorize thousands of photos using AI, deliver curated galleries to clients with watermarking and licensing controls, and manage billing and payments seamlessly.

The platform is a 3-product suite:
1. **photo-sorter** — AI-powered image classification and workspace management
2. **content-hub** — Client-facing gallery with watermarking and delivery
3. **brief-builder** — Shot list & shot management (future)

**Target Users:** Professional photographers (wedding, event, commercial) who need to sort, deliver, and get paid for their work.

## Tech Stack

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 14+ | Frontend & API routes (App Router) |
| React | 18 | UI components |
| TypeScript | 5+ | Type safety (strict mode) |
| Tailwind CSS | 3+ | Utility-first styling |
| Supabase | Latest | Postgres DB, Auth, Storage, Edge Functions, RLS, pgvector |
| Stripe | Latest | Billing (subscriptions), Connect (photographer→client payments) |
| Cloudflare Images | Latest | Image transforms, thumbnails, watermarking |
| SigLIP + Transformers.js | Latest | Zero-shot image classification (browser-side) |
| Vitest | Latest | Unit testing framework |
| Turborepo | Latest | Monorepo task orchestration |

## Code Standards

### TypeScript
- **Strict mode always.** No `any` types. Use `unknown` and type guards instead.
- Define types in `src/types/` or in `packages/types/` for sharing across apps.
- Use `const` assertions for literal types where appropriate.

### React
- **Functional components only.** No class components.
- Use React hooks (useState, useEffect, useContext, useCallback, useMemo).
- Extract custom hooks to `src/hooks/` directory.
- Memoize expensive computations and callbacks.

### Next.js (App Router)
- Use `app/` directory structure (not `pages/`).
- Follow conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- Use Server Components by default; mark Client Components with `'use client'`.
- API routes go in `app/api/` as route handlers.
- Use Dynamic Routes: `app/photos/[id]/page.tsx`.

### File Naming
- **Files:** kebab-case (`photo-upload.tsx`, `auth-service.ts`)
- **Components:** PascalCase (`PhotoUpload.tsx`)
- **Types:** PascalCase with `Type` or `Interface` suffix if needed (`PhotoType.ts`)

### Import Order
1. React & React DOM
2. Next.js (next/link, next/router, next/image, etc.)
3. Third-party libraries (lodash, clsx, etc.)
4. Local utils, services, lib/
5. Components
6. Types

```typescript
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { supabase } from '@/lib/supabase'
import { PhotoUpload } from '@/components/PhotoUpload'
import type { Photo } from '@/types/photo'
```

### Tailwind CSS
- Use utility classes; no inline `style={}` attributes.
- Create reusable components in `src/components/` for repeated patterns.
- Use Tailwind's `@apply` directive in global styles sparingly.
- Responsive design: mobile-first (`sm:`, `md:`, `lg:`, `xl:`).
- Dark mode: use `dark:` prefix where appropriate.

### Supabase
- **Always enable RLS (Row Level Security)** on tables.
- **Never expose `service_role` keys client-side.** Use it only in Edge Functions or backend.
- Use auto-generated types: `npx supabase gen types typescript --local > types/supabase.ts`.
- Store types in `packages/types/` for monorepo sharing.
- Use RLS policies to enforce data isolation at the database level.

### Error Handling
- Use try/catch blocks with proper error typing.
- Never silently swallow errors.
- Return meaningful error messages to clients.
- Log errors with context (user ID, action, timestamp).

```typescript
try {
  const result = await supabase.from('photos').select()
  return result
} catch (error) {
  console.error('Failed to fetch photos:', error)
  throw new Error('Unable to fetch photos')
}
```

## Git Workflow

### Branch Naming
```
feat/agent-id/short-description
fix/agent-id/short-description
refactor/agent-id/short-description
docs/agent-id/short-description
```

Examples:
- `feat/eng-auth/jwt-setup`
- `fix/eng-upload/cloudflare-timeout`
- `refactor/eng-stripe/payment-handler`

### Commit Format
Use conventional commits:
```
type(scope): message

Optional body with more details.
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`

Examples:
- `feat(auth): add JWT token refresh logic`
- `fix(upload): handle 413 payload too large error`
- `test(gallery): add watermark rendering tests`

### Pull Requests
1. **Always create a PR.** Never push directly to `main`.
2. PR title format: `[agent-id] Brief description`
   - `[eng-auth] Implement Supabase JWT refresh`
   - `[eng-upload] Add Cloudflare image transforms`
3. PR description must include:
   - What was built/changed
   - How to test it
   - Any known limitations or TODOs
   - Links to related issues or tasks

## Testing Requirements

- **Write tests for all new features.** No feature without tests.
- Use **Vitest** for unit tests.
- Minimum **80% coverage** for new code.
- Test files: `*.test.ts` or `*.test.tsx` co-located with source.

```
src/
├── lib/
│   ├── image-classifier.ts
│   └── image-classifier.test.ts
├── components/
│   ├── PhotoUpload.tsx
│   └── PhotoUpload.test.tsx
```

Run tests before creating a PR:
```bash
npm run test
npm run test:coverage
```

## File Organization

### App Directory Structure
```
apps/photo-sorter/src/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   ├── api/                # API routes
│   ├── dashboard/
│   ├── gallery/
│   └── settings/
├── components/             # React components
│   ├── common/            # Reusable UI (Button, Card, Modal, etc.)
│   ├── features/          # Feature-specific components
│   └── layouts/           # Page layouts
├── hooks/                  # Custom React hooks
│   ├── usePhotos.ts
│   ├── useAuth.ts
│   └── useUpload.ts
├── lib/                    # Utility functions & services
│   ├── supabase.ts
│   ├── stripe.ts
│   ├── cloudflare.ts
│   ├── image-classifier.ts
│   └── auth.ts
├── types/                  # TypeScript types (local)
│   ├── photo.ts
│   └── gallery.ts
└── styles/                 # Global styles
    └── globals.css
```

### Shared Monorepo Structure
```
~/view1-studio/
├── apps/
│   ├── photo-sorter/
│   ├── content-hub/
│   └── brief-builder/
├── packages/
│   ├── ui/                # Shared React components
│   ├── config/            # Shared ESLint, TypeScript configs
│   └── types/             # Shared TypeScript types
├── supabase/
│   ├── migrations/        # SQL migrations
│   └── functions/         # Edge Functions
└── agents/
    ├── telegram-bot/
    ├── tasks/
    └── results/
```

## Supabase Conventions

### Migrations
- Place in `supabase/migrations/` with timestamp prefix: `20260325120000_create_photos_table.sql`
- Always include RLS policies in migrations.
- One logical change per migration.
- Test migrations locally before committing.

### Edge Functions
- Place in `supabase/functions/` with descriptive names: `classify-image/`, `send-invoice/`
- Use TypeScript with strict types.
- Always validate request data and auth.
- Return JSON responses with proper status codes.

### RLS Policies
Every table must have RLS enabled and policies defined:
```sql
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own photos"
  ON photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos"
  ON photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Type Generation
```bash
npx supabase gen types typescript --local > packages/types/supabase.ts
```

Import generated types:
```typescript
import type { Database } from '@/types/supabase'
type Photo = Database['public']['Tables']['photos']['Row']
```

## Environment Variables

Never hardcode secrets. Use `.env.local` for local development.

### Expected Variables
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudflare Images
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID=abc...
NEXT_PUBLIC_CLOUDFLARE_API_TOKEN=Bearer ...
CLOUDFLARE_API_TOKEN=Bearer ...

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## IMPORTANT RULES — DO NOT BREAK

1. **NEVER push directly to `main` branch.** Always create a feature branch and PR.
2. **NEVER delete files without explicit instruction.** Ask if unsure.
3. **NEVER modify `.env` files directly.** Use `.env.local` locally; deploy env vars via CI/CD.
4. **NEVER commit secrets or API keys.** They belong in env vars only.
5. **NEVER install packages without adding to `package.json`.** Use `npm install` or `pnpm add` in the correct workspace.
6. **ALWAYS create a feature branch** with naming: `feat/agent-id/description`.
7. **ALWAYS create a PR when done.** Title: `[agent-id] Brief description`. Include detailed description.
8. **ALWAYS run `npm run lint`** before creating a PR. Fix all issues.
9. **ALWAYS run tests** before creating a PR. Ensure they pass.
10. **If you're unsure, add a TODO comment.** Don't guess. Move on and let humans review.

## Completion Protocol

When you finish your assigned task:

1. **Lint:** Run `npm run lint` and fix all issues.
2. **Test:** Run `npm run test` and ensure all tests pass.
3. **Create PR:**
   - Title: `[agent-id] Brief description`
   - Description includes:
     - What was built/changed
     - How to test it (step-by-step or test commands)
     - Any known limitations or TODOs
     - Links to related issues
4. **Exit cleanly:** Your tmux session ending triggers a Telegram notification.

## Project Context for Specific Agents

- **eng-arch:** Scaffold project structure, Turborepo config, shared configs, monorepo setup.
- **eng-auth:** Build Supabase Auth integration, JWT tokens, password reset, OAuth flows.
- **eng-ui:** Build shared component library (Button, Card, Modal, Form, etc.) with Tailwind.
- **eng-ai:** Implement SigLIP image classification with Transformers.js (browser-side zero-shot).
- **eng-upload:** Build upload pipeline with Cloudflare Images, chunked uploads, progress tracking.
- **eng-gallery:** Build client-facing gallery with watermarking, licensing, download controls.
- **eng-stripe:** Implement Stripe Billing (subscriptions), Connect (photographer payouts), webhooks.
- **eng-workspace:** Build workspace/team management, role-based access, invitations, settings.

---

**Last Updated:** 2026-03-25
**Status:** Active — All agents must follow this handbook.
