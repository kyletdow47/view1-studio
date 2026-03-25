# PhotoSorter — Spec Gaps & Self-Interview Guide

> Generated from deep analysis of SPEC.md (updated March 24, 2026).
> Answers marked with ✅ were resolved during this session. Items marked with ✅ still need your decision.

---

## 1. Decisions Made (Update Spec With These)

### Booking & Client Acquisition

✅ **Booking page URL**: Public page at `/book/[photographerId]`. Photographer shares on website, social, business cards. Add this route to the file tree.

✅ **Post-booking flow**: Project is auto-created when shoot is booked. Project is marked complete when photos are downloaded and approved by client.

✅ **Project lifecycle update**: Add `'booked'` status → `booked → draft → published → archived → deleted`. "Booked" = auto-created from booking, empty project. "Draft" = photographer has uploaded/is working on it.

### Payments & Business Model

✅ **Plan tiers**: 4 tiers — Free, Pro, Business, Custom. Update `profiles.plan` enum to `'free' | 'pro' | 'business' | 'custom'`. Define what differentiates each tier (see open question below).

✅ **Application fee**: Tiered by plan. Higher plans get lower fees. Creates upgrade incentive for high-volume photographers.

✅ **Failed deposit auto-charge**: Block downloads, notify both client and photographer. Client gets a pay-now link. Photographer sees outstanding balance in dashboard. Gallery stays at proofing level until paid.

✅ **Per-file cart UX**: Standard select + checkout flow. Client clicks photos to add to selection, sees running total, checks out via Stripe. Cart persists in gallery session.

✅ **Access gating**: Build a server-side access resolver function that checks all payment tables and returns `{ canView, canDownload, canRequestEdits, amountOwed }`. Gallery calls this once on load. Remove stale `payment_required` / `payment_status` references from Section 10.

### Notifications & Email

✅ **Email provider**: Resend (react-email templates). Add to stack table in Section 4. Add `RESEND_API_KEY` to environment variables.

✅ **Notification system**: Both — activity feed as the dashboard home + bell icon with dropdown in navigation header. Needs a `notifications` table in the data model.

✅ **Client invitation flow**: Magic link email. Client receives email with direct gallery link. Clicking prompts OAuth sign-in, then auto-links their account to the `project_clients` record.

### Client Experience

✅ **Client model**: Clients are sub-accounts inside photographer's dashboard, NOT independent platform users. No separate client dashboard. Client profiles live inside photographer's account. Galleries can be viewed as guest or with account.

✅ **Edit request UX**: In-gallery selection mode. Client enters "request edits" mode, selects photos, writes notes, submits. Status tracker in gallery sidebar. Edited photos appear alongside/replace originals.

✅ **Gallery customization (MVP)**: 3-4 theme presets (dark, light, minimal, editorial). Photographer picks theme per project. No custom colors/fonts in MVP.

✅ **Storage limits**: Fixed per tier — Free: 5GB, Pro: 100GB, Business: 500GB, Custom: unlimited. Overage blocks new uploads with upgrade prompt.

### Scope & Architecture

✅ **MVP phasing**: Phase 1 = core only (upload → AI sort → gallery → flat-fee downloads + Stripe Connect). Defer bookings, edit requests, per-file cart, booking forms to Phase 2. Ship Phase 1 in 3-4 weeks.

✅ **File tree**: Update with all new routes before building.

---

## 2. Open Questions — ALL RESOLVED ✅

### Tier Definitions (HIGH PRIORITY — affects everything)

✅ **What exactly does each tier include?** You said 4 tiers but haven't defined the splits:

| Feature | Free | Pro | Business | Custom |
|---------|------|-----|----------|--------|
| Active projects | 3? | Unlimited? | Unlimited? | Unlimited |
| Storage | 5GB | 100GB | 500GB | Unlimited |
| Stripe Connect | No? | Yes? | Yes? | Yes |
| App fee on transactions | 10%? | 7%? | 5%? | Negotiable? |
| Booking page | No? | Yes? | Yes? | Yes |
| Edit requests | No? | Yes? | Yes? | Yes |
| Gallery themes | 1 (dark)? | All? | All? | All + custom? |
| Custom branding | No | No | Yes? | Yes |
| Team members | 1 | 1 | Multiple? | Unlimited? |
| Priority support | No | No | Yes? | Yes |
| Monthly price | $0 | $?? | $?? | Contact sales |

✅ **Trial period**: `trial_ends_at` exists in the schema but there's no spec for trial behavior. How long? What tier does trial grant? What happens on expiry — downgrade to free or lock out?

✅ **What's the Pro price point?** Competitive analysis showed $15-20/mo is the sweet spot. What's your target?

### Notification Data Model

✅ **Notifications table schema**: You need a `notifications` table to power the bell dropdown + activity feed. Suggested schema:
```
notifications
├── id: uuid (PK)
├── photographer_id: uuid (FK → profiles)
├── type: text ('booking_new' | 'payment_received' | 'payment_failed' | 'edit_requested' | 'gallery_viewed' | 'client_accepted')
├── title: text
├── body: text
├── metadata: jsonb (links, amounts, client info)
├── read: boolean (default false)
├── created_at: timestamptz
```
Confirm or modify?

### Email Templates Needed

✅ **Which transactional emails are needed for Phase 1?** Suggested list:
- Gallery invitation (magic link)
- Payment confirmation (to client)
- Payment received (to photographer)
- Payment failed (to client, with retry link)
- Project published notification (to invited clients)
- Welcome email (photographer signup)

Which of these are Phase 1 vs Phase 2?

### Guest vs Authenticated Gallery Access

✅ **You said clients can "view as guest or create an account."** This conflicts with the spec's OAuth-gated gallery. Clarify the exact rules:
- Can anyone with the gallery link see watermarked previews without logging in?
- Does OAuth only gate downloads, payments, and edit requests?
- Or is the gallery completely locked behind OAuth (current spec)?

This is a significant UX decision. Guest preview access dramatically increases gallery sharing/virality but reduces photographer control.

### Project Completion State

✅ **You said the project is "completed when photos are downloaded and approved."** But there's no 'completed' status in the lifecycle. Should the lifecycle be:
```
booked → draft → published → completed → archived → deleted
```
What triggers "completed"? All clients have downloaded? Photographer manually marks it? Client clicks an "approve" button?

### Booking Form Scope for Phase 2

✅ **How complex are booking forms?** The `booking_form_fields` table supports custom fields with types (text, date, dropdown, textarea). For Phase 2, clarify:
- Can photographers create forms from scratch or only customize preset templates?
- Is there a booking calendar showing photographer availability?
- Do booking requests need photographer confirmation, or are they auto-confirmed on payment?
- Can photographers set blackout dates?

### Photographer Onboarding

✅ **What's the first-time photographer experience?** No onboarding flow is specified. After signup, what do they see?
- Guided setup wizard (name, business, preset preference, first project)?
- Empty dashboard with contextual prompts?
- Video tutorial / feature tour?

### Landing Page

✅ **`page.tsx` is listed as "landing/marketing page" but has no spec.** For launch:
- Is this a simple hero + features + pricing page?
- Does it need a demo/preview of the sorting experience?
- SEO considerations — what keywords are you targeting?

### Edit Request Delivery Mechanics

✅ **When the photographer delivers edited photos, how do they enter the system?** Options:
- Photographer uploads replacement files that swap the originals in the gallery
- Edited versions appear alongside originals (before/after)
- New "Edits" section appears in the gallery with only the edited files
- Photographer uploads to a separate delivery and marks edit request as "delivered"

### Refund Handling

✅ **Section 2 says photographer "initiates refunds via dashboard"** but no refund flow is specified:
- Full refund only, or partial refunds supported?
- Does the platform refund its application fee too, or only the photographer's portion?
- Is there a refund time limit?
- Does the client's access get revoked on refund?

### Multi-Currency

✅ **`project_pricing.currency` defaults to 'usd' from photographer's Stripe account.** But:
- Do you support photographers in non-USD countries?
- Does the client see prices in their own currency or the photographer's?
- Stripe Connect handles conversion, but the UI needs to display the right currency symbol.

### File Structure Updates Needed

✅ **Missing routes to add to Section 13:**
```
src/app/
├── book/
│   └── [photographerId]/
│       └── page.tsx              (public booking page)
├── (app)/
│   ├── dashboard/
│   │   └── page.tsx              (activity feed + project list)
│   ├── clients/
│   │   └── page.tsx              (client management list)
│   │   └── [id]/page.tsx         (individual client profile)
│   ├── bookings/
│   │   └── page.tsx              (booking management)
│   ├── settings/
│   │   ├── booking-forms/page.tsx (custom booking form builder)
│   │   └── themes/page.tsx       (gallery theme selection)
│   └── project/
│       └── [id]/
│           └── edits/page.tsx    (edit request management)
├── gallery/
│   └── [id]/
│       ├── page.tsx              (gallery view)
│       └── cart/page.tsx         (per-file checkout)
```
Confirm or modify this structure?

### Data Model Additions Needed

✅ **Missing tables/fields identified:**
- `notifications` table (for bell + activity feed)
- `gallery_themes` or a `theme` field on `projects` (for theme presets)
- `profiles.storage_used` (bigint, bytes — for enforcing storage limits)
- `projects.status` enum needs `'booked'` and `'completed'` added
- `profiles.plan` enum needs `'business'` and `'custom'` added
- Consider: `project_views` table for tracking gallery analytics (even if dashboard is v2, collect data now)

### Phase 1 vs Phase 2 Boundary

✅ **Confirm exactly what's in Phase 1 vs Phase 2:**

**Phase 1 (3-4 weeks):**
- [ ] Photographer auth + onboarding
- [ ] Project CRUD with preset selection
- [ ] Upload pipeline (tus, resumable, IndexedDB)
- [ ] AI classification (Web Worker + MobileNet)
- [ ] Workspace UI (sort, categorize, rename, star)
- [ ] Client gallery with theme presets
- [ ] Tiered access (preview/proofing/delivered)
- [ ] Watermarking (Cloudflare Images)
- [ ] Magic link client invitations
- [ ] Flat-fee download payments (Stripe Connect)
- [ ] Photographer subscription billing (Stripe)
- [ ] ZIP export
- [ ] Gallery invitation emails (Resend)
- [ ] Payment confirmation emails
- [ ] Activity feed dashboard
- [ ] Bell notification dropdown
- [ ] PWA setup

**Phase 2 (4-6 weeks after Phase 1):**
- [ ] Public booking page
- [ ] Booking forms (preset + custom)
- [ ] Deposit/balance payment flows
- [ ] Per-file download pricing + cart
- [ ] Edit request workflow (6-status flow)
- [ ] Client profiles inside photographer dashboard
- [ ] Advanced notification types
- [ ] Gallery analytics
- [ ] Team/multi-photographer (Business tier)
- [ ] Custom branding (Business tier)

Does this split feel right? Anything that should move between phases?

---

## 3. Spec Inconsistencies — ALL FIXED ✅

These contradictions have been resolved in the updated SPEC.md:

1. **Section 10 references stale payment fields** — `payment_required` and `payment_status` on `project_clients` are mentioned in the gallery description, but these fields were removed from the data model (replaced by `project_pricing`, `bookings`, `file_purchases`). Update Section 10 to reference the access resolver function instead.

2. **Section 11 still says "free/pro" only** — Plan tiers are now free/pro/business/custom. Update the billing section.

3. **Section 3 (MVP Scope) doesn't reflect phasing** — The "In scope" list includes everything. It should be split into Phase 1 / Phase 2 to match the phased approach.

4. **Section 15 (Implementation Phases) is still 4 weeks** — Needs rewrite to reflect Phase 1 (core, 3-4 weeks) and Phase 2 (bookings + edits + cart, 4-6 weeks).

5. **`project_clients` lost payment fields but gained `client_profile_id`** — Section 10's paywall description needs to reference the new access resolver pattern.

6. **Section 4 stack table missing Resend** — Add email provider row.

7. **Section 14 environment variables missing** — `RESEND_API_KEY` needs to be added.

8. **Project statuses incomplete** — `projects.status` enum in Section 5 only lists `'draft' | 'published' | 'archived'`. Needs `'booked'` and `'completed'` added.

---

*Use this document as a checklist when updating SPEC.md. Each ✅ is a decision that will affect implementation. Each ✅ is ready to write into the spec.*
