import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_CLIENT_ID = Deno.env.get('META_CLIENT_ID') || '';
const META_CLIENT_SECRET = Deno.env.get('META_CLIENT_SECRET') || '';
const META_REDIRECT_URI = Deno.env.get('META_REDIRECT_URI') || '';

async function verifyInstagramPublishPermission(igAccountId: string, accessToken: string): Promise<void> {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/content_publishing_limit?access_token=${encodeURIComponent(accessToken)}`
  );
  const payload = await response.json();

  if (!response.ok || payload?.error) {
    throw new Error(
      payload?.error?.message || 'Instagram publishing permission validation failed'
    );
  }
}

function renderRedirectPage(params: { title: string; message: string; redirectUrl: string; isError?: boolean }) {
  const { title, message, redirectUrl, isError } = params;
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeRedirect = redirectUrl.replace(/"/g, '&quot;');

  const color = isError ? '#dc2626' : '#16a34a';
  const bg = isError ? '#fef2f2' : '#f0fdf4';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta http-equiv="refresh" content="2;url=${safeRedirect}" />
    <style>
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin:0; padding:24px; background:#f8fafc; }
      .card { max-width:640px; margin:56px auto; background:white; border-radius:12px; box-shadow:0 10px 30px rgba(15,23,42,.08); border:1px solid #e2e8f0; overflow:hidden; }
      .head { padding:16px 20px; background:${bg}; border-bottom:1px solid #e2e8f0; color:${color}; font-weight:700; }
      .body { padding:20px; color:#334155; line-height:1.6; }
      .link { display:inline-block; margin-top:10px; color:#2563eb; text-decoration:none; font-weight:600; }
      .link:hover { text-decoration:underline; }
      .sub { margin-top:10px; color:#64748b; font-size:13px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="head">${safeTitle}</div>
      <div class="body">
        <div>${safeMessage}</div>
        <a class="link" href="${safeRedirect}">Continue to app</a>
        <div class="sub">Redirecting automatically in 2 seconds...</div>
      </div>
    </div>
    <script>
      setTimeout(function () { window.location.href = ${JSON.stringify(redirectUrl)}; }, 1500);
    </script>
  </body>
</html>`;
}

function isLocalhostUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return ["localhost", "127.0.0.1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function resolveFrontendUrl(returnOrigin: string): string {
  const configured = Deno.env.get('FRONTEND_URL') || '';
  if (returnOrigin) return returnOrigin;
  if (configured && !isLocalhostUrl(configured)) return configured;
  return '';
}

type OAuthProcessResult = {
  sourcePlatform: string;
  redirectUrl: string;
};

async function processMetaOAuth(params: { code: string; statePayload: string; redirectUriOverride?: string }): Promise<OAuthProcessResult> {
  const { code, statePayload, redirectUriOverride } = params;
  const [orgId, sourcePlatform, encodedReturnOrigin] = statePayload.split('|');
  const returnOrigin = encodedReturnOrigin ? decodeURIComponent(encodedReturnOrigin) : '';

  if (!code || !orgId) {
    throw new Error(`Missing 'code' or 'state' (orgId) parameter.`);
  }

  const effectiveRedirectUri = redirectUriOverride || META_REDIRECT_URI;
  if (!effectiveRedirectUri) {
    throw new Error('Missing META_REDIRECT_URI configuration.');
  }

  // Read Meta App ID & Secret from DB (saved via UI) if env vars not set
  let clientId = META_CLIENT_ID;
  let clientSecret = META_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    const { data: appRow } = await supabaseAdmin
      .from('organization_integrations')
      .select('provider_account_id, access_token')
      .eq('organization_id', orgId)
      .eq('platform', 'meta_app')
      .maybeSingle();
    if (!clientId) clientId = appRow?.provider_account_id || '';
    if (!clientSecret) clientSecret = appRow?.access_token || '';
  }
  if (!clientId) {
    throw new Error('Meta App ID not configured. Save App ID via the Meta integration page.');
  }
  if (!clientSecret) {
    throw new Error('Meta App Secret not configured. Save App Secret via the Meta integration page.');
  }

  const tokenResponse = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(effectiveRedirectUri)}&client_secret=${clientSecret}&code=${code}`);
  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    console.error("Facebook Token Error: ", tokenData.error);
    throw new Error(`Facebook OAuth failed: ${tokenData.error.message}`);
  }

  const shortLivedToken = tokenData.access_token;

  const longLivedResponse = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`);
  const longLivedData = await longLivedResponse.json();
  const longToken = longLivedData.access_token;

  const permissionsResponse = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${longToken}`);
  const permissionsData = await permissionsResponse.json();
  const grantedPermissions = new Set(
    Array.isArray(permissionsData?.data)
      ? permissionsData.data
          .filter((item: any) => item?.status === 'granted')
          .map((item: any) => String(item?.permission || ''))
      : []
  );

  const pagesResponse = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`);
  const pagesData = await pagesResponse.json();

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error("No Facebook Pages found for this user account.");
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  for (const page of pagesData.data) {
    const igResponse = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
    const igData = await igResponse.json();
    const igAccountId = igData.instagram_business_account?.id;

    await supabaseAdmin.from('organization_integrations').upsert({
      organization_id: orgId,
      platform: 'facebook_page',
      provider_account_id: page.id,
      access_token: page.access_token,
      metadata: {
        name: page.name,
        category: page.category,
        granted_permissions: Array.from(grantedPermissions),
      }
    }, { onConflict: 'organization_id, platform, provider_account_id' });

    if (igAccountId) {
      await supabaseAdmin.from('organization_integrations').upsert({
        organization_id: orgId,
        platform: 'instagram_business',
        provider_account_id: igAccountId,
        access_token: page.access_token,
        metadata: {
          facebook_page_id: page.id,
          facebook_page_name: page.name,
          granted_permissions: Array.from(grantedPermissions),
        }
      }, { onConflict: 'organization_id, platform, provider_account_id' });
    }
  }

  const FRONTEND_URL = resolveFrontendUrl(returnOrigin);
  if (!FRONTEND_URL) {
    throw new Error('Missing production frontend URL. Set FRONTEND_URL secret to your deployed app URL or reconnect from updated frontend build.');
  }
  const redirectPath = sourcePlatform ? `/integrations/${sourcePlatform}` : '/';
  const redirectUrl = `${FRONTEND_URL}${redirectPath}?success=true`;

  return {
    sourcePlatform: sourcePlatform || 'messenger',
    redirectUrl,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let postBody: any = null;

  try {
    if (req.method === 'POST') {
      postBody = await req.json().catch(() => ({}));
      const code = String(postBody?.code || '');
      const statePayload = String(postBody?.state || '');
      const redirectUri = String(postBody?.redirectUri || '');

      const result = await processMetaOAuth({
        code,
        statePayload,
        redirectUriOverride: redirectUri,
      });

      return new Response(JSON.stringify({
        success: true,
        sourcePlatform: result.sourcePlatform,
        redirectUrl: result.redirectUrl,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code') || '';
    const statePayload = url.searchParams.get('state') || '';

    const result = await processMetaOAuth({
      code,
      statePayload,
    });

    return new Response(
      renderRedirectPage({
        title: 'Meta Connected Successfully',
        message: 'Your account was connected successfully. You can now continue in the app.',
        redirectUrl: result.redirectUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      }
    );

  } catch (error: any) {
    console.error("OAuth edge function error:", error);
    let statePayload = '';
    if (req.method === 'POST') {
      statePayload = String(postBody?.state || '');
    } else {
      statePayload = new URL(req.url).searchParams.get('state') || '';
    }
    const encodedReturnOrigin = statePayload.split('|')[2] || '';
    const returnOrigin = encodedReturnOrigin ? decodeURIComponent(encodedReturnOrigin) : '';
    const FRONTEND_URL = resolveFrontendUrl(returnOrigin);
    const message = error instanceof Error ? error.message : 'OAuth callback failed';

    if (req.method === 'POST') {
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const redirectUrl = FRONTEND_URL
      ? `${FRONTEND_URL}?error=${encodeURIComponent(message)}`
      : `https://supabase.com/dashboard/project/${new URL(req.url).hostname.split('.')[0]}/functions`;

    return new Response(
      renderRedirectPage({
        title: 'Meta Connection Failed',
        message,
        redirectUrl,
        isError: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
});
