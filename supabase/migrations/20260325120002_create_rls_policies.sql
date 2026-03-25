-- ============================================================================
-- Migration: Row Level Security policies for all tables
-- View1 Studio
-- ============================================================================

-- ── Enable RLS on all tables ────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- ── Helper: check if user is a client on a project ─────────────────────────

CREATE OR REPLACE FUNCTION is_project_client(p_project_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_clients pc
    JOIN client_profiles cp ON cp.id = pc.client_profile_id
    WHERE pc.project_id = p_project_id
      AND cp.user_id = p_user_id
      AND pc.revoked_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── profiles ────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profile is inserted by trigger, not directly
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── projects ────────────────────────────────────────────────────────────────

CREATE POLICY "Owners can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Clients can view invited projects"
  ON projects FOR SELECT
  USING (is_project_client(id, auth.uid()));

CREATE POLICY "Owners can insert projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = owner_id);

-- ── media ───────────────────────────────────────────────────────────────────

CREATE POLICY "Owners can view project media"
  ON media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = media.project_id AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view media on invited projects"
  ON media FOR SELECT
  USING (is_project_client(project_id, auth.uid()));

CREATE POLICY "Owners can insert media"
  ON media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = media.project_id AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update media"
  ON media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = media.project_id AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete media"
  ON media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = media.project_id AND projects.owner_id = auth.uid()
    )
  );

-- ── notifications ───────────────────────────────────────────────────────────

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = photographer_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = photographer_id);

-- Notifications are inserted by server/edge functions only (service role)

-- ── client_profiles ─────────────────────────────────────────────────────────

CREATE POLICY "Photographers can view their clients"
  ON client_profiles FOR SELECT
  USING (auth.uid() = photographer_id);

CREATE POLICY "Clients can view own client profiles"
  ON client_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Photographers can manage their clients"
  ON client_profiles FOR INSERT
  WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update their clients"
  ON client_profiles FOR UPDATE
  USING (auth.uid() = photographer_id);

-- ── project_clients ─────────────────────────────────────────────────────────

CREATE POLICY "Project owners can view project clients"
  ON project_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_clients.project_id AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view own project access"
  ON project_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = project_clients.client_profile_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage project clients"
  ON project_clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_clients.project_id AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can update project clients"
  ON project_clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_clients.project_id AND projects.owner_id = auth.uid()
    )
  );

-- ── project_pricing ─────────────────────────────────────────────────────────

CREATE POLICY "Project owners can view pricing"
  ON project_pricing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_pricing.project_id AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view pricing on invited projects"
  ON project_pricing FOR SELECT
  USING (is_project_client(project_id, auth.uid()));

CREATE POLICY "Project owners can manage pricing"
  ON project_pricing FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_pricing.project_id AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can update pricing"
  ON project_pricing FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = project_pricing.project_id AND projects.owner_id = auth.uid()
    )
  );

-- ── bookings ────────────────────────────────────────────────────────────────

CREATE POLICY "Photographers can view their bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = photographer_id);

CREATE POLICY "Clients can view own bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = bookings.client_profile_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = bookings.client_profile_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Photographers can update bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = photographer_id);

-- ── edit_requests ───────────────────────────────────────────────────────────

CREATE POLICY "Project owners can view edit requests"
  ON edit_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = edit_requests.project_id AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view own edit requests"
  ON edit_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = edit_requests.client_profile_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create edit requests"
  ON edit_requests FOR INSERT
  WITH CHECK (
    is_project_client(project_id, auth.uid())
  );

CREATE POLICY "Project owners can update edit requests"
  ON edit_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = edit_requests.project_id AND projects.owner_id = auth.uid()
    )
  );

-- ── file_purchases ──────────────────────────────────────────────────────────

CREATE POLICY "Project owners can view file purchases"
  ON file_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = file_purchases.project_id AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view own purchases"
  ON file_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = file_purchases.client_profile_id AND cp.user_id = auth.uid()
    )
  );

-- Purchases are created by server (after payment confirmation)

-- ── booking_form_fields ─────────────────────────────────────────────────────

CREATE POLICY "Photographers can view own form fields"
  ON booking_form_fields FOR SELECT
  USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can manage form fields"
  ON booking_form_fields FOR ALL
  USING (auth.uid() = photographer_id)
  WITH CHECK (auth.uid() = photographer_id);

-- Public read for booking pages (clients filling out forms)
CREATE POLICY "Anyone can view form fields for booking"
  ON booking_form_fields FOR SELECT
  USING (true);

-- ── stripe_events ───────────────────────────────────────────────────────────

-- stripe_events is only written by service role (webhook handler)
-- No user-facing policies needed; RLS blocks all non-service access by default
