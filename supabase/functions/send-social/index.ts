import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function getIntegration(organizationId: string, platform: string) {
  const { data, error } = await supabase
    .from('organization_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('platform', platform)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function postFacebookPage(pageId: string, accessToken: string, content: string, mediaUrls: string[] = []) {
  const firstMedia = mediaUrls[0];

  if (firstMedia) {
    const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        url: firstMedia,
        caption: content,
        published: 'true',
        access_token: accessToken,
      }),
    });
    return await response.json();
  }

  const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      message: content,
      access_token: accessToken,
    }),
  });

  return await response.json();
}

function isVideoUrl(url: string): boolean {
  const normalized = String(url || "").toLowerCase();
  return [".mp4", ".mov", ".m4v", ".webm"].some((ext) => normalized.includes(ext));
}

async function waitForInstagramContainerReady(containerId: string, accessToken: string): Promise<void> {
  const maxAttempts = 12;
  const delayMs = 2500;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(`https://graph.facebook.com/v19.0/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`);
    const payload = await response.json();

    if (!response.ok || payload?.error) {
      throw new Error(payload?.error?.message || "Failed checking Instagram media status");
    }

    const statusCode = String(payload?.status_code || payload?.status || "").toUpperCase();
    if (statusCode === "FINISHED") return;
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      throw new Error(`Instagram container failed with status: ${statusCode}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Instagram media processing timeout. Please retry.");
}

async function postInstagramBusiness(igUserId: string, accessToken: string, content: string, mediaUrls: string[] = []) {
  const firstMedia = mediaUrls[0];
  if (!firstMedia) {
    throw new Error('Instagram requires at least one public image/video URL');
  }

  const isVideo = isVideoUrl(firstMedia);

  const createBody = new URLSearchParams({
    caption: content,
    access_token: accessToken,
  });

  if (isVideo) {
    createBody.set('video_url', firstMedia);
    createBody.set('media_type', 'VIDEO');
  } else {
    createBody.set('image_url', firstMedia);
  }

  const createResponse = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createBody,
  });

  const createResult = await createResponse.json();
  if (!createResponse.ok || createResult.error) {
    throw new Error(createResult.error?.message || 'Failed to create Instagram media container');
  }

  await waitForInstagramContainerReady(createResult.id, accessToken);

  const publishResponse = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      creation_id: createResult.id,
      access_token: accessToken,
    }),
  });

  const publishResult = await publishResponse.json();
  if (!publishResponse.ok || publishResult.error) {
    throw new Error(publishResult.error?.message || 'Failed to publish Instagram media');
  }

  return { container: createResult, published: publishResult };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record || !record.content || !record.platforms || record.platforms.length === 0) {
      return new Response('Missing required fields in webhook payload', { status: 400 });
    }

    const { id, content, platforms, media_urls, organization_id } = record;

    if (!organization_id) {
      throw new Error('Missing organization_id in record');
    }

    const results: Record<string, unknown> = {};
    const errors: string[] = [];

    const platformList = Array.isArray(platforms) ? platforms : [];

    for (const platform of platformList) {
      try {
        let platformResult: any;
        if (platform === 'facebook') {
          const integration = await getIntegration(organization_id, 'facebook_page');
          if (!integration) throw new Error('Facebook Page integration not connected');
          platformResult = await postFacebookPage(integration.provider_account_id, integration.access_token, content, media_urls || []);
        } else if (platform === 'instagram') {
          const integration = await getIntegration(organization_id, 'instagram_business');
          if (!integration) throw new Error('Instagram Business integration not connected');
          platformResult = await postInstagramBusiness(integration.provider_account_id, integration.access_token, content, media_urls || []);
        } else {
          errors.push(`${platform}: unsupported platform in Meta-native publishing path`);
          continue;
        }

        // Meta Graph API can return 200 with an error object inside
        if (platformResult?.error) {
          throw new Error(platformResult.error.message || `Meta API error on ${platform}`);
        }

        results[platform] = platformResult;
      } catch (err: any) {
        const message = String(err?.message || 'Unknown error');
        errors.push(`${platform}: ${message}`);
      }
    }

    const hasSuccess = Object.keys(results).length > 0;

    if (!hasSuccess) {
      await supabase.from('social_posts').update({
        status: 'failed',
        response_data: { errors },
      }).eq('id', id);

      return new Response(JSON.stringify({ error: 'Meta publishing failed', details: errors }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('social_posts').update({
      status: errors.length > 0 ? 'partial_failed' : 'sent',
      updated_at: new Date().toISOString(),
      response_data: { results, errors },
    }).eq('id', id);

    return new Response(JSON.stringify({ success: true, results, errors }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
