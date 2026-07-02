import React from 'react';
import {
  Paper, Text, Group, SimpleGrid, ThemeIcon, Stack, Badge,
  Loader, Center, Progress, Card, Box, Alert, Divider
} from '@mantine/core';
import {
  Share2, Eye, TrendingUp, Heart, MessageSquare, Repeat2, AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import CampaignPerformance from './CampaignPerformance';
import type { CampaignMetrics } from './CampaignPerformance';

interface SocialMeta {
  lastSyncedAt?: string | null;
  totalPosts?: number;
  failedPosts?: number;
  partialFailedPosts?: number;
}

interface Props {
  campaigns: CampaignMetrics[];
  socialMeta: SocialMeta | null;
  loading: boolean;
}

const MetaSocialPerformance: React.FC<Props> = ({ campaigns, socialMeta, loading }) => {
  if (loading) {
    return (
      <Paper p="xl" withBorder h={300} radius="md">
        <Center h="100%">
          <Stack align="center" gap="xs">
            <Loader size="sm" color="blue" />
            <Text size="sm" c="dimmed">Fetching Meta social insights...</Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Paper p="xl" withBorder radius="md" bg="gray.0">
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Share2 size={48} color="var(--mantine-color-gray-4)" strokeWidth={1} />
            <Text size="sm" c="dimmed" fw={500}>No Meta Social campaigns found in this period.</Text>
            <Text size="xs" c="dimmed">Create a Facebook or Instagram campaign to see analytics here.</Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  const totalPosts = socialMeta?.totalPosts || campaigns.length;
  const totalReach = campaigns.reduce((sum, c) => sum + c.reach, 0);
  const totalEngagement = campaigns.reduce((sum, c) => sum + c.engagement, 0);
  const totalLikes = campaigns.reduce((sum, c) => sum + (c.likes || 0), 0);
  const totalComments = campaigns.reduce((sum, c) => sum + (c.comments || 0), 0);
  const totalShares = campaigns.reduce((sum, c) => sum + (c.shares || 0), 0);
  const totalInteractions = totalLikes + totalComments + totalShares;

  const fbCampaigns = campaigns.filter(c => c.platforms?.includes('facebook'));
  const igCampaigns = campaigns.filter(c => c.platforms?.includes('instagram'));
  const fbReach = fbCampaigns.reduce((sum, c) => sum + c.reach, 0);
  const igReach = igCampaigns.reduce((sum, c) => sum + c.reach, 0);
  const fbEngagement = fbCampaigns.reduce((sum, c) => sum + c.engagement, 0);
  const igEngagement = igCampaigns.reduce((sum, c) => sum + c.engagement, 0);
  const fbLikes = fbCampaigns.reduce((sum, c) => sum + (c.likes || 0), 0);
  const igLikes = igCampaigns.reduce((sum, c) => sum + (c.likes || 0), 0);

  const totalPlatformReach = fbReach + igReach || 1;
  const maxEngagement = Math.max(fbEngagement, igEngagement) || 1;

  const hasIssues = (socialMeta?.partialFailedPosts || 0) > 0 || (socialMeta?.failedPosts || 0) > 0;

  const pieData = [
    { name: 'Facebook', value: Math.max(fbCampaigns.length, fbReach > 0 ? fbReach : 0) || fbCampaigns.length },
    { name: 'Instagram', value: Math.max(igCampaigns.length, igReach > 0 ? igReach : 0) || igCampaigns.length },
  ].filter(d => d.value > 0);

  const fbPct = Math.round((fbCampaigns.length / (fbCampaigns.length + igCampaigns.length || 1)) * 100);
  const igPct = 100 - fbPct;

  return (
    <Stack gap="lg">
      {hasIssues && (
        <Alert icon={<AlertCircle size={16} />} color="orange" title="Platform Issues Detected" variant="light">
          <Stack gap={2}>
            {(socialMeta?.failedPosts || 0) > 0 && (
              <Text size="sm">{socialMeta?.failedPosts} campaign(s) failed to publish on all platforms.</Text>
            )}
            {(socialMeta?.partialFailedPosts || 0) > 0 && (
              <Text size="sm">{socialMeta?.partialFailedPosts} campaign(s) had partial platform failures.</Text>
            )}
            <Text size="xs" c="dimmed" mt={2}>Check the campaign table below for error details.</Text>
          </Stack>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 2, lg: 4 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Posts</Text>
            <ThemeIcon variant="light" color="blue" size="sm"><Share2 size={14} /></ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl">{totalPosts}</Text>
            <Text size="xs" c="dimmed" mb={4}>published</Text>
          </Group>
          <Progress value={100} size="xs" color="blue" mt="md" />
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Reach</Text>
            <ThemeIcon variant="light" color="cyan" size="sm"><Eye size={14} /></ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl">{totalReach.toLocaleString()}</Text>
            <Text size="xs" c="cyan" mb={4}>impressions</Text>
          </Group>
          <Progress value={totalReach > 0 ? 100 : 0} size="xs" color="cyan" mt="md" />
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Engagement</Text>
            <ThemeIcon variant="light" color="violet" size="sm"><TrendingUp size={14} /></ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl">{totalEngagement.toLocaleString()}</Text>
            <Text size="xs" c="violet" mb={4}>total actions</Text>
          </Group>
          <Progress value={totalEngagement > 0 ? 100 : 0} size="xs" color="violet" mt="md" />
        </Paper>

        <Paper withBorder p="md" radius="md" style={{ borderColor: 'var(--mantine-color-pink-3)', backgroundColor: 'var(--mantine-color-pink-0)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="pink.9" fw={700} tt="uppercase">Interactions</Text>
            <ThemeIcon variant="filled" color="pink" size="sm"><Heart size={14} /></ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl" c="pink.9">{totalInteractions.toLocaleString()}</Text>
            <Text size="xs" c="pink.6" mb={4} fw={600}>total</Text>
          </Group>
          <Group gap={8} mt="xs">
            <Text size="xs" c="dimmed">{totalLikes} likes</Text>
            <Text size="xs" c="dimmed">·</Text>
            <Text size="xs" c="dimmed">{totalComments} comments</Text>
            <Text size="xs" c="dimmed">·</Text>
            <Text size="xs" c="dimmed">{totalShares} shares</Text>
          </Group>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <Card withBorder radius="md" p="lg">
          <Text fw={700} size="md" mb="lg">Platform Split</Text>

          <Center mb="sm">
            <PieChart width={160} height={160}>
              <Pie
                data={pieData}
                cx={80}
                cy={80}
                innerRadius={48}
                outerRadius={72}
                paddingAngle={4}
                dataKey="value"
              >
                <Cell fill="#1877F2" strokeWidth={0} />
                <Cell fill="#E4405F" strokeWidth={0} />
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </Center>

          <Stack gap={6} mb="lg">
            <Group justify="space-between">
              <Group gap={6}>
                <Box w={10} h={10} style={{ borderRadius: 2, background: '#1877F2', flexShrink: 0 }} />
                <Text size="xs">Facebook</Text>
              </Group>
              <Text size="xs" fw={700}>{fbPct}% · {fbCampaigns.length} posts</Text>
            </Group>
            <Group justify="space-between">
              <Group gap={6}>
                <Box w={10} h={10} style={{ borderRadius: 2, background: '#E4405F', flexShrink: 0 }} />
                <Text size="xs">Instagram</Text>
              </Group>
              <Text size="xs" fw={700}>{igPct}% · {igCampaigns.length} posts</Text>
            </Group>
          </Stack>

          <Divider mb="lg" />

          <Stack gap="md">
            <Box>
              <Group gap={6} mb={6}>
                <Box w={8} h={8} style={{ borderRadius: '50%', background: '#1877F2' }} />
                <Text size="sm" fw={600}>Facebook</Text>
                <Badge size="xs" color="blue" variant="light">{fbCampaigns.length} posts</Badge>
              </Group>
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Reach</Text>
                  <Text size="xs" fw={600}>{fbReach.toLocaleString()}</Text>
                </Group>
                <Progress value={(fbReach / totalPlatformReach) * 100} color="blue" size="sm" radius="xl" />
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Engagement</Text>
                  <Text size="xs" fw={600}>{fbEngagement.toLocaleString()}</Text>
                </Group>
                <Progress value={(fbEngagement / maxEngagement) * 100} color="blue" size="sm" radius="xl" />
                <Group justify="space-between" mt={2}>
                  <Group gap={4}><Heart size={10} color="#E4405F" /><Text size="xs" c="dimmed">Likes</Text></Group>
                  <Text size="xs" fw={600}>{fbLikes}</Text>
                </Group>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Group gap={6} mb={6}>
                <Box w={8} h={8} style={{ borderRadius: '50%', background: '#E4405F' }} />
                <Text size="sm" fw={600}>Instagram</Text>
                <Badge size="xs" color="pink" variant="light">{igCampaigns.length} posts</Badge>
              </Group>
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Reach</Text>
                  <Text size="xs" fw={600}>{igReach.toLocaleString()}</Text>
                </Group>
                <Progress value={(igReach / totalPlatformReach) * 100} color="pink" size="sm" radius="xl" />
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Engagement</Text>
                  <Text size="xs" fw={600}>{igEngagement.toLocaleString()}</Text>
                </Group>
                <Progress value={(igEngagement / maxEngagement) * 100} color="pink" size="sm" radius="xl" />
                <Group justify="space-between" mt={2}>
                  <Group gap={4}><Heart size={10} color="#E4405F" /><Text size="xs" c="dimmed">Likes</Text></Group>
                  <Text size="xs" fw={600}>{igLikes}</Text>
                </Group>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="sm">Total Interactions</Text>
              <Stack gap={6}>
                <Group justify="space-between">
                  <Group gap={4}><Heart size={12} color="var(--mantine-color-pink-5)" /><Text size="xs">Likes</Text></Group>
                  <Text size="xs" fw={700}>{totalLikes.toLocaleString()}</Text>
                </Group>
                <Group justify="space-between">
                  <Group gap={4}><MessageSquare size={12} color="var(--mantine-color-blue-5)" /><Text size="xs">Comments</Text></Group>
                  <Text size="xs" fw={700}>{totalComments.toLocaleString()}</Text>
                </Group>
                <Group justify="space-between">
                  <Group gap={4}><Repeat2 size={12} color="var(--mantine-color-teal-5)" /><Text size="xs">Shares</Text></Group>
                  <Text size="xs" fw={700}>{totalShares.toLocaleString()}</Text>
                </Group>
              </Stack>
            </Box>
          </Stack>
        </Card>

        <Box style={{ gridColumn: 'span 2', overflowX: 'auto' }}>
          <CampaignPerformance campaigns={campaigns} />
        </Box>
      </SimpleGrid>
    </Stack>
  );
};

export default MetaSocialPerformance;
