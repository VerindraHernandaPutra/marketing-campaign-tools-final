import React, { useState } from 'react';
import {
  Container, Title, Group, Button, TextInput, Paper,
  Text, ActionIcon, Menu, Modal, SimpleGrid, Badge
} from '@mantine/core';
import { SearchIcon, FolderIcon, MoreVerticalIcon, EditIcon, TrashIcon, FolderPlusIcon } from 'lucide-react';
import PageShell from '../shared/PageShell';

const Folders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const folders = [
    { id: '1', name: 'Brand Assets',         itemCount: 24, color: 'blue',   lastModified: '2 hours ago'  },
    { id: '2', name: 'Social Media',          itemCount: 48, color: 'pink',   lastModified: '5 hours ago'  },
    { id: '3', name: 'Marketing Campaigns',   itemCount: 36, color: 'green',  lastModified: '1 day ago'    },
    { id: '4', name: 'Presentations',         itemCount: 12, color: 'orange', lastModified: '2 days ago'   },
    { id: '5', name: 'Print Materials',       itemCount: 18, color: 'violet', lastModified: '3 days ago'   },
    { id: '6', name: 'Client Work',           itemCount: 56, color: 'red',    lastModified: '1 week ago'   },
  ];

  const filtered = folders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateFolder = () => {
    console.log('Creating folder:', newFolderName);
    setNewFolderName('');
    setCreateModalOpened(false);
  };

  return (
    <PageShell>
      <Container size="xl" p={0}>
        <Group justify="space-between" mb="xl">
          <Title order={2}>Folders</Title>
          <Button leftSection={<FolderPlusIcon size={16} />} color="blue" onClick={() => setCreateModalOpened(true)}>
            New Folder
          </Button>
        </Group>

        <TextInput
          placeholder="Search folders..."
          leftSection={<SearchIcon size={16} />}
          value={searchQuery}
          onChange={e => setSearchQuery(e.currentTarget.value)}
          w={300}
          mb="lg"
        />

        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="lg">
          {filtered.map(folder => (
            <Paper key={folder.id} shadow="sm" p="lg" style={{ cursor: 'pointer' }} withBorder>
              <Group justify="space-between" mb="md">
                <FolderIcon size={32} color={`var(--mantine-color-${folder.color}-5)`} />
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <ActionIcon variant="subtle">
                      <MoreVerticalIcon size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<EditIcon size={14} />}>Rename</Menu.Item>
                    <Menu.Divider />
                    <Menu.Item leftSection={<TrashIcon size={14} />} color="red">Delete</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
              <Text fw={600} size="lg" mb="xs">{folder.name}</Text>
              <Group justify="space-between">
                <Badge color={folder.color} variant="light">{folder.itemCount} items</Badge>
                <Text size="xs" c="dimmed">{folder.lastModified}</Text>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      </Container>

      <Modal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        title="Create New Folder"
      >
        <TextInput
          label="Folder Name"
          placeholder="Enter folder name"
          value={newFolderName}
          onChange={e => setNewFolderName(e.currentTarget.value)}
          mb="md"
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={() => setCreateModalOpened(false)}>Cancel</Button>
          <Button onClick={handleCreateFolder}>Create</Button>
        </Group>
      </Modal>
    </PageShell>
  );
};

export default Folders;
