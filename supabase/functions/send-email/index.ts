import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, accept-language, cache-control, pragma',
};

interface EmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
  scheduled_at?: string;
  tags?: { name: string; value: string }[];
  attachments?: {
    filename: string;
    content: string;
    content_id?: string;
    disposition?: string;
  }[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { to, subject, html, scheduledAt, attachments, organizationId, campaignId } = await req.json();

    console.log("send-email received:", { to, subject, hasAttachments: !!attachments?.length, organizationId, campaignId });

    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    let resendApiKey: string | null = null;
    let fromAddress = "onboarding@resend.dev";

    if (organizationId) {
      const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      const { data: integration } = await supabase
        .from("organization_integrations")
        .select("access_token, metadata")
        .eq("organization_id", organizationId)
        .eq("platform", "resend")
        .limit(1)
        .single();

      if (integration) {
        resendApiKey = integration.access_token;
        if (integration.metadata?.from_email && integration.metadata?.from_name) {
          fromAddress = `${integration.metadata.from_name} <${integration.metadata.from_email}>`;
        } else if (integration.metadata?.from_email) {
          fromAddress = integration.metadata.from_email;
        }
      }
    }

    if (!resendApiKey) {
      resendApiKey = Deno.env.get("RESEND_API_KEY") || null;
    }

    if (!resendApiKey) {
      throw new Error("No Resend API Key configured. Please connect Resend in Platform → Resend (Email) settings.");
    }

    const payload: EmailPayload = {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    const resendTags: { name: string; value: string }[] = [];
    if (campaignId) {
      resendTags.push({ name: "campaign_id", value: String(campaignId) });
    }
    if (organizationId) {
      resendTags.push({ name: "organization_id", value: String(organizationId) });
    }
    if (resendTags.length > 0) {
      payload.tags = resendTags;
    }

    if (scheduledAt) {
      payload.scheduled_at = scheduledAt;
    }

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map((att: any) => ({
        filename: att.filename.replace(/[^a-zA-Z0-9.-]/g, '_'),
        content: att.content,
        content_id: att.content_id,
        disposition: 'inline',
      }));
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API Error:", data);
      throw new Error(data.message || 'Failed to send email via Resend');
    }

    console.log("Email sent successfully:", data.id);

    const eventType = scheduledAt ? "scheduled" : "sent";
    const recipient = Array.isArray(payload.to) ? payload.to[0] : payload.to;
    const { error: eventError } = await supabase
      .from("email_events")
      .insert({
        email_id: data.id || crypto.randomUUID(),
        type: eventType,
        recipient: recipient || "unknown",
        campaign_id: campaignId || null,
      });
    if (eventError) {
      console.error("Failed to persist email_events row:", eventError);
    }

    if (campaignId) {
      const campaignStatus = scheduledAt ? "scheduled" : "sent";
      const { error: campaignUpdateError } = await supabase
        .from("marketing_campaigns")
        .update({ status: campaignStatus })
        .eq("id", campaignId);

      if (campaignUpdateError) {
        console.error("Failed to update campaign status:", campaignUpdateError);
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("send-email error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
