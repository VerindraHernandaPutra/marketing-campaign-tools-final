import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || '';
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WhatsApp webhook verified');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'POST') {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    try {
      const body = await req.json();
      console.log('WA webhook body:', JSON.stringify(body));

      if (body.object !== 'whatsapp_business_account') {
        return new Response('OK', { status: 200 });
      }

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== 'messages') continue;

          const value = change.value;
          const phoneNumberId = value?.metadata?.phone_number_id;

          if (!phoneNumberId) {
            console.log('No phone_number_id in webhook metadata, skipping');
            continue;
          }

          const { data: orgData, error: orgError } = await supabase
            .from('organization_integrations')
            .select('organization_id')
            .eq('provider_account_id', phoneNumberId)
            .eq('platform', 'whatsapp')
            .limit(1)
            .maybeSingle();

          if (orgError) {
            console.error('Org lookup error:', orgError.message);
            continue;
          }
          if (!orgData) {
            console.log(`No org found for phone_number_id: ${phoneNumberId}`);
            continue;
          }

          const organizationId = orgData.organization_id;

          for (const statusUpdate of value.statuses || []) {
            const dbStatus = statusUpdate.status === 'failed' ? 'failed' : 'sent';
            const { error: statusErr } = await supabase
              .from('whatsapp_outbox')
              .update({ status: dbStatus })
              .eq('organization_id', organizationId)
              .filter("response_data->>'messages'", 'ilike', `%${statusUpdate.id}%`);
            if (statusErr) console.error('Status update error:', statusErr.message);
          }

          const contactNames: Record<string, string> = {};
          for (const contact of value.contacts || []) {
            contactNames[contact.wa_id] = contact.profile?.name || contact.wa_id;
          }

          for (const msg of value.messages || []) {
            const senderPhone = String(msg.from).replace(/\D/g, '');
            const senderName = contactNames[msg.from] || senderPhone;

            let messageContent = '';
            if (msg.type === 'text') {
              messageContent = msg.text?.body || '';
            } else if (msg.type === 'image') {
              messageContent = msg.image?.caption || '[Image]';
            } else if (msg.type === 'video') {
              messageContent = msg.video?.caption || '[Video]';
            } else if (msg.type === 'audio') {
              messageContent = '[Audio]';
            } else if (msg.type === 'document') {
              messageContent = msg.document?.filename || '[Document]';
            } else if (msg.type === 'location') {
              messageContent = '[Location]';
            } else {
              messageContent = `[${msg.type}]`;
            }

            console.log(`Incoming WA message from ${senderPhone}: ${messageContent}`);

            const { data: convData, error: convError } = await supabase
              .from('conversations')
              .upsert({
                organization_id: organizationId,
                platform: 'whatsapp',
                external_contact_id: senderPhone,
                contact_name: senderName,
                last_message_at: new Date().toISOString(),
              }, { onConflict: 'organization_id, platform, external_contact_id' })
              .select('id, unread_count')
              .single();

            if (convError || !convData) {
              console.error('Conversation upsert error:', convError?.message);
              continue;
            }

            const { error: msgError } = await supabase.from('messages').insert({
              conversation_id: convData.id,
              sender_type: 'contact',
              content: messageContent,
              external_message_id: msg.id,
              status: 'received',
            });

            if (msgError) {
              console.error('Message insert error:', msgError.message);
              continue;
            }

            await supabase
              .from('conversations')
              .update({ unread_count: (convData.unread_count || 0) + 1 })
              .eq('id', convData.id);
          }
        }
      }
    } catch (error: any) {
      console.error('Webhook processing error:', error.message);
    }

    return new Response('OK', { status: 200 });
  }

  return new Response('Method Not Allowed', { status: 405 });
});
