import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, TextInput, SimpleGrid, Button, Group, Loader, Text, Center, ScrollArea, Chip,
  SegmentedControl, Tooltip, Modal, Stack, Paper, Table, Avatar, Badge, ActionIcon,
  Pagination, Select, ThemeIcon,
} from '@mantine/core';
import PageShell from '../../shared/PageShell';
import PageHeader from '../../shared/PageHeader';
import DesignCard from '../../dashboard/DesignCard';
import CreateNewCard from '../../dashboard/CreateNewCard';
import ConfirmationModal from '../../shared/ConfirmationModal';
import {
  SearchIcon, PlusIcon, FilterIcon, GridIcon, ListIcon,
  LayoutTemplateIcon, FileTextIcon, TrashIcon, EditIcon,
  FacebookIcon, InstagramIcon, MailIcon, LayoutIcon, SortAscIcon, CheckIcon,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../auth/UserContext';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';

interface Project {
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

const CAMPAIGN_TAGS = ['All', 'Social Media', 'Instagram', 'Facebook', 'Email', 'Business', 'Custom'];

// ─── SUB-COMPONENTS (must be OUTSIDE parent to satisfy react-hooks/static-components) ───

interface ViewToggleProps {
  viewMode: 'grid' | 'list';
  onChange: (val: 'grid' | 'list') => void;
}
const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onChange }) => (
  <SegmentedControl
    value={viewMode}
    onChange={val => onChange(val as 'grid' | 'list')}
    data={[
      { label: <Tooltip label="Grid View"><GridIcon size={16} /></Tooltip>, value: 'grid' },
      { label: <Tooltip label="List View"><ListIcon size={16} /></Tooltip>, value: 'list' },
    ]}
  />
);

interface CreationOptionsProps {
  isTemplateMode?: boolean;
  forceCampaign?: boolean;
  isCreationLoading: boolean;
  onCreateProject: (w: number | undefined, h: number | undefined, title: string, tags: string[], isTemplate: boolean) => void;
  onSizeCardClick: (w?: number, h?: number, title?: string, autoTags?: string[], forceCampaign?: boolean) => void;
}
const CreationOptions: React.FC<CreationOptionsProps> = ({
  isTemplateMode = false, forceCampaign = false, isCreationLoading, onCreateProject, onSizeCardClick,
}) => (
  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
    <CreateNewCard
      icon={<LayoutIcon size={24} />}
      title="Custom Size"
      description="Start from scratch"
      onClick={() => isTemplateMode
        ? onCreateProject(undefined, undefined, 'Custom Template', ['Custom'], true)
        : onSizeCardClick(undefined, undefined, 'Custom Design', ['Custom'], forceCampaign)
      }
    />
    <CreateNewCard
      icon={<InstagramIcon size={24} />}
      title="Instagram Post"
      description="1080 x 1080 px"
      width={1080}
      height={1080}
      onClick={() => isTemplateMode
        ? onCreateProject(1080, 1080, 'Instagram Template', ['Social Media', 'Instagram'], true)
        : onSizeCardClick(1080, 1080, 'Instagram Post', ['Social Media', 'Instagram'], forceCampaign)
      }
    />
    <CreateNewCard
      icon={<FacebookIcon size={24} />}
      title="Facebook Post"
      description="1200 x 630 px"
      width={1200}
      height={630}
      onClick={() => isTemplateMode
        ? onCreateProject(1200, 630, 'Facebook Template', ['Social Media', 'Facebook'], true)
        : onSizeCardClick(1200, 630, 'Facebook Post', ['Social Media', 'Facebook'], forceCampaign)
      }
    />
    <CreateNewCard
      icon={<MailIcon size={24} />}
      title="Email Header"
      description="600 x 200 px"
      width={600}
      height={200}
      onClick={() => isTemplateMode
        ? onCreateProject(600, 200, 'Email Template', ['Email', 'Marketing'], true)
        : onSizeCardClick(600, 200, 'Email Header', ['Email', 'Marketing'], forceCampaign)
      }
    />
    {isCreationLoading && <Loader size="xs" />}
  </SimpleGrid>
);

// ─── MAIN COMPONENT ───
const Campaigns: React.FC = () => {
  const { user } = useAuth();
  const { role, currentOrgId, isSuperAdmin } = useUserRole();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('updated_desc');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  const [activePage, setActivePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<string>('12');

  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [creationPreset, setCreationPreset] = useState<{ width?: number; height?: number; title: string; tags: string[] } | null>(null);
  const [isCreationLoading, setIsCreationLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const isOperator = isSuperAdmin || role === 'operator';
  const canManageCampaigns = isOperator || role === 'marketer';

  useEffect(() => { setActivePage(1); }, [searchQuery, sortBy, selectedTag, itemsPerPage]);

  const { data: campaigns = [], isLoading: loading, refetch: fetchCampaigns } = useQuery({
    queryKey: ['campaign-designs', currentOrgId],
    enabled: !!currentOrgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, user_id, title, thumbnail_url, created_at, updated_at, tags, is_template, organization_id, width:canvas_data->width, height:canvas_data->height')
        .eq('organization_id', currentOrgId!)
        .eq('is_template', false)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((d: any) => ({ ...d, canvas_data: { width: d.width, height: d.height } })) as Project[];
    },
  });

  const processData = () => {
    let filtered = [...campaigns];

    if (selectedTag !== 'All') filtered = filtered.filter(p => p.tags?.includes(selectedTag));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.title.localeCompare(b.title);
        case 'name_desc': return b.title.localeCompare(a.title);
        case 'created_desc': return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'updated_desc': default: return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      }
    });

    const totalItems = filtered.length;
    const limit = parseInt(itemsPerPage);
    const totalPages = Math.ceil(totalItems / limit);
    const start = (activePage - 1) * limit;
    const paginatedItems = filtered.slice(start, start + limit);
    return { paginatedItems, totalItems, totalPages };
  };

  const { paginatedItems, totalItems, totalPages } = processData();

  const handleCreateProject = async (
    width: number | undefined, height: number | undefined,
    title: string, tags: string[], isTemplate: boolean,
  ) => {
    if (!user || !currentOrgId) return;
    setIsCreationLoading(true);
    const finalWidth = width || 850;
    const finalHeight = height || 500;
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          title, user_id: user.id, organization_id: currentOrgId,
          is_template: isTemplate, tags,
          canvas_data: { version: '5.3.0', width: finalWidth, height: finalHeight, backgroundColor: '#ffffff', objects: [] },
        })
        .select()
        .single();
      if (error) throw error;
      if (data) { setIsDesignModalOpen(false); setCreationPreset(null); navigate(`/editor/${data.id}`); }
    } catch (error: unknown) {
      alert('Error creating design: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreationLoading(false);
    }
  };

  const handleSizeCardClick = (w?: number, h?: number, title?: string, autoTags: string[] = [], forceCampaign = false) => {
    const finalTitle = title || 'Untitled Design';
    if (forceCampaign) { handleCreateProject(w, h, finalTitle, autoTags, false); setIsDesignModalOpen(false); return; }
    if (isOperator) { setIsDesignModalOpen(false); setCreationPreset({ width: w, height: h, title: finalTitle, tags: autoTags }); }
    else { handleCreateProject(w, h, finalTitle, autoTags, false); }
  };

  const handleDeleteClick = (id: string) => { setProjectToDelete(id); setDeleteModalOpen(true); };
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    const { error } = await supabase.from('projects').delete().eq('id', projectToDelete);
    if (!error) { fetchCampaigns(); setDeleteModalOpen(false); setProjectToDelete(null); }
    else alert('Error deleting design: ' + error.message);
  };

  const handleDuplicate = async (project: Project) => {
    if (!user || !currentOrgId) return;
    if (!confirm(`Duplicate "${project.title}"?`)) return;
    try {
      const { data: newProject, error } = await supabase.from('projects').insert({
        user_id: user.id, organization_id: currentOrgId, is_template: false,
        title: `${project.title} (Copy)`, canvas_data: project.canvas_data,
        thumbnail_url: project.thumbnail_url, tags: project.tags,
      }).select('id').single();
      if (error) throw error;
      if (newProject) navigate(`/editor/${newProject.id}`);
    } catch (error: unknown) {
      alert('Error duplicating: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <PageShell>
      <ConfirmationModal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Design?"
        message="Are you sure you want to delete this design? This action cannot be undone."
        confirmLabel="Delete Forever"
        isDanger
      />
      <PageHeader
        icon={<LayoutTemplateIcon size={22} />}
        title="Campaign Designs"
        subtitle="Manage visual assets for your marketing campaigns"
        gradient={{ from: 'pink', to: 'violet' }}
        action={
          <Group>
            <ViewToggle viewMode={viewMode} onChange={setViewMode} />
            {canManageCampaigns && (
              <Button leftSection={<PlusIcon size={16} />} variant="gradient" gradient={{ from: 'pink', to: 'violet' }}
                onClick={() => setIsDesignModalOpen(true)}>
                New Design
              </Button>
            )}
          </Group>
        }
      />

      <Box my="md">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <TextInput
              placeholder="Search designs..."
              leftSection={<SearchIcon size={16} />}
              value={searchQuery}
              onChange={e => setSearchQuery(e.currentTarget.value)}
              w={300}
            />
            <Select
              data={[
                { value: 'updated_desc', label: 'Recently Updated' },
                { value: 'created_desc', label: 'Recently Created' },
                { value: 'name_asc', label: 'Name (A-Z)' },
                { value: 'name_desc', label: 'Name (Z-A)' },
              ]}
              value={sortBy}
              onChange={v => setSortBy(v || 'updated_desc')}
              w={180}
              allowDeselect={false}
              leftSection={<SortAscIcon size={14} />}
            />
            <Select
              data={['12', '24', '48', '96']}
              value={itemsPerPage}
              onChange={v => setItemsPerPage(v || '12')}
              w={70}
              allowDeselect={false}
            />
          </Group>
        </Group>

        <ScrollArea type="never" mb="lg">
          <Group gap="sm" wrap="nowrap">
            <FilterIcon size={16} />
            {CAMPAIGN_TAGS.map(tag => (
              <Chip key={tag} checked={selectedTag === tag} onChange={() => setSelectedTag(tag)} variant="light" color="blue" size="sm">
                {tag}
              </Chip>
            ))}
          </Group>
        </ScrollArea>
      </Box>

      {loading ? (
        <Center h={200}><Loader /></Center>
      ) : (
        <>
          {totalItems === 0 ? (
            <Center mt="xl" h={200}>
              <Stack align="center" gap="xs">
                <Text c="dimmed">No campaign designs found matching your search.</Text>
                {searchQuery && <Button variant="subtle" size="xs" onClick={() => setSearchQuery('')}>Clear Search</Button>}
              </Stack>
            </Center>
          ) : (
            <Stack gap="lg">
              {viewMode === 'grid' ? (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="lg">
                  {paginatedItems.map(design => (
                    <DesignCard
                      key={design.id}
                      design={{
                        id: design.id, title: design.title,
                        thumbnail: design.thumbnail_url || '',
                        updated_at: design.updated_at,
                        canvas_data: design.canvas_data,
                        tags: design.tags,
                      }}
                      isTemplate={false}
                      onRefresh={fetchCampaigns}
                      hideDelete={!canManageCampaigns}
                    />
                  ))}
                </SimpleGrid>
              ) : (
                <Paper shadow="sm" withBorder>
                  <Table striped highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Design Name</Table.Th>
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
                            <Group justify="flex-end" gap="xs">
                              <Tooltip label="Edit">
                                <ActionIcon variant="light" color="blue" onClick={() => navigate(`/editor/${t.id}`)}>
                                  <EditIcon size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Duplicate">
                                <ActionIcon variant="light" color="green" onClick={() => handleDuplicate(t)}>
                                  <LayoutTemplateIcon size={16} />
                                </ActionIcon>
                              </Tooltip>
                              {canManageCampaigns && (
                                <Tooltip label="Delete">
                                  <ActionIcon variant="light" color="red" onClick={() => handleDeleteClick(t.id)}>
                                    <TrashIcon size={16} />
                                  </ActionIcon>
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
                    Showing {(activePage - 1) * parseInt(itemsPerPage) + 1} - {Math.min(activePage * parseInt(itemsPerPage), totalItems)} of {totalItems}
                  </Text>
                  <Pagination total={totalPages} value={activePage} onChange={setActivePage} color="blue" />
                </Group>
              )}
            </Stack>
          )}
        </>
      )}

      <Modal opened={isDesignModalOpen} onClose={() => setIsDesignModalOpen(false)} title="Create New Campaign Design" size="xl">
        <Box mb="lg"><Text c="dimmed" size="sm">Select a size to start designing.</Text></Box>
        <CreationOptions
          forceCampaign
          isCreationLoading={isCreationLoading}
          onCreateProject={handleCreateProject}
          onSizeCardClick={handleSizeCardClick}
        />
      </Modal>

      <Modal
        opened={!!creationPreset}
        onClose={() => setCreationPreset(null)}
        title={
          <Group gap="xs">
            <ThemeIcon variant="light" color="blue"><PlusIcon size={16} /></ThemeIcon>
            <Text fw={600}>Create New Design</Text>
          </Group>
        }
        size="md"
        centered
        radius="md"
        padding="xl"
      >
        <Text size="sm" c="dimmed" mb="lg">
          You are creating <b>{creationPreset?.title}</b>. How would you like to categorize this design for your team?
        </Text>
        <Stack gap="md">
          <Button
            size="xl" variant="light" color="blue" fullWidth h="auto" py="md" justify="flex-start"
            leftSection={<ThemeIcon size={40} radius="xl" variant="filled" color="blue"><LayoutTemplateIcon size={20} /></ThemeIcon>}
            onClick={() => creationPreset && handleCreateProject(creationPreset.width, creationPreset.height, creationPreset.title + ' Template', creationPreset.tags, true)}
            loading={isCreationLoading}
            styles={{ inner: { justifyContent: 'flex-start' }, label: { width: '100%', textAlign: 'left' } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', marginLeft: 8 }}>
              <Text size="md" fw={600}>Create as Template</Text>
              <Text size="xs" c="dimmed" fw={400} ta="left">Visible to Designers</Text>
            </div>
            <ThemeIcon variant="subtle" color="blue" ml="auto"><CheckIcon size={16} /></ThemeIcon>
          </Button>
          <Button
            size="xl" variant="outline" color="green" fullWidth h="auto" py="md" justify="flex-start"
            leftSection={<ThemeIcon size={40} radius="xl" variant="filled" color="green"><FileTextIcon size={20} /></ThemeIcon>}
            onClick={() => creationPreset && handleCreateProject(creationPreset.width, creationPreset.height, creationPreset.title, creationPreset.tags, false)}
            loading={isCreationLoading}
            styles={{ inner: { justifyContent: 'flex-start' }, label: { width: '100%', textAlign: 'left' } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', marginLeft: 8 }}>
              <Text size="md" fw={600}>Create for Campaign</Text>
              <Text size="xs" c="dimmed" fw={400} ta="left">Standard Project</Text>
            </div>
            <ThemeIcon variant="subtle" color="green" ml="auto"><CheckIcon size={16} /></ThemeIcon>
          </Button>
        </Stack>
      </Modal>
    </PageShell>
  );
};

export default Campaigns;
