# PhotoSorter — Spec Deep Analysis & AI Research Report

> Research completed 2026-03-24. Covers the full updated SPEC.md (v2) — architecture, data model, phasing, payment systems, AI classification, and a comprehensive research report on AI technologies to maximize automation for photographers.

---

## Part 1: Spec Deep Analysis

### 1. Architecture Overview

PhotoSorter is a two-sided marketplace disguised as a SaaS tool. Photographers pay subscriptions; clients pay photographers for services. The platform takes a cut (7% Pro, 5% Business) via Stripe Connect.

**Stack summary:**
- **Frontend**: Next.js 14+ (App Router) on Vercel — SSR + RSC + PWA
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions + RLS)
- **Image CDN**: Cloudflare Images — on-demand transforms, watermarking
- **AI**: TensorFlow.js + MobileNet v2 (client-side, Web Worker) — currently
- **Uploads**: tus-js-client + IndexedDB for resumable chunked uploads
- **Payments**: Stripe Billing (subscriptions) + Stripe Connect Standard (photographer→client)
- **Email**: Resend + react-email (6 transactional templates)
- **State**: Zustand (3 stores: project, media, upload)

### 2. Data Model — 13 Tables

The schema is complex due to the two-sided payment model:

| Table | Purpose | Phase |
|-------|---------|-------|
| `profiles` | Photographer accounts, plan, Stripe IDs, storage tracking | 1 |
| `projects` | Core entity — preset, status, theme, gallery visibility, metadata | 1 |
| `media` | Files — storage path, classification, EXIF, upload status, sort order | 1 |
| `project_clients` | Access control — email-based invitations, access levels | 1 |
| `project_pricing` | Per-project payment configuration (booking/download/edit modes + prices) | 1 (flat-fee), 2 (full) |
| `client_profiles` | Per-photographer client accounts with saved Stripe payment methods | 2 |
| `bookings` | Booking records — type, deposit/balance tracking, form data | 2 |
| `edit_requests` | 6-status workflow — requested→reviewed→priced→paid→in_progress→delivered | 2 |
| `file_purchases` | Per-file or flat-fee download purchase records | 1 (flat), 2 (per-file) |
| `booking_form_fields` | Custom booking form definitions per preset, JSONB field array | 2 |
| `stripe_events` | Webhook idempotency log — prevents double-processing | 1 |
| `notifications` | Bell dropdown + activity feed, 8 event types | 1 |
| `client_reactions` | Hearts/stars/comments (v3 schema, designed now) | v3 |

### 3. Project Lifecycle State Machine

```
booked → draft → published → completed → archived → deleted
```

Key transitions:
- **booked→draft**: Photographer uploads first file (Phase 2 — auto-created from booking)
- **draft→published**: Photographer clicks Publish
- **published→completed**: Client clicks "Approve & Complete" (Phase 2)
- **completed→archived**: 30 days auto-timer
- **archived→deleted**: 6 months auto-timer
- **published→draft**: Unpublish (reversal)
- **completed→published**: Reopen (reversal)
- **archived→published**: Restore (reversal)

Edge case: `booked` and `completed` statuses are Phase 2 only. Phase 1 lifecycle is just `draft → published → archived`.

### 4. Four-Tier Subscription Model

| | Free | Pro ($39/mo) | Business (TBD) | Custom |
|---|---|---|---|---|
| Projects | 3 active | Unlimited | Unlimited | Unlimited |
| Storage | 5 GB | 100 GB | 500 GB | Unlimited |
| Gallery themes | 3 | All 4 | All 4 | All + custom (v3) |
| Stripe Connect | No | Yes (7% fee) | Yes (5% fee) | Yes (negotiable) |
| Client dashboard | No | Yes | Yes | Yes |
| Booking/Edits | No | Yes (Phase 2) | Yes (Phase 2) | Yes |
| Custom branding | No | No | Yes (v3) | Yes |
| Teams | 1 | 1 | Up to 5 (v3) | Unlimited |

**Trial**: 14-day Pro trial, card upfront. Failed payment → immediate downgrade to Free. Projects beyond Free limit become read-only.

**Downgrade behavior**: Pro features off immediately. Published projects stay live 30 days then go read-only. Connect disabled on new projects. Existing paid clients retain access.

### 5. Payment Architecture — Two Sides

**Side 1: Platform revenue (Stripe Billing)**
- 1 Stripe Product per tier, 2 Prices each (monthly + annual)
- Trial via Stripe's native trial_period_days
- Customer Portal for self-service management
- Custom tier: manual invoice/quote

**Side 2: Photographer→Client (Stripe Connect Standard)**
- Connected accounts managed by photographers themselves
- `charges_enabled` check before any PaymentIntent
- `application_fee_amount` on every PaymentIntent (7% or 5%)
- Client payment methods saved as Stripe Customer on the connected account (not platform)
- Auto-charge deposit balance on project delivery

**Three payment types (photographer-configurable per project via `project_pricing`):**

1. **Booking** (Phase 2): full upfront, deposit %, download-only fee, or free. Auto-creates draft project.
2. **Downloads** (Phase 1: flat fee; Phase 2: per-file cart): Permanent access until archived.
3. **Edit requests** (Phase 2): 6-status workflow. Flat fee or custom quote per request.

### 6. Access Control — The Access Resolver

The `resolve_gallery_access` **Postgres RPC function** is the single source of truth for all gallery access decisions. It queries 5 tables (`project_clients`, `project_pricing`, `bookings`, `file_purchases`, `edit_requests`) and returns:

```json
{ "canView": true, "canDownload": false, "canRequestEdits": true, "amountOwed": 15000 }
```

This eliminates stale client-side state and prevents payment bypass. Every gallery load and API call goes through this function.

**Gallery visibility has two modes** (`gallery_public` toggle):
- **Public**: Watermarked thumbnails visible to anyone with the link. OAuth required for actions.
- **Private**: OAuth required to see anything.

### 7. Webhook Processing

Single endpoint `/api/webhooks/stripe` handles both platform and Connect events. The `stripe_events` table ensures idempotency — every event ID is checked before processing.

**7 key events**: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `account.updated` (Connect), `payment_intent.succeeded` (Connect), `charge.refunded` (Connect).

### 8. Client Invitation Flow

Magic link via Resend → Client clicks → OAuth sign-in → Auto-link to `project_clients` record by email match. If `gallery_public: true`, preview works without sign-in.

### 9. Current AI System — MobileNet v2

**How it works today** (from prototype):
1. Load MobileNet v2 (alpha 1.0) via TensorFlow.js — ~16 MB
2. Classify each image → get top 5 ImageNet predictions
3. Concatenate prediction classNames into a lowercase string
4. Count substring keyword matches against preset category keyword lists
5. Highest score wins; no matches → `other`

**Limitations:**
- Only real estate keyword mapping exists; 3 other presets need building
- Keyword matching is brittle — substring-based, no semantic understanding
- Videos always get `video` category regardless of content
- No confidence threshold in prototype (spec says 0.1 but not implemented)
- Sequential on main thread in prototype; MVP moves to Web Worker
- MobileNet's ImageNet labels poorly match photography concepts

### 10. Notification System

Activity feed (dashboard home) + bell dropdown (header). `notifications` table with 8 event types. Records created server-side on key events, linked to relevant project/booking/payment via `metadata` JSONB.

### 11. Email System

6 templates via Resend + react-email: Welcome, Gallery Invitation (magic link), Project Published, Payment Confirmation, Payment Received, Payment Failed (with retry link).

### 12. Key Edge Cases & Gotchas

1. **Deposit auto-charge failure**: Gallery falls to proofing-level access, downloads locked. Client gets email with payment link. Photographer notified in dashboard.
2. **Stripe Connect account deactivated**: Must check `charges_enabled` before every PaymentIntent. Disable payment features if false.
3. **Trial expiry + active projects**: Projects beyond Free limit become read-only. Published projects stay live 30 days.
4. **Per-photographer client profiles**: One person with 3 photographers has 3 separate `client_profiles` records. Stripe Customer lives on the connected account.
5. **Webhook idempotency**: `stripe_events` table checked before processing. Duplicate `stripe_event_id` → return 200, skip processing.
6. **Magic link + email matching**: `project_clients.client_email` is the key. When client OAuth's, system matches by email. If email doesn't match (e.g., different Google account), link fails silently.
7. **Storage limits**: Enforced per tier. Overage blocks new uploads with upgrade prompt. `profiles.storage_used` updated on upload complete.
8. **Refunds**: Full + partial. Platform fee refunded proportionally. Full refund revokes download access; partial retains it. No time limit (Stripe's 180-day limit applies).
9. **Currency**: Phase 1 shows photographer's currency with correct symbol. Phase 2 adds approximate conversion display for international clients.
10. **Gallery themes**: Free gets 3 (dark, light, minimal), Pro+ gets all 4 (+ editorial). Custom themes v3.

---

## Part 2: AI Technology Research

### 13. Replacing MobileNet — The Biggest Upgrade Opportunity

The current MobileNet + keyword mapping system is the weakest part of the architecture. MobileNet was designed for ImageNet's 1,000 generic object categories (e.g., "golden retriever", "espresso maker"), not photography concepts like "wedding ceremony" or "real estate exterior". The keyword bridge is fragile.

#### Recommendation: SigLIP via Transformers.js (Zero-Shot Classification)

**SigLIP** (Sigmoid Language-Image Pre-training, by Google) is a CLIP-like vision-language model that can classify images using arbitrary text prompts. Instead of matching ImageNet labels to keywords, you directly ask: "Is this a wedding ceremony? A portrait? A reception?"

**Why SigLIP over CLIP:**
- SigLIP uses sigmoid loss (independent per-label scoring) vs CLIP's softmax (competitive). Sigmoid is better when you want to score each category independently — perfect for multi-label photo classification.
- SigLIP2 (Feb 2025) further improves accuracy.

**Browser deployment via Transformers.js:**
- Model: `Xenova/siglip-base-patch16-224` (quantized INT8: ~150-200 MB)
- Runs in Web Worker via ONNX Runtime Web (WASM backend)
- Cached in IndexedDB after first download — subsequent loads are instant
- Inference: 100-500ms per image on desktop (WASM), potentially 10x faster with WebGPU (Chrome/Edge only)

**What this eliminates:**
- The entire `RE_CATEGORIES` keyword mapping system
- The need to build keyword maps for wedding, travel, and general presets
- Substring matching hacks and their false positives
- The artificial gap between what the model "sees" and what the categories mean

**How it works with presets:**
```
text_prompts = [
  "exterior photograph of a house or building",
  "interior room with furniture",
  "kitchen with appliances",
  "bathroom with fixtures",
  "aerial or drone photograph from above",
  "swimming pool or outdoor living area",
  "landscape or scenic view",
  "twilight or dusk photograph of a building",
  "video footage",
  "other"
]

// SigLIP scores each prompt independently (sigmoid, not softmax)
scores = model.score(image, text_prompts)
category = text_prompts[argmax(scores)]
```

Each preset (real estate, wedding, travel, general) just defines a different list of text prompts. Adding a new category is adding a string — no keyword research, no keyword lists.

**Trade-offs vs MobileNet:**
| | MobileNet v2 | SigLIP (INT8) |
|---|---|---|
| Model size | ~16 MB | ~150-200 MB |
| First load | 1-2 seconds | 5-15 seconds (then cached) |
| Inference speed | ~50ms/image | ~200-500ms/image (WASM) |
| Classification accuracy | Low (keyword bridging) | High (semantic understanding) |
| Custom categories | Requires keyword maps | Just text prompts |
| New preset support | Hours of keyword research | Minutes of prompt writing |
| Video frame analysis | Classifies but overrides to "video" | Can meaningfully classify video frames |
| Browser support | All | All (WASM), Chrome/Edge (WebGPU) |
| Offline/PWA | Yes (cached) | Yes (IndexedDB cached) |

**500 photos performance:** At 300ms/image average, 500 photos = ~150 seconds (2.5 min). Parallelizing across 2 Web Workers cuts to ~75 seconds. This is slower than the spec's 60-second target but a reasonable trade-off for dramatically better accuracy.

**Fallback strategy:** Detect WebGPU support → use it for 10x faster inference. Fall back to WASM for Safari/Firefox. Consider batching: classify in groups of 10-20 for better throughput.

### 14. Server-Side AI Classification — For Premium Features

Client-side SigLIP handles basic category classification for free. For richer features, server-side APIs provide capabilities no browser model can match.

#### Claude Vision API (Anthropic)

**Cost per image** (~1,600 input tokens + ~100 output tokens):
| Model | Cost/Image | 500 Photos | Batch API (50% off) |
|-------|-----------|-----------|-------------------|
| Haiku 4.5 | $0.0021 | $1.05 | **$0.53** |
| Sonnet 4.6 | $0.0063 | $3.15 | $1.58 |

**What Claude can do that SigLIP can't:**
- Detailed scene descriptions ("bride walking down a sunlit garden aisle with white roses")
- Composition analysis ("rule of thirds, leading lines toward the altar")
- Mood/emotion detection ("candid, joyful, natural laughter")
- Multi-label output ("ceremony, outdoor, flowers, bride, group")
- Quality assessment ("slightly overexposed highlights, sharp focus on subject")
- Gallery section descriptions from photo contents

**Best use case:** Batch API after upload completes. Send 500 photos in one batch, get results in 1-2 hours, cost $0.53 with Haiku. Store enriched metadata in `media.predictions` JSONB.

#### OpenAI GPT-4o Vision

| Model | Mode | Cost/Image | 500 Photos | Batch (50% off) |
|-------|------|-----------|-----------|----------------|
| GPT-4o | Low detail | $0.0012 | $0.60 | **$0.30** |
| GPT-4o | High detail | $0.0029 | $1.45 | $0.73 |

**Note:** GPT-4o-mini paradoxically costs MORE per image than GPT-4o for vision tasks due to a 2,833 tokens/tile quirk. Always use GPT-4o for vision.

#### Google Cloud Vision API

- **Label detection**: $1.50/1,000 images ($0.75 for 500). First 1,000/month free.
- **Face detection**: $1.50/1,000 images. Includes emotion, headwear.
- **Limitation**: Fixed label vocabulary — cannot classify into custom categories like "wedding ceremony". Useful as supplementary data, not primary classifier.

#### Cost Comparison Summary (500 photos/project)

| Approach | Cost | Custom Categories | Latency | Privacy |
|----------|------|-------------------|---------|---------|
| SigLIP (client-side) | **$0** | Yes (zero-shot) | 100-500ms/image | Full (browser only) |
| Claude Haiku Batch | **$0.53** | Yes (any prompt) | Hours (batch) | API (stripped EXIF) |
| GPT-4o Low Detail Batch | **$0.30** | Yes (any prompt) | Hours (batch) | API |
| Google Cloud Vision | **$0.75** | No (fixed labels) | ~200ms/image | API |
| Claude Sonnet (real-time) | **$3.15** | Yes (best quality) | 2-5s/image | API |

### 15. AI-Powered Onboarding — Website Scraping + LLM Extraction

**Concept:** Photographer enters their website URL during onboarding → AI scrapes the site and pre-fills their profile.

**Implementation:**
1. **Firecrawl** scrapes the URL → returns clean markdown (67% fewer tokens than raw HTML)
2. Send markdown to Claude Haiku with a structured extraction prompt
3. Extract: business name, niche (wedding/real estate/portrait/etc.), location, style descriptors, price range, portfolio themes
4. Pre-fill: `profiles.business_name`, suggested preset, booking form defaults, gallery theme

**Firecrawl pricing:** Free tier = 500 pages. The `/extract` endpoint (AI-structured extraction) starts at $89/mo.

**Cost per onboarding:** ~$0.01-0.05 (1-3 pages scraped + Haiku extraction). Negligible.

**What this enables:**
- Auto-detect photographer's niche → suggest the right preset
- Auto-generate booking form fields based on their existing services
- Auto-suggest pricing based on their market/niche
- Pre-fill project metadata templates from their website content
- Set gallery theme based on their brand aesthetic

**Alternative approach (cheaper):** Skip Firecrawl, just ask the photographer for their Instagram handle. Use Meta's Graph API (public profile endpoint) to pull their bio, category, and recent post captions. Feed to Claude for niche detection. Free.

### 16. AI-Powered Photo Enhancement Features

These are high-value features that differentiate PhotoSorter from basic gallery tools.

#### Auto-Culling (Blur + Duplicate Detection)

**Client-side, free:**
- **Blur detection**: Compute Laplacian variance on a canvas-resized image. Variance below threshold → flagged as blurry. Simple, fast (~5ms/image), runs in Web Worker.
- **Duplicate detection**: Perceptual hashing (pHash) or CLIP embeddings cosine similarity. pHash is simpler and faster; CLIP catches semantic duplicates (same scene, different crop).
- **Blink/face detection**: face-api.js (TensorFlow.js-based) detects closed eyes and facial expressions. Works in browser.

**Combined workflow:**
1. After classification, run blur detection + pHash on each image
2. Flag blurry images and duplicate clusters
3. Present to photographer: "We found 23 blurry photos and 15 duplicate sets. Review?"
4. Photographer confirms or overrides

#### Aesthetic Scoring — AI Hero Shot Selection

**NIMA (Neural Image Assessment)** by Google predicts aesthetic scores on a 1-10 scale. Available as PyTorch model, convertible to ONNX for browser use (~20-80 MB).

**Workflow:**
1. Score all photos with NIMA
2. Cluster photos by CLIP embeddings (visual similarity groups)
3. Pick highest-scored photo from each cluster
4. Suggest as "hero shots" or auto-set `media.starred = true`
5. Auto-suggest `projects.cover_image_id` (highest NIMA score across all categories)

**MUSIQ** (Multi-scale Image Quality Transformer) is a more accurate alternative but larger. NIMA is more practical for browser deployment.

#### AI Auto-Tagging (Beyond Categories)

Using CLIP embeddings, you can tag photos with rich descriptors beyond preset categories:
- Colors: "golden hour", "blue sky", "warm tones"
- Composition: "wide angle", "close-up", "bokeh background"
- Subjects: "couple", "family group", "architectural detail"
- Mood: "romantic", "dramatic", "candid"

These tags enhance searchability and gallery descriptions.

### 17. AI for Client-Facing Features

#### Natural Language Photo Search

**Architecture:** CLIP embeddings + pgvector (Supabase's Postgres already supports pgvector).

1. Generate CLIP image embeddings for all photos (client-side via Transformers.js)
2. Store 512-dim float vectors in a `media_embeddings` table with pgvector
3. At search time, encode text query with CLIP text encoder
4. `SELECT * FROM media_embeddings ORDER BY embedding <=> query_vector LIMIT 20`
5. Return matching photos ranked by similarity

**Example queries that work:**
- "sunset photos"
- "group photo by the fountain"
- "the bride getting ready"
- "photos with mountains in background"
- "close-up of the ring"

**Implementation note:** pgvector is a PostgreSQL extension. Supabase supports it natively — just `CREATE EXTENSION vector;`. No external vector database needed.

**Cost:** Free (embeddings generated client-side, stored in existing Postgres). Only cost is storage for embedding vectors (~2 KB per photo × 500 photos = ~1 MB per project).

#### Face Detection and Grouping (Wedding Photos)

**Client-side with face-api.js** (vladmandic fork):
1. Detect faces → extract 128-dim face descriptors
2. Cluster using DBSCAN (density-based clustering, handles unknown number of people)
3. Group photos by person cluster
4. Present in gallery: "People" filter with auto-generated groups

**This is particularly valuable for wedding photography** — clients can browse "All photos of Uncle Bob" instead of scrolling through 800 photos.

**Privacy advantage:** All face processing happens in the browser. No biometric data sent to servers. Critical for GDPR compliance.

#### AI-Generated Gallery Descriptions

Use Claude Haiku to generate natural descriptions per gallery section:
- Input: category name, photo count, sample photo descriptions
- Output: "45 ceremony photos capturing the outdoor vineyard celebration, from the processional through the first kiss."
- Cost: <$0.01 per gallery
- Trigger: On project publish, batch-generate descriptions for all sections

### 18. Recommended AI Architecture — Hybrid Approach

| Layer | Feature | Technology | Runs | Cost/500 Photos | Phase |
|-------|---------|-----------|------|-----------------|-------|
| 1 | Category classification | SigLIP (Transformers.js) | Client-side | Free | 1 |
| 1 | Blur detection | Laplacian variance (Canvas) | Client-side | Free | 1 |
| 1 | Duplicate detection | pHash or CLIP cosine similarity | Client-side | Free | 1 |
| 2 | Aesthetic scoring | NIMA (ONNX) | Client-side | Free | 1 |
| 2 | Hero shot auto-select | NIMA + CLIP clustering | Client-side | Free | 1 |
| 2 | Face grouping | face-api.js | Client-side | Free | 2 |
| 3 | Rich descriptions | Claude Haiku Batch | Server-side | $0.53 | 2 |
| 3 | Gallery descriptions | Claude Haiku | Server-side | $0.01 | 1 |
| 3 | NL photo search | CLIP embeddings + pgvector | Both | Free (storage only) | 2 |
| 4 | Website onboarding | Firecrawl + Claude Haiku | Server-side | $0.03 | 1 |
| 4 | Booking form suggest | Claude Haiku | Server-side | $0.01 | 2 |
| 4 | Pricing suggestions | Claude Haiku + market data | Server-side | $0.01 | 2 |

**Total cost per project (Phase 1 features only):** ~$0.04 (gallery descriptions + onboarding)
**Total cost per project (all features):** ~$0.58

**Key principle: Client-side first, server-side for enrichment.** This maximizes privacy (photos never leave the browser for core features), minimizes cost (most AI is free), and ensures offline PWA support.

### 19. Implementation Priorities for AI

**Phase 1 (replace MobileNet, add basic AI features):**
1. Replace MobileNet with SigLIP in Web Worker via Transformers.js
2. Add blur detection (Laplacian variance) during classification pipeline
3. Add duplicate detection (pHash) during classification pipeline
4. Add NIMA aesthetic scoring for auto-starring hero shots
5. Add website scraping for AI onboarding (Firecrawl + Claude Haiku)
6. Generate gallery section descriptions on publish (Claude Haiku)

**Phase 2 (advanced AI features):**
7. Face detection + grouping for wedding preset (face-api.js)
8. CLIP embeddings → pgvector for natural language search
9. Rich photo descriptions via Claude Haiku Batch
10. AI booking form suggestions from niche detection
11. AI pricing suggestions from market data

**v3 (learning + personalization):**
12. AI learning from photographer corrections (fine-tune prompts per photographer)
13. Custom category creation from natural language ("I want a category for 'getting ready' shots")
14. Auto-culling confidence calibration from photographer feedback

### 20. Privacy & Compliance Considerations

**Client-side processing (SigLIP, face-api.js, NIMA):**
- No data leaves the browser — strongest privacy guarantee
- No GDPR data processing agreements needed
- Works offline (PWA)
- No per-image API costs

**Server-side processing (Claude/GPT-4o):**
- Requires explicit photographer opt-in
- Strip EXIF metadata before sending to APIs
- Anthropic: images not used for training, deleted after processing
- Use Batch API (results in hours, not real-time) to reduce urgency
- Consider EU data residency for European photographers
- Photographers must disclose AI processing in client contracts

**Face detection specifically:**
- Biometric data under GDPR, BIPA (Illinois), and similar laws
- Client-side processing avoids most legal exposure
- Never store face descriptors server-side unless absolutely necessary
- If face embeddings must be stored, encrypt at rest and add deletion API

### 21. Spec Gaps Identified During Analysis

1. **No `media_embeddings` table** for CLIP vectors / pgvector. Needed if implementing NL search.
2. **No AI enrichment pipeline spec** — when do server-side AI calls happen? On upload? On publish? As a background job?
3. **No AI cost attribution** — who pays for server-side AI? Platform absorbs it? Photographer pays per-project? Included in tier?
4. **No AI opt-in mechanism** — need a per-project or per-account toggle for server-side AI features (privacy).
5. **`media.predictions` JSONB is MobileNet-shaped** — needs to accommodate SigLIP scores, NIMA scores, CLIP embeddings, face descriptors, blur scores.
6. **No auto-culling UI spec** — where does the photographer review flagged blurry/duplicate photos?
7. **No face grouping UI spec** — how does face grouping appear in the workspace and gallery?
8. **SigLIP model download is 150-200 MB** — need a loading/progress UX for first-time users. The onboarding video tour could play during model download.
9. **Web Worker architecture needs rethinking** — current spec has one worker for classification. With SigLIP + blur + pHash + NIMA, need a pipeline orchestrator or multiple workers.
