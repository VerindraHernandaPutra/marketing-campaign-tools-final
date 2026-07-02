import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Title, Box, Grid, Select, Group, Button, Paper,
  Text, ThemeIcon, Tabs, Badge, Divider, SimpleGrid, Stack
} from '@mantine/core';
import {
  SparklesIcon, RefreshCw, Mail, LayoutDashboard, Share2,
  MessageCircle, Eye, Heart, MousePointerClick, TrendingUp, Clock,
  Lightbulb, AlertTriangle, Trophy
} from 'lucide-react';
import PageShell from '../../shared/PageShell';
import PageHeader from '../../shared/PageHeader';
import MetricsCard from '../../analytics/MetricsCard';
import EngagementChart from '../../analytics/EngagementChart';
import PlatformBreakdown from '../../analytics/PlatformBreakdown';
import EmailPerformance from '../../analytics/EmailPerformance';
import WhatsAppPerformance from '../../analytics/WhatsAppPerformance';
import MetaSocialPerformance from '../../analytics/MetaSocialPerformance';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../auth/UserContext';

type TrendDirection = 'up' | 'down';

interface AnalyticsOverviewResponse {
  generatedAt?: string;
  period?: string;
  overview: {
    reach: number;
    engagement: number;
    clicks: number;
    conversions: number;
  };
  platformDistribution: { name: string; value: number }[];
  engagementSeries: { date: string; reach: number; engagement: number; clicks: number }[];
  campaignMetrics: {
    id: string;
    name: string;
    platforms?: string[];
    reach: number;
    engagement: number;
    clicks: number;
    conversions: number;
    likes?: number;
    comments?: number;
    shares?: number;
    hasPlatformErrors?: boolean;
    errorCount?: number;
    lastError?: string | null;
    performance: number;
  }[];
  emailStats: {
    total: number;
    delivered: number;
    sent: number;
    bounced: number;
    opened: number;
    clicked: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recent_emails: any[];
  };
  whatsappStats?: {
    total: number;
    sent: number;
    inProgress: number;
    failed: number;
    received: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recent_messages: any[];
  };
  socialMeta?: {
    lastSyncedAt?: string | null;
    totalPosts?: number;
    failedPosts?: number;
    partialFailedPosts?: number;
  };
}

const TIME_RANGE_OPTIONS = [
  { value: '1d',   label: 'Last 24 hours' },
  { value: '7d',   label: 'Last 7 days' },
  { value: '30d',  label: 'Last 30 days' },
  { value: '90d',  label: 'Last 3 months' },
  { value: '180d', label: 'Last 6 months' },
];

const TIME_RANGE_LABELS: Record<string, string> = {
  '1d':   'Last 24 hours',
  '7d':   'Last 7 days',
  '30d':  'Last 30 days',
  '90d':  'Last 3 months',
  '180d': 'Last 6 months',
};

interface TabHeaderProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  lastSynced?: string | null;
  badge?: React.ReactNode;
}

const TabHeader: React.FC<TabHeaderProps> = ({ icon, iconColor, title, description, lastSynced, badge }) => (
  <Box mb="lg">
    <Group justify="space-between" align="flex-start">
      <Group gap="sm">
        <ThemeIcon color={iconColor} variant="light" size="xl" radius="md">{icon}</ThemeIcon>
        <Box>
          <Group gap="xs">
            <Title order={3}>{title}</Title>
            {badge}
          </Group>
          <Text size="sm" c="dimmed" mt={2}>{description}</Text>
        </Box>
      </Group>
      {lastSynced && (
        <Group gap={4}>
          <Clock size={12} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed">Last synced: {lastSynced}</Text>
        </Group>
      )}
    </Group>
    <Divider mt="md" />
  </Box>
);

interface AnalysisSummary {
  headline: string;
  executive_summary: string;
  overall_score: number;
  score_label: string;
  top_performers: { channel: string; metric: string; value: string; insight: string }[];
  concerns: { title: string; detail: string }[];
  recommendations: { action: string; expected_impact: string }[];
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#12b886';
  if (score >= 75) return '#40c057';
  if (score >= 60) return '#fab005';
  if (score >= 40) return '#fd7e14';
  return '#fa5252';
}

const Analytics: React.FC = () => {
  const { currentOrgId } = useUserRole();
  const [timeRange, setTimeRange] = useState<string | null>('7d');
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const {
    data: analyticsData,
    isLoading: loadingAnalytics,
    isFetching: fetchingAnalytics,
    refetch: refetchAnalytics,
    dataUpdatedAt,
  } = useQuery<AnalyticsOverviewResponse | null>({
    queryKey: ['analyticsOverview', currentOrgId, timeRange],
    enabled: !!currentOrgId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('analytics-overview', {
        body: { organizationId: currentOrgId, timeRange: timeRange || '7d' },
      });
      if (error) throw error;
      return data || null;
    },
  });

  const lastSynced = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleString()
    : null;

  const emailStats = analyticsData?.emailStats || null;
  const whatsappStats = analyticsData?.whatsappStats || null;
  const socialMeta = analyticsData?.socialMeta || null;

  const { overview, platformData, campaignData, engagementData, metaCampaigns, whatsappCampaigns } = useMemo(() => {
    const overviewData = {
      reach:       { value: (analyticsData?.overview.reach       || 0).toLocaleString(), change: 0, trend: 'up' as TrendDirection },
      engagement:  { value: (analyticsData?.overview.engagement  || 0).toLocaleString(), change: 0, trend: 'up' as TrendDirection },
      clicks:      { value: (analyticsData?.overview.clicks      || 0).toLocaleString(), change: 0, trend: 'up' as TrendDirection },
      conversions: { value: String(analyticsData?.overview.conversions || 0),            change: 0, trend: 'up' as TrendDirection },
    };

    const pData = analyticsData?.platformDistribution?.length
      ? analyticsData.platformDistribution
      : [{ name: 'No Data', value: 1 }];

    const cData = analyticsData?.campaignMetrics || [];
    const eData = analyticsData?.engagementSeries || [];
    const metaCampaigns     = cData.filter(c => c.platforms?.some(p => ['facebook', 'instagram'].includes(String(p).toLowerCase())));
    const whatsappCampaigns = cData.filter(c => c.platforms?.some(p => String(p).toLowerCase() === 'whatsapp'));

    return { overview: overviewData, platformData: pData, campaignData: cData, engagementData: eData, metaCampaigns, whatsappCampaigns };
  }, [analyticsData]);

  const handleGenerateSummary = async () => {
    const totalCampaigns = campaignData.length;
    const totalReach = analyticsData?.overview?.reach || 0;
    if (totalCampaigns === 0 && totalReach === 0) {
      alert('Data analitik belum mencukupi. Jalankan setidaknya satu kampanye terlebih dahulu sebelum membuat ringkasan.');
      return;
    }

    setIsSummarizing(true);
    try {
      const analyticsPayload = analyticsData || { period: timeRange, overview, platformDistribution: platformData, campaignMetrics: campaignData };
      const { data, error } = await supabase.functions.invoke('summarize-analytics', {
        body: { analyticsData: analyticsPayload, emailStats },
      });
      if (error) throw error;
      if (data?.insufficientData) {
        alert('Data analitik belum mencukupi untuk menghasilkan ringkasan yang akurat. Coba lagi setelah lebih banyak kampanye berjalan.');
        return;
      }
      if (data?.summary) setSummary(data.summary as AnalysisSummary);
    } catch (err) {
      console.error('AI Summary failed:', err);
      alert('Gagal membuat ringkasan analitik. Pastikan OPENAI_API_KEY sudah dikonfigurasi di Supabase secrets.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const periodLabel = TIME_RANGE_LABELS[timeRange || '7d'] || 'Last 7 days';

  return (
    <PageShell>
      <PageHeader
        icon={<TrendingUp size={22} />}
        title="Insight"
        subtitle={`Analytics & performance — Period: ${periodLabel}`}
        gradient={{ from: 'orange', to: 'red' }}
        action={
          <Group>
            <Button
              variant="default"
              leftSection={<RefreshCw size={16} className={fetchingAnalytics ? 'animate-spin' : ''} />}
              onClick={() => refetchAnalytics()}
              loading={fetchingAnalytics}
            >
              Refresh
            </Button>
            <Select
              aria-label="Time range"
              value={timeRange}
              onChange={setTimeRange}
              data={TIME_RANGE_OPTIONS}
              w={160}
              leftSection={<Clock size={14} />}
            />
          </Group>
        }
      />

      {/* AI Summary Banner */}
      <Paper p="xl" radius="lg" mb="xl" style={{
        background: 'linear-gradient(135deg, var(--mantine-color-violet-9) 0%, var(--mantine-color-grape-7) 100%)',
        boxShadow: '0 10px 30px -10px rgba(132, 94, 247, 0.4)',
        color: 'white',
        overflow: 'visible',
      }}>
        <Group justify="space-between" align="center">
          <Group gap="lg">
            <ThemeIcon size={56} radius="xl" variant="white" color="violet">
              <SparklesIcon size={32} />
            </ThemeIcon>
            <Box>
              <Text fw={800} size="xl" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>AI Marketing Strategist</Text>
              <Text size="sm" opacity={0.9} mt={4}>Unlock deep, actionable insights generated instantly from your real campaign data.</Text>
            </Box>
          </Group>
          <Button
            variant="white"
            color="violet"
            onClick={handleGenerateSummary}
            loading={isSummarizing}
            size="md"
            radius="xl"
            fw={700}
            leftSection={<SparklesIcon size={16} />}
            style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
          >
            {summary ? 'Regenerate Analysis' : 'Generate Analysis'}
          </Button>
        </Group>
        {summary && (
          <Box mt="xl" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', overflow: 'visible' }}>
            <Group justify="space-between" align="flex-start" mb="lg" wrap="nowrap">
              <Box style={{ flex: 1, marginRight: 16 }}>
                <Text fw={800} size="lg" style={{ color: 'white', lineHeight: 1.3 }}>{summary.headline}</Text>
                <Text size="sm" mt={8} style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.65 }}>{summary.executive_summary}</Text>
              </Box>
              <Box style={{ textAlign: 'center', flexShrink: 0 }}>
                <Box style={{ position: 'relative', width: 96, height: 96, margin: '0 auto' }}>
                  <svg width={96} height={96} style={{ overflow: 'visible', display: 'block' }}>
                    <circle cx={48} cy={48} r={38} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={8} />
                    <circle
                      cx={48} cy={48} r={38}
                      fill="none"
                      stroke={getScoreColor(summary.overall_score)}
                      strokeWidth={8}
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 38 * summary.overall_score / 100} ${2 * Math.PI * 38}`}
                      transform="rotate(-90 48 48)"
                    />
                    <text x={48} y={44} textAnchor="middle" fill="white" fontSize={16} fontWeight={900} fontFamily="inherit">{summary.overall_score}</text>
                    <text x={48} y={58} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={10} fontFamily="inherit">/100</text>
                  </svg>
                </Box>
                <Badge size="sm" variant="filled" mt={6} style={{ background: getScoreColor(summary.overall_score), color: 'white' }}>{summary.score_label}</Badge>
              </Box>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Box style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 14 }}>
                <Group gap={6} mb={10}>
                  <Trophy size={13} color="rgba(255,255,255,0.9)" />
                  <Text size="xs" fw={700} tt="uppercase" style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 }}>Top Performers</Text>
                </Group>
                <Stack gap={10}>
                  {summary.top_performers.map((p, i) => (
                    <Box key={i}>
                      <Group justify="space-between" mb={2}>
                        <Text size="xs" fw={600} style={{ color: 'rgba(255,255,255,0.9)' }}>{p.channel} · {p.metric}</Text>
                        <Badge size="xs" color="teal" variant="filled" style={{ flexShrink: 0 }}>{p.value}</Badge>
                      </Group>
                      <Text size="xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{p.insight}</Text>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Box style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 14 }}>
                <Group gap={6} mb={10}>
                  <AlertTriangle size={13} color="rgba(255,255,255,0.9)" />
                  <Text size="xs" fw={700} tt="uppercase" style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 }}>Watch Points</Text>
                </Group>
                <Stack gap={10}>
                  {summary.concerns.length === 0
                    ? <Text size="xs" style={{ color: 'rgba(255,255,255,0.55)' }}>No major concerns — everything looks healthy!</Text>
                    : summary.concerns.map((c, i) => (
                        <Box key={i}>
                          <Text size="xs" fw={600} style={{ color: 'rgba(255,255,255,0.9)' }}>{c.title}</Text>
                          <Text size="xs" mt={2} style={{ color: 'rgba(255,255,255,0.55)' }}>{c.detail}</Text>
                        </Box>
                      ))
                  }
                </Stack>
              </Box>

              <Box style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 14 }}>
                <Group gap={6} mb={10}>
                  <Lightbulb size={13} color="rgba(255,255,255,0.9)" />
                  <Text size="xs" fw={700} tt="uppercase" style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 }}>Recommendations</Text>
                </Group>
                <Stack gap={10}>
                  {summary.recommendations.map((r, i) => (
                    <Box key={i}>
                      <Text size="xs" fw={600} style={{ color: 'rgba(255,255,255,0.9)' }}>{r.action}</Text>
                      <Text size="xs" mt={2} style={{ color: 'rgba(255,255,255,0.55)' }}>→ {r.expected_impact}</Text>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </SimpleGrid>
          </Box>
        )}
      </Paper>

      <Tabs defaultValue="email" variant="pills" radius="md" mb="xl">
        <Tabs.List mb="lg">
          <Tabs.Tab value="email"    leftSection={<Mail size={16} />}>Email Marketing</Tabs.Tab>
          <Tabs.Tab value="meta"     leftSection={<Share2 size={16} />}>Meta Social</Tabs.Tab>
          <Tabs.Tab value="whatsapp" leftSection={<MessageCircle size={16} />}>WhatsApp</Tabs.Tab>
          <Tabs.Tab value="overview" leftSection={<LayoutDashboard size={16} />}>Web & Overview</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="email">
          <TabHeader
            icon={<Mail size={20} />}
            iconColor="grape"
            title="Email Campaigns (Resend)"
            description="Delivery, open rate, and click-through analytics from tracked email campaign events."
            lastSynced={lastSynced}
            badge={emailStats?.total ? <Badge color="grape" variant="light" size="sm">{emailStats.total} emails</Badge> : undefined}
          />
          <EmailPerformance stats={emailStats} loading={loadingAnalytics} />
        </Tabs.Panel>

        <Tabs.Panel value="meta">
          <TabHeader
            icon={<Share2 size={20} />}
            iconColor="blue"
            title="Meta Social (Facebook & Instagram)"
            description="Reach, engagement, likes, comments, and shares from published Facebook and Instagram posts."
            lastSynced={lastSynced}
            badge={metaCampaigns.length > 0 ? <Badge color="blue" variant="light" size="sm">{metaCampaigns.length} campaigns</Badge> : undefined}
          />
          <MetaSocialPerformance
            campaigns={metaCampaigns}
            socialMeta={socialMeta}
            loading={loadingAnalytics}
          />
        </Tabs.Panel>

        <Tabs.Panel value="whatsapp">
          <TabHeader
            icon={<MessageCircle size={20} />}
            iconColor="green"
            title="WhatsApp Business (Meta Cloud API)"
            description="Outbound delivery stats and inbound inbox activity. Counts are split from Meta Social so campaign types don't overlap."
            lastSynced={lastSynced}
            badge={whatsappStats?.total ? <Badge color="green" variant="light" size="sm">{whatsappStats.total} messages</Badge> : undefined}
          />
          <WhatsAppPerformance stats={whatsappStats} loading={loadingAnalytics} campaigns={whatsappCampaigns} />
        </Tabs.Panel>

        <Tabs.Panel value="overview">
          <TabHeader
            icon={<LayoutDashboard size={20} />}
            iconColor="indigo"
            title="Web & Campaign Overview"
            description="Aggregated totals across all channels — reach, engagement, clicks, and conversions for the selected period."
            lastSynced={lastSynced}
          />
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <MetricsCard title="Total Reach" value={overview.reach.value} change={overview.reach.change} trend={overview.reach.trend} icon={Eye} color="blue" subtitle="Across all channels" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <MetricsCard title="Total Engagement" value={overview.engagement.value} change={overview.engagement.change} trend={overview.engagement.trend} icon={Heart} color="violet" subtitle="Opens, likes & comments" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <MetricsCard title="Total Clicks" value={overview.clicks.value} change={overview.clicks.change} trend={overview.clicks.trend} icon={MousePointerClick} color="orange" subtitle="Link clicks tracked" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
              <MetricsCard title="Conversions" value={overview.conversions.value} change={overview.conversions.change} trend={overview.conversions.trend} icon={TrendingUp} color="green" subtitle="Tracked conversions" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, lg: 8 }}><EngagementChart data={engagementData} /></Grid.Col>
            <Grid.Col span={{ base: 12, lg: 4 }}><PlatformBreakdown data={platformData} /></Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>
    </PageShell>
  );
};

export default Analytics;
