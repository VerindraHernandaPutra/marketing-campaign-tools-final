import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, accept-language, cache-control, pragma",
};

type AnyRow = Record<string, any>;

type SocialInsightTotals = {
  reach: number;
  engagement: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
};

function getStartDate(timeRange: string | undefined): Date {
  const now = new Date();
  const map: Record<string, number> = {
    "1d":   1,
    "7d":   7,
    "30d":  30,
    "90d":  90,
    "180d": 180,
    "365d": 365,
  };
  const days = map[timeRange || "7d"] ?? 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function toDayKey(input: string | null | undefined): string {
  if (!input) return "";
  return new Date(input).toISOString().slice(0, 10);
}

function normalizeEmailEventType(type: string | null | undefined): string {
  const t = String(type || "").toLowerCase();
  if (["click", "clicked"].includes(t)) return "clicked";
  if (["open", "opened"].includes(t)) return "opened";
  if (["bounce", "bounced", "dropped", "failed"].includes(t)) return "bounced";
  if (["delivered", "delivery"].includes(t)) return "delivered";
  if (["sent", "queued", "processed"].includes(t)) return "sent";
  return "other";
}

function normalizeResendLastEvent(type: string | null | undefined): string {
  const t = String(type || "").toLowerCase();
  if (["clicked", "click"].includes(t)) return "clicked";
  if (["opened", "open"].includes(t)) return "opened";
  if (["delivered", "delivery"].includes(t)) return "delivered";
  if (["bounced", "bounce", "complained"].includes(t)) return "bounced";
  if (["sent", "queued", "processed"].includes(t)) return "sent";
  return "other";
}

function normalizePlatformValues(platforms: unknown): string[] {
  if (!Array.isArray(platforms)) return [];
  return platforms
    .map((item) => String(item || "").toLowerCase().trim())
    .filter(Boolean);
}

function normalizeQueueStatus(status: string | null | undefined): "sent" | "in_progress" | "failed" | "other" {
  const value = String(status || "").toLowerCase();
  if (["sent", "success", "delivered", "partial_failed", "partial-success"].includes(value)) return "sent";
  if (["scheduling", "scheduled", "queued", "processing", "in_progress", "pending"].includes(value)) return "in_progress";
  if (["failed", "error", "bounced"].includes(value)) return "failed";
  return "other";
}

async function fetchChannelRowsWithFallback(
  supabase: any,
  tableName: string,
  selectColumns: string,
  organizationId: string,
  campaignIds: string[],
  startDateIso: string,
): Promise<AnyRow[]> {
  const rowsById = new Map<string, AnyRow>();

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectColumns)
      .eq("organization_id", organizationId)
      .gte("created_at", startDateIso);

    if (!error) {
      for (const row of (data || []) as AnyRow[]) {
        if (row?.id !== undefined && row?.id !== null) rowsById.set(String(row.id), row);
      }
    }
  } catch (error) {
    console.warn(`analytics-overview: ${tableName} organization_id query fallback`, error);
  }

  if (campaignIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select(selectColumns)
        .in("campaign_id", campaignIds)
        .gte("created_at", startDateIso);

      if (!error) {
        for (const row of (data || []) as AnyRow[]) {
          if (row?.id !== undefined && row?.id !== null) rowsById.set(String(row.id), row);
        }
      }
    } catch (error) {
      console.warn(`analytics-overview: ${tableName} campaign_id fallback`, error);
    }
  }

  return Array.from(rowsById.values());
}

function getSocialResponseData(row: AnyRow): AnyRow {
  const data = row?.response_data;
  if (!data || typeof data !== "object") return {};
  return data as AnyRow;
}

function extractFacebookPostId(row: AnyRow): string | null {
  const response = getSocialResponseData(row);
  return (
    response?.results?.facebook?.post_id ||
    response?.results?.facebook?.id ||
    response?.facebook?.post_id ||
    response?.facebook?.id ||
    response?.id ||
    null
  );
}

function extractInstagramMediaId(row: AnyRow): string | null {
  const response = getSocialResponseData(row);
  return (
    response?.results?.instagram?.published?.id ||
    response?.results?.instagram?.container?.id ||
    response?.results?.instagram?.id ||
    response?.instagram?.id ||
    null
  );
}

function getSuccessfulPlatformsFromSocialRow(row: AnyRow): string[] {
  const declared = normalizePlatformValues(row?.platforms);
  const response = getSocialResponseData(row);
  const resultKeys = Object.keys(response?.results || {}).map((item) => String(item || "").toLowerCase());

  if (resultKeys.length === 0) return declared;
  const normalizedResults = new Set(resultKeys);
  return declared.filter((platform) => normalizedResults.has(platform));
}

function extractSocialErrors(row: AnyRow): string[] {
  const response = getSocialResponseData(row);
  if (Array.isArray(response?.errors)) {
    return response.errors.map((item) => String(item || "")).filter(Boolean);
  }
  if (response?.error) {
    return [String(response.error)];
  }
  return [];
}

async function fetchMetaInsightsForFacebookPost(postId: string, accessToken: string): Promise<SocialInsightTotals> {
  try {
    const engagementResponse = await fetch(
      `https://graph.facebook.com/v19.0/${postId}?fields=shares,reactions.summary(true).limit(0),comments.summary(true).limit(0)&access_token=${encodeURIComponent(accessToken)}`
    );
    const engagementPayload = await engagementResponse.json();
    if (!engagementResponse.ok || engagementPayload.error) return { reach: 0, engagement: 0, clicks: 0, likes: 0, comments: 0, shares: 0 };

    const likes = Number(engagementPayload?.reactions?.summary?.total_count || 0);
    const comments = Number(engagementPayload?.comments?.summary?.total_count || 0);
    const shares = Number(engagementPayload?.shares?.count || engagementPayload?.shares || 0);

    let reach = 0;
    let clicks = 0;
    let platformEngagement = 0;

    try {
      const insightResponse = await fetch(
        `https://graph.facebook.com/v19.0/${postId}/insights?metric=post_impressions,post_engaged_users,post_clicks&access_token=${encodeURIComponent(accessToken)}`
      );
      const insightPayload = await insightResponse.json();

      if (insightResponse.ok && !insightPayload?.error) {
        const values = Array.isArray(insightPayload?.data) ? insightPayload.data : [];
        const lookup = new Map<string, number>();
        for (const item of values) {
          const name = String(item?.name || "");
          const value = Array.isArray(item?.values) ? Number(item.values[0]?.value || 0) : Number(item?.value || 0);
          lookup.set(name, value);
        }
        reach = lookup.get("post_impressions") || 0;
        platformEngagement = lookup.get("post_engaged_users") || 0;
        clicks = lookup.get("post_clicks") || 0;
      }
    } catch {
      // Keep engagement-derived fields even if insights endpoint fails.
    }

    return {
      reach,
      engagement: platformEngagement || likes + comments + shares,
      clicks,
      likes,
      comments,
      shares,
    };
  } catch {
    return { reach: 0, engagement: 0, clicks: 0, likes: 0, comments: 0, shares: 0 };
  }
}

async function fetchMetaInsightsForInstagramMedia(mediaId: string, accessToken: string): Promise<SocialInsightTotals> {
  try {
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v19.0/${mediaId}?fields=like_count,comments_count&access_token=${encodeURIComponent(accessToken)}`
    );
    const mediaPayload = await mediaResponse.json();
    if (!mediaResponse.ok || mediaPayload.error) return { reach: 0, engagement: 0, clicks: 0, likes: 0, comments: 0, shares: 0 };

    const likes = Number(mediaPayload?.like_count || 0);
    const comments = Number(mediaPayload?.comments_count || 0);

    let reach = 0;
    let engagement = 0;

    try {
      const insightResponse = await fetch(
        `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=impressions,reach,engagement,saved&access_token=${encodeURIComponent(accessToken)}`
      );
      const insightPayload = await insightResponse.json();
      if (insightResponse.ok && !insightPayload.error) {
        const lookup = new Map<string, number>();
        for (const item of (Array.isArray(insightPayload?.data) ? insightPayload.data : [])) {
          const name = String(item?.name || "");
          const value = Array.isArray(item?.values) ? Number(item.values[0]?.value || 0) : Number(item?.value || 0);
          lookup.set(name, value);
        }
        reach = lookup.get("reach") || lookup.get("impressions") || 0;
        engagement = lookup.get("engagement") || 0;
      }
    } catch {
      // keep defaults
    }

    return {
      reach,
      engagement: engagement || likes + comments,
      clicks: 0,
      likes,
      comments,
      shares: 0,
    };
  } catch {
    return { reach: 0, engagement: 0, clicks: 0, likes: 0, comments: 0, shares: 0 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const timeRange = String(body?.timeRange || "7d");
    const startDate = getStartDate(timeRange);
    const startDateIso = startDate.toISOString();

    let organizationId = body?.organizationId as string | undefined;

    if (organizationId) {
      const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (membershipError || !membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      organizationId = membership?.organization_id;
    }

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "No organization found for user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [campaignByOrgRes, campaignByUserRes] = await Promise.all([
      supabase
        .from("marketing_campaigns")
        .select("id,title,platforms,status,created_at,user_id,organization_id")
        .eq("organization_id", organizationId)
        .gte("created_at", startDateIso)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("marketing_campaigns")
        .select("id,title,platforms,status,created_at,user_id,organization_id")
        .eq("user_id", user.id)
        .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
        .gte("created_at", startDateIso)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const mergedCampaigns = [
      ...((campaignByOrgRes.data || []) as AnyRow[]),
      ...((campaignByUserRes.data || []) as AnyRow[]),
    ];

    const campaigns = Array.from(
      new Map(mergedCampaigns.map((item) => [item.id, item])).values()
    ) as AnyRow[];
    const campaignIds = campaigns.map((c) => c.id).filter(Boolean);

    const [waRows, socialRows] = await Promise.all([
      fetchChannelRowsWithFallback(
        supabase,
        "whatsapp_outbox",
        "id,status,created_at,campaign_id,phone,message,response_data,organization_id,updated_at",
        organizationId,
        campaignIds,
        startDateIso,
      ),
      fetchChannelRowsWithFallback(
        supabase,
        "social_posts",
        "id,status,platforms,created_at,campaign_id,response_data,organization_id,updated_at",
        organizationId,
        campaignIds,
        startDateIso,
      ),
    ]);

    let conversationRows: AnyRow[] = [];
    try {
      const { data } = await supabase
        .from("conversations")
        .select("id,contact_name,external_contact_id,platform,last_message_at,organization_id")
        .eq("organization_id", organizationId)
        .eq("platform", "whatsapp")
        .gte("last_message_at", startDateIso);
      conversationRows = (data || []) as AnyRow[];
    } catch (error) {
      console.warn("analytics-overview: conversations query skipped", error);
    }

    const conversationIds = conversationRows.map((row) => row.id).filter(Boolean);

    let incomingMessages: AnyRow[] = [];
    if (conversationIds.length > 0) {
      try {
        const { data: messageRows } = await supabase
          .from("messages")
          .select("id,conversation_id,sender_type,content,status,created_at")
          .in("conversation_id", conversationIds)
          .gte("created_at", startDateIso)
          .order("created_at", { ascending: false })
          .limit(50);
        incomingMessages = (messageRows || []) as AnyRow[];
      } catch (error) {
        console.warn("analytics-overview: messages query skipped", error);
      }
    }

    let emailEvents: AnyRow[] = [];
    let linkClicks: AnyRow[] = [];

    if (campaignIds.length > 0) {
      const [emailRes, linkRes] = await Promise.all([
        supabase
          .from("email_events")
          .select("id,email_id,type,recipient,campaign_id,created_at")
          .in("campaign_id", campaignIds)
          .gte("created_at", startDateIso),
        supabase
          .from("link_clicks")
          .select("campaign_id,platform,clicks")
          .in("campaign_id", campaignIds),
      ]);
      emailEvents = (emailRes.data || []) as AnyRow[];
      linkClicks = (linkRes.data || []) as AnyRow[];
    }

    const socialInsightsByCampaign: Record<string, SocialInsightTotals> = {};
    const socialPostsByCampaign: Record<string, AnyRow[]> = {};

    for (const post of socialRows) {
      const campaignKey = String(post.campaign_id || "");
      if (!campaignKey) continue;
      if (!socialPostsByCampaign[campaignKey]) socialPostsByCampaign[campaignKey] = [];
      socialPostsByCampaign[campaignKey].push(post);
    }

    const metaTokens = new Map<string, string>();
    const { data: metaIntegrations } = await supabase
      .from("organization_integrations")
      .select("platform, access_token")
      .eq("organization_id", organizationId)
      .in("platform", ["facebook_page", "instagram_business"]);

    for (const integration of (metaIntegrations || []) as AnyRow[]) {
      if (integration?.platform && integration?.access_token) {
        metaTokens.set(String(integration.platform), String(integration.access_token));
      }
    }

    for (const [campaignId, posts] of Object.entries(socialPostsByCampaign)) {
      let totals: SocialInsightTotals = { reach: 0, engagement: 0, clicks: 0, likes: 0, comments: 0, shares: 0 };

      for (const post of posts) {
        const platforms = getSuccessfulPlatformsFromSocialRow(post);

        if (platforms.includes("facebook")) {
          const token = metaTokens.get("facebook_page");
          const postId = extractFacebookPostId(post);
          if (token && postId) {
            const insight = await fetchMetaInsightsForFacebookPost(postId, token);
            totals.reach += insight.reach;
            totals.engagement += insight.engagement;
            totals.clicks += insight.clicks;
            totals.likes += insight.likes;
            totals.comments += insight.comments;
            totals.shares += insight.shares;
          }
        }

        if (platforms.includes("instagram")) {
          const token = metaTokens.get("instagram_business");
          const mediaId = extractInstagramMediaId(post);
          if (token && mediaId) {
            const insight = await fetchMetaInsightsForInstagramMedia(mediaId, token);
            totals.reach += insight.reach;
            totals.engagement += insight.engagement;
            totals.clicks += insight.clicks;
            totals.likes += insight.likes;
            totals.comments += insight.comments;
            totals.shares += insight.shares;
          }
        }
      }

      socialInsightsByCampaign[campaignId] = totals;
    }

    const totalSocialInsights = Object.values(socialInsightsByCampaign).reduce(
      (acc, curr) => ({
        reach: acc.reach + curr.reach,
        engagement: acc.engagement + curr.engagement,
        clicks: acc.clicks + curr.clicks,
        likes: acc.likes + curr.likes,
        comments: acc.comments + curr.comments,
        shares: acc.shares + curr.shares,
      }),
      { reach: 0, engagement: 0, clicks: 0, likes: 0, comments: 0, shares: 0 }
    );

    const emailCounts = { total: 0, delivered: 0, sent: 0, bounced: 0, opened: 0, clicked: 0 };
    const uniqueEmailIds = new Set<string>();

    for (const evt of emailEvents) {
      const normalized = normalizeEmailEventType(evt.type);
      if (normalized === "sent") emailCounts.sent += 1;
      if (normalized === "delivered") emailCounts.delivered += 1;
      if (normalized === "bounced") emailCounts.bounced += 1;
      if (normalized === "opened") emailCounts.opened += 1;
      if (normalized === "clicked") emailCounts.clicked += 1;
      if (evt.email_id) uniqueEmailIds.add(String(evt.email_id));
    }
    emailCounts.total = uniqueEmailIds.size > 0 ? uniqueEmailIds.size : Math.max(emailCounts.sent, emailCounts.delivered + emailCounts.bounced);

    if (emailCounts.delivered === 0 && emailCounts.opened === 0 && emailCounts.clicked === 0 && uniqueEmailIds.size > 0) {
      try {
        let resendApiKey: string | null = null;

        const { data: resendIntegration } = await supabase
          .from("organization_integrations")
          .select("access_token")
          .eq("organization_id", organizationId)
          .eq("platform", "resend")
          .limit(1)
          .maybeSingle();

        if (resendIntegration?.access_token) {
          resendApiKey = resendIntegration.access_token;
        } else {
          resendApiKey = Deno.env.get("RESEND_API_KEY") || null;
        }

        if (resendApiKey) {
          const response = await fetch("https://api.resend.com/emails?limit=100", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
            },
          });

          if (response.ok) {
            const payload = await response.json();
            const resendRows = (payload?.data || []) as AnyRow[];
            const resendMap = new Map<string, AnyRow>();

            for (const row of resendRows) {
              if (row?.id) resendMap.set(String(row.id), row);
            }

            let fallbackDelivered = 0;
            let fallbackOpened = 0;
            let fallbackClicked = 0;
            let fallbackBounced = 0;

            for (const emailId of uniqueEmailIds) {
              const row = resendMap.get(String(emailId));
              if (!row) continue;
              const normalized = normalizeResendLastEvent(row.last_event);

              if (normalized === "clicked") fallbackClicked += 1;
              if (normalized === "opened") fallbackOpened += 1;
              if (normalized === "delivered") fallbackDelivered += 1;
              if (normalized === "bounced") fallbackBounced += 1;
            }

            emailCounts.clicked = Math.max(emailCounts.clicked, fallbackClicked);
            emailCounts.opened = Math.max(emailCounts.opened, fallbackOpened, emailCounts.clicked);
            emailCounts.delivered = Math.max(emailCounts.delivered, fallbackDelivered, emailCounts.opened);
            emailCounts.bounced = Math.max(emailCounts.bounced, fallbackBounced);
          }
        }
      } catch (fallbackError) {
        console.error("analytics-overview Resend fallback error:", fallbackError);
      }
    }

    const recentEmailEvents = [...emailEvents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((evt) => ({
        id: evt.id,
        subject: `Campaign ${evt.campaign_id?.slice?.(0, 8) || ""}`,
        to: [evt.recipient || "-"],
        last_event: normalizeEmailEventType(evt.type),
      }));

    const waSent = waRows.filter((r) => normalizeQueueStatus(r.status) === "sent").length;
    const waInProgress = waRows.filter((r) => normalizeQueueStatus(r.status) === "in_progress").length;
    const waFailed = waRows.filter((r) => normalizeQueueStatus(r.status) === "failed").length;
    const socialSentRows = socialRows.filter((r) => normalizeQueueStatus(r.status) === "sent");
    const socialSent = socialSentRows.length;

    const platformDistributionMap: Record<string, number> = {
      Facebook: 0,
      Instagram: 0,
      Twitter: 0,
      LinkedIn: 0,
      WhatsApp: waSent,
      Email: emailCounts.total,
    };

    for (const row of socialSentRows) {
      const platforms = getSuccessfulPlatformsFromSocialRow(row);
      if (platforms.includes("facebook")) platformDistributionMap.Facebook += 1;
      if (platforms.includes("instagram")) platformDistributionMap.Instagram += 1;
      if (platforms.includes("twitter")) platformDistributionMap.Twitter += 1;
      if (platforms.includes("linkedin")) platformDistributionMap.LinkedIn += 1;
    }

    const platformDistribution = Object.entries(platformDistributionMap)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const trackedClicks = linkClicks.reduce((acc, curr) => acc + Number(curr.clicks || 0), 0);
    const totalReach = waSent + socialSent + emailCounts.delivered + totalSocialInsights.reach;
    const totalEngagement = emailCounts.opened + totalSocialInsights.engagement + totalSocialInsights.likes + totalSocialInsights.comments;
    const totalClicks = emailCounts.clicked + trackedClicks + totalSocialInsights.clicks;

    const dayBuckets: Record<string, { reach: number; engagement: number; clicks: number }> = {};
    const days = timeRange === "30d" ? 30 : 7;
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayBuckets[key] = { reach: 0, engagement: 0, clicks: 0 };
    }

    for (const row of waRows) {
      if (row.status !== "sent") continue;
      const key = toDayKey(row.created_at);
      if (dayBuckets[key]) dayBuckets[key].reach += 1;
    }
    for (const row of socialRows) {
      if (normalizeQueueStatus(row.status) !== "sent") continue;
      const key = toDayKey(row.created_at);
      if (dayBuckets[key]) dayBuckets[key].reach += 1;
    }
    for (const evt of emailEvents) {
      const key = toDayKey(evt.created_at);
      if (!dayBuckets[key]) continue;
      const normalized = normalizeEmailEventType(evt.type);
      if (normalized === "delivered") dayBuckets[key].reach += 1;
      if (normalized === "opened") dayBuckets[key].engagement += 1;
      if (normalized === "clicked") dayBuckets[key].clicks += 1;
    }

    const engagementSeries = Object.entries(dayBuckets).map(([date, metric]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      reach: metric.reach,
      engagement: metric.engagement,
      clicks: metric.clicks,
    }));

    const emailByCampaign: Record<string, { opened: number; clicked: number; delivered: number }> = {};
    for (const evt of emailEvents) {
      const key = String(evt.campaign_id || "");
      if (!key) continue;
      if (!emailByCampaign[key]) emailByCampaign[key] = { opened: 0, clicked: 0, delivered: 0 };
      const normalized = normalizeEmailEventType(evt.type);
      if (normalized === "opened") emailByCampaign[key].opened += 1;
      if (normalized === "clicked") emailByCampaign[key].clicked += 1;
      if (normalized === "delivered") emailByCampaign[key].delivered += 1;
    }

    const linkByCampaign: Record<string, number> = {};
    for (const item of linkClicks) {
      const key = String(item.campaign_id || "");
      if (!key) continue;
      linkByCampaign[key] = (linkByCampaign[key] || 0) + Number(item.clicks || 0);
    }

    const waByCampaign: Record<string, { sent: number }> = {};
    for (const row of waRows) {
      const key = String(row.campaign_id || "");
      if (!key) continue;
      if (!waByCampaign[key]) waByCampaign[key] = { sent: 0 };
      if (normalizeQueueStatus(row.status) === "sent") waByCampaign[key].sent += 1;
    }

    const socialByCampaign: Record<string, { sent: number }> = {};
    const socialErrorsByCampaign: Record<string, { errorCount: number; lastError: string | null }> = {};
    for (const row of socialRows) {
      const key = String(row.campaign_id || "");
      if (!key) continue;
      if (!socialByCampaign[key]) socialByCampaign[key] = { sent: 0 };
      if (normalizeQueueStatus(row.status) === "sent") socialByCampaign[key].sent += 1;

      const rowErrors = extractSocialErrors(row);
      const statusValue = String(row.status || "").toLowerCase();
      const effectiveErrors = rowErrors.length > 0
        ? rowErrors
        : (statusValue === "failed" ? ["Platform delivery failed"] : []);

      if (!socialErrorsByCampaign[key]) {
        socialErrorsByCampaign[key] = { errorCount: 0, lastError: null };
      }

      if (effectiveErrors.length > 0) {
        socialErrorsByCampaign[key].errorCount += effectiveErrors.length;
        socialErrorsByCampaign[key].lastError = effectiveErrors[0];
      }
    }

    const campaignMetrics = campaigns.slice(0, 10).map((campaign) => {
      const emailMetric = emailByCampaign[campaign.id] || { opened: 0, clicked: 0, delivered: 0 };
      const waMetric = waByCampaign[campaign.id] || { sent: 0 };
      const socialMetric = socialByCampaign[campaign.id] || { sent: 0 };
      const socialError = socialErrorsByCampaign[campaign.id] || { errorCount: 0, lastError: null };
      const socialInsight = socialInsightsByCampaign[campaign.id] || { reach: 0, engagement: 0, clicks: 0, likes: 0, comments: 0, shares: 0 };
      const links = linkByCampaign[campaign.id] || 0;
      const status = String(campaign.status || "").toLowerCase();
      const basePerf = status === "sent" ? 70 : status === "scheduled" ? 45 : status === "draft" ? 20 : 30;
      const reach = emailMetric.delivered + waMetric.sent + Math.max(socialMetric.sent, socialInsight.reach);
      const clickBoost = Math.min(30, emailMetric.clicked + links + socialInsight.clicks);
      return {
        id: campaign.id,
        name: campaign.title || "Untitled",
        platforms: normalizePlatformValues(campaign.platforms),
        reach,
        engagement: Math.max(emailMetric.opened, socialInsight.engagement + socialInsight.likes + socialInsight.comments),
        clicks: emailMetric.clicked + links + socialInsight.clicks,
        conversions: 0,
        likes: socialInsight.likes,
        comments: socialInsight.comments,
        shares: socialInsight.shares,
        hasPlatformErrors: socialError.errorCount > 0,
        errorCount: socialError.errorCount,
        lastError: socialError.lastError,
        performance: Math.min(100, basePerf + clickBoost),
      };
    });

    const metaSocialRows = socialRows.filter((row) => {
      const platforms = normalizePlatformValues(row.platforms);
      return platforms.includes("facebook") || platforms.includes("instagram");
    });

    const socialLastSyncedAt = metaSocialRows.reduce<string | null>((latest, row) => {
      const candidate = String(row.updated_at || row.created_at || "");
      if (!candidate) return latest;
      if (!latest) return candidate;
      return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
    }, null);

    const socialFailedCount = metaSocialRows.filter((row) => normalizeQueueStatus(row.status) === "failed").length;
    const socialPartialFailedCount = metaSocialRows.filter((row) => {
      const statusValue = String(row.status || "").toLowerCase();
      return statusValue === "partial_failed" || extractSocialErrors(row).length > 0;
    }).length;

    const whatsappRecent = [...waRows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((row) => ({
        id: row.id,
        phone: row.phone || "-",
        message: String(row.message || "").slice(0, 60),
        status: row.status || "scheduling",
        created_at: row.created_at,
        direction: "outbound",
      }));

    const convIdToPhone = new Map<string, string>();
    for (const conv of conversationRows) {
      convIdToPhone.set(String(conv.id), String(conv.external_contact_id || conv.contact_name || conv.id));
    }

    const whatsappIncoming = [...incomingMessages]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((row) => ({
        id: row.id,
        phone: convIdToPhone.get(String(row.conversation_id)) || row.conversation_id || "-",
        message: String(row.content || "").slice(0, 60),
        status: row.status || "received",
        created_at: row.created_at,
        direction: "inbound",
      }));

    const whatsappRecentActivity = [...whatsappRecent, ...whatsappIncoming]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15);

    const payload = {
      organizationId,
      period: timeRange,
      generatedAt: new Date().toISOString(),
      overview: {
        reach: totalReach,
        engagement: totalEngagement,
        clicks: totalClicks,
        conversions: 0,
      },
      platformDistribution,
      engagementSeries,
      campaignMetrics,
      emailStats: {
        ...emailCounts,
        recent_emails: recentEmailEvents,
      },
      whatsappStats: {
        total: waRows.length + incomingMessages.length,
        sent: waSent,
        inProgress: waInProgress,
        failed: waFailed,
        received: incomingMessages.filter((row) => row.sender_type === "contact").length,
        recent_messages: whatsappRecentActivity,
      },
      socialMeta: {
        lastSyncedAt: socialLastSyncedAt,
        totalPosts: metaSocialRows.length,
        failedPosts: socialFailedCount,
        partialFailedPosts: socialPartialFailedCount,
      },
      diagnostics: {
        campaignsCount: campaigns.length,
        whatsappRows: waRows.length,
        socialRows: socialRows.length,
        emailEvents: emailEvents.length,
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("analytics-overview error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
