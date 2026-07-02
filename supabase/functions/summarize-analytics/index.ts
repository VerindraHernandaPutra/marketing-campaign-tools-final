import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CampaignRow { name: string; platforms?: string[]; reach: number; engagement: number; likes?: number; performance: number }
interface PlatformRow { name: string; value: number }
interface AnalyticsPayload {
  period?: string;
  overview?: Record<string, number>;
  emailStats?: Record<string, number>;
  whatsappStats?: Record<string, number>;
  socialMeta?: Record<string, number>;
  campaignMetrics?: CampaignRow[];
  platformDistribution?: PlatformRow[];
}

function buildAnalyticsSummary(data: AnalyticsPayload): string {
  const period = data?.period || '7d';
  const ov = data?.overview || {};
  const email = data?.emailStats || {};
  const wa = data?.whatsappStats || {};
  const social = data?.socialMeta || {};
  const campaigns = (data?.campaignMetrics || []).slice(0, 5);
  const dist = (data?.platformDistribution || []);

  const emailDeliveryRate = email.total > 0 ? Math.round((email.delivered / email.total) * 100) : 0;
  const emailOpenRate = email.delivered > 0 ? Math.round((email.opened / email.delivered) * 100) : 0;
  const emailCTR = email.opened > 0 ? Math.round((email.clicked / email.opened) * 100) : 0;
  const waSentRate = wa.total > 0 ? Math.round((wa.sent / wa.total) * 100) : 0;

  const topCampaigns = campaigns.map((c: CampaignRow) =>
    `"${c.name}" (${(c.platforms || []).join('+')}) — reach:${c.reach}, engagement:${c.engagement}, likes:${c.likes||0}, performance:${c.performance}%`
  ).join('; ');

  const platformSummary = dist.map((p: PlatformRow) => `${p.name}:${p.value}`).join(', ');

  return `
Period: ${period === '1d' ? 'Last 24 hours' : period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : period === '90d' ? 'Last 3 months' : 'Last 6 months'}

OVERALL METRICS:
- Total Reach: ${ov.reach || 0}
- Total Engagement: ${ov.engagement || 0}
- Total Clicks: ${ov.clicks || 0}
- Conversions: ${ov.conversions || 0}

EMAIL (Resend):
- Emails Sent: ${email.total || 0}
- Delivery Rate: ${emailDeliveryRate}% (${email.delivered || 0} delivered, ${email.bounced || 0} bounced)
- Open Rate: ${emailOpenRate}% (${email.opened || 0} opened)
- Click-Through Rate (CTR): ${emailCTR}% (${email.clicked || 0} clicked)

WHATSAPP (Meta Cloud API):
- Total Messages: ${wa.total || 0}
- Sent: ${wa.sent || 0} (${waSentRate}% success rate)
- In Progress: ${wa.inProgress || 0}
- Failed: ${wa.failed || 0}
- Received (inbound): ${wa.received || 0}

META SOCIAL (Facebook + Instagram):
- Total Posts Published: ${social.totalPosts || 0}
- Failed Posts: ${social.failedPosts || 0}
- Partial Failures: ${social.partialFailedPosts || 0}

PLATFORM DISTRIBUTION: ${platformSummary || 'No data'}

TOP CAMPAIGNS: ${topCampaigns || 'No campaigns'}
`.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const analyticsData = body?.analyticsData
    const openAiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openAiKey) {
      throw new Error('Missing OPENAI_API_KEY secret. Set it via: supabase secrets set OPENAI_API_KEY=sk-...')
    }

    const analyticsSummary = buildAnalyticsSummary(analyticsData)

    const systemPrompt = `You are an expert marketing strategist and data analyst for a multi-channel marketing SaaS platform.
You produce concise, specific, and actionable insights for marketing teams.
You ALWAYS respond with valid JSON only — no markdown, no code blocks, no explanation outside the JSON.`

    const userPrompt = `Analyze this marketing performance data and return a JSON analysis.

${analyticsSummary}

Return ONLY this JSON structure (no other text):
{
  "headline": "One punchy sentence (max 12 words) summarizing the overall performance",
  "executive_summary": "2-3 sentences for a marketing manager. Be specific with numbers. Highlight the most meaningful trend.",
  "overall_score": <integer 0-100: 0=critical, 40=poor, 60=average, 75=good, 90=excellent>,
  "score_label": "<one of: Critical | Needs Work | Average | Good | Excellent>",
  "top_performers": [
    {
      "channel": "<Email | WhatsApp | Facebook | Instagram | Overall>",
      "metric": "<metric name>",
      "value": "<formatted value with unit, e.g. '42%' or '1,204'>",
      "insight": "<one sentence why this is notable>"
    }
  ],
  "concerns": [
    {
      "title": "<short issue title>",
      "detail": "<one sentence explaining the issue and its potential impact>"
    }
  ],
  "recommendations": [
    {
      "action": "<specific action to take, starting with a verb>",
      "expected_impact": "<what improvement to expect>"
    }
  ]
}

Rules:
- top_performers: exactly 2-3 items, pick the strongest metrics from the data
- concerns: 1-2 items max; if everything looks healthy return an empty array []
- recommendations: exactly 3 items, ordered by priority (highest impact first)
- If a channel has 0 data, do not highlight it as a performer; flag it as a concern instead
- Use the actual numbers from the data — do not invent figures
- overall_score should reflect the composite health: delivery rates, engagement rates, and failure rates`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 900,
        response_format: { type: 'json_object' },
      }),
    })

    const result = await response.json()

    if (result.error) {
      console.error('OpenAI Error:', result.error)
      throw new Error(result.error.message)
    }

    const rawContent = result.choices?.[0]?.message?.content || '{}'

    let parsed: unknown
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      console.error('Failed to parse OpenAI JSON response:', rawContent)
      throw new Error('AI returned invalid JSON. Try again.')
    }

    return new Response(JSON.stringify({ summary: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('summarize-analytics error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
