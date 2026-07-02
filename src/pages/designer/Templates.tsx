import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, TextInput, SimpleGrid, Button, Group, Loader, Text, Center,
  ScrollArea, Chip, SegmentedControl, Tooltip, Modal, Stack, Paper,
  Table, Avatar, Badge, ActionIcon, Pagination, Select, ThemeIcon
} from '@mantine/core';
import PageShell from '../../shared/PageShell';
import PageHeader from '../../shared/PageHeader';
import DesignCard from '../../dashboard/DesignCard';
import CreateNewCard from '../../dashboard/CreateNewCard';
import ConfirmationModal from '../../shared/ConfirmationModal';
import {
  SearchIcon, PlusIcon, FilterIcon, GridIcon, ListIcon,
  LayoutTemplateIcon, FileTextIcon, TrashIcon, EditIcon,
  FacebookIcon, InstagramIcon, MailIcon, LayoutIcon, SortAscIcon, CheckIcon
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../auth/UserContext';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';

interface ProjectTemplate {
  id: string;
  title: string;
  thumbnail_url: string | null;
  updated_at: string | null;
  created_at: string | null;
  canvas_data: { width?: number; height?: number; [key: string]: unknown };
  is_template: boolean;
  organization_id: string;
  tags?: string[] | null;
}

const TEMPLATE_TAGS = ['All', 'Social Media', 'Instagram', 'Facebook', 'Email', 'Business', 'Custom'];

// ─── Sub-components (DILUAR Templates) ───────────────────────────────────────

interface TmplViewToggleProps {
  viewMode: 'grid' | 'list';
  onChange: (v: 'grid' | 'list') => void;
}
const TmplViewToggle: React.FC<TmplViewToggleProps> = ({ viewMode, onChange }) => (
  <SegmentedControl
    value={viewMode}
    onChange={val => onChange(val as 'grid' | 'list')}
    data={[
      { label: <Tooltip label="Grid View"><GridIcon size={16} /></Tooltip>, value: 'grid' },
      { label: <Tooltip label="List View"><ListIcon size={16} /></Tooltip>, value: 'list' },
    ]}
  />
);

interface TmplCreationOptionsProps {
  onSizeCardClick: (w?: number, h?: number, title?: string, tags?: string[]) => void;
}
const TmplCreationOptions: React.FC<TmplCreationOptionsProps> = ({ onSizeCardClick }) => (
  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
    <CreateNewCard icon={<LayoutIcon size={24} />} title="Custom Size" description="Start from scratch"
      onClick={() => onSizeCardClick(undefined, undefined, 'Custom Template', ['Custom'])} />
    <CreateNewCard icon={<InstagramIcon size={24} />} title="Instagram Post" description="1080 x 1080 px"
      width={1080} height={1080}
      onClick={() => onSizeCardClick(1080, 1080, 'Instagram Template', ['Social Media', 'Instagram'])} />
    <CreateNewCard icon={<FacebookIcon size={24} />} title="Facebook Post" description="1200 x 630 px"
      width={1200} height={630}
      onClick={() => onSizeCardClick(1200, 630, 'Facebook Template', ['Social Media', 'Facebook'])} />
    <CreateNewCard icon={<MailIcon size={24} />} title="Email Header" description="600 x 200 px"
      width={600} height={200}
      onClick={() => onSizeCardClick(600, 200, 'Email Template', ['Email', 'Marketing'])} />
  </SimpleGrid>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Templates: React.FC = () => {
  const { user } = useAuth();
  const { role, currentOrgId, isSuperAdmin } = useUserRole();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [selectedTag, setSelectedTag] = useState('All');
  const [activePage, setActivePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState('12');

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [creationPreset, setCreationPreset] = useState<{ width?: number; height?: number; title: string; tags: string[] } | null>(null);
  const [isCreationLoading, setIsCreationLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const isOperator = isSuperAdmin || role === 'operator';
  // eslint-disable-next-line
  useEffect(() => { setActivePage(1); }, [searchQuery, sortBy, selectedTag, itemsPerPage]);

  const { data: templates = [], isLoading: loading, refetch: fetchTemplates } = useQuery({
    queryKey: ['templates', currentOrgId],
    enabled: !!currentOrgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, user_id, title, thumbnail_url, created_at, updated_at, tags, is_template, organization_id, width:canvas_data->width, height:canvas_data->height')
        .eq('is_template', true)
        .eq('organization_id', currentOrgId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((d: any) => ({ ...d, canvas_data: { width: d.width, height: d.height } })) as ProjectTemplate[];
    },
  });

  const processData = () => {
    let filtered = [...templates];
    if (selectedTag !== 'All') filtered = filtered.filter(t => t.tags?.includes(selectedTag));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) || t.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.title.localeCompare(b.title);
        case 'name_desc': return b.title.localeCompare(a.title);
        case 'created_desc': return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        default: return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      }
    });
    const limit = parseInt(itemsPerPage);
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedItems = filtered.slice((activePage - 1) * limit, activePage * limit);
    return { paginatedItems, totalItems, totalPages };
  };

  const { paginatedItems, totalItems, totalPages } = processData();

  const handleCreateProject = async (width: number | undefined, height: number | undefined, title: string, tags: string[], isTemplate: boolean) => {
    if (!user || !currentOrgId) return;
    setIsCreationLoading(true);
    try {
      const { data, error } = await supabase.from('projects').insert({
        title, user_id: user.id, organization_id: currentOrgId, is_template: isTemplate, tags,
        canvas_data: { version: '5.3.0', width: width || 850, height: height || 500, backgroundColor: '#ffffff', objects: [] }
      }).select().single();
      if (error) throw error;
      if (data) { setIsTemplateModalOpen(false); setCreationPreset(null); navigate(`/editor/${data.id}`); }
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setIsCreationLoading(false);
    }
  };

  const handleSizeCardClick = (width?: number, height?: number, title?: string, autoTags: string[] = []) => {
    const finalTitle = title || 'Untitled Template';
    if (isOperator) { setIsTemplateModalOpen(false); setCreationPreset({ width, height, title: finalTitle, tags: autoTags }); }
    else handleCreateProject(width, height, finalTitle, autoTags, true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    const { error } = await supabase.from('projects').delete().eq('id', templateToDelete);
    if (!error) { fetchTemplates(); setDeleteModalOpen(false); setTemplateToDelete(null); }
    else alert('Error: ' + error.message);
  };

  const handleDuplicate = async (template: ProjectTemplate) => {
    if (!user || !currentOrgId) return;
    if (!confirm(`Create a new campaign from "${template.title}"?`)) return;
    try {
      const { data, error } = await supabase.from('projects').insert({
        user_id: user.id, organization_id: currentOrgId, is_template: false,
        title: `${template.title} (Copy)`, canvas_data: template.canvas_data,
        thumbnail_url: template.thumbnail_url, tags: template.tags
      }).select('id').single();
      if (error) throw error;
      if (data) navigate(`/editor/${data.id}`);
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  return (
    <PageShell>
      <ConfirmationModal
        opened={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete} title="Delete Template?"
        message="Are you sure? This action cannot be undone."
        confirmLabel="Delete Forever" isDanger
      />

      <PageHeader
        icon={<LayoutTemplateIcon size={22} />}
        title="Templates"
        subtitle={isOperator ? 'Manage organization templates' : 'Choose a template to start your design'}
        gradient={{ from: 'teal', to: 'cyan' }}
        action={
          <Group>
            <TmplViewToggle viewMode={viewMode} onChange={setViewMode} />
            {isOperator && (
              <Button leftSection={<PlusIcon size={16} />} variant="gradient"
                gradient={{ from: 'teal', to: 'cyan' }} onClick={() => setIsTemplateModalOpen(true)}>
                New Template
              </Button>
            )}
          </Group>
        }
      />

      <Box my="md">
        <Group gap="xs" mb="md">
          <TextInput placeholder="Search templates..." leftSection={<SearchIcon size={16} />}
            value={searchQuery} onChange={e => setSearchQuery(e.currentTarget.value)} w={300} />
          <Select
            data={[
              { value: 'updated_desc', label: 'Recently Updated' },
              { value: 'created_desc', label: 'Recently Created' },
              { value: 'name_asc', label: 'Name (A-Z)' },
              { value: 'name_desc', label: 'Name (Z-A)' },
            ]}
            value={sortBy} onChange={v => setSortBy(v || 'updated_desc')}
            w={180} allowDeselect={false} leftSection={<SortAscIcon size={14} />}
          />
          <Select data={['12', '24', '48', '96']} value={itemsPerPage}
            onChange={v => setItemsPerPage(v || '12')} w={70} allowDeselect={false} />
        </Group>
        <ScrollArea type="never" mb="lg">
          <Group gap="sm" wrap="nowrap">
            <FilterIcon size={16} style={{ color: '#9ca3af' }} />
            {TEMPLATE_TAGS.map(tag => (
              <Chip key={tag} checked={selectedTag === tag} onChange={() => setSelectedTag(tag)}
                variant="light" color="blue" size="sm">{tag}</Chip>
            ))}
          </Group>
        </ScrollArea>
      </Box>

      {loading ? (
        <Center h={200}><Loader /></Center>
      ) : totalItems === 0 ? (
        <Center mt="xl" h={200}>
          <Stack align="center" gap="xs">
            <Text c="dimmed">No templates found matching your search.</Text>
            {searchQuery && <Button variant="subtle" size="xs" onClick={() => setSearchQuery('')}>Clear Search</Button>}
          </Stack>
        </Center>
      ) : (
        <Stack gap="lg">
          {viewMode === 'grid' ? (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="lg">
              {paginatedItems.map(template => (
                <DesignCard key={template.id}
                  design={{
                    id: template.id, title: template.title,
                    thumbnail: template.thumbnail_url || '',
                    updated_at: template.updated_at, canvas_data: template.canvas_data, tags: template.tags
                  }}
                  isTemplate={true}
                  onRefresh={fetchTemplates}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Paper shadow="sm" withBorder>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Template Name</Table.Th>
                    <Table.Th>Tags</Table.Th>
                    <Table.Th>Dimensions</Table.Th>
                    <Table.Th>Last Updated</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedItems.map(t => (
                    <Table.Tr key={t.id}>
                      <Table.Td>
                        <Group gap="sm">
                          <Avatar src={t.thumbnail_url} radius="sm" size="lg" />
                          <div>
                            <Text fw={500}>{t.title}</Text>
                            <Text size="xs" c="dimmed">ID: {t.id.substring(0, 8)}...</Text>
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {t.tags?.map(tag => <Badge key={tag} size="xs" variant="outline">{tag}</Badge>)}
                        </Group>
                      </Table.Td>
                      <Table.Td><Text size="sm">{t.canvas_data?.width || '?'} x {t.canvas_data?.height || '?'}</Text></Table.Td>
                      <Table.Td><Text size="sm">{new Date(t.updated_at || '').toLocaleDateString()}</Text></Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="Edit">
                            <ActionIcon variant="light" color="blue" onClick={() => navigate(`/editor/${t.id}`)}><EditIcon size={16} /></ActionIcon>
                          </Tooltip>
                          <Tooltip label="Use for Campaign">
                            <ActionIcon variant="light" color="green" onClick={() => handleDuplicate(t)}><LayoutTemplateIcon size={16} /></ActionIcon>
                          </Tooltip>
                          {isOperator && (
                            <Tooltip label="Delete">
                              <ActionIcon variant="light" color="red" onClick={() => { setTemplateToDelete(t.id); setDeleteModalOpen(true); }}><TrashIcon size={16} /></ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
          {totalPages > 1 && (
            <Group justify="space-between" mt="md">
              <Text size="sm" c="dimmed">
                Showing {(activePage - 1) * parseInt(itemsPerPage) + 1}–{Math.min(activePage * parseInt(itemsPerPage), totalItems)} of {totalItems}
              </Text>
              <Pagination total={totalPages} value={activePage} onChange={setActivePage} color="blue" />
            </Group>
          )}
        </Stack>
      )}

      {/* Create Template Modal */}
      <Modal opened={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)}
        title="Create New Template" size="xl">
        <Box mb="lg"><Text c="dimmed" size="sm">Select a preset size to create a new master template.</Text></Box>
        <TmplCreationOptions onSizeCardClick={handleSizeCardClick} />
      </Modal>

      {/* Operator Choice Modal */}
      <Modal
        opened={!!creationPreset} onClose={() => setCreationPreset(null)}
        title={<Group gap="xs"><ThemeIcon variant="light" color="blue"><PlusIcon size={16} /></ThemeIcon><Text fw={600}>Create New Design</Text></Group>}
        size="md" centered radius="md" padding="xl"
      >
        <Text size="sm" c="dimmed" mb="lg">
          You are creating <b>{creationPreset?.title}</b>. How would you like to categorize it?
        </Text>
        <Stack gap="md">
          <Button size="xl" variant="light" color="blue" fullWidth h="auto" py="md" justify="flex-start"
            leftSection={<ThemeIcon size={40} radius="xl" variant="filled" color="blue"><LayoutTemplateIcon size={20} /></ThemeIcon>}
            onClick={() => creationPreset && handleCreateProject(creationPreset.width, creationPreset.height, creationPreset.title + ' Template', creationPreset.tags, true)}
            loading={isCreationLoading}
            styles={{ inner: { justifyContent: 'flex-start' }, label: { width: '100%', textAlign: 'left' } }}
          >
            <div style={{ marginLeft: 8 }}>
              <Text size="md" fw={600}>Create as Template</Text>
              <Text size="xs" c="dimmed" fw={400}>Save as a master template.</Text>
            </div>
            <div style={{ marginLeft: 'auto' }}><ThemeIcon variant="subtle" color="blue"><CheckIcon size={16} /></ThemeIcon></div>
          </Button>
          <Button size="xl" variant="outline" color="green" fullWidth h="auto" py="md" justify="flex-start"
            leftSection={<ThemeIcon size={40} radius="xl" variant="filled" color="green"><FileTextIcon size={20} /></ThemeIcon>}
            onClick={() => creationPreset && handleCreateProject(creationPreset.width, creationPreset.height, creationPreset.title, creationPreset.tags, false)}
            loading={isCreationLoading}
            styles={{ inner: { justifyContent: 'flex-start' }, label: { width: '100%', textAlign: 'left' } }}
          >
            <div style={{ marginLeft: 8 }}>
              <Text size="md" fw={600}>Create for Campaign</Text>
              <Text size="xs" c="dimmed" fw={400}>Create a standalone campaign design.</Text>
            </div>
            <div style={{ marginLeft: 'auto' }}><ThemeIcon variant="subtle" color="green"><CheckIcon size={16} /></ThemeIcon></div>
          </Button>
        </Stack>
      </Modal>
    </PageShell>
  );
};

export default Templates;
