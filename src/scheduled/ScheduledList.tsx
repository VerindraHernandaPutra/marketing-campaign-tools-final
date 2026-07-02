import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Group, Text, Badge, Paper, SimpleGrid, Loader, Center,
  ThemeIcon, ActionIcon, Tooltip, Select, TextInput, Table,
  Modal, Stack, Divider, Button, Avatar, ScrollArea
} from '@mantine/core';
import {
  SearchIcon, EditIcon, TrashIcon, CalendarIcon,
  ClockIcon, CheckCircleIcon, XCircleIcon, FileTextIcon,
  RocketIcon, RefreshCwIcon, EyeIcon
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useUserRole } from '../auth/UserContext';
import { useNavigate } from 'react-router-dom';

interface Campaign {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  scheduled_date: string | null;
  status: string;
  created_at: string;
  platform_data?: { media?: string[] };
}

interface Stats {
  total: number;
  scheduled: number;
  sent: number;
  draft: number;
  failed: number;
}

const PLATFORM_META: Record<string, { label: string; color: string; emoji: string }> = {
  email:     { label: 'Email',     color: '#EA4335', emoji: '📧' },
  whatsapp:  { label: 'WhatsApp', color: '#25D366', emoji: '💬' },
  facebook:  { label: 'Facebook', color: '#1877F2', emoji: '📘' },
  instagram: { label: 'Instagram',color: '#E4405F', emoji: '📸' },
  twitter:   { label: 'Twitter',  color: '#1DA1F2', emoji: '🐦' },
  linkedin:  { label: 'LinkedIn', color: '#0A66C2', emoji: '💼' },
};

const STATUS_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  sent:       { color: 'teal',   icon: <CheckCircleIcon size={14} />,  label: 'Sent'       },
  scheduled:  { color: 'blue',   icon: <ClockIcon size={14} />,        label: 'Scheduled'  },
  draft:      { color: 'gray',   icon: <FileTextIcon size={14} />,     label: 'Draft'      },
  failed:     { color: 'red',    icon: <XCircleIcon size={14} />,      label: 'Failed'     },
  scheduling: { color: 'orange', icon: <RocketIcon size={14} />,       label: 'Processing' },
};

async function reconcileScheduledInList(rows: Campaign[]): Promise<Campaign[]> {
  const nowTs = Date.now();
  const overdueIds = rows
    .filter(r => r.status === 'scheduled' && r.scheduled_date && new Date(r.scheduled_date).getTime() <= nowTs)
    .map(r => r.id);
  if (overdueIds.length === 0) return rows;
  const { error } = await supabase
    .from('marketing_campaigns')
    .update({ status: 'sent' })
    .in('id', overdueIds)
    .eq('status', 'scheduled');
  if (error) return rows;
  return rows.map(r => overdueIds.includes(r.id) ? { ...r, status: 'sent' } : r);
}

const StatCard: React.FC<{
  icon: React.ReactNode; value: number; label: string;
  color: string; active?: boolean; onClick?: () => void;
}> = ({ icon, value, label, color, active, onClick }) => (
  <Paper
    shadow={active ? 'md' : 'xs'}
    p="md"
    radius="lg"
    withBorder
    onClick={onClick}
    style={{
      cursor: onClick ? 'pointer' : 'default',
      border: active ? `2px solid var(--mantine-color-${color}-5)` : '1px solid #e9ecef',
      background: active ? `var(--mantine-color-${color}-0)` : '#fff',
      transition: 'all 0.2s ease',
    }}
  >
    <Group gap="sm">
      <ThemeIcon color={color} variant="light" size="lg" radius="md">
        {icon}
      </ThemeIcon>
      <Box>
        <Text fw={700} size="xl" lh={1}>{value}</Text>
        <Text size="xs" c="dimmed">{label}</Text>
      </Box>
    </Group>
  </Paper>
);

const CampaignDetailModal: React.FC<{
  campaign: Campaign | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ campaign, onClose, onEdit, onDelete }) => {
  if (!campaign) return null;
  const sm = STATUS_META[campaign.status] || STATUS_META.draft;

  return (
    <Modal opened={!!campaign} onClose={onClose} centered title="Campaign Details" size="md"
      styles={{ content: { borderRadius: 16 } }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Text fw={700} size="lg">{campaign.title}</Text>
            <Group gap={6} mt={4}>
              <Badge color={sm.color} leftSection={sm.icon} variant="light" size="sm">
                {sm.label}
              </Badge>
              {campaign.platforms?.map(p => (
                <Badge key={p} size="sm" variant="outline"
                  style={{ color: PLATFORM_META[p]?.color, borderColor: PLATFORM_META[p]?.color }}>
                  {PLATFORM_META[p]?.emoji} {PLATFORM_META[p]?.label || p}
                </Badge>
              ))}
            </Group>
          </Box>
        </Group>

        <Divider />

        <Box p="sm" style={{ background: '#f8f9fa', borderRadius: 8 }}>
          <Text size="xs" fw={600} c="dimmed" mb={4}>CONTENT PREVIEW</Text>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {campaign.content || 'No content.'}
          </Text>
        </Box>

        {campaign.scheduled_date && (
          <Group gap="xs" p="sm" style={{ background: '#e7f5ff', borderRadius: 8 }}>
            <CalendarIcon size={16} color="#228be6" />
            <Text size="sm">
              <strong>Scheduled:</strong> {new Date(campaign.scheduled_date).toLocaleString()}
            </Text>
          </Group>
        )}

        <Group gap="xs" p="sm" style={{ background: '#f8f9fa', borderRadius: 8 }}>
          <ClockIcon size={16} color="#868e96" />
          <Text size="sm" c="dimmed">
            Created: {new Date(campaign.created_at).toLocaleDateString()}
          </Text>
        </Group>

        <Group mt="sm">
          <Button flex={1} variant="light" color="blue"
            leftSection={<EditIcon size={14} />} onClick={() => { onClose(); onEdit(campaign.id); }}>
            Edit
          </Button>
          <Button flex={1} variant="light" color="red"
            leftSection={<TrashIcon size={14} />} onClick={() => onDelete(campaign.id)}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

const CampaignHistoryList: React.FC = () => {
  const { currentOrgId } = useUserRole();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  const [platformFilter, setPlatformFilter] = useState<string | null>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);

  const { data: campaigns = [], isLoading: loading, refetch: fetchCampaigns } = useQuery({
    queryKey: ['scheduled-campaigns', currentOrgId],
    enabled: !!currentOrgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('organization_id', currentOrgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return reconcileScheduledInList((data || []) as Campaign[]);
    },
  });

  const stats = useMemo<Stats>(() => ({
    total:     campaigns.length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    sent:      campaigns.filter(c => c.status === 'sent').length,
    draft:     campaigns.filter(c => c.status === 'draft').length,
    failed:    campaigns.filter(c => c.status === 'failed').length,
  }), [campaigns]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    await supabase.from('marketing_campaigns').delete().eq('id', id);
    setSelectedCampaign(null);
    fetchCampaigns();
  };

  const filtered = campaigns.filter(c => {
    const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.content?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || statusFilter === 'all' || c.status === statusFilter;
    const matchStatFilter = !activeStatFilter || c.status === activeStatFilter;
    const matchPlatform = !platformFilter || platformFilter === 'all' || c.platforms?.includes(platformFilter);
    return matchSearch && matchStatus && matchStatFilter && matchPlatform;
  });

  const handleStatClick = (key: string) => {
    setActiveStatFilter(prev => prev === key ? null : key);
    setStatusFilter('all');
  };

  return (
    <Box>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} mb="xl">
        <StatCard icon={<RocketIcon size={18} />} value={stats.total} label="Total Campaigns" color="violet"
          active={!activeStatFilter} onClick={() => setActiveStatFilter(null)} />
        <StatCard icon={<ClockIcon size={18} />} value={stats.scheduled} label="Scheduled" color="blue"
          active={activeStatFilter === 'scheduled'} onClick={() => handleStatClick('scheduled')} />
        <StatCard icon={<CheckCircleIcon size={18} />} value={stats.sent} label="Sent" color="teal"
          active={activeStatFilter === 'sent'} onClick={() => handleStatClick('sent')} />
        <StatCard icon={<FileTextIcon size={18} />} value={stats.draft} label="Drafts" color="gray"
          active={activeStatFilter === 'draft'} onClick={() => handleStatClick('draft')} />
        <StatCard icon={<XCircleIcon size={18} />} value={stats.failed} label="Failed" color="red"
          active={activeStatFilter === 'failed'} onClick={() => handleStatClick('failed')} />
      </SimpleGrid>

      <Group mb="lg" justify="space-between">
        <Group gap="sm">
          <TextInput
            placeholder="Search campaigns..."
            leftSection={<SearchIcon size={15} />}
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            w={240}
            radius="md"
          />
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: 'all', label: 'All Status' },
              { value: 'sent', label: '✅ Sent' },
              { value: 'scheduled', label: '📅 Scheduled' },
              { value: 'draft', label: '📝 Draft' },
              { value: 'failed', label: '❌ Failed' },
            ]}
            w={160}
            radius="md"
          />
          <Select
            placeholder="Platform"
            value={platformFilter}
            onChange={setPlatformFilter}
            data={[
              { value: 'all', label: 'All Platforms' },
              ...Object.entries(PLATFORM_META).map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.label}` }))
            ]}
            w={160}
            radius="md"
          />
        </Group>
        <Tooltip label="Refresh">
          <ActionIcon variant="light" color="gray" onClick={() => fetchCampaigns()}>
            <RefreshCwIcon size={15} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {loading ? (
        <Center h={200}><Loader /></Center>
      ) : filtered.length === 0 ? (
        <Center h={200}>
          <Stack align="center" gap="xs">
            <CalendarIcon size={40} color="#dee2e6" />
            <Text c="dimmed" size="sm">No campaigns match the current filters.</Text>
          </Stack>
        </Center>
      ) : (
        <ScrollArea>
          <Table striped highlightOnHover verticalSpacing="sm" withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Campaign</Table.Th>
                <Table.Th>Platforms</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map(c => {
                const sm = STATUS_META[c.status] || STATUS_META.draft;
                const dateLabel = c.scheduled_date
                  ? new Date(c.scheduled_date).toLocaleDateString()
                  : new Date(c.created_at).toLocaleDateString();

                return (
                  <Table.Tr key={c.id} style={{ cursor: 'pointer' }}>
                    <Table.Td onClick={() => setSelectedCampaign(c)}>
                      <Group gap="sm">
                        <Avatar size="sm" radius="md" color="blue">
                          {c.title?.[0]?.toUpperCase() || '?'}
                        </Avatar>
                        <Box>
                          <Text fw={600} size="sm" lineClamp={1}>{c.title}</Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>{c.content}</Text>
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td onClick={() => setSelectedCampaign(c)}>
                      <Group gap={4}>
                        {c.platforms?.slice(0, 3).map(p => (
                          <Tooltip key={p} label={PLATFORM_META[p]?.label || p}>
                            <Text size="sm">{PLATFORM_META[p]?.emoji || '📣'}</Text>
                          </Tooltip>
                        ))}
                        {(c.platforms?.length || 0) > 3 && (
                          <Text size="xs" c="dimmed">+{(c.platforms?.length || 0) - 3}</Text>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td onClick={() => setSelectedCampaign(c)}>
                      <Badge color={sm.color} leftSection={sm.icon} variant="light" size="sm">
                        {sm.label}
                      </Badge>
                    </Table.Td>
                    <Table.Td onClick={() => setSelectedCampaign(c)}>
                      <Group gap={4}>
                        {c.scheduled_date
                          ? <CalendarIcon size={12} color="#228be6" />
                          : <ClockIcon size={12} color="#868e96" />}
                        <Text size="xs">{dateLabel}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="View">
                          <ActionIcon variant="subtle" color="gray" onClick={() => setSelectedCampaign(c)}>
                            <EyeIcon size={15} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Edit">
                          <ActionIcon variant="subtle" color="blue" onClick={() => navigate(`/campaign-manager/edit/${c.id}`)}>
                            <EditIcon size={15} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(c.id)}>
                            <TrashIcon size={15} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}

      <CampaignDetailModal
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onEdit={(id) => navigate(`/campaign-manager/edit/${id}`)}
        onDelete={handleDelete}
      />
    </Box>
  );
};

export default CampaignHistoryList;
