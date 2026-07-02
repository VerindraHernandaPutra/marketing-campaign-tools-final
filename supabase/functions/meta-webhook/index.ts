import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const META_VERIFY_TOKEN = Deno.env.get('META_VERIFY_TOKEN') || 'marketing-tool-verify-token-123';

serve(async (req: Request) => {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      console.log('Meta Webhook Verified!');
      return new Response(challenge, { status: 200 });
    }
    console.error('Webhook verification failed. Token mismatch.');
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'POST') {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
      const body = await req.json();
      console.log('Meta webhook received:', JSON.stringify(body));

      const isPage = body.object === 'page';
      const isInstagram = body.object === 'instagram';

      if (!isPage && !isInstagram) {
        return new Response('EVENT_RECEIVED', { status: 200 });
      }

      const platform = isInstagram ? 'instagram' : 'messenger';
      const dbPlatformKey = isInstagram ? 'instagram_business' : 'facebook_page';

      for (const entry of body.entry || []) {
        const messagingEvents = entry.messaging || [];

        for (const event of messagingEvents) {
          // Skip echoes, reads, and delivery receipts
          if (!event.message || event.message.is_echo) continue;

          const senderId = String(event.sender?.id || '');
          const recipientId = String(event.recipient?.id || '');

          if (!senderId || !recipientId) continue;

          // Find which organization owns this page/IG account
          const { data: orgData } = await supabase
            .from('organization_integrations')
            .select('organization_id')
            .eq('provider_account_id', recipientId)
            .eq('platform', dbPlatformKey)
            .limit(1)
            .maybeSingle();

          if (!orgData) {
            console.log(`No org found for ${dbPlatformKey} account: ${recipientId}`);
            continue;
          }

          const organizationId = orgData.organization_id;

          // Extract message content
          let messageContent = '';
          let mediaUrl: string | null = null;

          if (event.message.text) {
            messageContent = event.message.text;
          } else if (event.message.attachments?.length > 0) {
            const attachment = event.message.attachments[0];
            mediaUrl = attachment.payload?.url || null;
            messageContent = attachment.type === 'image' ? '[Image]'
              : attachment.type === 'video' ? '[Video]'
              : attachment.type === 'audio' ? '[Audio]'
              : attachment.type === 'file' ? '[File]'
              : '[Attachment]';
          }

          console.log(`Incoming ${platform} message from ${senderId}: ${messageContent}`);

          // Upsert conversation
          const { data: convData, error: convError } = await supabase
            .from('conversations')
            .upsert({
              organization_id: organizationId,
              platform,
              external_contact_id: senderId,
              contact_name: senderId,
              last_message_at: new Date().toISOString(),
            }, { onConflict: 'organization_id, platform, external_contact_id' })
            .select('id, unread_count')
            .single();

          if (convError || !convData) {
            console.error('Conversation upsert error:', convError?.message);
            continue;
          }

          // Insert message
          const { error: msgError } = await supabase.from('messages').insert({
            conversation_id: convData.id,
            sender_type: 'contact',
            content: messageContent,
            media_url: mediaUrl,
            external_message_id: event.message.mid,
            status: 'received',
          });

          if (msgError) {
            console.error('Message insert error:', msgError.message);
            continue;
          }

          // Increment unread count
          await supabase
            .from('conversations')
            .update({ unread_count: (convData.unread_count || 0) + 1 })
            .eq('id', convData.id);
        }
      }
    } catch (e: any) {
      console.error('Meta webhook error:', e.message);
    }

    return new Response('EVENT_RECEIVED', { status: 200 });
  }

  return new Response('Method Not Allowed', { status: 405 });
});
