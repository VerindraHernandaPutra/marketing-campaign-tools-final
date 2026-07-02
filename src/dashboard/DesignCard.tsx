import React, { useState } from 'react';
import {
  Paper, Text, Group, ActionIcon, Menu, Image, Box,
  UnstyledButton, Badge, LoadingOverlay, Tooltip, Modal, Stack, Button, TagsInput
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import {
  MoreVerticalIcon, TrashIcon, CopyIcon, DownloadIcon,
  PlusCircleIcon, EditIcon, ExternalLinkIcon, PencilIcon,
  LayoutTemplateIcon, ImageIcon, TagIcon
} from 'lucide-react';

const TAG_SUGGESTIONS = [
  'Social Media', 'Instagram', 'Facebook', 'Email', 'Marketing',
  'Campaign', 'Template', 'Draft', 'Custom', 'Banner', 'Poster',
  'Story', 'Thumbnail', 'Promo', 'Event',
];
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/useAuth';
import { useUserRole } from '../auth/UserContext';
import ConfirmationModal from '../shared/ConfirmationModal';

interface DesignCardProps {
  design: {
    id: string;
    title: string;
    thumbnail: string | null;
    updated_at?: string | null;
    canvas_data?: unknown;
    tags?: string[] | null;
    is_template?: boolean;
  };
  isTemplate?: boolean;
  onRefresh?: () => void;
  hideDelete?: boolean;
}

function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) return 'just now';
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'mo ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'm ago';
  return Math.floor(seconds) + 's ago';
}

const DesignCard: React.FC<DesignCardProps> = ({ design, isTemplate, onRefresh, hideDelete = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, isSuperAdmin, currentOrgId } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [editingTags, setEditingTags] = useState<string[]>([]);

  const isOperator = isSuperAdmin || role === 'operator';
  const isDesigner = role === 'designer';
  const canManageSource = (!isTemplate || isOperator) && !hideDelete;
  const canAddToCampaign = isSuperAdmin || role === 'operator' || role === 'marketer';

  const handleEdit = () => navigate(`/editor/${design.id}`);
  const handleOpen = () => window.open(`/editor/${design.id}`, '_blank');

  const handleDuplicate = async (asTemplate = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: original } = await supabase.from('projects').select('*').eq('id', design.id).single();
      if (original) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orig = original as any;
        const { data: newProject, error } = await supabase.from('projects').insert({
          user_id: user.id,
          organization_id: currentOrgId,
          is_template: asTemplate,
          title: `${orig.title} (Copy)`,
          canvas_data: orig.canvas_data,
          thumbnail_url: orig.thumbnail_url,
          tags: orig.tags
        }).select('id').single();
        if (error) throw error;
        if (!asTemplate && newProject) {
          navigate(`/editor/${newProject.id}`);
        } else if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error: unknown) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    const { error } = await supabase.from('projects').delete().eq('id', design.id);
    setLoading(false);
    setIsDeleteModalOpen(false);
    if (error) alert('Error: ' + error.message);
    else if (onRefresh) onRefresh();
  };

  const handleDownload = async () => {
    if (!design.thumbnail) {
      alert('No thumbnail. Open and save the project first.');
      return;
    }
    try {
      const response = await fetch(design.thumbnail);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${design.title.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Download failed.');
    }
  };

  const handleOpenTagModal = () => {
    setEditingTags(design.tags ?? []);
    setTagModalOpen(true);
  };

  const handleSaveTags = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('projects').update({ tags: editingTags }).eq('id', design.id);
      if (error) throw error;
      setTagModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCampaign = () => {
    navigate('/campaign-manager/new', {
      state: { importedDesign: { title: design.title, thumbnail: design.thumbnail } }
    });
  };

  const handleCardClick = () => {
    if (isTemplate) {
      if (isOperator) {
        handleEdit();
      } else {
        if (confirm(`Create a new project from "${design.title}" template?`)) {
          handleDuplicate(false);
        }
      }
    } else {
      handleEdit();
    }
  };

  const hasThumbnail = design.thumbnail && design.thumbnail.length > 10;

  return (
    <>
      <Modal
        opened={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        title={<Group gap="xs"><TagIcon size={16} /><Text fw={600}>Edit Tags — {design.title}</Text></Group>}
        centered
      >
        <Stack gap="md">
          <TagsInput
            label="Tags"
            description="Ketik lalu tekan Enter untuk menambah tag baru"
            placeholder="Tambah tag..."
            value={editingTags}
            onChange={setEditingTags}
            data={TAG_SUGGESTIONS}
            clearable
            splitChars={[',', ' ']}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setTagModalOpen(false)}>Batal</Button>
            <Button onClick={handleSaveTags} loading={loading} leftSection={<TagIcon size={14} />}>
              Simpan
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmationModal
        opened={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Design?"
        message={`Are you sure you want to delete "${design.title}"? This action cannot be undone.`}
        confirmLabel="Delete Forever"
        isDanger
        loading={loading}
      />

      <Paper
        shadow="sm"
        radius="md"
        pos="relative"
        style={{ overflow: 'hidden', cursor: 'pointer', border: '1px solid #e5e7eb' }}
      >
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'md', blur: 2 }} />

        <UnstyledButton onClick={handleCardClick} style={{ width: '100%' }}>
          <Box
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/3',
              overflow: 'hidden',
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          >
            {hasThumbnail ? (
              <Image
                src={design.thumbnail}
                alt={design.title}
                fit="contain"
                style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'white' }}
              />
            ) : (
              <Box style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: '#f9fafb', padding: 16, textAlign: 'center'
              }}>
                <ImageIcon size={48} style={{ color: '#d1d5db', marginBottom: 8 }} />
                <Text size="xs" c="dimmed">No Preview</Text>
              </Box>
            )}
            {isTemplate && (
              <Badge
                style={{ position: 'absolute', top: 8, right: 8 }}
                color="grape" variant="filled" size="sm"
              >
                Template
              </Badge>
            )}
          </Box>
        </UnstyledButton>

        <Box p="md">
          <Group justify="space-between" wrap="nowrap" mb={6}>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Tooltip label={design.title} openDelay={500}>
                <Text fw={600} size="sm" lineClamp={1}>{design.title}</Text>
              </Tooltip>
              <Text size="xs" c="dimmed">
                {isTemplate && isDesigner ? 'Click to Use' : `Edited ${timeAgo(design.updated_at)}`}
              </Text>
            </Box>

            <Menu shadow="md" width={220} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" onClick={e => e.stopPropagation()}>
                  <MoreVerticalIcon size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {isTemplate && isOperator && (
                  <>
                    <Menu.Label>Operator Actions</Menu.Label>
                    <Menu.Item leftSection={<PencilIcon size={14} />} onClick={e => { e.stopPropagation(); handleEdit(); }}>
                      Edit Master Template
                    </Menu.Item>
                    <Menu.Item leftSection={<LayoutTemplateIcon size={14} />} onClick={e => { e.stopPropagation(); handleDuplicate(false); }}>
                      Use for Campaign
                    </Menu.Item>
                    <Menu.Divider />
                  </>
                )}
                {isTemplate && !isOperator && (
                  <Menu.Item leftSection={<PlusCircleIcon size={14} />} onClick={e => { e.stopPropagation(); handleDuplicate(false); }}>
                    Use Template
                  </Menu.Item>
                )}
                {!isTemplate && (
                  <Menu.Item leftSection={<EditIcon size={14} />} onClick={e => { e.stopPropagation(); handleEdit(); }}>
                    Edit
                  </Menu.Item>
                )}
                <Menu.Item leftSection={<ExternalLinkIcon size={14} />} onClick={e => { e.stopPropagation(); handleOpen(); }}>
                  Open in New Tab
                </Menu.Item>
                {canAddToCampaign && (
                  <Menu.Item leftSection={<PlusCircleIcon size={14} />} onClick={e => { e.stopPropagation(); handleAddToCampaign(); }}>
                    Add to Campaign
                  </Menu.Item>
                )}
                <Menu.Divider />
                <Menu.Item leftSection={<TagIcon size={14} />} onClick={e => { e.stopPropagation(); handleOpenTagModal(); }}>
                  Edit Tags
                </Menu.Item>
                <Menu.Item leftSection={<CopyIcon size={14} />} onClick={e => { e.stopPropagation(); handleDuplicate(design.is_template ?? false); }}>
                  Duplicate
                </Menu.Item>
                <Menu.Item leftSection={<DownloadIcon size={14} />} onClick={e => { e.stopPropagation(); handleDownload(); }}>
                  Download
                </Menu.Item>
                {canManageSource && (
                  <>
                    <Menu.Divider />
                    <Menu.Item leftSection={<TrashIcon size={14} />} color="red" onClick={e => { e.stopPropagation(); setIsDeleteModalOpen(true); }}>
                      Delete
                    </Menu.Item>
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>

          {design.tags && design.tags.length > 0 && (
            <Group gap={4} mt={8}>
              {design.tags.slice(0, 2).map(tag => (
                <Badge key={tag} size="xs" variant="outline" color="dark" radius="sm">{tag}</Badge>
              ))}
              {design.tags.length > 2 && (
                <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>+{design.tags.length - 2}</Text>
              )}
            </Group>
          )}
        </Box>
      </Paper>
    </>
  );
};

export default DesignCard;
