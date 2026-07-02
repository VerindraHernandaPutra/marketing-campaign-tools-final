// [cite: src/pages/Groups.tsx]
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button, Table, Group, TextInput, Modal, ActionIcon,
  LoadingOverlay, Paper, Drawer, Text, Select, Pagination, Stack,
  Checkbox, ScrollArea, Avatar, Badge, Divider, Center, ThemeIcon, Box
} from '@mantine/core';
import { 
  PlusIcon, EditIcon, TrashIcon, UsersIcon, SearchIcon, SortAscIcon, 
  ArrowRightIcon, ArrowLeftIcon, CheckIcon, UserIcon
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import PageShell from '../../shared/PageShell';
import PageHeader from '../../shared/PageHeader';
import { useAuth } from '../../auth/useAuth';
import { useUserRole } from '../../auth/UserContext';

interface MarketingGroup {
  id: string;
  name: string;
  description: string;
  client_count?: number;
  created_at?: string;
}

interface Client {
    id: string;
    name: string;
    email?: string;
    avatar_url?: string;
}

// Define a type for the raw response to avoid 'any'
interface GroupWithCount {
  id: string;
  name: string;
  description: string;
  created_at: string;
  client_groups: { count: number }[];
}

interface CustomListProps {
  items: Client[];
  selection: string[];
  onToggle: (id: string) => void;
  placeholder: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  emptyLabel: string;
}

const CustomList: React.FC<CustomListProps> = ({
  items, selection, onToggle, placeholder, searchValue, onSearchChange, emptyLabel
}) => (
  <Paper withBorder h="100%" display="flex" style={{ flexDirection: 'column', overflow: 'hidden' }}>
    <Box p="xs" className="border-b border-gray-200 bg-gray-50">
      <TextInput
        placeholder={placeholder}
        size="xs"
        leftSection={<SearchIcon size={12} />}
        value={searchValue}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
      />
      <Group justify="space-between" mt="xs">
        <Text size="xs" c="dimmed">{items.length} items</Text>
        <Text size="xs" c="dimmed">{selection.length} selected</Text>
      </Group>
    </Box>
    <ScrollArea flex={1}>
      {items.length === 0 ? (
        <Center h={100}>
          <Text size="xs" c="dimmed">{emptyLabel}</Text>
        </Center>
      ) : (
        <Stack gap={0}>
          {items.map(client => {
            const isSelected = selection.includes(client.id);
            return (
              <Group
                key={client.id}
                p="xs"
                wrap="nowrap"
                className={`cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${isSelected ? 'bg-blue-50' : ''}`}
                onClick={() => onToggle(client.id)}
              >
                <Checkbox checked={isSelected} readOnly size="xs" style={{ pointerEvents: 'none' }} />
                <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                  <Avatar size="sm" radius="xl" color="blue"><UserIcon size={14} /></Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>{client.name}</Text>
                    {client.email && <Text size="xs" c="dimmed" truncate>{client.email}</Text>}
                  </div>
                </Group>
              </Group>
            );
          })}
        </Stack>
      )}
    </ScrollArea>
  </Paper>
);

const Groups: React.FC = () => {
  const { user } = useAuth();
  const { currentOrgId } = useUserRole();

  // -- Advanced Table States --
  const [searchQuery, setSearchQuery] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<string>('10');
  const [sortBy, setSortBy] = useState<string>('name_asc');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MarketingGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  // -- Advanced Member Management State --
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');
  
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set()); // IDs currently in the group
  
  // Selection states for the transfer lists
  const [leftSelection, setLeftSelection] = useState<string[]>([]);
  const [rightSelection, setRightSelection] = useState<string[]>([]);
  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  const [isSavingMembers, setIsSavingMembers] = useState(false);

  const { data: groups = [], isLoading: loading, refetch: fetchGroups } = useQuery({
    queryKey: ['groups', currentOrgId ?? user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const query = supabase.from('groups').select('*, client_groups(count)');
      const { data, error } = currentOrgId
        ? await query.eq('organization_id', currentOrgId)
        : await query.eq('user_id', user!.id);
      if (error) throw error;
      const rawData = data as unknown as GroupWithCount[];
      return rawData.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        created_at: g.created_at,
        client_count: g.client_groups?.[0]?.count || 0,
      })) as MarketingGroup[];
    },
  });

  // Reset pagination
  useEffect(() => {
    // eslint-disable-next-line
    setActivePage(1);
  }, [searchQuery, sortBy, itemsPerPage]);

  // --- Data Processing ---
  const processedGroups = useMemo(() => {
    let data = [...groups];

    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        data = data.filter(g => 
            g.name.toLowerCase().includes(query) ||
            g.description?.toLowerCase().includes(query)
        );
    }

    data.sort((a, b) => {
        switch (sortBy) {
            case 'name_asc': return a.name.localeCompare(b.name);
            case 'name_desc': return b.name.localeCompare(a.name);
            case 'count_desc': return (b.client_count || 0) - (a.client_count || 0);
            case 'created_desc': default: 
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
    });

    const total = data.length;
    const limit = parseInt(itemsPerPage);
    const totalPages = Math.ceil(total / limit);
    const paginated = data.slice((activePage - 1) * limit, activePage * limit);

    return { data: paginated, total, totalPages };
  }, [groups, searchQuery, sortBy, activePage, itemsPerPage]);

  // --- Actions ---
  const handleSaveGroup = async () => {
    if (!user || !groupName) return;
    try {
      if (editingGroup) {
        await supabase.from('groups').update({ name: groupName, description: groupDesc }).eq('id', editingGroup.id);
      } else {
        await supabase.from('groups').insert({ name: groupName, description: groupDesc, user_id: user.id, organization_id: currentOrgId });
      }
      setModalOpen(false);
      fetchGroups();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const { data: activeCampaigns } = await supabase
      .from('marketing_campaigns')
      .select('id, title')
      .eq('platform_data->>target_group_id', id)
      .in('status', ['scheduled', 'sending'])
      .limit(1);

    if (activeCampaigns && activeCampaigns.length > 0) {
      const campaignTitle = activeCampaigns[0].title;
      if (!confirm(`Grup "${name}" sedang digunakan oleh kampanye aktif "${campaignTitle}". Menghapus grup ini akan mempengaruhi kampanye tersebut. Lanjutkan?`)) return;
    } else {
      if (!confirm(`Delete group "${name}"?`)) return;
    }
    await supabase.from('groups').delete().eq('id', id);
    fetchGroups();
  };

  // --- Advanced Member Management Logic ---

  const openManageMembers = async (group: MarketingGroup) => {
    setSelectedGroupId(group.id);
    setSelectedGroupName(group.name);
    setLeftSelection([]);
    setRightSelection([]);
    setLeftSearch('');
    setRightSearch('');
    setManageOpen(true);
    
    // Fetch all clients
    const { data: clients } = await supabase.from('clients').select('id, name, email').eq('user_id', user!.id);
    setAllClients(clients as Client[] || []);

    // Fetch current members
    const { data: members } = await supabase
      .from('client_groups')
      .select('client_id')
      .eq('group_id', group.id);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberIdSet = new Set(members?.map((m: any) => m.client_id) || []);
    setMemberIds(memberIdSet as Set<string>);
  };

  const saveMembers = async () => {
    if (!selectedGroupId) return;
    setIsSavingMembers(true);

    try {
        // Delete all existing links for this group
        await supabase.from('client_groups').delete().eq('group_id', selectedGroupId);

        // Insert new links from the memberIds set
        if (memberIds.size > 0) {
            const toInsert = Array.from(memberIds).map(clientId => ({
                group_id: selectedGroupId,
                client_id: clientId
            }));
            const { error } = await supabase.from('client_groups').insert(toInsert);
            if (error) throw error;
        }

        setManageOpen(false);
        fetchGroups(); // Update counts in the main table
    } catch (error) {
        console.error("Failed to save members", error);
        alert("Failed to save group members.");
    } finally {
        setIsSavingMembers(false);
    }
  };

  const moveRight = () => {
      const newMemberIds = new Set(memberIds);
      leftSelection.forEach(id => newMemberIds.add(id));
      setMemberIds(newMemberIds);
      setLeftSelection([]);
  };

  const moveLeft = () => {
      const newMemberIds = new Set(memberIds);
      rightSelection.forEach(id => newMemberIds.delete(id));
      setMemberIds(newMemberIds);
      setRightSelection([]);
  };

  const toggleLeftSelection = (id: string) => {
      setLeftSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleRightSelection = (id: string) => {
      setRightSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Filter lists based on search and membership status
  const leftList = allClients.filter(c => !memberIds.has(c.id) && c.name.toLowerCase().includes(leftSearch.toLowerCase()));
  const rightList = allClients.filter(c => memberIds.has(c.id) && c.name.toLowerCase().includes(rightSearch.toLowerCase()));

  return (
    <PageShell>
        <PageHeader
          icon={<UsersIcon size={22} />}
          title="Client Groups"
          subtitle="Segment your audience into targeted lists"
          gradient={{ from: 'violet', to: 'grape' }}
          action={
            <Button leftSection={<PlusIcon size={16} />} variant="gradient" gradient={{ from: 'violet', to: 'grape' }} onClick={() => {
              setEditingGroup(null); setGroupName(''); setGroupDesc(''); setModalOpen(true);
            }}>
              Create Group
            </Button>
          }
        />

          <Paper shadow="sm" p="md" withBorder>
            <LoadingOverlay visible={loading} />
            
             {/* --- Table Controls --- */}
             <Group justify="space-between" mb="md">
                <Group gap="xs">
                    <TextInput
                        placeholder="Search groups..."
                        leftSection={<SearchIcon size={14} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                        w={250}
                    />
                    <Select 
                        data={[
                            { value: 'name_asc', label: 'Name (A-Z)' },
                            { value: 'name_desc', label: 'Name (Z-A)' },
                            { value: 'count_desc', label: 'Most Members' },
                            { value: 'created_desc', label: 'Newest First' },
                        ]}
                        value={sortBy}
                        onChange={(v) => setSortBy(v || 'name_asc')}
                        leftSection={<SortAscIcon size={14} />}
                        w={180}
                        allowDeselect={false}
                    />
                    <Select 
                        data={['5', '10', '25']} 
                        value={itemsPerPage} 
                        onChange={(v) => setItemsPerPage(v || '10')}
                        w={70}
                        allowDeselect={false}
                    />
                </Group>
            </Group>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Group Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Members</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {processedGroups.data.map((group) => (
                  <Table.Tr key={group.id}>
                    <Table.Td fw={500}>{group.name}</Table.Td>
                    <Table.Td>{group.description || '-'}</Table.Td>
                    <Table.Td>{group.client_count} Clients</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" variant="light" leftSection={<UsersIcon size={14}/>} onClick={() => openManageMembers(group)}>
                          Manage
                        </Button>
                        <ActionIcon variant="subtle" color="blue" onClick={() => {
                           setEditingGroup(group); setGroupName(group.name); setGroupDesc(group.description); setModalOpen(true);
                        }}>
                          <EditIcon size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(group.id, group.name)}>
                          <TrashIcon size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {processedGroups.total === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={4} align="center" style={{ height: 100 }}>
                        <Text c="dimmed">No groups found.</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>

            {/* --- Pagination --- */}
            {processedGroups.totalPages > 1 && (
                <Group justify="space-between" mt="md">
                    <Text size="sm" c="dimmed">
                        Showing {(activePage - 1) * parseInt(itemsPerPage) + 1} - {Math.min(activePage * parseInt(itemsPerPage), processedGroups.total)} of {processedGroups.total}
                    </Text>
                    <Pagination total={processedGroups.totalPages} value={activePage} onChange={setActivePage} color="blue" />
                </Group>
            )}
          </Paper>

      {/* Create/Edit Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingGroup ? "Edit Group" : "Create Group"}>
        <Stack>
            <TextInput label="Name" required value={groupName} onChange={e => setGroupName(e.target.value)} />
            <TextInput label="Description" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} />
            <Group justify="flex-end" mt="sm">
                <Button onClick={handleSaveGroup}>Save</Button>
            </Group>
        </Stack>
      </Modal>

      {/* Advanced Manage Members Drawer */}
      <Drawer 
        opened={manageOpen} 
        onClose={() => setManageOpen(false)} 
        title={
            <Group>
                <ThemeIcon variant="light" color="blue" size="lg"><UsersIcon size={20}/></ThemeIcon>
                <Box>
                    <Text fw={700}>Manage Members</Text>
                    <Text size="xs" c="dimmed">Group: {selectedGroupName}</Text>
                </Box>
            </Group>
        } 
        position="right" 
        size="xl" // Wide drawer for split view
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      >
        <Stack h="calc(100vh - 100px)" gap="md">
            
            <Group grow align="stretch" style={{ flex: 1, minHeight: 0 }}>
                {/* LEFT PANEL: Available Clients */}
                <Stack gap="xs" h="100%">
                    <Text size="sm" fw={600}>Available Clients</Text>
                    <CustomList 
                        items={leftList} 
                        selection={leftSelection} 
                        onToggle={toggleLeftSelection} 
                        placeholder="Search available..."
                        searchValue={leftSearch}
                        onSearchChange={setLeftSearch}
                        emptyLabel="No available clients found"
                    />
                </Stack>

                {/* MIDDLE: Action Buttons */}
                <Stack justify="center" gap="sm" w={50} style={{ flexGrow: 0 }}>
                    <ActionIcon 
                        variant="filled" color="blue" size="lg" radius="xl" 
                        onClick={moveRight} 
                        disabled={leftSelection.length === 0}
                    >
                        <ArrowRightIcon size={20} />
                    </ActionIcon>
                    <ActionIcon 
                        variant="filled" color="gray" size="lg" radius="xl" 
                        onClick={moveLeft} 
                        disabled={rightSelection.length === 0}
                    >
                        <ArrowLeftIcon size={20} />
                    </ActionIcon>
                </Stack>

                {/* RIGHT PANEL: Group Members */}
                <Stack gap="xs" h="100%">
                    <Group justify="space-between">
                        <Text size="sm" fw={600}>Assigned Members</Text>
                        <Badge variant="light" color="blue">{memberIds.size}</Badge>
                    </Group>
                    <CustomList 
                        items={rightList} 
                        selection={rightSelection} 
                        onToggle={toggleRightSelection} 
                        placeholder="Search members..."
                        searchValue={rightSearch}
                        onSearchChange={setRightSearch}
                        emptyLabel="No members in group"
                    />
                </Stack>
            </Group>

            <Divider />
            
            <Group justify="flex-end" gap="md">
                <Button variant="default" onClick={() => setManageOpen(false)}>Cancel</Button>
                <Button 
                    leftSection={isSavingMembers ? null : <CheckIcon size={16}/>} 
                    onClick={saveMembers} 
                    loading={isSavingMembers}
                >
                    Save Changes
                </Button>
            </Group>
        </Stack>
      </Drawer>
    </PageShell>
  );
};

export default Groups;