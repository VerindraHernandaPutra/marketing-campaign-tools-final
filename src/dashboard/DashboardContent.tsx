import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Tabs, SimpleGrid, Text, Box, Group, Button,
  Center, Loader, Badge, Modal, ScrollArea, Chip, ActionIcon,
  Table, SegmentedControl, Paper, Avatar, TagsInput, Tooltip, Stack,
  Pagination, Select, TextInput, ThemeIcon
} from '@mantine/core';
import {
  LayoutIcon, FacebookIcon, InstagramIcon, MailIcon, PlusIcon,
  FilterIcon, GridIcon, ListIcon, TrashIcon, EditIcon, LayoutTemplateIcon,
  FileTextIcon, SearchIcon, CheckIcon, SortAscIcon
} from 'lucide-react';
import PageHeader from '../shared/PageHeader';
import { Navigate, useNavigate } from 'react-router-dom';
import CreateNewCard from './CreateNewCard';
import DesignCard from './DesignCard';
import MetricsCard from '../analytics/MetricsCard';
import EngagementChart from '../analytics/EngagementChart';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/useAuth';
import { useUserRole } from '../auth/UserContext';
import ConfirmationModal from '../shared/ConfirmationModal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CanvasData {
  width?: number;
  height?: number;
  [key: string]: unknown;
}

export type Project = {
  id: string;
  user_id: string;
  title: string;
  canvas_data: CanvasData | null;
  thumbnail_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_template?: boolean;
  tags?: string[] | null;
  organization_id?: string;
};

const TEMPLATE_TAGS = ['All', 'Social Media', 'Instagram', 'Facebook', 'Email', 'Business', 'Custom'];
const RECENT_TAGS = ['All', 'Social Media', 'Instagram', 'Facebook', 'Email', 'Marketing', 'Campaign', 'Template', 'Custom'];

// ─── Sub-components (DILUAR component utama) ─────────────────────────────────

interface ViewToggleProps {
  viewMode: 'grid' | 'list';
  onChange: (v: 'grid' | 'list') => void;
}
const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onChange }) => (
  <SegmentedControl
    value={viewMode}
    onChange={(val) => onChange(val as 'grid' | 'list')}
    data={[
      { label: <Tooltip label="Grid View"><GridIcon size={16} /></Tooltip>, value: 'grid' },
      { label: <Tooltip label="List View"><ListIcon size={16} /></Tooltip>, value: 'list' },
    ]}
  />
);

interface ProjectTableProps {
  data: Project[];
  onEdit: (id: string) => void;
  onDuplicate: (project: Project, asTemplate: boolean) => void;
  onDelete: (id: string) => void;
}
const ProjectTable: React.FC<ProjectTableProps> = ({ data, onEdit, onDuplicate, onDelete }) => (
  <Paper shadow="sm" withBorder>
    <Table striped highlightOnHover verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Tags</Table.Th>
          <Table.Th>Dimensions</Table.Th>
          <Table.Th>Last Updated</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.map(t => (
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
                {t.tags?.slice(0, 3).map(tag => <Badge key={tag} size="xs" variant="outline">{tag}</Badge>)}
                {t.tags && t.tags.length > 3 && <Badge size="xs" variant="outline">+{t.tags.length - 3}</Badge>}
              </Group>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{t.canvas_data?.width || '?'} x {t.canvas_data?.height || '?'}</Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{new Date(t.updated_at || '').toLocaleDateString()}</Text>
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                <Tooltip label="Edit">
                  <ActionIcon variant="light" color="blue" onClick={() => onEdit(t.id)}><EditIcon size={16} /></ActionIcon>
                </Tooltip>
                <Tooltip label="Duplicate">
                  <ActionIcon variant="light" color="green" onClick={() => onDuplicate(t, t.is_template || false)}><LayoutTemplateIcon size={16} /></ActionIcon>
                </Tooltip>
                <Tooltip label="Delete">
                  <ActionIcon variant="light" color="red" onClick={() => onDelete(t.id)}><TrashIcon size={16} /></ActionIcon>
                </Tooltip>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  </Paper>
);

interface DataRendererProps {
  paginatedItems: Project[];
  totalItems: number;
  totalPages: number;
  viewMode: 'grid' | 'list';
  activePage: number;
  itemsPerPage: string;
  searchQuery: string;
  onPageChange: (p: number) => void;
  onClearSearch: () => void;
  onRefresh: () => void;
  isTemplate: boolean;
  onEdit: (id: string) => void;
  onDuplicate: (project: Project, asTemplate: boolean) => void;
  onDelete: (id: string) => void;
}
const DataRenderer: React.FC<DataRendererProps> = ({
  paginatedItems, totalItems, totalPages, viewMode,
  activePage, itemsPerPage, searchQuery,
  onPageChange, onClearSearch, onRefresh, isTemplate,
  onEdit, onDuplicate, onDelete
}) => {
  if (totalItems === 0) {
    return (
      <Box py="xl" ta="center"
        style={{ background: '#f9fafb', borderRadius: 8, border: '1px dashed #d1d5db' }}>
        <Text c="dimmed" mb="md">
          {searchQuery ? `No results found for "${searchQuery}".` : 'No items found.'}
        </Text>
        {searchQuery && (
          <Button variant="subtle" size="xs" onClick={onClearSearch}>Clear Search</Button>
        )}
      </Box>
    );
  }
  return (
    <Stack gap="lg">
      {viewMode === 'grid' ? (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="lg">
          {paginatedItems.map(project => (
            <DesignCard
              key={project.id}
              design={{
                id: project.id,
                title: project.title,
                thumbnail: project.thumbnail_url,
                updated_at: project.updated_at,
                canvas_data: project.canvas_data,
                tags: project.tags
              }}
              isTemplate={isTemplate}
              onRefresh={onRefresh}
            />
          ))}
        </SimpleGrid>
      ) : (
        <ProjectTable data={paginatedItems} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
      )}
      {totalPages > 1 && (
        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            Showing {(activePage - 1) * parseInt(itemsPerPage) + 1}–
            {Math.min(activePage * parseInt(itemsPerPage), totalItems)} of {totalItems}
          </Text>
          <Pagination total={totalPages} value={activePage} onChange={onPageChange} color="blue" />
        </Group>
      )}
    </Stack>
  );
};

interface CreationOptionsProps {
  isTemplateMode?: boolean;
  forceCampaign?: boolean;
  isOperator: boolean;
  isCreationLoading: boolean;
  onSizeCardClick: (w?: number, h?: number, title?: string, tags?: string[], force?: boolean) => void;
  onCreateProject: (w: number | undefined, h: number | undefined, title: string, tags: string[], isTemplate: boolean) => void;
}
const CreationOptions: React.FC<CreationOptionsProps> = ({
  isTemplateMode = false, forceCampaign = false,
  onSizeCardClick, onCreateProject
}) => (
  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
    <CreateNewCard icon={<LayoutIcon size={24} />} title="Custom Size" description="Start from scratch"
      onClick={() => isTemplateMode
        ? onCreateProject(undefined, undefined, 'Custom Template', ['Custom'], true)
        : onSizeCardClick(undefined, undefined, 'Custom Size', ['Custom'], forceCampaign)} />
    <CreateNewCard icon={<InstagramIcon size={24} />} title="Instagram Post" description="1080 x 1080 px" width={1080} height={1080}
      onClick={() => isTemplateMode
        ? onCreateProject(1080, 1080, 'Instagram Template', ['Social Media', 'Instagram'], true)
        : onSizeCardClick(1080, 1080, 'Instagram Post', ['Social Media', 'Instagram'], forceCampaign)} />
    <CreateNewCard icon={<FacebookIcon size={24} />} title="Facebook Post" description="1200 x 630 px" width={1200} height={630}
      onClick={() => isTemplateMode
        ? onCreateProject(1200, 630, 'Facebook Template', ['Social Media', 'Facebook'], true)
        : onSizeCardClick(1200, 630, 'Facebook Post', ['Social Media', 'Facebook'], forceCampaign)} />
    <CreateNewCard icon={<MailIcon size={24} />} title="Email Header" description="600 x 200 px" width={600} height={200}
      onClick={() => isTemplateMode
        ? onCreateProject(600, 200, 'Email Template', ['Email', 'Marketing'], true)
        : onSizeCardClick(600, 200, 'Email Header', ['Email', 'Marketing'], forceCampaign)} />
  </SimpleGrid>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const DashboardContent: React.FC = () => {
  const { user } = useAuth();
  const { role, isSuperAdmin, currentOrgId } = useUserRole();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string | null>('recent');
  const [templateFilter, setTemplateFilter] = useState('All');
  const [campaignFilter, setCampaignFilter] = useState('All');
  const [recentFilter, setRecentFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState('12');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [newTemplateTags, setNewTemplateTags] = useState<string[]>([]);
  const [creationPreset, setCreationPreset] = useState<{ width?: number; height?: number; title: string; tags: string[] } | null>(null);
  const [isCreationLoading, setIsCreationLoading] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const isMarketer = role === 'marketer' && !isSuperAdmin;
  const isOperator = role === 'operator' || isSuperAdmin;

  const { data: allProjects = [], isLoading: loadingProjects, refetch: fetchAllProjects } = useQuery({
    queryKey: ['projects', currentOrgId],
    enabled: !!currentOrgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, user_id, title, thumbnail_url, created_at, updated_at, tags, is_template, organization_id, width:canvas_data->width, height:canvas_data->height')
        .eq('organization_id', currentOrgId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((d: any) => ({ ...d, canvas_data: { width: d.width, height: d.height } })) as Project[];
    },
  });

  const projects = allProjects;
  const templates = allProjects.filter(p => p.is_template === true);
  const campaignDesigns = allProjects.filter(p => p.is_template === false);

  useEffect(() => {
    // eslint-disable-next-line
    setActivePage(1);
    setSearchQuery('');
    setSortBy('updated_desc');
  }, [activeTab, templateFilter, campaignFilter, recentFilter]);

  const processData = (data: Project[], tagFilter: string, tagList: string[]) => {
    let filtered = [...data];
    if (tagList === RECENT_TAGS) {
      if (tagFilter === 'Template') filtered = filtered.filter(p => p.is_template === true);
      else if (tagFilter === 'Campaign') filtered = filtered.filter(p => p.is_template === false);
    } else {
      if (tagFilter !== 'All') filtered = filtered.filter(p => p.tags?.includes(tagFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) || p.tags?.some(t => t.toLowerCase().includes(q))
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

  const handleCreateProject = async (
    width: number | undefined, height: number | undefined,
    title: string, tags: string[], isTemplate: boolean
  ) => {
    if (!user) return;
    setIsCreationLoading(true);
    try {
      const { data, error } = await supabase.from('projects').insert({
        title,
        user_id: user.id,
        organization_id: currentOrgId || undefined,
        is_template: isTemplate,
        tags: [...tags, ...(isTemplate ? newTemplateTags : [])],
        canvas_data: {
          version: '5.3.0',
          width: width || 850,
          height: height || 500,
          backgroundColor: '#ffffff',
          objects: []
        }
      }).select().single();
      if (error) throw error;
      if (data) {
        setNewTemplateTags([]);
        setIsTemplateModalOpen(false);
        setIsDesignModalOpen(false);
        setCreationPreset(null);
        navigate(`/editor/${data.id}`);
      }
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setIsCreationLoading(false);
    }
  };

  const handleSizeCardClick = (width?: number, height?: number, title?: string, autoTags: string[] = [], forceCampaign = false) => {
    const finalTitle = title || 'Untitled Project';
    if (forceCampaign) {
      handleCreateProject(width, height, finalTitle, autoTags, false);
      setIsDesignModalOpen(false);
      return;
    }
    if (isOperator) {
      setIsTemplateModalOpen(false);
      setIsDesignModalOpen(false);
      setCreationPreset({ width, height, title: finalTitle, tags: autoTags });
    } else {
      handleCreateProject(width, height, finalTitle, autoTags, false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    const { error } = await supabase.from('projects').delete().eq('id', projectToDelete);
    if (!error) { fetchAllProjects(); setDeleteModalOpen(false); setProjectToDelete(null); }
    else alert('Error: ' + error.message);
  };

  const handleDelete = (id: string) => { setProjectToDelete(id); setDeleteModalOpen(true); };

  const handleDuplicate = async (project: Project, asTemplate: boolean) => {
    if (!user || !currentOrgId) return;
    if (!confirm(`Duplicate "${project.title}"?`)) return;
    try {
      const { data, error } = await supabase.from('projects').insert({
        user_id: user.id,
        organization_id: currentOrgId,
        is_template: asTemplate,
        title: `${project.title} (Copy)`,
        canvas_data: project.canvas_data,
        thumbnail_url: project.thumbnail_url,
        tags: project.tags
      }).select('id').single();
      if (error) throw error;
      if (data) navigate(`/editor/${data.id}`);
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  if (isSuperAdmin) return <Navigate to="/admin" replace />;

  const greeting = role === 'operator' ? 'Operator Dashboard' : role === 'designer' ? 'Designer Studio' : 'Marketing Hub';
  const subtitle = role === 'operator' ? "Manage your organization's campaigns and designs"
    : role === 'designer' ? 'Create and manage your visual assets'
    : 'Track performance and schedule campaigns';

  if (isMarketer) {
    return (
      <>
        <PageHeader icon={<MailIcon size={22} />} title={greeting} subtitle={subtitle}
          gradient={{ from: 'cyan', to: 'teal' }}
          action={<Badge color="cyan" variant="light" size="lg">Marketer</Badge>} />
        <SimpleGrid cols={3} spacing="lg" mb="xl">
          <MetricsCard title="Active Campaigns" value="4" change={12} trend="up" />
          <MetricsCard title="Total Reach" value="12.5k" change={5.4} trend="up" />
          <MetricsCard title="Engagement Rate" value="4.2%" change={-1.1} trend="down" />
        </SimpleGrid>
        <EngagementChart data={[]} />
      </>
    );
  }

  const currentTagFilter = activeTab === 'recent' ? recentFilter : activeTab === 'templates' ? templateFilter : campaignFilter;
  const setCurrentTagFilter = activeTab === 'recent' ? setRecentFilter : activeTab === 'templates' ? setTemplateFilter : setCampaignFilter;
  const currentTagList = activeTab === 'recent' ? RECENT_TAGS : TEMPLATE_TAGS;

  const recentData = processData(projects, recentFilter, RECENT_TAGS);
  const templateData = processData(templates, templateFilter, TEMPLATE_TAGS);
  const campaignData = processData(campaignDesigns, campaignFilter, TEMPLATE_TAGS);

  return (
    <Box>
      <ConfirmationModal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Design?"
        message="Are you sure? This action cannot be undone."
        confirmLabel="Delete Forever"
        isDanger
      />

      {/* Operator choice: Template or Campaign? */}
      <Modal
        opened={!!creationPreset}
        onClose={() => setCreationPreset(null)}
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
              <Text size="xs" c="dimmed" fw={400}>Save as a master template for Designers to reuse.</Text>
            </div>
            <div style={{ marginLeft: 'auto' }}><ThemeIcon variant="subtle" color="blue"><CheckIcon size={16} /></ThemeIcon></div>
          </Button>
          <Button size="xl" variant="light" color="green" fullWidth h="auto" py="md" justify="flex-start"
            leftSection={<ThemeIcon size={40} radius="xl" variant="filled" color="green"><FileTextIcon size={20} /></ThemeIcon>}
            onClick={() => creationPreset && handleCreateProject(creationPreset.width, creationPreset.height, creationPreset.title, creationPreset.tags, false)}
            loading={isCreationLoading}
            styles={{ inner: { justifyContent: 'flex-start' }, label: { width: '100%', textAlign: 'left' } }}
          >
            <div style={{ marginLeft: 8 }}>
              <Text size="md" fw={600}>Create for Campaign</Text>
              <Text size="xs" c="dimmed" fw={400}>Create a standalone design for a specific campaign.</Text>
            </div>
            <div style={{ marginLeft: 'auto' }}><ThemeIcon variant="subtle" color="green"><CheckIcon size={16} /></ThemeIcon></div>
          </Button>
        </Stack>
      </Modal>

      <PageHeader
        icon={role === 'operator' ? <LayoutIcon size={22} /> : <LayoutTemplateIcon size={22} />}
        title={greeting}
        subtitle={subtitle}
        gradient={role === 'operator' ? { from: 'blue', to: 'indigo' } : { from: 'pink', to: 'violet' }}
        action={
          role === 'operator' ? <Badge color="blue" variant="light" size="lg">Operator</Badge> :
          role === 'designer' ? <Badge color="pink" variant="light" size="lg">Designer</Badge> : undefined
        }
      />

      <CreationOptions
        isTemplateMode={false}
        isOperator={isOperator}
        isCreationLoading={isCreationLoading}
        onSizeCardClick={handleSizeCardClick}
        onCreateProject={handleCreateProject}
      />

      <Tabs value={activeTab} onChange={setActiveTab} mt="xl" color="blue">
        <Tabs.List>
          <Tabs.Tab value="recent">Recent designs</Tabs.Tab>
          <Tabs.Tab value="templates">Templates</Tabs.Tab>
          {isOperator && <Tabs.Tab value="campaigns">Campaign Designs</Tabs.Tab>}
        </Tabs.List>

        <Box my="md">
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <TextInput
                placeholder="Search designs..."
                leftSection={<SearchIcon size={14} />}
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
                w={180} allowDeselect={false}
                leftSection={<SortAscIcon size={14} />}
              />
              <Select
                data={['12', '24', '48', '96']}
                value={itemsPerPage}
                onChange={v => setItemsPerPage(v || '12')}
                w={70} allowDeselect={false}
              />
            </Group>
            <Group>
              <ViewToggle viewMode={viewMode} onChange={setViewMode} />
              <Button variant="subtle" size="sm" color="blue" onClick={() => fetchAllProjects()}>Refresh</Button>
              {activeTab === 'templates' && isOperator && (
                <Button leftSection={<PlusIcon size={16} />} onClick={() => setIsTemplateModalOpen(true)}>New Template</Button>
              )}
              {activeTab === 'campaigns' && (
                <Button leftSection={<PlusIcon size={16} />} onClick={() => setIsDesignModalOpen(true)}>New Design</Button>
              )}
            </Group>
          </Group>

          <ScrollArea type="never" mb="lg">
            <Group gap="sm" wrap="nowrap">
              <FilterIcon size={16} style={{ color: '#9ca3af' }} />
              {currentTagList.map(tag => (
                <Chip key={tag} checked={currentTagFilter === tag} onChange={() => setCurrentTagFilter(tag)}
                  variant="light" color="blue" size="sm">
                  {tag}
                </Chip>
              ))}
            </Group>
          </ScrollArea>
        </Box>

        <Tabs.Panel value="recent">
          {loadingProjects ? <Center h={100}><Loader /></Center> : (
            <DataRenderer
              {...recentData}
              viewMode={viewMode} activePage={activePage} itemsPerPage={itemsPerPage}
              searchQuery={searchQuery} onPageChange={setActivePage}
              onClearSearch={() => setSearchQuery('')} onRefresh={fetchAllProjects}
              isTemplate={false}
              onEdit={id => navigate(`/editor/${id}`)}
              onDuplicate={handleDuplicate} onDelete={handleDelete}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="templates">
          {loadingProjects ? <Center h={100}><Loader /></Center> : (
            <DataRenderer
              {...templateData}
              viewMode={viewMode} activePage={activePage} itemsPerPage={itemsPerPage}
              searchQuery={searchQuery} onPageChange={setActivePage}
              onClearSearch={() => setSearchQuery('')} onRefresh={fetchAllProjects}
              isTemplate={true}
              onEdit={id => navigate(`/editor/${id}`)}
              onDuplicate={handleDuplicate} onDelete={handleDelete}
            />
          )}
        </Tabs.Panel>

        {isOperator && (
          <Tabs.Panel value="campaigns">
            {loadingProjects ? <Center h={100}><Loader /></Center> : (
              <DataRenderer
                {...campaignData}
                viewMode={viewMode} activePage={activePage} itemsPerPage={itemsPerPage}
                searchQuery={searchQuery} onPageChange={setActivePage}
                onClearSearch={() => setSearchQuery('')} onRefresh={fetchAllProjects}
                isTemplate={false}
                onEdit={id => navigate(`/editor/${id}`)}
                onDuplicate={handleDuplicate} onDelete={handleDelete}
              />
            )}
          </Tabs.Panel>
        )}
      </Tabs>

      <Modal opened={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)}
        title="Create New Template" size="xl">
        <Box mb="lg">
          <Text size="sm" fw={500} mb="xs">Custom Tags</Text>
          <TagsInput placeholder="Enter custom tags..." data={[]} value={newTemplateTags} onChange={setNewTemplateTags} mb="md" />
          <Text c="dimmed" size="sm">Select a preset size to create the template.</Text>
        </Box>
        <CreationOptions
          isTemplateMode={true} isOperator={isOperator} isCreationLoading={isCreationLoading}
          onSizeCardClick={handleSizeCardClick} onCreateProject={handleCreateProject}
        />
      </Modal>

      <Modal opened={isDesignModalOpen} onClose={() => setIsDesignModalOpen(false)}
        title="Create Campaign Design" size="xl">
        <Box mb="lg"><Text c="dimmed" size="sm">Select a size to start a new campaign design.</Text></Box>
        <CreationOptions
          isTemplateMode={false} forceCampaign={true} isOperator={isOperator}
          isCreationLoading={isCreationLoading}
          onSizeCardClick={handleSizeCardClick} onCreateProject={handleCreateProject}
        />
      </Modal>
    </Box>
  );
};

export default DashboardContent;
