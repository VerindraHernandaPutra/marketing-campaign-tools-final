import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VERIFY_TOKEN = Deno.env.get('FACEBOOK_VERIFY_TOKEN') || 'my_secure_webhook_token';

serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new Response(challenge, { status: 200 });
    } else {
      return new Response('Verification failed', { status: 403 });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();

      if (body.object === 'page' || body.object === 'instagram') {
        const platform = body.object === 'instagram' ? 'instagram' : 'messenger';
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        for (const entry of body.entry) {
          const webhookEvent = entry.messaging[0];
          console.log("Received event:", JSON.stringify(webhookEvent));

          const senderPsid = webhookEvent.sender.id;
          const pageId = webhookEvent.recipient.id;

          if (webhookEvent.message && !webhookEvent.message.is_echo) {
             console.log(`Incoming message from PSID: ${senderPsid} to Page ID: ${pageId}`);

             const { data: orgData } = await supabase
                .from('organization_integrations')
                .select('organization_id, access_token')
                .eq('provider_account_id', pageId)
                .limit(1)
                .single();

             if (orgData) {
                let contactName = undefined;
                try {
                   let profileUrl = '';
                   if (platform === 'instagram') {
                       profileUrl = `https://graph.facebook.com/v19.0/${senderPsid}?fields=name,profile_pic&access_token=${orgData.access_token}`;
                   } else {
                       profileUrl = `https://graph.facebook.com/${senderPsid}?fields=first_name,last_name&access_token=${orgData.access_token}`;
                   }

                   const profileResp = await fetch(profileUrl);
                   const profile = await profileResp.json();

                   if (platform === 'instagram' && profile && profile.name) {
                       contactName = profile.name;
                   } else if (profile && profile.first_name) {
                       contactName = `${profile.first_name} ${profile.last_name || ''}`.trim();
                   }
                } catch (e) {
                   console.error("Failed to fetch profile", e);
                }

                const { data: convData } = await supabase.from('conversations').upsert({
                    organization_id: orgData.organization_id,
                    platform: platform,
                    external_contact_id: senderPsid,
                    contact_name: contactName,
                    last_message_at: new Date().toISOString()
                }, { onConflict: 'organization_id, platform, external_contact_id' }).select('id').single();

                if (convData) {
                    await supabase.from('messages').insert({
                        conversation_id: convData.id,
                        sender_type: 'contact',
                        content: webhookEvent.message.text || '[Media/Attachment]',
                        external_message_id: webhookEvent.message.mid
                    });
                }
             }

          } else if (webhookEvent.delivery && webhookEvent.delivery.mids) {
             for (const mid of webhookEvent.delivery.mids) {
                await supabase.from('messages').update({ status: 'delivered' }).eq('external_message_id', mid);
             }
          } else if (webhookEvent.read) {
             console.log("Messages read at watermark:", webhookEvent.read.watermark);
          }
        }
        return new Response('EVENT_RECEIVED', { status: 200 });
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error(error);
      return new Response('Error Processing Request', { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
});
