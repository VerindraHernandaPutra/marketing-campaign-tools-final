import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table, Badge, Paper, Text, Loader, Group, ActionIcon, TextInput, Select,
  Pagination, Stack, Avatar, Tooltip, Box, SimpleGrid, ThemeIcon, Center,
  Modal, Divider, Button, ScrollArea,
} from '@mantine/core';
import {
  EditIcon, TrashIcon, SearchIcon, SortAscIcon, ClockIcon, CalendarIcon,
  UserIcon, CheckCircleIcon, XCircleIcon, FileTextIcon, RocketIcon,
  RefreshCwIcon, EyeIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/useAuth';
import { useUserRole } from '../auth/UserContext';

interface Campaign {
  id: string;
  title: string;
  platforms: string[];
  status: string;
  created_at: string;
  updated_at?: string;
  scheduled_date: string | null;
  content?: string;
  platform_data?: {
    target_group_id?: string | null;
    media?: string[];
  };
}

interface Stats {
  total: number; scheduled: number; sent: number; draft: number; failed: number;
}

const PLATFORM_META: Record<string, { label: string; color: string; emoji: string }> = {
  email:     { label: 'Email',     color: '#EA4335', emoji: '📧' },
  whatsapp:  { label: 'WhatsApp', color: '#25D366', emoji: '💬' },
  facebook:  { label: 'Facebook', color: '#1877F2', emoji: '📘' },
  instagram: { label: 'Instagram', color: '#E4405F', emoji: '📸' },
  twitter:   { label: 'Twitter',  color: '#1DA1F2', emoji: '🐦' },
  linkedin:  { label: 'LinkedIn', color: '#0A66C2', emoji: '💼' },
};

const STATUS_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  sent:       { color: 'teal',   icon: <CheckCircleIcon size={14} />, label: 'Sent'       },
  scheduled:  { color: 'blue',   icon: <ClockIcon size={14} />,       label: 'Scheduled'  },
  draft:      { color: 'gray',   icon: <FileTextIcon size={14} />,    label: 'Draft'      },
  failed:     { color: 'red',    icon: <XCircleIcon size={14} />,     label: 'Failed'     },
  scheduling: { color: 'orange', icon: <RocketIcon size={14} />,      label: 'Processing' },
};

async function reconcileScheduled(rows: Campaign[]): Promise<Campaign[]> {
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

// ─── STAT CARD ───
interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
}
const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color, active, onClick }) => (
  <Paper
    shadow={active ? 'md' : 'xs'} p="md" radius="lg" withBorder onClick={onClick}
    style={{
      cursor: onClick ? 'pointer' : 'default',
      border: active ? `2px solid var(--mantine-color-${color}-5)` : '1px solid #e9ecef',
      background: active ? `var(--mantine-color-${color}-0)` : '#fff',
      transition: 'all 0.2s ease',
    }}
  >
    <Group gap="sm">
      <ThemeIcon color={color} variant="light" size="lg" radius="md">{icon}</ThemeIcon>
      <Box>
        <Text fw={700} size="xl" lh={1}>{value}</Text>
        <Text size="xs" c="dimmed">{label}</Text>
      </Box>
    </Group>
  </Paper>
);

// ─── DETAIL MODAL ───
interface CampaignDetailModalProps {
  campaign: Campaign | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({ campaign, onClose, onEdit, onDelete }) => {
  if (!campaign) return null;
  const sm = STATUS_META[campaign.status] || STATUS_META.draft;
  return (
    <Modal opened={!!campaign} onClose={onClose} centered title="Campaign Details" size="md"
      styles={{ content: { borderRadius: 16 } }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Text fw={700} size="lg">{campaign.title}</Text>
            <Group gap={6} mt={4}>
              <Badge color={sm.color} leftSection={sm.icon} variant="light" size="sm">{sm.label}</Badge>
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
            <Text size="sm"><strong>Scheduled:</strong> {new Date(campaign.scheduled_date).toLocaleString()}</Text>
          </Group>
        )}
        <Group gap="xs" p="sm" style={{ background: '#f8f9fa', borderRadius: 8 }}>
          <ClockIcon size={16} color="#868e96" />
          <Text size="sm" c="dimmed">Created: {new Date(campaign.created_at).toLocaleDateString()}</Text>
        </Group>
        <Group mt="sm">
          <Button flex={1} variant="light" color="blue" leftSection={<EditIcon size={14} />}
            onClick={() => { onClose(); onEdit(campaign.id); }}>Edit</Button>
          <Button flex={1} variant="light" color="red" leftSection={<TrashIcon size={14} />}
            onClick={() => onDelete(campaign.id)}>Delete</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

// ─── MAIN COMPONENT ───
const CampaignHistory: React.FC = () => {
  const { user } = useAuth();
  const { currentOrgId } = useUserRole();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<string>('10');
  const [sortBy, setSortBy] = useState<string>('created_desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => { setActivePage(1); }, [searchQuery, sortBy, itemsPerPage, statusFilter, platformFilter, activeStatFilter]);

  const { data: campaigns = [], isLoading: loading, refetch: fetchHistory } = useQuery({
    queryKey: ['campaign-history', currentOrgId],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const query = currentOrgId
        ? supabase.from('marketing_campaigns').select('*').eq('organization_id', currentOrgId).order('created_at', { ascending: false })
        : supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return reconcileScheduled((data || []) as Campaign[]);
    },
  });

  const stats = useMemo<Stats>(() => ({
    total: campaigns.length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    failed: campaigns.filter(c => c.status === 'failed').length,
  }), [campaigns]);

  const processedData = useMemo(() => {
    let data = [...campaigns];

    if (activeStatFilter) data = data.filter(c => c.status === activeStatFilter);
    if (statusFilter !== 'all') data = data.filter(c => c.status === statusFilter);
    if (platformFilter !== 'all') data = data.filter(c => c.platforms?.includes(platformFilter));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        c.platforms?.some(p => p.toLowerCase().includes(q))
      );
    }

    data.sort((a, b) => {
      switch (sortBy) {
        case 'title_asc':  return a.title.localeCompare(b.title);
        case 'title_desc': return b.title.localeCompare(a.title);
        case 'status':     return a.status.localeCompare(b.status);
        case 'created_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_desc': default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    const total = data.length;
    const limit = parseInt(itemsPerPage);
    const totalPages = Math.ceil(total / limit);
    const paginated = data.slice((activePage - 1) * limit, activePage * limit);
    return { data: paginated, total, totalPages };
  }, [campaigns, activeStatFilter, statusFilter, platformFilter, searchQuery, sortBy, activePage, itemsPerPage]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id);
    if (!error) { setSelectedCampaign(null); fetchHistory(); }
    else alert('Error deleting campaign');
  };

  const handleStatClick = (key: string) => {
    setActiveStatFilter(prev => prev === key ? null : key);
    setStatusFilter('all');
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <Paper shadow="sm" p="md" withBorder mt="xl">
      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} mb="xl">
        <StatCard icon={<RocketIcon size={18} />} value={stats.total} label="Total" color="violet"
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

      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <TextInput
            placeholder="Search campaigns..."
            leftSection={<SearchIcon size={14} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.currentTarget.value)}
            w={220}
          />
          <Select
            data={[
              { value: 'all', label: 'All Status' },
              { value: 'sent', label: '✅ Sent' },
              { value: 'scheduled', label: '📅 Scheduled' },
              { value: 'draft', label: '📝 Draft' },
              { value: 'failed', label: '❌ Failed' },
            ]}
            value={statusFilter}
            onChange={v => setStatusFilter(v || 'all')}
            w={150}
            allowDeselect={false}
          />
          <Select
            data={[
              { value: 'all', label: 'All Platforms' },
              ...Object.entries(PLATFORM_META).map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.label}` })),
            ]}
            value={platformFilter}
            onChange={v => setPlatformFilter(v || 'all')}
            w={160}
            allowDeselect={false}
          />
          <Select
            data={[
              { value: 'created_desc', label: 'Newest First' },
              { value: 'created_asc', label: 'Oldest First' },
              { value: 'title_asc', label: 'Title (A-Z)' },
              { value: 'status', label: 'Status' },
            ]}
            value={sortBy}
            onChange={v => setSortBy(v || 'created_desc')}
            leftSection={<SortAscIcon size={14} />}
            w={160}
            allowDeselect={false}
          />
          <Select
            data={['5', '10', '25', '50']}
            value={itemsPerPage}
            onChange={v => setItemsPerPage(v || '10')}
            w={75}
            allowDeselect={false}
          />
        </Group>
        <Tooltip label="Refresh">
          <ActionIcon variant="light" color="gray" onClick={() => fetchHistory()}>
            <RefreshCwIcon size={15} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {loading ? (
        <Center h={200}><Loader /></Center>
      ) : processedData.total === 0 ? (
        <Center h={150}>
          <Stack align="center" gap="xs">
            <CalendarIcon size={36} color="#dee2e6" />
            <Text c="dimmed" size="sm">No campaigns match the current filters.</Text>
          </Stack>
        </Center>
      ) : (
        <>
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="sm" withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Campaign</Table.Th>
                  <Table.Th>Platforms</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Schedule</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {processedData.data.map(c => {
                  const sm = STATUS_META[c.status] || STATUS_META.draft;
                  return (
                    <Table.Tr key={c.id} style={{ cursor: 'pointer' }}>
                      <Table.Td onClick={() => setSelectedCampaign(c)}>
                        <Group gap="sm">
                          <Avatar size="sm" radius="md" color="blue">
                            {(c.title || '?')[0].toUpperCase()}
                          </Avatar>
                          <Box>
                            <Text fw={600} size="sm" lineClamp={1}>{c.title || 'Untitled'}</Text>
                            <Text size="xs" c="dimmed" lineClamp={1}>{c.content || 'No content preview'}</Text>
                          </Box>
                        </Group>
                      </Table.Td>
                      <Table.Td onClick={() => setSelectedCampaign(c)}>
                        <Group gap={4}>
                          {(c.platforms || []).slice(0, 3).map(p => (
                            <Tooltip key={p} label={PLATFORM_META[p]?.label || p}>
                              <Text size="md">{PLATFORM_META[p]?.emoji || '📣'}</Text>
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
                        <Stack gap={2}>
                          <Group gap={4}>
                            {c.scheduled_date ? <CalendarIcon size={12} color="#228be6" /> : <ClockIcon size={12} color="#868e96" />}
                            <Text size="xs">{formatDate(c.scheduled_date || c.created_at)}</Text>
                          </Group>
                          {c.platform_data?.target_group_id && (
                            <Group gap={4}>
                              <UserIcon size={11} color="#868e96" />
                              <Text size="xs" c="dimmed">Audience Group</Text>
                            </Group>
                          )}
                        </Stack>
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

          {processedData.totalPages > 1 && (
            <Group justify="space-between" mt="lg">
              <Text size="sm" c="dimmed">
                Showing {(activePage - 1) * parseInt(itemsPerPage) + 1}–{Math.min(activePage * parseInt(itemsPerPage), processedData.total)} of {processedData.total}
              </Text>
              <Pagination total={processedData.totalPages} value={activePage} onChange={setActivePage} color="blue" />
            </Group>
          )}
        </>
      )}

      <CampaignDetailModal
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onEdit={id => navigate(`/campaign-manager/edit/${id}`)}
        onDelete={handleDelete}
      />
    </Paper>
  );
};

export default CampaignHistory;
