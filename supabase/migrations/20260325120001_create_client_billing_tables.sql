-- ============================================================================
-- Migration: Client access, billing, and payment tables
-- View1 Studio — Phase 1 & 2
-- ============================================================================

-- ── Custom types ────────────────────────────────────────────────────────────

CREATE TYPE access_level AS ENUM ('preview', 'proofing', 'delivered');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE booking_type AS ENUM ('full', 'deposit', 'download_only', 'free');
CREATE TYPE pricing_mode AS ENUM ('bundled', 'individual');
CREATE TYPE download_mode AS ENUM ('flat', 'per_file');
CREATE TYPE edit_request_status AS ENUM ('requested', 'reviewed', 'priced', 'paid', 'in_progress', 'delivered');

-- ── client_profiles ─────────────────────────────────────────────────────────

CREATE TABLE client_profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photographer_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name      text NOT NULL DEFAULT '',
  email             text NOT NULL,
  phone             text,
  stripe_customer_id text,  -- on photographer's Stripe Connect account
  has_saved_payment_method boolean NOT NULL DEFAULT false,
  preferences       jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, photographer_id)
);

CREATE INDEX idx_client_profiles_photographer ON client_profiles(photographer_id);
CREATE INDEX idx_client_profiles_user ON client_profiles(user_id);

COMMENT ON TABLE client_profiles IS 'Per-photographer client profiles (one person with N photographers = N records)';

-- ── project_clients ─────────────────────────────────────────────────────────

CREATE TABLE project_clients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_profile_id uuid REFERENCES client_profiles(id) ON DELETE SET NULL,
  client_email      text NOT NULL,
  access_level      access_level NOT NULL DEFAULT 'preview',
  invited_at        timestamptz NOT NULL DEFAULT now(),
  accepted_at       timestamptz,
  revoked_at        timestamptz
);

CREATE INDEX idx_project_clients_project ON project_clients(project_id);
CREATE INDEX idx_project_clients_email ON project_clients(client_email);

COMMENT ON TABLE project_clients IS 'Project-level client access and invitations';

-- ── project_pricing ─────────────────────────────────────────────────────────

CREATE TABLE project_pricing (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  pricing_mode          pricing_mode NOT NULL DEFAULT 'bundled',
  booking_enabled       boolean NOT NULL DEFAULT false,
  booking_type          booking_type,
  booking_price         integer,  -- cents
  booking_deposit_percent integer,
  download_enabled      boolean NOT NULL DEFAULT false,
  download_mode         download_mode,
  download_flat_price   integer,  -- cents
  download_per_file_price integer, -- cents
  edit_enabled          boolean NOT NULL DEFAULT false,
  edit_flat_fee         integer,  -- cents
  currency              text NOT NULL DEFAULT 'usd',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE project_pricing IS 'Per-project payment configuration';

-- ── bookings ────────────────────────────────────────────────────────────────

CREATE TABLE bookings (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid REFERENCES projects(id) ON DELETE SET NULL,
  photographer_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_profile_id       uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  status                  booking_status NOT NULL DEFAULT 'pending',
  booking_type            booking_type NOT NULL DEFAULT 'full',
  total_price             integer NOT NULL DEFAULT 0,  -- cents
  deposit_amount          integer,
  balance_amount          integer,
  deposit_paid            boolean NOT NULL DEFAULT false,
  balance_paid            boolean NOT NULL DEFAULT false,
  deposit_payment_intent_id text,
  balance_payment_intent_id text,
  form_data               jsonb NOT NULL DEFAULT '{}',
  preferred_date          date,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_photographer ON bookings(photographer_id);
CREATE INDEX idx_bookings_client ON bookings(client_profile_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ── edit_requests ───────────────────────────────────────────────────────────

CREATE TABLE edit_requests (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_profile_id       uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  status                  edit_request_status NOT NULL DEFAULT 'requested',
  media_ids               uuid[] NOT NULL DEFAULT '{}',
  client_notes            text NOT NULL DEFAULT '',
  photographer_notes      text,
  quoted_price            integer,  -- cents
  stripe_payment_intent_id text,
  paid_at                 timestamptz,
  delivered_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_edit_requests_project ON edit_requests(project_id);

-- ── file_purchases ──────────────────────────────────────────────────────────

CREATE TABLE file_purchases (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_profile_id       uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  media_ids               uuid[] NOT NULL DEFAULT '{}',
  total_price             integer NOT NULL DEFAULT 0,  -- cents
  stripe_payment_intent_id text,
  paid_at                 timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_file_purchases_project ON file_purchases(project_id);

-- ── booking_form_fields ─────────────────────────────────────────────────────

CREATE TABLE booking_form_fields (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preset            project_preset,
  fields            jsonb NOT NULL DEFAULT '[]',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_forms_photographer ON booking_form_fields(photographer_id);

-- ── stripe_events ───────────────────────────────────────────────────────────

CREATE TABLE stripe_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type      text NOT NULL,
  processed_at    timestamptz NOT NULL DEFAULT now(),
  payload         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stripe_events_event_id ON stripe_events(stripe_event_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────

CREATE TRIGGER trg_client_profiles_updated_at BEFORE UPDATE ON client_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_project_pricing_updated_at BEFORE UPDATE ON project_pricing
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_edit_requests_updated_at BEFORE UPDATE ON edit_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_booking_form_fields_updated_at BEFORE UPDATE ON booking_form_fields
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
