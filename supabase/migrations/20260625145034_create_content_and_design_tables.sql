CREATE TABLE clients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text,
  phone           text,
  country         text,
  facebook_psid   text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_clients_org ON clients(organization_id);

CREATE TABLE groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_groups_org ON groups(organization_id);

CREATE TABLE client_groups (
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  group_id  uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, group_id)
);

CREATE TABLE contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,
  name         text NOT NULL,
  contact_info text NOT NULL,
  type         text NOT NULL,
  tags         text[] DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'Untitled Design',
  canvas_data     jsonb,
  thumbnail_url   text,
  is_template     boolean DEFAULT false,
  tags            text[] DEFAULT '{}',
  media_urls      text[] DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_projects_org ON projects(organization_id);
