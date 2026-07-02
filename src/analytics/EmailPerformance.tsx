import React from 'react';
import { Paper, Text, Group, SimpleGrid, ThemeIcon, Stack, Table, Badge, Loader, Center, Progress, Tooltip, Card, Box } from '@mantine/core';
import { Mail, CheckCircle, AlertOctagon, Send, MousePointerClick, Eye, TrendingUp } from 'lucide-react';

interface EmailStats {
  total: number;
  delivered: number;
  sent: number;
  bounced: number;
  opened: number;
  clicked: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recent_emails: any[];
}

interface Props {
  stats: EmailStats | null;
  loading: boolean;
}

const EmailPerformance: React.FC<Props> = ({ stats, loading }) => {
  if (loading) {
    return (
      <Paper p="xl" withBorder h={300} radius="md">
        <Center h="100%">
          <Stack align="center" gap="xs">
            <Loader size="sm" color="blue" />
            <Text size="sm" c="dimmed">Fetching latest marketing data...</Text>
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
          <Text size="sm">No campaign data found.</Text>
        </Group>
      </Paper>
    );
  }

  const deliveryRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;
  const openRate = stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 100) : 0;
  const clickRate = stats.opened > 0 ? Math.round((stats.clicked / stats.opened) * 100) : 0;

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Sent</Text>
            <ThemeIcon variant="light" color="gray" size="sm"><Send size={14} /></ThemeIcon>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl">{stats.total}</Text>
            <Text size="xs" c="dimmed" mb={4}>emails</Text>
          </Group>
          <Progress aria-label="Total sent emails" value={100} size="xs" color="gray" mt="md" />
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Delivered</Text>
            <Tooltip label="Emails that successfully reached the inbox">
              <ThemeIcon variant="light" color={deliveryRate > 95 ? 'teal' : 'orange'} size="sm"><CheckCircle size={14} /></ThemeIcon>
            </Tooltip>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl">{deliveryRate}%</Text>
            <Text size="xs" c="teal" fw={500} mb={4}>{stats.delivered} reached</Text>
          </Group>
          <Progress aria-label={`Delivery rate: ${deliveryRate}%`} value={deliveryRate} size="xs" color="teal" mt="md" />
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Open Rate</Text>
            <Tooltip label="Percentage of delivered emails that were opened">
              <ThemeIcon variant="light" color="blue" size="sm"><Eye size={14} /></ThemeIcon>
            </Tooltip>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl">{openRate}%</Text>
            <Text size="xs" c="blue" mb={4}>{stats.opened} read</Text>
          </Group>
          <Progress aria-label={`Open rate: ${openRate}%`} value={openRate} size="xs" color="blue" mt="md" />
        </Paper>

        <Paper withBorder p="md" radius="md" style={{ borderColor: 'var(--mantine-color-violet-4)', backgroundColor: 'var(--mantine-color-violet-0)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="violet.9" fw={700} tt="uppercase">Click Rate (CTR)</Text>
            <Tooltip label="Percentage of readers who clicked a link">
              <ThemeIcon variant="filled" color="violet" size="sm"><MousePointerClick size={14} /></ThemeIcon>
            </Tooltip>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text fw={700} size="xl" c="violet.9">{clickRate}%</Text>
            <Text size="xs" c="violet.7" mb={4} fw={600}>{stats.clicked} clicks</Text>
          </Group>
          <Progress aria-label={`Click-through rate: ${clickRate}%`} value={clickRate} size="xs" color="violet" mt="md" />
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <Card withBorder radius="md" p="lg">
          <Group justify="space-between" mb="xl">
            <Text fw={700} size="md">Engagement Funnel</Text>
            <TrendingUp size={18} className="text-gray-400" />
          </Group>
          <Stack gap="lg">
            <Box>
              <Group justify="space-between" mb={4}>
                <Text size="sm">Sent</Text>
                <Text size="sm" fw={700}>{stats.total}</Text>
              </Group>
              <Progress aria-label="Emails sent" value={100} color="gray" size="xl" radius="xl" />
            </Box>
            <Box>
              <Group justify="space-between" mb={4}>
                <Text size="sm">Delivered</Text>
                <Text size="sm" fw={700}>{stats.delivered}</Text>
              </Group>
              <Progress aria-label={`Delivered: ${stats.delivered}`} value={deliveryRate} color="teal" size="xl" radius="xl" />
            </Box>
            <Box>
              <Group justify="space-between" mb={4}>
                <Text size="sm">Opened</Text>
                <Text size="sm" fw={700}>{stats.opened}</Text>
              </Group>
              <Progress aria-label={`Opened: ${stats.opened}`} value={(stats.opened / stats.total) * 100} color="blue" size="xl" radius="xl" />
            </Box>
            <Box>
              <Group justify="space-between" mb={4}>
                <Text size="sm">Clicked Link</Text>
                <Text size="sm" fw={700}>{stats.clicked}</Text>
              </Group>
              <Progress aria-label={`Clicked: ${stats.clicked}`} value={(stats.clicked / stats.total) * 100} color="violet" size="xl" radius="xl" striped animated />
            </Box>
          </Stack>
        </Card>

        <Paper withBorder radius="md" p="md" style={{ gridColumn: 'span 2' }}>
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <ThemeIcon variant="light" color="gray"><Mail size={16} /></ThemeIcon>
              <Text fw={600}>Live Activity Feed</Text>
            </Group>
            <Badge variant="light" color="gray">{stats.recent_emails?.length || 0} events</Badge>
          </Group>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Subject</Table.Th>
                <Table.Th>Recipient</Table.Th>
                <Table.Th>Latest Event</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stats.recent_emails && stats.recent_emails.map((email) => (
                <Table.Tr key={email.id}>
                  <Table.Td style={{ maxWidth: 200 }}>
                    <Text size="sm" fw={500} truncate>{email.subject || '(No Subject)'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{email.to[0]}</Text>
                  </Table.Td>
                  <Table.Td>
                    {email.last_event === 'clicked' ? (
                      <Badge color="violet" variant="filled" leftSection={<MousePointerClick size={10} />}>Clicked</Badge>
                    ) : email.last_event === 'opened' ? (
                      <Badge color="blue" variant="light" leftSection={<Eye size={10} />}>Read</Badge>
                    ) : email.last_event === 'delivered' ? (
                      <Badge color="teal" variant="outline" leftSection={<CheckCircle size={10} />}>Delivered</Badge>
                    ) : email.last_event === 'bounced' ? (
                      <Badge color="red" variant="filled" leftSection={<AlertOctagon size={10} />}>Bounced</Badge>
                    ) : (
                      <Badge color="gray" variant="dot">Sent</Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          {(!stats.recent_emails || stats.recent_emails.length === 0) && (
            <Center p="xl">
              <Text size="sm" c="dimmed">No recent activity found.</Text>
            </Center>
          )}
        </Paper>
      </SimpleGrid>
    </Stack>
  );
};

export default EmailPerformance;
