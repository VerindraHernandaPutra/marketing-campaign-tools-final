import React from 'react';
import { Paper, Text, Group, SimpleGrid, ThemeIcon, Stack, Table, Badge, Loader, Center, Progress, Tooltip, Card, Box } from '@mantine/core';
import { MessageCircle, CheckCircle, AlertOctagon, Send, Clock3, Inbox, TrendingUp } from 'lucide-react';

interface WhatsAppStats {
  total: number;
  sent: number;
  inProgress: number;
  failed: number;
  received: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recent_messages: any[];
}

interface WhatsAppCampaignMetrics {
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
  performance: number;
}

interface Props {
  stats: WhatsAppStats | null;
  loading: boolean;
  campaigns?: WhatsAppCampaignMetrics[];
}

const WhatsAppPerformance: React.FC<Props> = ({ stats, loading, campaigns }) => {
  if (loading) {
    return (
      <Paper p="xl" withBorder h={300} radius="md">
        <Center h="100%">
          <Stack align="center" gap="xs">
            <Loader size="sm" color="green" />
            <Text size="sm" c="dimmed">Fetching WhatsApp stats...</Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  if (!stats) {
    return (
      <Paper p="md" withBorder radius="md" bg="gray.0">
        <Group>
          <AlertOctagon size={20} color="orange" />
          <Text size="sm">No WhatsApp activity found.</Text>
        </Group>
      </Paper>
    );
  }

  const totalOutbound = stats.sent + stats.inProgress + stats.failed;
  const successRate = totalOutbound > 0 ? Math.round((stats.sent / totalOutbound) * 100) : 0;
  const pendingRate = totalOutbound > 0 ? Math.round((stats.inProgress / totalOutbound) * 100) : 0;
  const failedRate = totalOutbound > 0 ? Math.round((stats.failed / totalOutbound) * 100) : 0;

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Messages</Text>
            <ThemeIcon variant="light" color="gray" size="sm"><MessageCircle size={14} /></ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl">{stats.total}</Text>
            <Text size="xs" c="dimmed" mb={4}>all events</Text>
          </Group>
          <Progress aria-label="Total messages" value={100} size="xs" color="gray" mt="md" />
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Sent</Text>
            <Tooltip label="Delivered successfully via Meta Cloud API">
              <ThemeIcon variant="light" color="teal" size="sm"><CheckCircle size={14} /></ThemeIcon>
            </Tooltip>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl">{successRate}%</Text>
            <Text size="xs" c="teal" fw={500} mb={4}>{stats.sent} sent</Text>
          </Group>
          <Progress aria-label={`Sent: ${successRate}%`} value={successRate} size="xs" color="teal" mt="md" />
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">In Progress</Text>
            <Tooltip label="Queued or still processing">
              <ThemeIcon variant="light" color="blue" size="sm"><Clock3 size={14} /></ThemeIcon>
            </Tooltip>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl">{pendingRate}%</Text>
            <Text size="xs" c="blue" mb={4}>{stats.inProgress} queued</Text>
          </Group>
          <Progress aria-label={`In progress: ${pendingRate}%`} value={pendingRate} size="xs" color="blue" mt="md" />
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Failed</Text>
            <Tooltip label="Messages that could not be sent">
              <ThemeIcon variant="light" color="red" size="sm"><AlertOctagon size={14} /></ThemeIcon>
            </Tooltip>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl">{failedRate}%</Text>
            <Text size="xs" c="red" mb={4}>{stats.failed} failed</Text>
          </Group>
          <Progress aria-label={`Failed: ${failedRate}%`} value={failedRate} size="xs" color="red" mt="md" />
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Received</Text>
            <ThemeIcon variant="light" color="green" size="sm"><Inbox size={14} /></ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl">{stats.received}</Text>
            <Text size="xs" c="green" mb={4}>inbound</Text>
          </Group>
          <Progress aria-label={`Received: ${stats.received}`} value={stats.received > 0 ? 100 : 0} size="xs" color="green" mt="md" />
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <Card withBorder radius="md" p="lg">
          <Group justify="space-between" mb="xl">
            <Text fw={700} size="md">Delivery Funnel</Text>
            <TrendingUp size={18} className="text-gray-400" />
          </Group>
          <Stack gap="lg">
            <Box>
              <Group justify="space-between" mb={4}>
                <Text size="sm">Sent</Text>
                <Text size="sm" fw={700}>{stats.sent}</Text>
              </Group>
              <Progress aria-label={`Sent: ${stats.sent}`} value={successRate} color="teal" size="xl" radius="xl" />
            </Box>
            <Box>
              <Group justify="space-between" mb={4}>
                <Text size="sm">In Progress</Text>
                <Text size="sm" fw={700}>{stats.inProgress}</Text>
              </Group>
              <Progress aria-label={`In progress: ${stats.inProgress}`} value={pendingRate} color="blue" size="xl" radius="xl" />
            </Box>
            <Box>
              <Group justify="space-between" mb={4}>
                <Text size="sm">Failed</Text>
                <Text size="sm" fw={700}>{stats.failed}</Text>
              </Group>
              <Progress aria-label={`Failed: ${stats.failed}`} value={failedRate} color="red" size="xl" radius="xl" striped animated />
            </Box>
          </Stack>
        </Card>

        <Paper withBorder radius="md" p="md" style={{ gridColumn: 'span 2' }}>
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <ThemeIcon variant="light" color="green"><Send size={16} /></ThemeIcon>
              <Text fw={600}>Live WhatsApp Activity</Text>
            </Group>
            <Badge variant="light" color="green">{stats.recent_messages?.length || 0} events</Badge>
          </Group>

          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Direction</Table.Th>
                <Table.Th>Phone / Conversation</Table.Th>
                <Table.Th>Message</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stats.recent_messages && stats.recent_messages.map((message) => (
                <Table.Tr key={message.id}>
                  <Table.Td>
                    <Badge color={message.direction === 'inbound' ? 'green' : 'blue'} variant="light">
                      {message.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" truncate>{message.phone || '-'}</Text>
                  </Table.Td>
                  <Table.Td style={{ maxWidth: 280 }}>
                    <Text size="sm" fw={500} truncate>{message.message || '(No Message)'}</Text>
                  </Table.Td>
                  <Table.Td>
                    {message.status === 'sent' ? (
                      <Badge color="teal" variant="filled">Sent</Badge>
                    ) : message.status === 'failed' ? (
                      <Badge color="red" variant="filled">Failed</Badge>
                    ) : message.status === 'received' ? (
                      <Badge color="green" variant="light">Received</Badge>
                    ) : (
                      <Badge color="blue" variant="outline">Processing</Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {(!stats.recent_messages || stats.recent_messages.length === 0) && (
            <Center p="xl">
              <Text size="sm" c="dimmed">No recent WhatsApp activity found.</Text>
            </Center>
          )}

          {campaigns && campaigns.length > 0 && (
            <Text size="xs" c="dimmed" mt="md">
              {campaigns.length} WhatsApp campaign{campaigns.length === 1 ? '' : 's'} are included in this tab.
            </Text>
          )}
        </Paper>
      </SimpleGrid>
    </Stack>
  );
};

export default WhatsAppPerformance;
