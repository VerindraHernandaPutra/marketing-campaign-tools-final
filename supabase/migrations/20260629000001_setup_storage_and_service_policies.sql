-- ============================================================
-- Storage Buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-media', 'campaign-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage Policies — campaign-media
-- ============================================================

CREATE POLICY "campaign_media_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'campaign-media');

CREATE POLICY "campaign_media_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campaign-media');

CREATE POLICY "campaign_media_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'campaign-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- Storage Policies — chat-media
-- ============================================================

CREATE POLICY "chat_media_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "chat_media_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- ============================================================
-- Service Role RLS — edge functions butuh akses penuh
-- Webhook functions (whatsapp-webhook, meta-webhook) jalan
-- sebagai service_role, bukan authenticated user.
-- ============================================================

-- whatsapp_outbox: service role untuk update status
CREATE POLICY "service_role_whatsapp_outbox"
ON whatsapp_outbox FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- conversations: service role untuk webhook upsert
CREATE POLICY "service_role_conversations"
ON conversations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- messages: service role untuk webhook insert
CREATE POLICY "service_role_messages"
ON messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- social_posts: update status oleh send-social function
-- (mungkin sudah ada, gunakan IF NOT EXISTS workaround)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'social_posts' AND policyname = 'Service role full access'
  ) THEN
    EXECUTE 'CREATE POLICY "service_role_social_posts" ON social_posts FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;
