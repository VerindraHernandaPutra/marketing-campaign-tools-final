import React from 'react';
import { Paper, Text, Table, Progress, Group, Badge, Stack } from '@mantine/core';
import { Heart, MessageSquare, Repeat2 } from 'lucide-react';

export interface CampaignMetrics {
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
}

interface CampaignPerformanceProps {
  campaigns: CampaignMetrics[];
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'blue',
  instagram: 'pink',
  whatsapp: 'green',
  email: 'violet',
};

const CampaignPerformance: React.FC<CampaignPerformanceProps> = ({ campaigns }) => {
  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  if (!campaigns || campaigns.length === 0) {
    return (
      <Paper shadow="sm" p="lg" withBorder>
        <Text size="lg" fw={600} mb="md">Campaign Performance</Text>
        <Text size="sm" c="dimmed">No Meta social campaigns found in this period.</Text>
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" p="lg" withBorder>
      <Text size="lg" fw={600} mb="md">Campaign Performance</Text>
      <Table highlightOnHover verticalSpacing="sm" striped mt="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ minWidth: 180 }}>Campaign Name</Table.Th>
            <Table.Th style={{ minWidth: 140 }}>Channel</Table.Th>
            <Table.Th style={{ minWidth: 60 }}>Reach</Table.Th>
            <Table.Th style={{ minWidth: 90 }}>Engagement</Table.Th>
            <Table.Th style={{ minWidth: 110 }}>Interactions</Table.Th>
            <Table.Th style={{ minWidth: 60 }}>Clicks</Table.Th>
            <Table.Th style={{ minWidth: 110 }}>Performance</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {campaigns.map(campaign => {
            const likes = campaign.likes || 0;
            const comments = campaign.comments || 0;
            const shares = campaign.shares || 0;
            return (
              <Table.Tr key={campaign.id}>
                <Table.Td>
                  <Text fw={500} size="sm">{campaign.name}</Text>
                  {campaign.hasPlatformErrors && (
                    <Stack gap={2} mt={4}>
                      <Badge color="orange" variant="light" size="xs">
                        Platform issue{(campaign.errorCount || 0) > 1 ? 's' : ''}: {campaign.errorCount || 1}
                      </Badge>
                      {campaign.lastError && (
                        <Text size="xs" c="dimmed" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {campaign.lastError}
                        </Text>
                      )}
                    </Stack>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="wrap">
                    {(campaign.platforms || []).length > 0
                      ? campaign.platforms!.map(platform => (
                          <Badge key={platform} variant="light" size="sm" color={PLATFORM_COLORS[platform] || 'gray'}>
                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                          </Badge>
                        ))
                      : <Text size="xs" c="dimmed">—</Text>
                    }
                  </Group>
                </Table.Td>
                <Table.Td><Text size="sm">{campaign.reach.toLocaleString()}</Text></Table.Td>
                <Table.Td><Text size="sm">{campaign.engagement.toLocaleString()}</Text></Table.Td>
                <Table.Td>
                  <Group gap={10}>
                    <Group gap={3}><Heart size={11} color="var(--mantine-color-pink-5)" /><Text size="xs">{likes}</Text></Group>
                    <Group gap={3}><MessageSquare size={11} color="var(--mantine-color-blue-5)" /><Text size="xs">{comments}</Text></Group>
                    <Group gap={3}><Repeat2 size={11} color="var(--mantine-color-teal-5)" /><Text size="xs">{shares}</Text></Group>
                  </Group>
                </Table.Td>
                <Table.Td><Text size="sm">{campaign.clicks.toLocaleString()}</Text></Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Progress
                      aria-label={`Performance: ${campaign.performance}%`}
                      value={campaign.performance}
                      color={getPerformanceColor(campaign.performance)}
                      w={70} size="sm" radius="xl"
                    />
                    <Text size="xs" fw={700} c={getPerformanceColor(campaign.performance)}>
                      {campaign.performance}%
                    </Text>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Paper>
  );
};

export default CampaignPerformance;
