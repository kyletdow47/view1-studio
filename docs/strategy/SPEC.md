# PhotoSorter — Product Specification

> AI-powered media sorting and client delivery platform for photographers & videographers.

**Status**: MVP Spec — v2 (updated March 24, 2026)
**Timeline**: Phase 1: 3–4 weeks | Phase 2: 4–6 weeks after Phase 1
**Brand**: Standalone product (name TBD, working name "PhotoSorter")

---

## 1. Vision

Photographers spend hours manually sorting, organizing, and delivering media from location-based shoots. PhotoSorter automates the sort using AI, lets photographers fine-tune the result, and generates a shareable client gallery — all in one flow.

**Core loop (MVP):** Upload → AI sorts → Review/adjust → Share gallery link with client → Client pays & downloads.

PhotoSorter is also a full business tool — photographers can charge clients for bookings, edit requests, and downloads via Stripe Connect. The platform earns revenue through photographer subscriptions + application fees on client transactions.

---

## 2. User Roles

### Photographer (primary user)
- Creates account, creates projects, uploads media
- Owns all organization decisions
- Controls client access levels and pricing
- Connects Stripe account to charge clients (Pro/Business only)
- Manages subscription billing and client payments
- Configures custom booking forms per preset
- Manages edit request workflow
- Initiates refunds via dashboard

### Client (invited viewer)
- Accesses project via OAuth (Google/Apple sign-in)
- Has a per-photographer profile with saved payment method and preferences
- Photographer sets access level per client
- Pays for bookings, edits, and/or downloads (if photographer requires payment)
- Can book shoots via photographer's booking page
- Can request edits on specific photos
- Can download files if access level + payment status permits
- **Cannot** re-sort, move, delete, or modify organization

---

## 3. Scope & Phasing

### Phase 1 — Core (3-4 weeks)
- Photographer auth (Supabase Auth — email/password + OAuth)
- Video tour + guided onboarding wizard (business name, preset, Stripe Connect, first project)
- Project creation with niche preset selection
- Background upload queue with resumable uploads
- Client-side AI classification (MobileNet + niche presets)
- Manual re-categorization and drag-reorder
- Multiple view modes (grid, list) with orientation filtering
- Batch rename with template tokens
- Shareable client gallery with theme presets (dark, light, minimal, editorial)
- Guest/private toggle per project (public preview vs OAuth-gated)
- Tiered client access (preview/proofing/delivered)
- Cloudflare Images for thumbnails and watermarks
- Magic link client invitations (via Resend)
- Flat-fee download payments (Stripe Connect)
- Photographer subscription billing (Stripe — Free/Pro/Business/Custom tiers)
- Stripe Connect onboarding
- All 6 transactional emails (Resend)
- Notifications (bell dropdown + activity feed dashboard)
- ZIP export with organized folder structure
- Landing page (hero + features + pricing)
- PWA (installable, offline-capable for viewing)

### Phase 2 — Payments & Workflows (4-6 weeks after Phase 1)
- Public booking page (`/book/[photographerId]`)
- Booking forms (preset templates + custom fields)
- Deposit / balance payment flows (auto-charge on delivery)
- Per-file download pricing + cart checkout
- Edit request workflow (6-status: requested → reviewed → priced → paid → in_progress → delivered)
- Edited photos "Edits" section in gallery
- Client profiles inside photographer dashboard
- Client "Approve & Complete" button (project completion)
- Refund flow (full + partial) in photographer dashboard
- Approximate currency display conversion for international clients
- Booking confirmation mode (auto-confirm vs photographer-confirms, configurable)
- Advanced notification types (Phase 2 actions)

### Deferred to v3+
- Client comments & reactions on photos
- Custom user-defined categories
- AI learning from corrections
- Native mobile apps (iOS/Android via Expo)
- Project archival lifecycle automation (active → cold → delete)
- Advanced collaboration (approval queues, proposed edits)
- Social media share integrations
- Multi-photographer teams / workspace sharing (Business tier)
- Analytics dashboard (views, downloads, engagement)
- Bulk project management
- API access for integrations
- Custom branding — logo watermarks, custom gallery themes (Business tier)
- Calendar/availability management for bookings
- Drag-and-drop form builder for booking forms

---

## 4. Technical Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Next.js PWA │────▶│  Supabase Cloud   │────▶│ Supabase Storage│
│  (Vercel)    │     │  (Postgres + Auth)│     │ (S3-compatible) │
└──────┬───────┘     └──────────────────┘     └─────────────────┘
       │                                              │
       │  ┌──────────────────┐                        │
       └─▶│ Cloudflare Images │◀───────────────────────┘
          │ (thumbnails,      │
          │  watermarks,      │
          │  responsive sizes)│
          └──────────────────┘
```

### Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router), React 18, TypeScript |
| Styling | Tailwind CSS (port existing design tokens) |
| State | Zustand (lightweight, works well with React) |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Image Processing | Cloudflare Images (on-demand transforms via URL) |
| AI Classification | TensorFlow.js + MobileNet (client-side, in Web Worker) |
| File Uploads | tus-js-client (resumable) + IndexedDB (progress tracking) |
| Deployment | Vercel (frontend) + Supabase Cloud (backend) |
| Email | Resend + react-email (transactional emails) |
| PWA | next-pwa (service worker, offline caching) |

---

## 5. Data Model

### `users` (Supabase Auth manages this)
Extended via `profiles` table:
```
profiles
├── id: uuid (FK → auth.users)
├── display_name: text
├── avatar_url: text
├── business_name: text (optional)
├── plan: text ('free' | 'pro' | 'business' | 'custom')
├── trial_ends_at: timestamptz (nullable — Pro trial expiry)
├── stripe_customer_id: text (nullable — our Stripe customer)
├── stripe_subscription_id: text (nullable — active subscription)
├── stripe_connect_id: text (nullable — photographer's connected Stripe account)
├── stripe_connect_onboarded: boolean (default false)
├── storage_used: bigint (default 0 — bytes, for enforcing tier storage limits)
├── onboarding_completed: boolean (default false)
├── created_at: timestamptz
└── updated_at: timestamptz
```

### `projects`
```
projects
├── id: uuid (PK)
├── owner_id: uuid (FK → profiles)
├── name: text
├── preset: text ('real_estate' | 'wedding' | 'travel' | 'general')
├── status: text ('booked' | 'draft' | 'published' | 'completed' | 'archived')
├── metadata: jsonb (core + custom fields, see §5.1)
├── cover_image_id: uuid (FK → media, nullable)
├── theme: text ('dark' | 'light' | 'minimal' | 'editorial') (default 'dark')
├── gallery_public: boolean (default false — if true, anyone with link sees watermarked previews)
├── published_at: timestamptz (nullable)
├── completed_at: timestamptz (nullable — set when client approves)
├── created_at: timestamptz
└── updated_at: timestamptz
```

### `media`
```
media
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── storage_path: text (Supabase Storage path)
├── original_name: text
├── display_name: text (renamed name)
├── mime_type: text
├── file_size: bigint (bytes)
├── type: text ('image' | 'video')
├── category: text (from preset categories)
├── orientation: text ('landscape' | 'portrait' | 'square')
├── sort_order: integer
├── starred: boolean (default false)
├── note: text (nullable)
├── width: integer
├── height: integer
├── predictions: jsonb (MobileNet raw predictions, for future learning)
├── exif: jsonb (extracted EXIF data — GPS, timestamp, camera, etc.)
├── upload_status: text ('pending' | 'uploading' | 'complete' | 'failed')
├── created_at: timestamptz
└── updated_at: timestamptz
```

### `project_clients` (access control + payments)
```
project_clients
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── client_profile_id: uuid (FK → client_profiles, nullable — linked after client accepts)
├── client_email: text
├── access_level: text ('preview' | 'proofing' | 'delivered')
├── invited_at: timestamptz
├── accepted_at: timestamptz (nullable)
└── revoked_at: timestamptz (nullable)
```

### `client_profiles` (per-photographer client accounts)
```
client_profiles
├── id: uuid (PK)
├── user_id: uuid (FK → auth.users)
├── photographer_id: uuid (FK → profiles — the photographer they belong to)
├── display_name: text
├── email: text
├── phone: text (nullable)
├── stripe_customer_id: text (nullable — on photographer's connected account)
├── has_saved_payment_method: boolean (default false)
├── preferences: jsonb (nullable — client preferences, scoped to this photographer)
├── created_at: timestamptz
└── updated_at: timestamptz
```
Note: client profiles are scoped per-photographer. One person working with 3 photographers has 3 separate client_profiles records. `stripe_customer_id` is a Customer object on the photographer's connected Stripe account (not the platform account).

### `project_pricing` (photographer-configured payment options per project)
```
project_pricing
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── pricing_mode: text ('bundled' | 'individual')
├── booking_enabled: boolean (default false)
├── booking_type: text ('full' | 'deposit' | 'download_only' | 'free') (nullable)
├── booking_price: integer (nullable — cents)
├── booking_deposit_percent: integer (nullable — e.g., 50 for 50%)
├── download_enabled: boolean (default false)
├── download_mode: text ('flat' | 'per_file') (nullable)
├── download_flat_price: integer (nullable — cents, for flat mode)
├── download_per_file_price: integer (nullable — cents, for per-file mode)
├── edit_enabled: boolean (default false)
├── edit_flat_fee: integer (nullable — cents per edit request)
├── currency: text (default 'usd' — from photographer's Stripe account)
├── created_at: timestamptz
└── updated_at: timestamptz
```

### `bookings`
```
bookings
├── id: uuid (PK)
├── project_id: uuid (FK → projects, nullable — auto-created draft project)
├── photographer_id: uuid (FK → profiles)
├── client_profile_id: uuid (FK → client_profiles)
├── status: text ('pending' | 'confirmed' | 'completed' | 'cancelled')
├── booking_type: text ('full' | 'deposit' | 'download_only' | 'free')
├── total_price: integer (cents)
├── deposit_amount: integer (nullable — cents, if deposit type)
├── balance_amount: integer (nullable — cents, remaining after deposit)
├── deposit_paid: boolean (default false)
├── balance_paid: boolean (default false)
├── deposit_payment_intent_id: text (nullable)
├── balance_payment_intent_id: text (nullable)
├── form_data: jsonb (client's booking form responses)
├── preferred_date: date (nullable)
├── notes: text (nullable)
├── created_at: timestamptz
└── updated_at: timestamptz
```
Note: When booking_type is 'deposit', `balance_amount` is auto-charged when the project is published/delivered. If auto-charge fails, gallery shows proofing-level access but downloads are locked until balance is paid.

### `edit_requests`
```
edit_requests
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── client_profile_id: uuid (FK → client_profiles)
├── status: text ('requested' | 'reviewed' | 'priced' | 'paid' | 'in_progress' | 'delivered')
├── media_ids: uuid[] (array of media files to edit)
├── client_notes: text (what the client wants)
├── photographer_notes: text (nullable — photographer's response/quote notes)
├── quoted_price: integer (nullable — cents, photographer sets after review)
├── stripe_payment_intent_id: text (nullable)
├── paid_at: timestamptz (nullable)
├── delivered_at: timestamptz (nullable)
├── created_at: timestamptz
└── updated_at: timestamptz
```
Note: Edit requests follow a full workflow: client requests → photographer reviews → photographer sets price (or uses flat fee) → client pays quoted amount → photographer works → photographer marks delivered. If edit_flat_fee is set on project_pricing, the quoted_price is auto-filled.

### `file_purchases` (for per-file download pricing)
```
file_purchases
├── id: uuid (PK)
├── project_id: uuid (FK → projects)
├── client_profile_id: uuid (FK → client_profiles)
├── media_ids: uuid[] (array of purchased media files)
├── total_price: integer (cents)
├── stripe_payment_intent_id: text (nullable)
├── paid_at: timestamptz (nullable)
├── created_at: timestamptz
└── updated_at: timestamptz
```
Note: For flat-fee downloads, a single file_purchases record covers all media in the project. For per-file, the cart checkout creates one record with the selected media_ids. Access is permanent until project is archived.

### `booking_form_fields` (custom booking form configuration)
```
booking_form_fields
├── id: uuid (PK)
├── photographer_id: uuid (FK → profiles)
├── preset: text ('real_estate' | 'wedding' | 'travel' | 'general' | null for custom)
├── fields: jsonb (ordered array of field definitions)
├── created_at: timestamptz
└── updated_at: timestamptz
```
Fields JSONB structure:
```json
[
  { "key": "property_address", "label": "Property Address", "type": "text", "required": true },
  { "key": "preferred_date", "label": "Preferred Date", "type": "date", "required": true },
  { "key": "budget", "label": "Budget Range", "type": "dropdown", "options": ["$200-500", "$500-1000", "$1000+"], "required": false },
  { "key": "notes", "label": "Additional Notes", "type": "textarea", "required": false }
]
```
Preset-based templates provide default fields (real estate: property address, MLS#; wedding: venue, date, etc.). Photographer can add, remove, or reorder fields.

### `stripe_events` (webhook idempotency log)
```
stripe_events
├── id: uuid (PK)
├── stripe_event_id: text (unique — Stripe's event ID, e.g., 'evt_xxx')
├── event_type: text (e.g., 'checkout.session.completed')
├── processed_at: timestamptz
├── payload: jsonb (nullable — full event payload for debugging)
└── created_at: timestamptz
```
Every incoming Stripe webhook is checked against this table before processing. If the event_id already exists, the webhook is acknowledged but not re-processed. Prevents double-processing from Stripe's retry logic.

### `notifications`
```
notifications
├── id: uuid (PK)
├── photographer_id: uuid (FK → profiles)
├── type: text ('booking_new' | 'payment_received' | 'payment_failed' | 'edit_requested' | 'gallery_viewed' | 'client_accepted' | 'project_published' | 'subscription_changed')
├── title: text
├── body: text
├── metadata: jsonb (links, amounts, client info — e.g., { "project_id": "...", "amount": 15000, "client_name": "Jane" })
├── read: boolean (default false)
├── created_at: timestamptz
```

### `client_reactions` (v3, but schema designed now)
```
client_reactions
├── id: uuid (PK)
├── media_id: uuid (FK → media)
├── client_id: uuid (FK → auth.users)
├── type: text ('heart' | 'star' | 'comment')
├── content: text (nullable, for comments)
├── created_at: timestamptz
└── updated_at: timestamptz
```

### 5.1 Metadata System

Projects have a `metadata` JSONB column with this structure:
```json
{
  "core": {
    "shoot_date": "2024-03-15",
    "location": "123 Main St, Austin TX",
    "client_name": "Jane Smith"
  },
  "template": {
    "mls_number": "MLS-12345",
    "agent_name": "John Doe",
    "listing_price": "$450,000"
  },
  "custom": {
    "weather": "Sunny",
    "access_notes": "Gate code 1234"
  }
}
```

Template fields are defined per preset:
- **Real estate**: mls_number, agent_name, listing_price, property_type, sqft
- **Wedding**: couple_names, venue, ceremony_time, reception_time, coordinator
- **Travel**: destination, trip_dates, accommodation, itinerary_link
- **General**: (no template fields, custom only)

---

## 6. Category Presets

Each preset defines categories with keywords for MobileNet classification:

### Real estate
`exterior`, `interior`, `kitchen`, `bathroom`, `drone/aerial`, `pool/outdoor`, `landscape`, `twilight`, `video`, `other`

### Wedding
`ceremony`, `reception`, `portraits`, `getting_ready`, `details`, `dance`, `family`, `venue`, `video`, `other`

### Travel
`landmarks`, `street`, `food`, `accommodation`, `nature`, `people`, `transport`, `nightlife`, `video`, `other`

### General
`people`, `places`, `objects`, `nature`, `architecture`, `action`, `detail`, `video`, `other`

Port the existing `RE_CATEGORIES` keyword mapping from `index.html` for real estate. Build equivalent mappings for other presets.

---

## 7. Upload Pipeline

### Flow
```
User drops files
  → Files queued in IndexedDB (with metadata: name, size, hash)
  → Upload worker processes queue (1-3 concurrent uploads)
    → Each file: chunked upload via tus protocol to Supabase Storage
    → On chunk complete: update IndexedDB progress
    → On file complete:
      → Create `media` row in Postgres (upload_status: 'complete')
      → Trigger client-side classification (Web Worker)
      → Generate thumbnail URL via Cloudflare Images
  → UI shows real-time progress per file + overall
  → User can continue sorting/browsing during upload
```

### Resumability
- IndexedDB stores: `{ fileHash, fileName, projectId, bytesUploaded, tusUploadUrl, status }`
- On page load: check IndexedDB for pending uploads → prompt "Resume X uploads?"
- File identity: SHA-256 hash of first 1MB + file size + file name (fast, avoids hashing entire file)
- Duplicate detection: if hash+size matches existing media row, skip upload

### Constraints
- Max file size: 500MB per file (covers most photo/video formats)
- Supported formats: JPEG, PNG, HEIC, HEIF, TIFF, RAW (CR2/NEF/ARW), MP4, MOV, WebM
- HEIC/RAW: convert to JPEG client-side for preview, store original

---

## 8. AI Classification (Client-Side)

### Architecture
```
Main Thread                    Web Worker
─────────────                  ──────────
Upload complete ──message──▶  Load MobileNet (cached)
                              Decode image
                              Run inference
                              Match predictions → preset categories
              ◀──message──    Return { category, confidence, predictions[] }
Update UI + DB
```

### Classification logic (ported from prototype)
1. Load MobileNet v2 (alpha 1.0) — cached after first load
2. For images: decode directly. For videos: extract frame at 25% duration
3. Get top 5 predictions from MobileNet
4. Score each preset category by keyword match against predictions
5. Assign highest-scoring category (minimum threshold: 0.1)
6. Below threshold → assign `other`
7. Store raw predictions in `media.predictions` for future model improvements

### Performance
- Web Worker prevents UI blocking
- Process images in parallel with uploads (classify as they complete)
- Target: classify 500 images in <60 seconds on modern hardware

---

## 9. Photographer Workspace (Main App)

### Layout
```
┌─────────────────────────────────────────────────────┐
│ Header: Logo | Project Name | [Publish] [Export ZIP] │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │  Content Area                             │
│          │                                           │
│ Projects │  ┌─ Toolbar ─────────────────────────┐   │
│ list     │  │ View: Grid|List  Filter: All|L|P  │   │
│          │  │ Search  |  Batch Rename  |  Sort   │   │
│ ──────── │  └───────────────────────────────────┘   │
│          │                                           │
│ Category │  ┌─ Category: Exterior ──────────────┐   │
│ filters  │  │ ┌────┐ ┌────┐ ┌────┐ ┌────┐      │   │
│          │  │ │    │ │    │ │    │ │    │ ...    │   │
│ Upload   │  │ └────┘ └────┘ └────┘ └────┘      │   │
│ progress │  └───────────────────────────────────┘   │
│          │                                           │
│          │  ┌─ Category: Interior ──────────────┐   │
│          │  │ ...                                │   │
│          │  └───────────────────────────────────┘   │
├──────────┴──────────────────────────────────────────┤
│ Move Bar (visible when items selected)               │
└─────────────────────────────────────────────────────┘
```

### Features (ported + enhanced from prototype)
- **Project sidebar**: list of projects, create new, switch between
- **Category sections**: collapsible, drag-reorder within and across
- **Media cards**: thumbnail, filename, category badge, star, note icon
- **Multi-select**: click, shift+click range, ctrl+click toggle
- **Batch operations**: move to category, rename, delete, star
- **Orientation filter**: all / landscape / portrait
- **View modes**: grid (configurable size) / list (with metadata columns)
- **Batch rename**: template tokens — `{property}`, `{category}`, `{n}`, `{date}`, `{mls}`, `{agent}`, `{original}`
- **Keyboard shortcuts**: arrow keys to navigate, space to select, `s` to star, `delete` to remove
- **Upload zone**: drag-drop anywhere, or sidebar upload button
- **Real-time upload progress**: per-file and overall in sidebar

### Design system
Port existing design tokens from prototype:
- Dark theme (bg: `#0C0C0E`, surface: `#161619`, accent: `#4ADE80`)
- DM Sans + JetBrains Mono typography
- Convert to Tailwind CSS custom theme

---

## 10. Client Gallery

### URL structure
`/gallery/[projectId]`

### Gallery visibility
Photographer chooses per project via `gallery_public` toggle:
- **Public** (`gallery_public: true`): Anyone with the link sees watermarked thumbnail previews without logging in. OAuth required for: full-res viewing, downloads, payments, edit requests. Maximizes sharing/virality.
- **Private** (`gallery_public: false`): Gallery link prompts OAuth sign-in before showing anything. Full photographer control over who sees the work.

### Access levels (authenticated users)

| Level | See thumbnails | See full-res | Download individual | Download ZIP | Comment (v3) |
|-------|:-:|:-:|:-:|:-:|:-:|
| Preview | Watermarked | No | No | No | No |
| Proofing | Clean | Yes | No | No | Yes |
| Delivered | Clean | Yes | Yes | Yes | Yes |

### Access resolver
A **Postgres RPC function** (`resolve_gallery_access`) checks all relevant tables on gallery load and returns:
```json
{ "canView": true, "canDownload": false, "canRequestEdits": true, "amountOwed": 15000 }
```
This function queries `project_clients`, `project_pricing`, `bookings`, `file_purchases`, and `edit_requests` to determine the client's effective access. Gallery and API routes call this once — all access decisions flow through this single function. No stale client-side state.

Any access level can additionally require payment (photographer-configured via `project_pricing`). Payment goes to the photographer's connected Stripe account. Platform takes a 7% application fee (5% for Business tier).

### Payment types (photographer-configurable per project)

**Booking (before media exists):**
- Photographer shares a booking link → client fills out custom form + pays
- Booking payment modes: full payment upfront, deposit (photographer sets %), download-only fee, or free
- Successful booking auto-creates a draft project with client info pre-filled and client invited
- For deposit bookings: remaining balance is auto-charged when project is published/delivered
- If auto-charge fails: client gets email with payment link, gallery shows proofing-level access but downloads are locked until balance is paid

**Downloads (after media is uploaded):**
- Two pricing modes (photographer chooses per project):
  - **Flat fee**: one price unlocks all downloads for the project
  - **Per-file**: photographer sets price per file, client adds to cart and checks out once (single PaymentIntent)
- Once paid, access is permanent until the project is archived
- Cart + single checkout for per-file purchases (avoids excessive Stripe fees from many small transactions)

**Edit requests (after media is uploaded):**
- Client selects photos, writes notes about desired edits, submits request
- Full workflow: `requested` → `reviewed` → `priced` → `paid` → `in_progress` → `delivered`
- If photographer has a flat edit fee set, price is auto-filled; otherwise photographer reviews and sets a custom quote
- Client pays the quoted amount via Stripe Checkout
- Photographer marks delivered when edits are complete

### Gallery UI
- Clean, minimal layout — photographer's brand-forward
- Category-based sections (matching photographer's organization)
- Lightbox view for full-res browsing
- Download button (individual + "Download All" ZIP) — access-level + payment gated
- Paywall screen when payment is required but not yet completed
- Cart interface for per-file download purchases
- Edit request submission form (select photos + notes)
- Heart/star reactions on each photo (stored, shown to photographer)
- Responsive — works well on mobile (clients browse on phones)

### Gallery themes (Phase 1)
- 4 preset themes: dark, light, minimal, editorial
- Photographer selects theme per project (stored in `projects.theme`)
- Free tier: 3 themes (dark, light, minimal). Pro+: all 4.
- Custom themes deferred to v3 (Business tier)

### Watermarking
- Cloudflare Images overlay transform for watermarked previews
- Watermark: semi-transparent "PROOF" text or photographer's logo (v3)
- Applied at CDN level — original files untouched in storage

### Client invitation flow
- Photographer enters client email → system sends magic link email via Resend
- Email contains direct gallery link
- Clicking link prompts Google/Apple OAuth sign-in
- After sign-in, system auto-links their account to the `project_clients` record (matches by email)
- If `gallery_public: true`, client can preview without signing in; sign-in required for any action

### Edit delivery (Phase 2)
- Edited photos appear in a separate "Edits" category section in the gallery
- Originals remain untouched in their original categories
- Photographer uploads edited files and marks the edit request as "delivered"
- Client sees both originals and edits side by side in the gallery

---

## 11. Notifications & Email

### Notification system
- **Activity feed**: Dashboard home page shows recent activity across all projects
- **Bell dropdown**: Navigation header bell icon with unread count badge + dropdown showing recent notifications
- Powered by `notifications` table — records created server-side on key events
- Notifications link to the relevant project/booking/payment

### Transactional emails (Phase 1 — all via Resend + react-email templates)

| Email | Recipient | Trigger |
|-------|-----------|---------|
| Welcome | Photographer | After signup |
| Gallery invitation (magic link) | Client | Photographer invites client |
| Project published | Client | Photographer publishes project |
| Payment confirmation | Client | Successful payment |
| Payment received | Photographer | Client pays for anything |
| Payment failed (with retry link) | Client | Card declined on auto-charge or checkout |

---

## 12. Project Lifecycle & Billing

### States
```
booked ──(upload)──▶ draft ──(publish)──▶ published ──(client approves)──▶ completed ──(30 days)──▶ archived ──(6 months)──▶ deleted
                       │                      │                               │                        │
                       └──(delete)──▶ X      └──(unpublish)──▶ draft         └──(reopen)──▶ published  └──(restore)──▶ published
```
- **booked**: Auto-created from a booking. Empty project with client info pre-filled. (Phase 2)
- **draft**: Photographer is uploading/organizing. Not visible to clients.
- **published**: Gallery is live. Clients can view/pay/download per access level.
- **completed**: Client has clicked "Approve & Complete" in the gallery. (Phase 2)
- **archived**: Read-only. No new uploads or payments. Downloads still work for paid clients.
- **deleted**: Permanently removed after 6 months in archived state.

### Platform billing — Photographer subscriptions (Stripe Billing)

Four tiers:

| Feature | Free | Pro | Business | Custom |
|---|---|---|---|---|
| Active projects | 3 | Unlimited | Unlimited | Unlimited |
| Storage | 5 GB | 100 GB | 500 GB | Unlimited |
| Gallery themes | 3 (dark, light, minimal) | All 4 | All 4 | All + custom (v3) |
| Gallery sharing | Yes | Yes | Yes | Yes |
| Guest preview toggle | Yes | Yes | Yes | Yes |
| Client dashboard | No | Yes | Yes | Yes |
| Stripe Connect | No | Yes (7% app fee) | Yes (5% app fee) | Yes (negotiable) |
| Booking page | No | Yes (Phase 2) | Yes (Phase 2) | Yes |
| Edit requests | No | Yes (Phase 2) | Yes (Phase 2) | Yes |
| Custom branding | No | No | Yes (v3) | Yes |
| Team members | 1 | 1 | Up to 5 (v3) | Unlimited |
| Priority support | No | No | Yes | Yes |
| Price | $0 | $39/month | TBD/month | Contact sales |
| Annual discount | — | ~15-20% off | ~15-20% off | — |

**Trial**: 14-day Pro trial with card upfront. Stripe Billing handles trial period natively. After 14 days, if payment fails, immediately downgrade to Free tier. Existing projects beyond Free limit become read-only (can view/export but not create new).

**Downgrade behavior**: When a photographer downgrades (or trial/payment fails):
- Pro features are disabled immediately
- Already-published projects remain live for 30 days, then become read-only
- Stripe Connect payment features are disabled on new projects
- Existing paid clients retain their access
- Storage overage blocks new uploads with upgrade prompt

**Stripe setup**: One Stripe Product per tier. Two Prices per paid Product (monthly + annual). Subscription managed via Stripe Billing + Customer Portal. Custom tier handled via manual Stripe invoice/quote.

### Photographer → Client billing (Stripe Connect)

**Stripe Connect Standard accounts:**
- Photographer onboards via Stripe Connect OAuth flow → redirect to `/settings/connect`
- Onboarding must be complete (`charges_enabled: true`) before any client payment features work
- If onboarding is incomplete, all payment features are disabled with a banner prompting completion
- `profiles.stripe_connect_id` stores the connected account ID
- `profiles.stripe_connect_onboarded` tracks completion status
- Connect onboarding links expire — regenerate fresh link each time photographer accesses the page

**Application fees:**
- Pro tier: 7% platform fee on every client transaction
- Business tier: 5% platform fee
- Custom tier: negotiable (set per account)
- Collected via `application_fee_amount` on PaymentIntents
- On refunds: platform fee is also refunded (Stripe default behavior)

**Client payment methods:**
- Clients create a per-photographer profile with saved payment info and preferences
- Payment methods saved via Stripe SetupIntent on the photographer's connected account (Customer object lives on the connected account, not platform)
- Enables auto-charging deposit balances on delivery without requiring client action
- All card data handled by Stripe — zero PCI scope for us

**Refunds (Phase 2):**
- Photographer initiates refunds via their PhotoSorter dashboard
- Supports both full and partial refunds (photographer enters amount)
- Platform calls Stripe Refund API on the connected account
- Platform application fee is refunded proportionally (Stripe default behavior)
- On full refund: client's download access for that payment is revoked
- On partial refund: client retains access
- No refund time limit enforced by platform (Stripe's own limits apply — 180 days)
- Refund status updated in our records via webhook

**Currency:**
- Each photographer's client payments use their Stripe account's default currency
- Platform subscription is in the photographer's local currency (Stripe handles this)
- **Client-facing display (Phase 2):** Show approximate local price alongside photographer's price (e.g., "$150 USD ≈ £120"). Uses exchange rate API for display only — actual charge is in photographer's currency
- Phase 1: show photographer's currency with correct symbol only

### Webhook processing

**Endpoint**: `/api/webhooks/stripe` — handles both platform and Connect events

**Idempotency**: All events logged in `stripe_events` table. Before processing, check if `stripe_event_id` already exists. If so, return 200 without re-processing.

**Key events to handle:**
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription OR record client payment |
| `invoice.paid` | Confirm subscription renewal |
| `invoice.payment_failed` | Trigger downgrade to Free tier |
| `customer.subscription.deleted` | Downgrade to Free tier |
| `account.updated` (Connect) | Update `stripe_connect_onboarded` status |
| `payment_intent.succeeded` (Connect) | Update booking/edit/download payment status |
| `charge.refunded` (Connect) | Update refund status in our records |

---

## 13. Security

### Authentication
- **Photographers**: Supabase Auth (email/password + Google/Apple OAuth)
- **Clients**: Google/Apple OAuth only (no password accounts for clients)

### Authorization (Supabase RLS)
- Photographers can only access their own projects and media
- Clients can only access projects they're invited to (`project_clients` table)
- Client access level enforced at both API and UI level
- Payment status enforced: if payment required, content is gated regardless of access level
- Signed URLs for media access (expire after 1 hour, regenerated as needed)

### Storage security
- Supabase Storage buckets are private (no public URLs)
- All media access via signed URLs or Cloudflare Images with auth token
- Watermarked URLs for preview-level clients

### Payment security
- All card data handled by Stripe — zero PCI scope for platform
- Client payment methods stored as Stripe Customer objects on the photographer's connected account
- Stripe Radar (built-in fraud detection) active on all payments — no additional cost
- Webhook signature verification on all incoming Stripe events (`stripe-signature` header)
- `stripe_events` idempotency table prevents double-processing from webhook retries
- Stripe Connect `charges_enabled` check before creating any PaymentIntent — prevents payments to deactivated accounts
- Application fees enforced server-side via `application_fee_amount` — cannot be bypassed by client

---

## 14. Photographer Onboarding

### First-time experience (after signup)
1. **Short video tour** — 60-90 second feature overview (auto-plays, skippable)
2. **Guided setup wizard** (3-4 steps):
   - Step 1: Business name + avatar/logo upload
   - Step 2: Default preset preference (real estate, wedding, travel, general)
   - Step 3: Connect Stripe account (optional, can skip and do later)
   - Step 4: Create first project (name + preset)
3. Land on workspace with first project open, ready to upload
4. `profiles.onboarding_completed` set to `true` after wizard finishes

### Landing page (`page.tsx`)
- Hero section with headline + CTA ("Start sorting for free")
- Feature highlights (AI sorting, client gallery, get paid)
- Pricing table (4 tiers)
- Testimonials placeholder (populate after launch)
- Footer with links

---

## 15. Next.js Project Structure

```
photo-sorter/
├── public/
│   ├── manifest.json          (PWA manifest)
│   ├── sw.js                  (service worker)
│   └── icons/                 (PWA icons)
├── src/
│   ├── app/
│   │   ├── layout.tsx         (root layout, providers)
│   │   ├── page.tsx           (landing page — hero, features, pricing)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── onboarding/page.tsx  (video tour + setup wizard)
│   │   ├── (app)/                   (authenticated photographer routes)
│   │   │   ├── layout.tsx           (app shell — sidebar + header + bell)
│   │   │   ├── dashboard/page.tsx   (activity feed + project list)
│   │   │   ├── clients/                              ← Phase 2
│   │   │   │   ├── page.tsx         (client list)
│   │   │   │   └── [id]/page.tsx    (client profile)
│   │   │   ├── bookings/page.tsx    (booking mgmt)   ← Phase 2
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx         (account settings)
│   │   │   │   ├── billing/page.tsx (subscription management)
│   │   │   │   ├── connect/page.tsx (Stripe Connect onboarding + status)
│   │   │   │   ├── booking-forms/page.tsx (form builder) ← Phase 2
│   │   │   │   └── themes/page.tsx  (gallery theme selection)
│   │   │   └── project/
│   │   │       └── [id]/
│   │   │           ├── page.tsx        (workspace — main sorting UI)
│   │   │           ├── settings/page.tsx (project metadata, client access, pricing)
│   │   │           ├── publish/page.tsx  (publish flow)
│   │   │           └── edits/page.tsx   (edit request mgmt) ← Phase 2
│   │   ├── book/                                     ← Phase 2
│   │   │   └── [photographerId]/
│   │   │       └── page.tsx   (public booking page — form + payment)
│   │   ├── gallery/
│   │   │   └── [id]/
│   │   │       ├── page.tsx   (client-facing gallery + paywall)
│   │   │       ├── cart/page.tsx (per-file checkout)  ← Phase 2
│   │   │       └── edit-request/page.tsx              ← Phase 2
│   │   └── api/
│   │       └── webhooks/
│   │           └── stripe/route.ts  (Stripe + Connect webhook handler)
│   ├── components/
│   │   ├── ui/                (design system primitives)
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── ...
│   │   ├── workspace/         (photographer workspace components)
│   │   │   ├── MediaCard.tsx
│   │   │   ├── CategorySection.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   ├── MoveBar.tsx
│   │   │   ├── UploadZone.tsx
│   │   │   ├── UploadProgress.tsx
│   │   │   ├── BatchRenameModal.tsx
│   │   │   └── NoteEditor.tsx
│   │   ├── gallery/           (client gallery components)
│   │   │   ├── GalleryGrid.tsx
│   │   │   ├── Lightbox.tsx
│   │   │   ├── DownloadBar.tsx
│   │   │   ├── Paywall.tsx
│   │   │   ├── FileCart.tsx          ← Phase 2
│   │   │   └── EditRequestForm.tsx   ← Phase 2
│   │   ├── booking/           (client booking components) ← Phase 2
│   │   │   ├── BookingForm.tsx
│   │   │   └── DynamicFormFields.tsx
│   │   └── notifications/     (notification components)
│   │       ├── BellDropdown.tsx
│   │       └── ActivityFeed.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts      (browser client)
│   │   │   ├── server.ts      (server client for RSC)
│   │   │   └── middleware.ts  (auth middleware)
│   │   ├── ai/
│   │   │   ├── classifier.ts  (MobileNet loader + classification)
│   │   │   ├── classifier.worker.ts (Web Worker for inference)
│   │   │   ├── presets.ts     (category presets + keyword maps)
│   │   │   └── video-frame.ts (video frame extraction)
│   │   ├── upload/
│   │   │   ├── queue.ts       (upload queue manager)
│   │   │   ├── resumable.ts   (tus upload wrapper)
│   │   │   └── indexeddb.ts   (progress persistence)
│   │   ├── stripe/
│   │   │   ├── client.ts      (Stripe SDK init)
│   │   │   ├── connect.ts     (Connect onboarding, account links)
│   │   │   ├── checkout.ts    (subscription + client payment sessions)
│   │   │   └── webhooks.ts    (webhook event handlers)
│   │   ├── email/
│   │   │   ├── send.ts        (Resend wrapper)
│   │   │   └── templates/     (react-email templates)
│   │   │       ├── Welcome.tsx
│   │   │       ├── GalleryInvitation.tsx
│   │   │       ├── ProjectPublished.tsx
│   │   │       ├── PaymentConfirmation.tsx
│   │   │       ├── PaymentReceived.tsx
│   │   │       └── PaymentFailed.tsx
│   │   ├── media/
│   │   │   ├── cloudflare.ts  (image URL builder — thumbnails, watermarks)
│   │   │   └── exif.ts        (EXIF extraction)
│   │   └── utils/
│   │       ├── rename.ts      (batch rename pattern expansion)
│   │       ├── zip.ts         (ZIP export builder)
│   │       └── format.ts      (file size, date formatters)
│   ├── stores/
│   │   ├── project.ts         (Zustand — current project state)
│   │   ├── media.ts           (Zustand — media files, selection, filters)
│   │   └── upload.ts          (Zustand — upload queue state)
│   └── types/
│       ├── database.ts        (generated Supabase types)
│       ├── media.ts           (Media, Category, Orientation types)
│       └── project.ts         (Project, Preset, Metadata types)
├── supabase/
│   ├── migrations/            (SQL migration files)
│   ├── seed.sql               (dev seed data)
│   └── config.toml
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
├── .env.local.example
├── SPEC.md                    (this file)
└── README.md
```

---

## 16. Deployment & Infrastructure

### Services
| Service | Provider | Tier |
|---------|----------|------|
| Frontend hosting | Vercel | Free (Pro when needed) |
| Database + Auth | Supabase | Free tier (500MB DB, 1GB storage) |
| File storage | Supabase Storage | Free tier → Pro ($25/mo for 100GB) |
| Image transforms | Cloudflare Images | $5/mo for 100K transformations |
| Payments (platform) | Stripe Billing | Subscription revenue from photographers |
| Payments (Connect) | Stripe Connect | Photographer → client payments, platform takes app fee |
| Email | Resend | Transactional emails (free tier: 3K/month) |
| Domain | TBD | ~$12/year |

### Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT=
CLOUDFLARE_IMAGES_API_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_CONNECT_CLIENT_ID=
RESEND_API_KEY=
```

### MVP cost estimate
- **0-100 users**: ~$5-10/month (free tiers cover most things)
- **100-1000 users**: ~$50-100/month (Supabase Pro + Cloudflare Images)
- Revenue at 100 paid subs (mix of Pro + Business) × avg $25/month = $2,500/month + 5% Connect app fees on client transactions

---

## 17. Implementation Phases

### Phase 1 — Core Product (3-4 weeks)

**Week 1: Foundation**
- [ ] Initialize Next.js project with TypeScript, Tailwind, Zustand
- [ ] Set up Supabase project (DB schema, auth, storage buckets, RLS policies)
- [ ] Port design system from prototype (dark theme, tokens → Tailwind)
- [ ] Build auth flow (signup, login, OAuth)
- [ ] Build onboarding wizard (video tour + 4-step setup)
- [ ] Build project CRUD (create, list, delete) with preset selection
- [ ] Port AI classification to Web Worker (`classifier.worker.ts`)

**Week 2: Workspace & Upload**
- [ ] Build upload pipeline (drag-drop → tus upload → Supabase Storage)
- [ ] Implement upload queue with IndexedDB persistence
- [ ] Build workspace UI (sidebar, category sections, media grid)
- [ ] Port media card component (select, star, note, rename)
- [ ] Implement batch operations (move, rename, delete)
- [ ] Add orientation filter and view modes
- [ ] Wire up Cloudflare Images for thumbnails
- [ ] Storage tracking + tier limit enforcement

**Week 3: Billing, Gallery & Email**
- [ ] Integrate Stripe Billing — 4 tiers (Free/Pro/Business/Custom), monthly + annual prices
- [ ] Build subscription management UI (`/settings/billing`) + Stripe Customer Portal
- [ ] Implement 14-day Pro trial with card upfront
- [ ] Build trial expiry → Free downgrade logic
- [ ] Integrate Stripe Connect onboarding flow (`/settings/connect`)
- [ ] Set up Stripe webhook handler + `stripe_events` idempotency table
- [ ] Build client gallery page (4 themes, lightbox, category sections)
- [ ] Implement `gallery_public` toggle (guest preview vs OAuth-gated)
- [ ] Build `resolve_gallery_access` Postgres RPC function
- [ ] Set up Cloudflare Images watermarking for preview tier
- [ ] Build `project_pricing` configuration UI (flat-fee downloads)
- [ ] Build gallery paywall + flat-fee download checkout
- [ ] Set up Resend + all 6 email templates
- [ ] Magic link client invitation flow

**Week 4: Polish & Launch**
- [ ] Build notifications table + bell dropdown + activity feed dashboard
- [ ] Build landing page (hero + features + pricing table)
- [ ] ZIP export with organized folder structure
- [ ] Implement project publishing flow
- [ ] PWA setup (manifest, service worker, installability)
- [ ] Upload resume-on-return flow
- [ ] Keyboard shortcuts
- [ ] Error handling, loading states, empty states
- [ ] Mobile responsive pass
- [ ] Gallery theme selection UI (`/settings/themes`)
- [ ] Testing (upload, gallery access, flat-fee payments, webhooks, emails)
- [ ] Deploy to production (Vercel + Supabase)

### Phase 2 — Payments & Workflows (4-6 weeks after Phase 1)

**Week 5-6: Booking & Client Management**
- [ ] Build public booking page (`/book/[photographerId]`)
- [ ] Build booking form field system (preset templates + custom fields)
- [ ] Implement booking payment modes (full, deposit, download-only, free)
- [ ] Auto-create draft project on booking payment
- [ ] Build configurable booking confirmation (auto vs photographer-confirms)
- [ ] Build client profiles inside photographer dashboard
- [ ] Build client list + individual client profile pages
- [ ] Saved payment methods (Stripe SetupIntent on connected account)
- [ ] Build bookings management page

**Week 7-8: Per-File Cart, Edits & Refinements**
- [ ] Build per-file download pricing + cart checkout in gallery
- [ ] Build edit request submission UI in gallery
- [ ] Build edit request workflow (6-status) + photographer management UI
- [ ] Build "Edits" section in gallery for delivered edits
- [ ] Implement deposit auto-charge on project delivery
- [ ] Build failed-charge fallback (notify + lock downloads)
- [ ] Build refund flow (full + partial) in photographer dashboard
- [ ] Client "Approve & Complete" button + `completed` project status
- [ ] Approximate currency display conversion for international clients
- [ ] Advanced notification types for Phase 2 features
- [ ] Testing (all payment flows, booking, edits, refunds, currency)

---

## 18. Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Large uploads failing | tus resumable protocol + IndexedDB tracking |
| MobileNet accuracy too low | Manual override is easy; track corrections for v2 learning |
| Cloudflare Images cost at scale | Cache aggressively; only generate sizes on first request |
| Client link sharing / unauthorized access | OAuth gating (not just URL tokens); signed URLs expire |
| Scope creep beyond MVP | This spec defines the line. Comments, reactions, archive lifecycle = v2. |
| Storage costs growing | Tiered storage limits (5GB/100GB/500GB) + subscription revenue covers costs |
| Stripe Connect onboarding drop-off | Block payment features until complete; regenerate fresh onboarding links |
| Auto-charge balance fails (card declined) | Graceful fallback: lock downloads, notify client with payment link, keep gallery viewable |
| Webhook double-processing | `stripe_events` idempotency table — check before processing every event |
| Photographer's Stripe account deactivated | Check `charges_enabled` before creating PaymentIntents; disable payment features if false |
| Subscription lapses with active client payments | 30-day grace on published projects; new payment features disabled immediately |
| Per-file purchases with tiny amounts | Cart + single checkout avoids excessive Stripe fixed fees ($0.30/txn) |

---

## 19. What's Explicitly NOT in Phase 1 or Phase 2

To keep scope honest — these are v3+:
- No client comments or reactions (view + download only)
- No custom user-defined categories (presets only)
- No AI learning from corrections
- No native mobile apps
- No project archival/deletion lifecycle automation
- No team/multi-photographer workspaces (Business tier)
- No analytics dashboard (gallery views, downloads, engagement)
- No custom branding — logo watermarks, custom gallery themes (Business tier)
- No social media integrations
- No RAW file conversion (store original, show JPEG preview)
- No calendar/availability management for bookings
- No drag-and-drop form builder (template + add/remove/reorder fields only)
- No partial payments / installment plans
- No bulk project management
- No API access for integrations
