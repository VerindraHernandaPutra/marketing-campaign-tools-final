import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Group, ActionIcon, Button, Divider, Menu, useMantineColorScheme,
  Box, TextInput, Tooltip, useMantineTheme, Text, Modal, Image, Center, Badge,
} from '@mantine/core';
import {
  ArrowLeft, Download, Undo2, Redo2, Moon, Sun, Cloud, FileType, LayoutTemplate,
  PanelRightOpen, PanelRightClose, ZoomIn, ZoomOut, Maximize, Eye,
} from 'lucide-react';
import { useFabricCanvas } from './CanvasContext';

interface HeaderProps {
  sidebarOpened: boolean;
  onToggleSidebar: () => void;
  propertiesPanelOpened: boolean;
  onTogglePropertiesPanel: () => void;
  projectTitle: string;
  isTemplate?: boolean;
  onUpdateTitle: (newTitle: string) => void;
  onSave: () => void;
  onToggleResizeModal: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToCanvas: () => void;
  onToggleDownloadModal: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  propertiesPanelOpened,
  onTogglePropertiesPanel,
  projectTitle,
  isTemplate,
  onUpdateTitle,
  onSave,
  onToggleResizeModal,
  onToggleDownloadModal,
  onZoomIn,
  onZoomOut,
  onFitToCanvas,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const isDark = colorScheme === 'dark';
  const navigate = useNavigate();
  const [newTitle, setNewTitle] = useState(projectTitle);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [previewOpened, setPreviewOpened] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const { canvas } = useFabricCanvas();

  useEffect(() => {
    // eslint-disable-next-line
    setNewTitle(projectTitle);
    if (projectTitle) {
      document.title = `${projectTitle} — Design Editor`;
    }
  }, [projectTitle]);

  const handleTitleBlur = () => {
    if (newTitle.trim() && newTitle !== projectTitle) {
      setSaveStatus('saving');
      onUpdateTitle(newTitle);
      setTimeout(() => setSaveStatus('saved'), 800);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleManualSave = () => {
    setSaveStatus('saving');
    onSave();
    setTimeout(() => setSaveStatus('saved'), 800);
  };

  const handlePreview = () => {
    if (canvas) {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
      setPreviewImage(dataUrl);
      setPreviewOpened(true);
    }
  };

  return (
    <>
      <Box
        component="header"
        h={64}
        px="md"
        style={{
          borderBottom: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
          backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
        }}
      >
        <Group justify="space-between" h="100%" wrap="nowrap">
          {/* LEFT SECTION */}
          <Group gap="sm" wrap="nowrap">
            <Tooltip label="Back to Dashboard">
              <ActionIcon
                aria-label="Back to Dashboard"
                variant="subtle"
                color="gray"
                size="lg"
                onClick={() => navigate(-1)}
                radius="xl"
              >
                <ArrowLeft size={20} />
              </ActionIcon>
            </Tooltip>

            <Box>
              <Group gap={6} align="center">
                <TextInput
                  aria-label="Project title"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.currentTarget.value);
                    setSaveStatus('unsaved');
                  }}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  variant="unstyled"
                  size="sm"
                  w={Math.max(150, newTitle.length * 10)}
                  styles={{
                    input: {
                      fontWeight: 600,
                      fontSize: '1rem',
                      paddingLeft: 6,
                      paddingRight: 6,
                      borderRadius: 4,
                      transition: 'all 0.2s',
                      color: isDark ? 'white' : '#1f2937',
                      border: '1px solid transparent',
                    },
                  }}
                />
                {isTemplate !== undefined && (
                  <Badge
                    size="xs"
                    variant="filled"
                    color={isTemplate ? 'grape' : 'indigo'}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    {isTemplate ? 'Template' : 'Campaign'}
                  </Badge>
                )}
                <Tooltip label={saveStatus === 'saved' ? 'All changes saved' : 'Unsaved changes'}>
                  <Box>
                    {saveStatus === 'saved' ? (
                      <Cloud size={14} color="gray" />
                    ) : (
                      <div style={{ width: 8, height: 8, backgroundColor: '#eab308', borderRadius: '50%' }} />
                    )}
                  </Box>
                </Tooltip>
              </Group>

              <Group gap={2} mt={-2} mb={10}>
                {/* FILE MENU */}
                <Menu shadow="md" width={200} trigger="hover" openDelay={100} closeDelay={200}>
                  <Menu.Target>
                    <Button variant="subtle" size="compact-sm" color="gray" fw={400}>File</Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<FileType size={14} />} onClick={handleManualSave}>
                      Save
                    </Menu.Item>
                    <Menu.Item leftSection={<LayoutTemplate size={14} />} onClick={onToggleResizeModal}>
                      Resize Canvas
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>

                {/* EDIT MENU */}
                <Menu shadow="md" width={200} trigger="hover" openDelay={100} closeDelay={200}>
                  <Menu.Target>
                    <Button variant="subtle" size="compact-sm" color="gray" fw={400}>Edit</Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<Undo2 size={14} />}
                      onClick={onUndo}
                      disabled={!canUndo}
                      rightSection={<Text size="xs" c="dimmed">Ctrl+Z</Text>}
                    >
                      Undo
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<Redo2 size={14} />}
                      onClick={onRedo}
                      disabled={!canRedo}
                      rightSection={<Text size="xs" c="dimmed">Ctrl+Y</Text>}
                    >
                      Redo
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>

                {/* VIEW MENU */}
                <Menu shadow="md" width={220} trigger="hover" openDelay={100} closeDelay={200}>
                  <Menu.Target>
                    <Button variant="subtle" size="compact-sm" color="gray" fw={400}>View</Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Canvas Controls</Menu.Label>
                    <Menu.Item leftSection={<ZoomIn size={14} />} onClick={onZoomIn}>Zoom In</Menu.Item>
                    <Menu.Item leftSection={<ZoomOut size={14} />} onClick={onZoomOut}>Zoom Out</Menu.Item>
                    <Menu.Item leftSection={<Maximize size={14} />} onClick={onFitToCanvas}>Fit to Screen</Menu.Item>
                    <Menu.Divider />
                    <Menu.Label>Interface</Menu.Label>
                    <Menu.Item
                      leftSection={isDark ? <Sun size={14} /> : <Moon size={14} />}
                      onClick={() => toggleColorScheme()}
                    >
                      {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item leftSection={<Eye size={14} />} onClick={handlePreview} color="blue">
                      Preview Design
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Box>
          </Group>

          {/* RIGHT SECTION */}
          <Group gap="sm" wrap="nowrap">
            <Group gap={4}>
              <Tooltip label="Undo (Ctrl+Z)">
                <ActionIcon
                  aria-label="Undo (Ctrl+Z)"
                  variant="subtle"
                  color="gray"
                  size="md"
                  radius="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                  style={{ opacity: !canUndo ? 0.4 : 1 }}
                >
                  <Undo2 size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Redo (Ctrl+Y)">
                <ActionIcon
                  aria-label="Redo (Ctrl+Y)"
                  variant="subtle"
                  color="gray"
                  size="md"
                  radius="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                  style={{ opacity: !canRedo ? 0.4 : 1 }}
                >
                  <Redo2 size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>

            <Divider orientation="vertical" h={24} />

            <Tooltip label={propertiesPanelOpened ? 'Hide Properties' : 'Show Properties'}>
              <ActionIcon
                aria-label={propertiesPanelOpened ? 'Hide Properties' : 'Show Properties'}
                onClick={onTogglePropertiesPanel}
                size="lg"
                variant={propertiesPanelOpened ? 'light' : 'default'}
                color={propertiesPanelOpened ? 'blue' : 'gray'}
                radius="md"
              >
                {propertiesPanelOpened ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </ActionIcon>
            </Tooltip>

            <Button
              variant="gradient"
              gradient={{ from: 'indigo', to: 'blue' }}
              leftSection={<Download size={16} />}
              onClick={onToggleDownloadModal}
              radius="md"
            >
              Export
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Preview Modal */}
      <Modal
        opened={previewOpened}
        onClose={() => setPreviewOpened(false)}
        title="Design Preview"
        size="xl"
        centered
        overlayProps={{ backgroundOpacity: 0.85, blur: 3, color: '#000' }}
        styles={{
          header: { backgroundColor: 'transparent', color: 'white' },
          content: { backgroundColor: 'transparent', boxShadow: 'none' },
          title: { fontWeight: 700 },
        }}
      >
        <Center>
          {previewImage && (
            <Image
              src={previewImage}
              alt={`Preview of ${newTitle}`}
              radius="md"
              style={{ maxHeight: '80vh', maxWidth: '100%', objectFit: 'contain' }}
            />
          )}
        </Center>
      </Modal>
    </>
  );
};

export default Header;
