-- ============================================================================
-- Migration: Core tables — profiles, projects, media
-- View1 Studio — Phase 1
-- ============================================================================

-- ── Custom types ────────────────────────────────────────────────────────────

CREATE TYPE project_status AS ENUM ('booked', 'draft', 'published', 'completed', 'archived');
CREATE TYPE project_preset AS ENUM ('real_estate', 'wedding', 'travel', 'general');
CREATE TYPE project_theme AS ENUM ('dark', 'light', 'minimal', 'editorial');
CREATE TYPE media_type AS ENUM ('image', 'video');
CREATE TYPE media_orientation AS ENUM ('landscape', 'portrait', 'square');
CREATE TYPE upload_status AS ENUM ('pending', 'uploading', 'complete', 'failed');
CREATE TYPE photographer_plan AS ENUM ('free', 'pro', 'business', 'custom');

-- ── profiles ────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   text NOT NULL DEFAULT '',
  avatar_url     text,
  business_name  text,
  plan           photographer_plan NOT NULL DEFAULT 'free',
  trial_ends_at  timestamptz,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  stripe_connect_id       text,
  stripe_connect_onboarded boolean NOT NULL DEFAULT false,
  storage_used   bigint NOT NULL DEFAULT 0,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Photographer profile extending auth.users';

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── projects ────────────────────────────────────────────────────────────────

CREATE TABLE projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            text NOT NULL,
  preset          project_preset NOT NULL DEFAULT 'general',
  status          project_status NOT NULL DEFAULT 'draft',
  metadata        jsonb NOT NULL DEFAULT '{}',
  cover_image_id  uuid,  -- FK added after media table exists
  theme           project_theme NOT NULL DEFAULT 'dark',
  gallery_public  boolean NOT NULL DEFAULT false,
  published_at    timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);

COMMENT ON TABLE projects IS 'Photography project with AI classification and gallery settings';

-- ── media ───────────────────────────────────────────────────────────────────

CREATE TABLE media (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_path   text NOT NULL,
  original_name  text NOT NULL,
  display_name   text NOT NULL,
  mime_type      text NOT NULL,
  file_size      bigint NOT NULL DEFAULT 0,
  type           media_type NOT NULL DEFAULT 'image',
  category       text,  -- preset-specific category string
  orientation    media_orientation,
  sort_order     integer NOT NULL DEFAULT 0,
  starred        boolean NOT NULL DEFAULT false,
  note           text,
  width          integer,
  height         integer,
  predictions    jsonb,  -- MobileNet raw predictions
  exif           jsonb,  -- EXIF/metadata
  upload_status  upload_status NOT NULL DEFAULT 'pending',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_project ON media(project_id);
CREATE INDEX idx_media_category ON media(project_id, category);
CREATE INDEX idx_media_upload_status ON media(upload_status);

COMMENT ON TABLE media IS 'Photos and videos within a project, with AI classification data';

-- Now add the cover_image FK
ALTER TABLE projects
  ADD CONSTRAINT fk_cover_image FOREIGN KEY (cover_image_id)
  REFERENCES media(id) ON DELETE SET NULL;

-- ── notifications ───────────────────────────────────────────────────────────

CREATE TYPE notification_type AS ENUM (
  'booking_new', 'payment_received', 'payment_failed',
  'edit_requested', 'gallery_viewed', 'client_accepted',
  'project_published', 'subscription_changed'
);

CREATE TABLE notifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type             notification_type NOT NULL,
  title            text NOT NULL,
  body             text NOT NULL DEFAULT '',
  metadata         jsonb NOT NULL DEFAULT '{}',
  read             boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_photographer ON notifications(photographer_id, read, created_at DESC);

-- ── updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_media_updated_at BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
