-- Aktifkan RLS pada semua tabel
ALTER TABLE organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_outbox         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_outbox        ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;

-- ORGANIZATIONS
CREATE POLICY "Read Organizations" ON organizations FOR SELECT
  USING (is_super_admin() OR id IN (SELECT get_my_org_ids()));
CREATE POLICY "SuperAdmin Manage All Organizations" ON organizations FOR ALL
  USING (is_super_admin());
CREATE POLICY "admin_manage_orgs" ON organizations FOR ALL
  USING (is_admin());

-- PROFILES
CREATE POLICY "Public Read Profiles" ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Self Insert Profile" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Self Update Profile" ON profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "SuperAdmin Manage All Users" ON profiles FOR ALL
  USING (is_super_admin());

-- ORGANIZATION_MEMBERS
CREATE POLICY "Read Org Members" ON organization_members FOR SELECT
  USING (is_super_admin() OR organization_id IN (SELECT get_my_org_ids()));
CREATE POLICY "Read own membership" ON organization_members FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Manage Org Members" ON organization_members FOR ALL
  USING (is_super_admin() OR get_my_role_in_org(organization_id) = ANY(ARRAY['admin','operator']::app_role[]));

-- ORGANIZATION_INTEGRATIONS
CREATE POLICY "Users can read their organization integrations" ON organization_integrations FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins and Operators can insert integrations" ON organization_integrations FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin','operator']::app_role[])));
CREATE POLICY "Admins and Operators can update integrations" ON organization_integrations FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin','operator']::app_role[])));
CREATE POLICY "Admins and Operators can delete integrations" ON organization_integrations FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin','operator']::app_role[])));

-- CLIENTS (scoped per user_id karena Clients.tsx insert tanpa organization_id)
CREATE POLICY "clients_select" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (auth.uid() = user_id);

-- GROUPS (scoped per user_id, same pattern as clients)
CREATE POLICY "groups_select" ON groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "groups_insert" ON groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "groups_update" ON groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "groups_delete" ON groups FOR DELETE USING (auth.uid() = user_id);

-- CLIENT_GROUPS (join table — izinkan kalau user memiliki group-nya)
CREATE POLICY "client_groups_all" ON client_groups FOR ALL
  USING (EXISTS (SELECT 1 FROM groups WHERE groups.id = group_id AND groups.user_id = auth.uid()));

-- CONTACTS
CREATE POLICY "contacts_select_own" ON contacts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "contacts_insert_own" ON contacts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "contacts_update_own" ON contacts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "contacts_delete_own" ON contacts FOR DELETE USING (user_id = auth.uid());

-- PROJECTS
CREATE POLICY "Org members can view projects" ON projects FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY "Admin, Operator, Designer can INSERT projects" ON projects FOR INSERT
  WITH CHECK (get_user_role(organization_id) = ANY(ARRAY['admin','operator','designer']::app_role[]));
CREATE POLICY "Admin, Operator, Designer can UPDATE projects" ON projects FOR UPDATE
  USING (get_user_role(organization_id) = ANY(ARRAY['admin','operator','designer']::app_role[]));
CREATE POLICY "Only Admin and Operator can DELETE projects" ON projects FOR DELETE
  USING (get_user_role(organization_id) = ANY(ARRAY['admin','operator']::app_role[]));
CREATE POLICY "Allow individual read access" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow individual create access" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow individual update access" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow individual delete access" ON projects FOR DELETE USING (auth.uid() = user_id);

-- MARKETING_CAMPAIGNS
CREATE POLICY "Org members can view campaigns" ON marketing_campaigns FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY "Admin, Operator, Marketer can manage campaigns" ON marketing_campaigns FOR ALL
  USING (get_user_role(organization_id) = ANY(ARRAY['admin','operator','marketer']::app_role[]));
CREATE POLICY "Enable access for users based on user_id" ON marketing_campaigns FOR ALL
  USING (auth.uid() = user_id);

-- WHATSAPP_OUTBOX
CREATE POLICY "Authenticated users can view messages" ON whatsapp_outbox FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Authenticated users can insert messages" ON whatsapp_outbox FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- MESSENGER_OUTBOX
CREATE POLICY "Org members can view messenger tasks" ON messenger_outbox FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid() AND om.organization_id = messenger_outbox.organization_id));
CREATE POLICY "Org members can insert messenger tasks" ON messenger_outbox FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid() AND om.organization_id = messenger_outbox.organization_id));

-- SOCIAL_POSTS
CREATE POLICY "Org members can view social posts" ON social_posts FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid() AND om.organization_id = social_posts.organization_id));
CREATE POLICY "Org members can insert social posts" ON social_posts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid() AND om.organization_id = social_posts.organization_id));
CREATE POLICY "Service role full access" ON social_posts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- EMAIL_EVENTS
CREATE POLICY "Org members can view email events" ON email_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM marketing_campaigns c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = email_events.campaign_id AND om.user_id = auth.uid()));
CREATE POLICY "Service role can insert email events" ON email_events FOR INSERT TO service_role WITH CHECK (true);

-- LINK_CLICKS
CREATE POLICY "link_clicks_select_org" ON link_clicks FOR SELECT
  USING (EXISTS (SELECT 1 FROM marketing_campaigns c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = link_clicks.campaign_id AND om.user_id = auth.uid()));
CREATE POLICY "link_clicks_insert_org" ON link_clicks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM marketing_campaigns c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = link_clicks.campaign_id AND om.user_id = auth.uid()));

-- CONVERSATIONS
CREATE POLICY "Org members can view conversations" ON conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid() AND om.organization_id = conversations.organization_id));
CREATE POLICY "Org members can insert conversations" ON conversations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid() AND om.organization_id = conversations.organization_id));
CREATE POLICY "Org members can update conversations" ON conversations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = auth.uid() AND om.organization_id = conversations.organization_id));

-- MESSAGES
CREATE POLICY "Org members can view messages" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = messages.conversation_id AND om.user_id = auth.uid()));
CREATE POLICY "Org members can insert messages" ON messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM conversations c JOIN organization_members om ON om.organization_id = c.organization_id WHERE c.id = messages.conversation_id AND om.user_id = auth.uid()));
