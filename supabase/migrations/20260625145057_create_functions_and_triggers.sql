-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND username = 'superadmin'
  );
END; $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END; $$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM organization_members
  WHERE user_id = auth.uid() LIMIT 1;
  RETURN org_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(org_id uuid)
RETURNS app_role LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public' AS $$
  SELECT role FROM organization_members
  WHERE organization_id = org_id AND user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role_in_org(org_id uuid)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
  SELECT role FROM organization_members
  WHERE organization_id = org_id AND user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_available_users_for_org(org_id uuid)
RETURNS TABLE(id uuid, username text, email text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.username, p.email FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = p.id AND om.organization_id = org_id
  );
END; $$;

-- ============================================
-- TRIGGER: Auto-create profile saat user signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END; $$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TRIGGER: Auto-update updated_at pada projects
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$;

CREATE TRIGGER on_projects_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- TRIGGER: Enforce batas jumlah member per role
CREATE OR REPLACE FUNCTION public.check_org_role_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  current_count integer;
  limit_count   integer;
BEGIN
  IF NEW.status != 'active' THEN RETURN NEW; END IF;

  IF NEW.role = 'operator' THEN
    SELECT max_operators INTO limit_count FROM organizations WHERE id = NEW.organization_id;
  ELSIF NEW.role = 'designer' THEN
    SELECT max_designers INTO limit_count FROM organizations WHERE id = NEW.organization_id;
  ELSIF NEW.role = 'marketer' THEN
    SELECT max_marketers INTO limit_count FROM organizations WHERE id = NEW.organization_id;
  ELSE
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM organization_members
  WHERE organization_id = NEW.organization_id
    AND role = NEW.role AND status = 'active'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

  IF (current_count + 1) > limit_count THEN
    RAISE EXCEPTION 'Limit reached for % slots. Max: %. Current: %.',
      NEW.role, limit_count, current_count;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER enforce_role_limit
  BEFORE INSERT OR UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION check_org_role_limit();
