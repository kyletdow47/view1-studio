-- ============================================================
-- Auth Schema: profiles, workspaces, workspace_members
-- Triggered on auth.users INSERT to auto-provision new users
-- ============================================================

-- profiles: one-to-one extension of auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- workspaces: each photographer gets one workspace on signup
CREATE TABLE IF NOT EXISTS public.workspaces (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view workspace"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace owner can update workspace"
  ON public.workspaces FOR UPDATE
  USING (auth.uid() = owner_id);

-- workspace_members: role-based access (owner | admin | member)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID  NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT  NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own memberships"
  ON public.workspace_members FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- handle_new_user: auto-create profile + workspace on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id  UUID;
  v_slug          TEXT;
  v_display_name  TEXT;
BEGIN
  -- Derive a human-readable display name
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    v_display_name,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Build a URL-safe slug: lowercase alphanumeric + hyphens, then append 8 random chars
  v_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  -- Create default workspace
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (
    v_display_name || '''s Workspace',
    v_slug,
    NEW.id
  )
  RETURNING id INTO v_workspace_id;

  -- Add user as owner of their workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
