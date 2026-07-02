import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, accept-language, cache-control, pragma",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { conversationId, content, mediaUrl } = await req.json();

    if (!conversationId || (!content && !mediaUrl)) {
      throw new Error("Missing required payload fields");
    }

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
        throw new Error("Conversation not found");
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", conversation.organization_id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: integration, error: intError } = await supabase
        .from('organization_integrations')
        .select('*')
        .eq('organization_id', conversation.organization_id)
        .ilike('platform', conversation.platform === 'messenger' ? 'facebook%' : `${conversation.platform}%`)
        .limit(1)
        .single();

    if (intError || !integration || !integration.access_token) {
        throw new Error(`No access token found for ${conversation.platform}`);
    }

    const accessToken = integration.access_token;
    const externalId = conversation.external_contact_id;
    let metaResponse = null;

    if (conversation.platform === 'messenger' || conversation.platform === 'instagram') {
        const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`;

        if (mediaUrl) {
           const mediaPayload = {
               recipient: { id: externalId },
               message: {
                   attachment: {
                       type: "image",
                       payload: { url: mediaUrl, is_reusable: false }
                   }
               }
           };
           const mediaRes = await fetch(url, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(mediaPayload)
           });
           metaResponse = await mediaRes.json();
           if (metaResponse.error) {
              console.error("Meta Graph Media Error:", metaResponse.error);
              throw new Error(metaResponse.error.message);
           }
        }

        if (content && content.trim() !== '') {
           const textPayload = {
               recipient: { id: externalId },
               message: { text: content }
           };
           const textRes = await fetch(url, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(textPayload)
           });
           const textJson = await textRes.json();
           if (textJson.error) {
              console.error("Meta Graph Text Error:", textJson.error);
              throw new Error(textJson.error.message);
           }

           metaResponse = textJson;
        }

    } else if (conversation.platform === 'whatsapp') {
        const phoneNumberId = integration.provider_account_id;
        const targetPhone = externalId;
        const waUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
        const waHeaders = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        };

        if (mediaUrl) {
            const mediaPayload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: targetPhone,
                type: 'image',
                image: { link: mediaUrl, caption: content || '' },
            };
            const mediaRes = await fetch(waUrl, {
                method: 'POST',
                headers: waHeaders,
                body: JSON.stringify(mediaPayload),
            });
            const mediaJson = await mediaRes.json();
            if (mediaJson.error) throw new Error(mediaJson.error.message || 'Meta WA failed to send media');
            metaResponse = { message_id: mediaJson.messages?.[0]?.id };
        } else if (content && content.trim() !== '') {
            const textPayload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: targetPhone,
                type: 'text',
                text: { body: content },
            };
            const textRes = await fetch(waUrl, {
                method: 'POST',
                headers: waHeaders,
                body: JSON.stringify(textPayload),
            });
            const textJson = await textRes.json();
            if (textJson.error) throw new Error(textJson.error.message || 'Meta WA failed to send message');
            metaResponse = { message_id: textJson.messages?.[0]?.id };
        }

    } else {
        throw new Error(`Platform ${conversation.platform} not supported yet in Edge Function dispatcher.`);
    }

    const { data: savedMessage, error: insertError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        content: content,
        media_url: mediaUrl,
        status: 'sent',
        external_message_id: metaResponse.message_id
    }).select().single();

    if (insertError) throw insertError;

    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);

    return new Response(JSON.stringify(savedMessage), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
