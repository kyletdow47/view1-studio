# PhotoSorter — Implementation Plan

> Detailed task-level plan covering Phase 1 (3-4 weeks) and Phase 2 (4-6 weeks). Each task includes dependencies, files touched, and code snippets where useful. Based on SPEC.md v2 and research.md AI findings.

---

## Dependency Map

```
Week 1: Foundation
  ├─ 1.1 Project init ─────────────────────────────────┐
  ├─ 1.2 Supabase schema + RLS ──────────────┐         │
  ├─ 1.3 Design system (Tailwind) ───────────┤         │
  ├─ 1.4 Auth flow ──────────────────────────┤         │
  ├─ 1.5 Onboarding wizard ──── depends on 1.4         │
  ├─ 1.6 Project CRUD ──────── depends on 1.2, 1.4    │
  └─ 1.7 AI classification ── depends on 1.1           │
                                                        │
Week 2: Workspace & Upload                              │
  ├─ 2.1 Upload pipeline ──── depends on 1.2, 1.6     │
  ├─ 2.2 Workspace UI ─────── depends on 1.3, 1.6     │
  ├─ 2.3 Media cards ──────── depends on 2.2           │
  ├─ 2.4 Batch operations ─── depends on 2.2           │
  ├─ 2.5 Orientation/views ── depends on 2.2           │
  ├─ 2.6 Cloudflare Images ── depends on 2.1           │
  └─ 2.7 Storage enforcement ─ depends on 2.1          │
                                                        │
Week 3: Billing, Gallery & Email                        │
  ├─ 3.1 Stripe Billing ──── depends on 1.2            │
  ├─ 3.2 Stripe Connect ──── depends on 3.1            │
  ├─ 3.3 Webhook handler ─── depends on 1.2            │
  ├─ 3.4 Gallery page ────── depends on 1.2, 2.6      │
  ├─ 3.5 Access resolver ─── depends on 1.2            │
  ├─ 3.6 Gallery paywall ─── depends on 3.2, 3.4, 3.5 │
  ├─ 3.7 Email system ────── depends on 1.1            │
  └─ 3.8 Client invitations ─ depends on 3.4, 3.7     │
                                                        │
Week 4: Polish & Launch                                 │
  ├─ 4.1 Notifications ──── depends on 1.2             │
  ├─ 4.2 Landing page ───── depends on 1.3             │
  ├─ 4.3 ZIP export ─────── depends on 2.1             │
  ├─ 4.4 Publish flow ───── depends on 3.4, 3.7       │
  ├─ 4.5 PWA ─────────────── depends on 1.1            │
  ├─ 4.6 Upload resume ──── depends on 2.1             │
  ├─ 4.7 Keyboard shortcuts ─ depends on 2.2           │
  └─ 4.8 Testing & deploy ── depends on ALL            │
```

---

## Week 1: Foundation

### 1.1 Project Initialization

**Dependencies:** None
**Files created:** project root config files

```bash
npx create-next-app@latest photo-sorter --typescript --tailwind --app --src-dir --eslint
cd photo-sorter
npm install zustand @supabase/supabase-js @supabase/ssr
npm install -D supabase
```

**package.json key additions:**
```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "zustand": "^4.5",
    "@supabase/supabase-js": "^2.45",
    "@supabase/ssr": "^0.5",
    "@xenova/transformers": "^3.0",
    "tus-js-client": "^4.1",
    "idb-keyval": "^6.2",
    "stripe": "^17.0",
    "@stripe/stripe-js": "^4.0",
    "resend": "^4.0",
    "@react-email/components": "^0.0.25",
    "jszip": "^3.10",
    "file-saver": "^2.0"
  }
}
```

**`.env.local.example`:**
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
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Create directory skeleton** matching SPEC §15:
```
src/
├── app/          (all route groups)
├── components/   (ui/, workspace/, gallery/, booking/, notifications/)
├── lib/          (supabase/, ai/, upload/, stripe/, email/, media/, utils/)
├── stores/       (project.ts, media.ts, upload.ts)
└── types/        (database.ts, media.ts, project.ts)
```

---

### 1.2 Supabase Schema + RLS

**Dependencies:** 1.1
**Files:** `supabase/migrations/001_initial_schema.sql`, `supabase/migrations/002_rls_policies.sql`

**Migration 001 — Tables:**

```sql
-- Enable pgvector for future NL search (Phase 2)
CREATE EXTENSION IF NOT EXISTS vector;

-- profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  business_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','business','custom')),
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_connect_id TEXT,
  stripe_connect_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  storage_used BIGINT NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  preset TEXT NOT NULL CHECK (preset IN ('real_estate','wedding','travel','general')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('booked','draft','published','completed','archived')),
  metadata JSONB NOT NULL DEFAULT '{"core":{},"template":{},"custom":{}}',
  cover_image_id UUID,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light','minimal','editorial')),
  gallery_public BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- media
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image','video')),
  category TEXT,
  orientation TEXT CHECK (orientation IN ('landscape','portrait','square')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  starred BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  width INTEGER,
  height INTEGER,
  predictions JSONB,
  exif JSONB,
  upload_status TEXT NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending','uploading','complete','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK for cover_image after media exists
ALTER TABLE projects ADD CONSTRAINT fk_cover_image FOREIGN KEY (cover_image_id) REFERENCES media(id) ON DELETE SET NULL;

-- project_clients
CREATE TABLE project_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_profile_id UUID,
  client_email TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'preview' CHECK (access_level IN ('preview','proofing','delivered')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- project_pricing (Phase 1: flat-fee downloads only)
CREATE TABLE project_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  pricing_mode TEXT NOT NULL DEFAULT 'individual' CHECK (pricing_mode IN ('bundled','individual')),
  booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  booking_type TEXT CHECK (booking_type IN ('full','deposit','download_only','free')),
  booking_price INTEGER,
  booking_deposit_percent INTEGER,
  download_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  download_mode TEXT CHECK (download_mode IN ('flat','per_file')),
  download_flat_price INTEGER,
  download_per_file_price INTEGER,
  edit_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  edit_flat_fee INTEGER,
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- file_purchases (Phase 1: flat-fee only)
CREATE TABLE file_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_profile_id UUID,
  media_ids UUID[],
  total_price INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- stripe_events (idempotency)
CREATE TABLE stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_media_project ON media(project_id);
CREATE INDEX idx_media_category ON media(project_id, category);
CREATE INDEX idx_project_clients_project ON project_clients(project_id);
CREATE INDEX idx_project_clients_email ON project_clients(client_email);
CREATE INDEX idx_notifications_photographer ON notifications(photographer_id, read, created_at DESC);
CREATE INDEX idx_stripe_events_event_id ON stripe_events(stripe_event_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON media FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON project_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Migration 002 — RLS Policies:**

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: own profile only
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Projects: owner sees own, clients see invited
CREATE POLICY projects_owner ON projects FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY projects_client_view ON projects FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_clients pc
    WHERE pc.project_id = id
    AND pc.client_email = auth.jwt()->>'email'
    AND pc.revoked_at IS NULL
  )
);

-- Media: via project access
CREATE POLICY media_owner ON media FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);
CREATE POLICY media_client_view ON media FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_clients pc
    WHERE pc.project_id = media.project_id
    AND pc.client_email = auth.jwt()->>'email'
    AND pc.revoked_at IS NULL
  )
);

-- Project clients: owner manages
CREATE POLICY pc_owner ON project_clients FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

-- Notifications: own only
CREATE POLICY notif_own ON notifications FOR ALL USING (auth.uid() = photographer_id);
```

---

### 1.3 Design System (Tailwind)

**Dependencies:** 1.1
**Files:** `tailwind.config.ts`, `src/app/globals.css`

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0C0C0E",
        surface: { DEFAULT: "#161619", 2: "#1E1E22", 3: "#26262B" },
        border: { DEFAULT: "#2A2A30", hover: "#3A3A42" },
        text: { DEFAULT: "#E8E6E3", dim: "#8A8A95", muted: "#5A5A65" },
        accent: { DEFAULT: "#4ADE80", dim: "#22C55E", glow: "rgba(74,222,128,0.12)" },
        warning: "#FB923C",
        danger: "#F87171",
        blue: "#60A5FA",
        purple: "#A78BFA",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: { DEFAULT: "8px", lg: "12px" },
    },
  },
  plugins: [],
} satisfies Config;
```

---

### 1.4 Auth Flow

**Dependencies:** 1.1, 1.2
**Files:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/middleware.ts`

**`src/lib/supabase/client.ts`:**
```typescript
import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

**`src/lib/supabase/server.ts`:**
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
};
```

**`src/middleware.ts`** — refreshes session on every request:
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from app routes
  if (!user && request.nextUrl.pathname.startsWith("/(app)")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Redirect authenticated users away from auth routes
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};
```

**Auth pages**: Standard email/password form + Google/Apple OAuth buttons. On signup success → redirect to `/onboarding`.

---

### 1.5 Onboarding Wizard

**Dependencies:** 1.4
**Files:** `src/app/(auth)/onboarding/page.tsx`, `src/components/onboarding/WizardSteps.tsx`

4-step wizard as a client component with stepper UI:
1. Business name + avatar upload → updates `profiles`
2. Preset selection (real_estate | wedding | travel | general) → stores in local state
3. Stripe Connect prompt (skip or start OAuth flow) → redirects to Stripe, returns to step 4
4. Create first project (name + preset from step 2) → creates project row, redirects to workspace

On completion: `UPDATE profiles SET onboarding_completed = true`.

**AI onboarding (optional, Phase 1 stretch):** Add a URL input in step 1. On submit, call a server action that runs Firecrawl + Claude Haiku to extract business name, niche, theme suggestion. Pre-fill steps 1-2.

```typescript
// src/app/api/onboarding/scrape/route.ts (server action)
// POST { url: "https://photographer-website.com" }
// → Firecrawl scrape → Claude Haiku extraction → return { businessName, niche, theme }
```

---

### 1.6 Project CRUD

**Dependencies:** 1.2, 1.4
**Files:** `src/app/(app)/dashboard/page.tsx`, `src/stores/project.ts`, `src/types/project.ts`

**Zustand store:**
```typescript
// src/stores/project.ts
import { create } from "zustand";
import type { Project } from "@/types/project";

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  currentProject: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
}));
```

**Dashboard:** Server component fetches projects via RSC. Displays project cards with name, preset badge, status, photo count, last updated. "New Project" button opens modal with name + preset selector.

**Tier enforcement:** Before creating, check `SELECT COUNT(*) FROM projects WHERE owner_id = $1 AND status != 'archived'`. If >= 3 and plan = 'free', show upgrade prompt.

---

### 1.7 AI Classification Pipeline

**Dependencies:** 1.1
**Files:** `src/lib/ai/classifier.worker.ts`, `src/lib/ai/classifier.ts`, `src/lib/ai/presets.ts`, `src/lib/ai/quality.ts`

This replaces MobileNet with SigLIP + adds blur detection + duplicate detection + NIMA scoring.

**`src/lib/ai/presets.ts`** — Text prompts per preset (replaces keyword maps):
```typescript
export const PRESET_PROMPTS: Record<string, Record<string, string>> = {
  real_estate: {
    exterior: "exterior photograph of a house or building facade",
    interior: "interior room of a house with furniture",
    kitchen: "kitchen with cabinets countertops and appliances",
    bathroom: "bathroom with sink toilet or shower",
    "drone/aerial": "aerial or drone photograph looking down at property",
    "pool/outdoor": "swimming pool hot tub or outdoor living patio area",
    landscape: "landscape scenic view or garden",
    twilight: "twilight or dusk photograph of a building with lights on",
    video: "video footage or film still",
  },
  wedding: {
    ceremony: "wedding ceremony at altar or aisle",
    reception: "wedding reception dinner or party with tables and decorations",
    portraits: "portrait photograph of bride groom or couple",
    getting_ready: "bride or groom getting ready putting on dress or suit",
    details: "close up of wedding rings flowers invitation or shoes",
    dance: "first dance or dancing at wedding reception",
    family: "group photograph of family or wedding party",
    venue: "wide shot of wedding venue building or outdoor setting",
    video: "video footage or film still",
  },
  travel: {
    landmarks: "famous landmark monument or tourist attraction",
    street: "street scene with people buildings or urban life",
    food: "food dish meal or restaurant dining",
    accommodation: "hotel room resort or vacation rental interior",
    nature: "natural landscape mountain beach ocean or forest",
    people: "portrait or candid photo of a person traveling",
    transport: "airplane train boat car or transportation",
    nightlife: "nighttime scene bar club or city lights",
    video: "video footage or film still",
  },
  general: {
    people: "photograph of one or more people",
    places: "photograph of a place building or location",
    objects: "close up photograph of an object or product",
    nature: "nature wildlife plants or outdoor scenery",
    architecture: "architectural photograph of a building structure",
    action: "action shot of movement or sports",
    detail: "detail or macro close up photograph",
    video: "video footage or film still",
  },
};

// Every preset always has "other" as a fallback
export const OTHER_PROMPT = "miscellaneous photograph that does not fit other categories";
```

**`src/lib/ai/classifier.worker.ts`** — Web Worker:
```typescript
import { pipeline, env } from "@xenova/transformers";

// Disable local model checks — always use CDN / IndexedDB cache
env.allowLocalModels = false;

let classifier: any = null;

async function loadModel(onProgress: (p: number) => void) {
  classifier = await pipeline(
    "zero-shot-image-classification",
    "Xenova/siglip-base-patch16-224",
    {
      quantized: true,         // INT8 — ~150 MB
      progress_callback: (p: any) => {
        if (p.status === "progress") onProgress(p.progress);
      },
    }
  );
}

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === "load") {
    await loadModel((progress) => self.postMessage({ type: "load_progress", progress }));
    self.postMessage({ type: "loaded" });
    return;
  }

  if (type === "classify") {
    const { imageData, prompts, mediaId } = payload;
    const results = await classifier(imageData, Object.values(prompts));
    // results: [{ label, score }] sorted by score descending
    const topResult = results[0];
    const categoryKey = Object.keys(prompts).find(
      (k) => prompts[k] === topResult.label
    ) ?? "other";

    self.postMessage({
      type: "classified",
      result: {
        mediaId,
        category: categoryKey,
        confidence: topResult.score,
        allScores: results.map((r: any) => ({ label: r.label, score: r.score })),
      },
    });
  }
};
```

**`src/lib/ai/quality.ts`** — Blur + duplicate detection (runs in same or separate worker):
```typescript
// Blur detection via Laplacian variance
export function computeBlurScore(imageData: ImageData): number {
  const gray = toGrayscale(imageData);
  const laplacian = applyLaplacian(gray, imageData.width, imageData.height);
  return variance(laplacian);
}

// Perceptual hash for duplicate detection
export function computePHash(imageData: ImageData): string {
  // Resize to 32x32, convert to grayscale, DCT, take top-left 8x8
  // Return 64-bit hash as hex string
  const resized = resizeTo32x32(imageData);
  const gray = toGrayscale(resized);
  const dct = applyDCT(gray);
  const median = computeMedian(dct.slice(0, 64));
  return dct.slice(0, 64).map((v) => (v > median ? "1" : "0")).join("");
}

// Compare two pHashes — hamming distance
export function hashDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) dist++;
  return dist;
}
// Distance < 10 = likely duplicate
```

**Pipeline orchestration** (`src/lib/ai/classifier.ts`):
```typescript
// Main thread coordinator
// 1. On upload complete: send image to worker for SigLIP classification
// 2. In parallel: compute blur score + pHash on main thread (canvas)
// 3. Collect results → update media row in Supabase
// 4. Flag blurry (score < threshold) and duplicate (hamming < 10) in predictions JSONB

// predictions JSONB shape:
// {
//   "siglip": { "category": "exterior", "confidence": 0.87, "scores": [...] },
//   "blur_score": 142.5,
//   "is_blurry": false,
//   "phash": "a1b2c3d4...",
//   "duplicate_of": null | "media-id-xxx"
// }
```

---

## Week 2: Workspace & Upload

### 2.1 Upload Pipeline

**Dependencies:** 1.2, 1.6
**Files:** `src/lib/upload/queue.ts`, `src/lib/upload/resumable.ts`, `src/lib/upload/indexeddb.ts`, `src/stores/upload.ts`, `src/components/workspace/UploadZone.tsx`, `src/components/workspace/UploadProgress.tsx`

**`src/lib/upload/indexeddb.ts`:**
```typescript
import { get, set, del, entries } from "idb-keyval";

export interface UploadRecord {
  fileHash: string;
  fileName: string;
  projectId: string;
  bytesUploaded: number;
  totalBytes: number;
  tusUploadUrl: string | null;
  status: "pending" | "uploading" | "complete" | "failed";
}

export const getUploadRecord = (hash: string) => get<UploadRecord>(hash);
export const setUploadRecord = (hash: string, record: UploadRecord) => set(hash, record);
export const deleteUploadRecord = (hash: string) => del(hash);
export const getAllUploads = () => entries<string, UploadRecord>();
```

**`src/lib/upload/resumable.ts`:**
```typescript
import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";

export function uploadFile(
  file: File,
  projectId: string,
  onProgress: (bytes: number) => void,
  onComplete: (storagePath: string) => void,
  onError: (err: Error) => void,
  resumeUrl?: string
) {
  const supabase = createClient();
  const storagePath = `${projectId}/${crypto.randomUUID()}_${file.name}`;

  // Get Supabase Storage upload URL for tus
  const upload = new tus.Upload(file, {
    endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
    retryDelays: [0, 3000, 5000, 10000],
    headers: {
      authorization: `Bearer ${supabase.auth.session()?.access_token}`,
      "x-upsert": "true",
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: {
      bucketName: "media",
      objectName: storagePath,
      contentType: file.type,
    },
    chunkSize: 6 * 1024 * 1024, // 6 MB chunks
    onProgress: (bytesUploaded) => onProgress(bytesUploaded),
    onSuccess: () => onComplete(storagePath),
    onError: (err) => onError(err),
  });

  if (resumeUrl) {
    upload.url = resumeUrl;
    upload.start();
  } else {
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    });
  }

  return upload;
}
```

**File identity hash** (fast — first 1 MB + size + name):
```typescript
export async function computeFileHash(file: File): Promise<string> {
  const chunk = file.slice(0, 1024 * 1024); // first 1 MB
  const buffer = await chunk.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hashHex}_${file.size}_${file.name}`;
}
```

**Queue manager** (`src/lib/upload/queue.ts`): processes 1-3 concurrent uploads. On each complete → create media row → trigger AI classification worker.

**Storage enforcement:** Before queuing, check `profiles.storage_used + file.size <= tier_limit`. If over, reject with upgrade prompt.

---

### 2.2 Workspace UI

**Dependencies:** 1.3, 1.6
**Files:** `src/app/(app)/project/[id]/page.tsx`, `src/app/(app)/layout.tsx`, `src/components/workspace/Sidebar.tsx`, `src/components/workspace/Toolbar.tsx`, `src/components/workspace/CategorySection.tsx`, `src/stores/media.ts`

**`src/stores/media.ts`:**
```typescript
import { create } from "zustand";

interface MediaStore {
  files: MediaFile[];
  selectedIds: Set<string>;
  orientationFilter: "all" | "landscape" | "portrait";
  viewMode: "grid" | "list";

  setFiles: (files: MediaFile[]) => void;
  toggleSelect: (id: string) => void;
  rangeSelect: (id: string) => void;
  clearSelection: () => void;
  setOrientationFilter: (filter: "all" | "landscape" | "portrait") => void;
  setViewMode: (mode: "grid" | "list") => void;
}
```

**Layout** (`src/app/(app)/layout.tsx`): App shell with sidebar (project list + upload progress) + header (logo, project name, publish/export buttons, bell icon).

**Workspace page**: Server component fetches project + media. Client components for interactivity. Media grouped by category with collapsible sections.

---

### 2.3 Media Cards

**Dependencies:** 2.2
**Files:** `src/components/workspace/MediaCard.tsx`, `src/components/workspace/NoteEditor.tsx`

Port from prototype: thumbnail, filename overlay, type badge, selection checkbox, star button, note button, rename button. Add drag-and-drop via HTML5 drag API (port `onDragStart`/`onDrop` from prototype).

---

### 2.4 Batch Operations

**Dependencies:** 2.2
**Files:** `src/components/workspace/MoveBar.tsx`, `src/components/workspace/BatchRenameModal.tsx`

MoveBar appears when `selectedIds.size > 0`. Options: move to category, batch rename, star, delete.

**Batch rename** — `src/lib/utils/rename.ts`:
```typescript
export function expandPattern(
  pattern: string,
  media: MediaFile,
  index: number,
  project: Project
): string {
  const catLabel = media.category ?? "other";
  const dateStr = media.exif?.timestamp
    ? new Date(media.exif.timestamp).toISOString().slice(0, 10)
    : "no-date";
  const original = media.original_name.replace(/\.[^.]+$/, "");
  const mls = project.metadata?.template?.mls_number ?? "no-mls";
  const agent = project.metadata?.template?.agent_name?.replace(/\s+/g, "-") ?? "no-agent";

  return pattern
    .replace(/\{property\}/g, project.name.replace(/[/\\:*?"<>|]/g, "_"))
    .replace(/\{category\}/g, catLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase())
    .replace(/\{n\}/g, String(index))
    .replace(/\{nn\}/g, String(index).padStart(2, "0"))
    .replace(/\{nnn\}/g, String(index).padStart(3, "0"))
    .replace(/\{date\}/g, dateStr)
    .replace(/\{mls\}/g, mls)
    .replace(/\{agent\}/g, agent)
    .replace(/\{original\}/g, original);
}
```

---

### 2.5 Orientation Filter + View Modes

**Dependencies:** 2.2
**Files:** integrated into Toolbar.tsx

Orientation filter: toggles `orientationFilter` in media store. Grid/list toggle sets `viewMode`. Grid mode uses CSS grid with configurable column width. List mode shows a table with columns: thumbnail, name, category, orientation, size, date.

---

### 2.6 Cloudflare Images

**Dependencies:** 2.1
**Files:** `src/lib/media/cloudflare.ts`

```typescript
const CF_ACCOUNT = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT!;

export function thumbnailUrl(storagePath: string, width = 400): string {
  return `https://imagedelivery.net/${CF_ACCOUNT}/${storagePath}/w=${width}`;
}

export function watermarkedUrl(storagePath: string): string {
  return `https://imagedelivery.net/${CF_ACCOUNT}/${storagePath}/watermark=proof`;
}

export function fullResUrl(storagePath: string): string {
  return `https://imagedelivery.net/${CF_ACCOUNT}/${storagePath}/public`;
}
```

The exact URL pattern depends on Cloudflare Images configuration. Watermark overlay is configured in Cloudflare dashboard as a named variant.

---

### 2.7 Storage Enforcement

**Dependencies:** 2.1
**Files:** integrated into upload queue

On each upload complete:
```sql
UPDATE profiles SET storage_used = storage_used + $fileSize WHERE id = $userId;
```

Before upload start, check tier limit:
```typescript
const TIER_LIMITS: Record<string, number> = {
  free: 5 * 1024 ** 3,      // 5 GB
  pro: 100 * 1024 ** 3,     // 100 GB
  business: 500 * 1024 ** 3, // 500 GB
  custom: Infinity,
};
```

---

## Week 3: Billing, Gallery & Email

### 3.1 Stripe Billing (Subscriptions)

**Dependencies:** 1.2
**Files:** `src/lib/stripe/client.ts`, `src/lib/stripe/checkout.ts`, `src/app/(app)/settings/billing/page.tsx`

**`src/lib/stripe/client.ts`:**
```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});
```

**Stripe Product/Price setup** (run once via script or Stripe dashboard):
- Product: "PhotoSorter Pro" → Price: $39/mo, Price: $395/yr (≈$32.92/mo)
- Product: "PhotoSorter Business" → Prices TBD
- Trial: `trial_period_days: 14` on the Pro price

**Checkout flow:**
```typescript
// src/lib/stripe/checkout.ts
export async function createSubscriptionCheckout(
  customerId: string,
  priceId: string,
  userId: string
) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    metadata: { userId },
  });
}
```

**Billing page:** Shows current plan, usage (storage), manage subscription button (→ Stripe Customer Portal), upgrade/downgrade options.

---

### 3.2 Stripe Connect

**Dependencies:** 3.1
**Files:** `src/lib/stripe/connect.ts`, `src/app/(app)/settings/connect/page.tsx`

```typescript
// src/lib/stripe/connect.ts
export async function createConnectAccountLink(accountId: string) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/connect`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/connect?onboarded=true`,
    type: "account_onboarding",
  });
}

export async function createConnectAccount(email: string) {
  return stripe.accounts.create({
    type: "standard",
    email,
  });
}

export async function checkChargesEnabled(accountId: string): Promise<boolean> {
  const account = await stripe.accounts.retrieve(accountId);
  return account.charges_enabled ?? false;
}
```

**Connect page:** If not connected → "Connect Stripe" button → creates account + redirects to Stripe onboarding. If connected but incomplete → "Complete setup" with fresh link. If complete → shows status, connected account email, link to Stripe dashboard.

---

### 3.3 Webhook Handler

**Dependencies:** 1.2
**Files:** `src/app/api/webhooks/stripe/route.ts`, `src/lib/stripe/webhooks.ts`

```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe/client";
import { handleStripeEvent } from "@/lib/stripe/webhooks";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = (await headers()).get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Idempotency check
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("stripe_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .single();

  if (existing) return new Response("Already processed", { status: 200 });

  // Log event
  await supabase.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data,
  });

  // Process
  await handleStripeEvent(event);

  return new Response("OK", { status: 200 });
}
```

**`src/lib/stripe/webhooks.ts`** — handler switch:
```typescript
export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutComplete(event.data.object);
    case "invoice.paid":
      return handleInvoicePaid(event.data.object);
    case "invoice.payment_failed":
      return handlePaymentFailed(event.data.object);
    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(event.data.object);
    case "account.updated":
      return handleAccountUpdated(event.data.object);
    case "payment_intent.succeeded":
      return handlePaymentIntentSucceeded(event.data.object);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Downgrade to free
  const supabase = createServiceClient(); // uses SUPABASE_SERVICE_ROLE_KEY
  await supabase
    .from("profiles")
    .update({ plan: "free", stripe_subscription_id: null })
    .eq("stripe_customer_id", invoice.customer);
  // Create notification
  // Send email
}
```

---

### 3.4 Gallery Page

**Dependencies:** 1.2, 2.6
**Files:** `src/app/gallery/[id]/page.tsx`, `src/components/gallery/GalleryGrid.tsx`, `src/components/gallery/Lightbox.tsx`, `src/components/gallery/Paywall.tsx`

Server component: fetch project, check `gallery_public`, if private → require auth. Call `resolve_gallery_access` RPC. Pass access info to client components.

Gallery themes applied via CSS class on the root gallery element:
```typescript
const THEME_CLASSES: Record<string, string> = {
  dark: "bg-[#0C0C0E] text-white",
  light: "bg-white text-gray-900",
  minimal: "bg-gray-50 text-gray-800",
  editorial: "bg-stone-900 text-stone-100",
};
```

---

### 3.5 Access Resolver (Postgres RPC)

**Dependencies:** 1.2
**Files:** `supabase/migrations/003_access_resolver.sql`

```sql
CREATE OR REPLACE FUNCTION resolve_gallery_access(
  p_project_id UUID,
  p_user_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_client project_clients%ROWTYPE;
  v_pricing project_pricing%ROWTYPE;
  v_purchased BOOLEAN := FALSE;
  v_amount_owed INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Find client record
  SELECT * INTO v_client
  FROM project_clients
  WHERE project_id = p_project_id
    AND client_email = p_user_email
    AND revoked_at IS NULL
  LIMIT 1;

  IF v_client IS NULL THEN
    RETURN jsonb_build_object(
      'canView', FALSE, 'canDownload', FALSE,
      'canRequestEdits', FALSE, 'amountOwed', 0,
      'accessLevel', NULL
    );
  END IF;

  -- Check pricing
  SELECT * INTO v_pricing FROM project_pricing WHERE project_id = p_project_id;

  -- Check if already purchased (flat-fee)
  IF v_pricing IS NOT NULL AND v_pricing.download_enabled THEN
    SELECT EXISTS(
      SELECT 1 FROM file_purchases
      WHERE project_id = p_project_id
        AND paid_at IS NOT NULL
      -- In Phase 1, client_profile_id may be null; match by email via project_clients
    ) INTO v_purchased;

    IF NOT v_purchased AND v_pricing.download_flat_price IS NOT NULL THEN
      v_amount_owed := v_pricing.download_flat_price;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'canView', TRUE,
    'canDownload', (v_client.access_level = 'delivered' AND (NOT v_pricing.download_enabled OR v_purchased)),
    'canRequestEdits', (v_client.access_level IN ('proofing', 'delivered')),
    'amountOwed', v_amount_owed,
    'accessLevel', v_client.access_level
  );

  RETURN v_result;
END;
$$;
```

---

### 3.6 Gallery Paywall + Flat-Fee Checkout

**Dependencies:** 3.2, 3.4, 3.5
**Files:** `src/components/gallery/Paywall.tsx`, `src/app/api/checkout/download/route.ts`

If `amountOwed > 0`, show paywall overlay with price and "Pay to Download" button. Button calls server route that creates a Stripe Checkout session on the photographer's connected account with `application_fee_amount`.

```typescript
// src/app/api/checkout/download/route.ts
export async function POST(request: Request) {
  const { projectId, photographerConnectId, amount, currency, plan } = await request.json();

  const appFeePercent = plan === "business" ? 0.05 : 0.07;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [{
        price_data: {
          currency,
          product_data: { name: "Gallery Download Access" },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: Math.round(amount * appFeePercent),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gallery/${projectId}?paid=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/gallery/${projectId}`,
      metadata: { projectId, type: "download_flat" },
    },
    { stripeAccount: photographerConnectId }
  );

  return Response.json({ url: session.url });
}
```

---

### 3.7 Email System

**Dependencies:** 1.1
**Files:** `src/lib/email/send.ts`, `src/lib/email/templates/*.tsx`

```typescript
// src/lib/email/send.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  subject: string,
  react: React.ReactElement
) {
  return resend.emails.send({
    from: "PhotoSorter <noreply@photosorter.com>",
    to,
    subject,
    react,
  });
}
```

**Template example — `GalleryInvitation.tsx`:**
```tsx
import { Button, Heading, Text } from "@react-email/components";

export function GalleryInvitation({
  photographerName,
  projectName,
  galleryUrl,
}: {
  photographerName: string;
  projectName: string;
  galleryUrl: string;
}) {
  return (
    <>
      <Heading>{photographerName} shared a gallery with you</Heading>
      <Text>Your photos from "{projectName}" are ready to view.</Text>
      <Button href={galleryUrl}>View Gallery</Button>
    </>
  );
}
```

---

### 3.8 Client Invitations

**Dependencies:** 3.4, 3.7
**Files:** integrated into project settings page

In project settings, photographer enters client email + access level. On submit:
1. Insert `project_clients` row
2. Send `GalleryInvitation` email with magic link URL: `/gallery/[projectId]?invite=[token]`
3. Token is a signed JWT containing `{ projectId, email, accessLevel }`
4. On gallery load, if token present → verify → prompt OAuth → auto-link `project_clients` record

---

## Week 4: Polish & Launch

### 4.1 Notifications

**Dependencies:** 1.2
**Files:** `src/components/notifications/BellDropdown.tsx`, `src/components/notifications/ActivityFeed.tsx`

Bell dropdown: fetches `SELECT * FROM notifications WHERE photographer_id = $1 ORDER BY created_at DESC LIMIT 20`. Shows unread count badge. Clicking marks as read.

Activity feed on dashboard: same query but with pagination and richer display.

Notifications are created server-side by webhook handlers and server actions (e.g., after sending invitation, after publishing).

---

### 4.2 Landing Page

**Dependencies:** 1.3
**Files:** `src/app/page.tsx`

Sections: Hero (headline + CTA + screenshot), Features (3-4 cards: AI sorting, client gallery, get paid, themes), Pricing table (4 tiers — reuse data from SPEC §12), Testimonials placeholder, Footer.

---

### 4.3 ZIP Export

**Dependencies:** 2.1
**Files:** `src/lib/utils/zip.ts`

```typescript
import JSZip from "jszip";
import { saveAs } from "file-saver";

export async function exportProjectZip(
  projectName: string,
  mediaByCategory: Record<string, { name: string; url: string }[]>,
  onProgress: (pct: number) => void
) {
  const zip = new JSZip();
  const folder = zip.folder(projectName.replace(/[/\\:*?"<>|]/g, "_"))!;

  for (const [category, files] of Object.entries(mediaByCategory)) {
    const catFolder = folder.folder(category)!;
    for (const file of files) {
      const response = await fetch(file.url);
      const blob = await response.blob();
      catFolder.file(file.name, blob);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" }, (meta) =>
    onProgress(meta.percent)
  );
  saveAs(blob, `${projectName}-sorted.zip`);
}
```

---

### 4.4 Publish Flow

**Dependencies:** 3.4, 3.7
**Files:** `src/app/(app)/project/[id]/publish/page.tsx`

Steps:
1. Validate: project has media, at least one client invited
2. Confirm gallery settings (theme, public/private, pricing)
3. Update `projects.status = 'published'`, set `published_at`
4. Send "Project Published" email to all invited clients
5. Create notification for photographer
6. Redirect to published gallery URL

---

### 4.5 PWA

**Dependencies:** 1.1
**Files:** `public/manifest.json`, `next.config.ts`

```json
// public/manifest.json
{
  "name": "PhotoSorter",
  "short_name": "PhotoSorter",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0C0C0E",
  "theme_color": "#4ADE80",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Use `next-pwa` or `@serwist/next` for service worker generation. Cache gallery pages for offline viewing.

---

### 4.6 Upload Resume

**Dependencies:** 2.1
**Files:** integrated into upload queue

On workspace page load:
```typescript
const pendingUploads = await getAllUploads();
const incomplete = pendingUploads.filter(([, r]) => r.status !== "complete");
if (incomplete.length > 0) {
  // Show toast: "You have X unfinished uploads. Resume?"
  // On confirm: re-queue with tusUploadUrl for resume
}
```

---

### 4.7 Keyboard Shortcuts

**Dependencies:** 2.2
**Files:** `src/hooks/useKeyboardShortcuts.ts`

```typescript
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { selectedIds, files } = useMediaStore.getState();
      switch (e.key) {
        case "ArrowRight": case "ArrowLeft": case "ArrowUp": case "ArrowDown":
          // Navigate between media cards
          break;
        case " ":
          e.preventDefault(); // Toggle select on focused card
          break;
        case "s":
          // Toggle star on selected
          break;
        case "Delete": case "Backspace":
          // Remove selected
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
```

---

### 4.8 Testing & Deploy

**Dependencies:** ALL
**Files:** test files throughout

**Critical test paths:**
1. Signup → onboarding → create project → upload 5 files → verify AI classification
2. Set flat-fee pricing → invite client → client opens gallery → pays → downloads
3. Subscribe to Pro → verify tier features unlock → let trial expire → verify downgrade
4. Stripe Connect onboarding → verify `charges_enabled` check → client payment → verify app fee
5. Webhook: send test events → verify idempotency → verify state updates
6. Upload resume: start upload → close tab → reopen → verify resume prompt
7. Gallery: public mode → verify guest preview → private mode → verify OAuth gate

**Deploy:**
```bash
# Vercel
vercel --prod

# Supabase
supabase db push          # Apply migrations
supabase functions deploy  # Deploy edge functions (if any)
```

---

## Phase 2 Tasks (Weeks 5-8)

### 5.1 Client Profiles
**Dependencies:** Phase 1 complete
**Tables:** `client_profiles` (already in schema, add migration for Phase 2 fields)
**Files:** `src/app/(app)/clients/page.tsx`, `src/app/(app)/clients/[id]/page.tsx`

Client list inside photographer dashboard. Each profile shows: name, email, projects, total paid, saved payment method status. Stripe Customer created on photographer's connected account via `stripe.customers.create({}, { stripeAccount: connectId })`.

### 5.2 Public Booking Page
**Dependencies:** 5.1
**Tables:** `bookings`, `booking_form_fields`
**Files:** `src/app/book/[photographerId]/page.tsx`, `src/components/booking/BookingForm.tsx`, `src/components/booking/DynamicFormFields.tsx`

Public page (no auth required). Loads photographer's booking form fields for their default preset. Client fills form + pays. On success: create `bookings` row + auto-create draft `projects` row + create `project_clients` row.

### 5.3 Booking Payment Modes
**Dependencies:** 5.2
4 modes: full, deposit %, download-only, free. Deposit mode creates PaymentIntent for deposit amount. Balance auto-charged on project publish via saved payment method.

### 5.4 Per-File Cart + Checkout
**Dependencies:** Phase 1 gallery
**Files:** `src/app/gallery/[id]/cart/page.tsx`, `src/components/gallery/FileCart.tsx`

Client clicks photos to add to cart (stored in React state). Cart shows selected photos + running total. Checkout creates single Stripe Checkout session with `line_items` for the total. On success: create `file_purchases` row with `media_ids` array.

### 5.5 Edit Request Workflow
**Dependencies:** 5.1
**Files:** `src/app/gallery/[id]/edit-request/page.tsx`, `src/app/(app)/project/[id]/edits/page.tsx`, `src/components/gallery/EditRequestForm.tsx`

Client selects photos → writes notes → submits. Photographer sees in `/project/[id]/edits` with status badges. Photographer reviews, sets price (or flat fee auto-fills), status changes. Client gets email to pay. On payment: status → `in_progress`. Photographer uploads edited files, marks delivered. Edited files appear in gallery "Edits" category.

### 5.6 Deposit Auto-Charge on Delivery
**Dependencies:** 5.3
On project publish, for any bookings with `booking_type = 'deposit'` and `balance_paid = false`:
1. Retrieve saved payment method from client's Stripe Customer on connected account
2. Create PaymentIntent for `balance_amount` with `off_session: true`
3. If succeeds: `balance_paid = true`
4. If fails: send PaymentFailed email to client, create notification for photographer, gallery access falls to proofing level

### 5.7 Refund Flow
**Dependencies:** Phase 1 complete
**Files:** Refund button in photographer dashboard per payment.
```typescript
const refund = await stripe.refunds.create(
  { payment_intent: paymentIntentId, amount: amountInCents }, // amount optional for partial
  { stripeAccount: connectId }
);
```
Full refund → revoke download access. Partial → retain access.

### 5.8 Booking Confirmation Mode
**Dependencies:** 5.2
Per-photographer setting: auto-confirm (booking confirmed immediately on payment) or manual (booking goes to `pending`, photographer reviews and clicks confirm/decline).

### 5.9 Client Approve & Complete
**Dependencies:** Phase 1 gallery
"Approve & Complete" button in gallery (only shown to `delivered` access level clients). On click: `projects.status = 'completed'`, `projects.completed_at = NOW()`. Notification to photographer.

### 5.10 Currency Display
**Dependencies:** Phase 1 gallery
Fetch exchange rates from a free API (e.g., `api.exchangerate-api.com`). Show approximate local price: `"$150 USD ≈ £120 GBP"`. Cache rates for 24 hours. Display only — actual charge is always in photographer's currency.

---

## Phase 2 Database Migration

```sql
-- migration: 004_phase2_tables.sql

CREATE TABLE client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  photographer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  stripe_customer_id TEXT,
  has_saved_payment_method BOOLEAN NOT NULL DEFAULT FALSE,
  preferences JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, photographer_id)
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  photographer_id UUID NOT NULL REFERENCES profiles(id),
  client_profile_id UUID NOT NULL REFERENCES client_profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  booking_type TEXT NOT NULL CHECK (booking_type IN ('full','deposit','download_only','free')),
  total_price INTEGER NOT NULL DEFAULT 0,
  deposit_amount INTEGER,
  balance_amount INTEGER,
  deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  balance_paid BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_payment_intent_id TEXT,
  balance_payment_intent_id TEXT,
  form_data JSONB NOT NULL DEFAULT '{}',
  preferred_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_profile_id UUID NOT NULL REFERENCES client_profiles(id),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','reviewed','priced','paid','in_progress','delivered')),
  media_ids UUID[] NOT NULL,
  client_notes TEXT NOT NULL,
  photographer_notes TEXT,
  quoted_price INTEGER,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE booking_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preset TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(photographer_id, preset)
);

-- Add FK from project_clients to client_profiles
ALTER TABLE project_clients
  ADD CONSTRAINT fk_client_profile
  FOREIGN KEY (client_profile_id)
  REFERENCES client_profiles(id);

-- Add FK from file_purchases to client_profiles
ALTER TABLE file_purchases
  ADD CONSTRAINT fk_purchase_client_profile
  FOREIGN KEY (client_profile_id)
  REFERENCES client_profiles(id);

-- RLS for Phase 2 tables
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY cp_photographer ON client_profiles FOR ALL USING (photographer_id = auth.uid());
CREATE POLICY bookings_photographer ON bookings FOR ALL USING (photographer_id = auth.uid());
CREATE POLICY er_photographer ON edit_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);
CREATE POLICY bff_photographer ON booking_form_fields FOR ALL USING (photographer_id = auth.uid());
```

---

## AI Features Roadmap (Integrated Into Phases)

| Feature | Phase | Technology | Effort | Files |
|---------|-------|-----------|--------|-------|
| SigLIP zero-shot classification | 1 (Week 1) | Transformers.js | High | `lib/ai/*` |
| Blur detection | 1 (Week 1) | Canvas Laplacian | Low | `lib/ai/quality.ts` |
| Duplicate detection (pHash) | 1 (Week 1) | Canvas + DCT | Medium | `lib/ai/quality.ts` |
| NIMA aesthetic scoring | 1 (Week 2) | ONNX Runtime | Medium | `lib/ai/nima.worker.ts` |
| Auto-star hero shots | 1 (Week 2) | NIMA scores | Low | integrated into classify pipeline |
| AI onboarding (website scrape) | 1 (Week 1) | Firecrawl + Claude Haiku | Medium | `app/api/onboarding/scrape/` |
| Gallery descriptions on publish | 1 (Week 4) | Claude Haiku | Low | `lib/ai/descriptions.ts` |
| Face grouping (wedding) | 2 | face-api.js | High | `lib/ai/faces.worker.ts` |
| NL photo search (pgvector) | 2 | CLIP embeddings + pgvector | High | `lib/ai/embeddings.ts` |
| Rich photo descriptions | 2 | Claude Haiku Batch | Medium | `lib/ai/enrich.ts` |
| Booking form suggestions | 2 | Claude Haiku | Low | integrated into booking-forms |
