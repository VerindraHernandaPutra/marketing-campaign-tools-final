CREATE TABLE organization_integrations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform            text NOT NULL,
  provider_account_id text NOT NULL,
  access_token        text NOT NULL,
  refresh_token       text,
  token_expires_at    timestamptz,
  connected_at        timestamptz DEFAULT now(),
  status              text DEFAULT 'active',
  metadata            jsonb DEFAULT '{}',
  UNIQUE(organization_id, platform, provider_account_id)
);

CREATE TABLE email_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id    text NOT NULL,
  type        text NOT NULL,
  recipient   text NOT NULL,
  link_url    text,
  campaign_id uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE link_clicks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_url text NOT NULL,
  campaign_id  uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  platform     text,
  clicks       integer DEFAULT 0
);

CREATE TABLE conversations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform            text NOT NULL,
  external_contact_id text NOT NULL,
  contact_name        text,
  client_id           text,
  unread_count        integer DEFAULT 0,
  last_message_at     timestamptz DEFAULT timezone('utc', now()),
  created_at          timestamptz DEFAULT timezone('utc', now()),
  UNIQUE(organization_id, platform, external_contact_id)
);

CREATE TABLE messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type         text NOT NULL,
  content             text,
  media_url           text,
  status              text DEFAULT 'delivered',
  external_message_id text,
  created_at          timestamptz DEFAULT timezone('utc', now())
);
