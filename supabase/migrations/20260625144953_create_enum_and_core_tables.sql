CREATE TYPE app_role AS ENUM ('admin', 'operator', 'designer', 'marketer');

CREATE TABLE organizations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  status       text DEFAULT 'active',
  max_operators  integer DEFAULT 1,
  max_designers  integer DEFAULT 5,
  max_marketers  integer DEFAULT 3,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username    text UNIQUE,
  email       text,
  avatar_url  text,
  updated_at  timestamptz
);

CREATE TABLE organization_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role            app_role NOT NULL DEFAULT 'operator',
  status          text DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_members_user ON organization_members(user_id);
