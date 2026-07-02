import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Title, Tabs, Table, Button, Group, Modal, TextInput,
  Loader, Badge, ActionIcon, Text, Select, Paper, Tooltip, PasswordInput,
  Textarea, Switch, SimpleGrid, ThemeIcon, NumberInput, Pagination
} from '@mantine/core';
import { supabase } from '../../supabaseClient';
import DashboardHeader from '../../shared/DashboardHeader';
import DashboardSidebar from '../../shared/DashboardSidebar';
import {
  EditIcon, TrashIcon, UsersIcon, BanIcon, CheckCircleIcon, PlusIcon,
  BuildingIcon, ActivityIcon, SearchIcon, SortAscIcon
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

interface Organization {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  max_operators?: number;
  max_designers?: number;
  max_marketers?: number;
}

interface ProfileWithRole {
  id: string;
  username: string;
  email: string;
  updated_at: string;
  organization_name?: string;
  role?: string;
  organization_id?: string;
  membership_id?: string;
  status?: string;
}

interface TableControlsProps {
  placeholder: string;
  sortOptions: { value: string; label: string }[];
  onAdd: () => void;
  addLabel: string;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  sortBy: string;
  onSortChange: (val: string) => void;
  itemsPerPage: string;
  onItemsPerPageChange: (val: string) => void;
}

const TableControls: React.FC<TableControlsProps> = ({
  placeholder, sortOptions, onAdd, addLabel,
  searchQuery, onSearchChange, sortBy, onSortChange,
  itemsPerPage, onItemsPerPageChange,
}) => (
  <Group justify="space-between" mb="md">
    <Group gap="xs">
      <TextInput placeholder={placeholder} leftSection={<SearchIcon size={14} />}
        value={searchQuery} onChange={(e) => onSearchChange(e.currentTarget.value)} w={250} />
      <Select data={sortOptions} value={sortBy} onChange={(v) => onSortChange(v || sortOptions[0].value)}
        allowDeselect={false} leftSection={<SortAscIcon size={14} />} w={180} />
      <Select data={['5', '10', '25', '50']} value={itemsPerPage}
        onChange={(v) => onItemsPerPageChange(v || '10')} w={70} allowDeselect={false} />
    </Group>
    <Button leftSection={<PlusIcon size={16} />} onClick={onAdd}>{addLabel}</Button>
  </Group>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<string | null>(
    (location.state as { tab?: string })?.tab || 'overview'
  );
  const [orgList, setOrgList] = useState<Organization[]>([]);
  const [userList, setUserList] = useState<ProfileWithRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<string>('10');
  const [sortBy, setSortBy] = useState<string>('created_desc');

  // Org modal
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [orgModalMode, setOrgModalMode] = useState<'create' | 'edit'>('create');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgFormName, setOrgFormName] = useState('');
  const [orgFormDesc, setOrgFormDesc] = useState('');
  const [orgFormStatus, setOrgFormStatus] = useState(true);
  const [limitOperator, setLimitOperator] = useState<number | string>(1);
  const [limitDesigner, setLimitDesigner] = useState<number | string>(5);
  const [limitMarketer, setLimitMarketer] = useState<number | string>(3);

  // User modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<ProfileWithRole | null>(null);
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormName, setUserFormName] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormOrgId, setUserFormOrgId] = useState<string | null>(null);
  const [userFormRole, setUserFormRole] = useState('designer');
  const [userFormStatus, setUserFormStatus] = useState(true);

  const [collapsed, setCollapsed] = useState(false);
  const orgSelectData = orgList.map(o => ({ value: o.id, label: o.name }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: orgs } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    if (orgs) setOrgList(orgs as Organization[]);

    const { data: profiles } = await supabase.from('profiles').select('*').neq('username', 'superadmin').order('updated_at', { ascending: false });
    const { data: memberships } = await supabase.from('organization_members').select('id, user_id, role, status, organization_id, organizations(name)');

    if (profiles) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const combined: ProfileWithRole[] = profiles.map((p: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const membership = memberships?.find((m: any) => m.user_id === p.id);
        return {
          ...p,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          organization_name: (membership?.organizations as any)?.name || '-',
          role: membership?.role || '-',
          organization_id: membership?.organization_id,
          membership_id: membership?.id,
          status: membership?.status || '-',
        };
      });
      setUserList(combined);
    }
    setLoading(false);
  }, []);

  // eslint-disable-next-line
  useEffect(() => { fetchData(); }, [fetchData]);

  const processOrgs = useMemo(() => {
    let data = [...orgList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(o => o.name.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const total = data.length;
    const limit = parseInt(itemsPerPage);
    const totalPages = Math.ceil(total / limit);
    const paginated = data.slice((activePage - 1) * limit, activePage * limit);
    return { data: paginated, total, totalPages };
  }, [orgList, searchQuery, sortBy, activePage, itemsPerPage]);

  const processUsers = useMemo(() => {
    let data = [...userList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(u =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.organization_name?.toLowerCase().includes(q)
      );
    }
    data.sort((a, b) => {
      if (sortBy === 'name_asc') return (a.username || '').localeCompare(b.username || '');
      if (sortBy === 'email') return a.email.localeCompare(b.email);
      if (sortBy === 'role') return (a.role || '').localeCompare(b.role || '');
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    const total = data.length;
    const limit = parseInt(itemsPerPage);
    const totalPages = Math.ceil(total / limit);
    const paginated = data.slice((activePage - 1) * limit, activePage * limit);
    return { data: paginated, total, totalPages };
  }, [userList, searchQuery, sortBy, activePage, itemsPerPage]);

  const getAnalytics = () => {
    const totalOrgs = orgList.length;
    const activeOrgs = orgList.filter(o => o.status === 'active').length;
    const totalUsers = userList.length;
    const activeMembers = userList.filter(u => u.status === 'active').length;
    const orgCounts: Record<string, number> = {};
    userList.forEach(u => {
      if (u.organization_name && u.organization_name !== '-')
        orgCounts[u.organization_name] = (orgCounts[u.organization_name] || 0) + 1;
    });
    const chartData = Object.keys(orgCounts).map(name => ({ name, users: orgCounts[name] })).slice(0, 10);
    return { totalOrgs, activeOrgs, totalUsers, activeMembers, chartData };
  };
  const stats = getAnalytics();

  const openOrgModal = (mode: 'create' | 'edit', item?: Organization) => {
    setOrgModalMode(mode);
    if (mode === 'edit' && item) {
      setSelectedOrg(item);
      setOrgFormName(item.name);
      setOrgFormDesc(item.description || '');
      setOrgFormStatus(item.status === 'active');
      setLimitOperator(item.max_operators || 1);
      setLimitDesigner(item.max_designers || 5);
      setLimitMarketer(item.max_marketers || 3);
    } else {
      setSelectedOrg(null);
      setOrgFormName(''); setOrgFormDesc('');
      setOrgFormStatus(true);
      setLimitOperator(1); setLimitDesigner(5); setLimitMarketer(3);
    }
    setIsOrgModalOpen(true);
  };

  const handleSaveOrg = async () => {
    if (!orgFormName.trim()) return;
    const payload = {
      name: orgFormName, description: orgFormDesc,
      status: orgFormStatus ? 'active' : 'inactive',
      max_operators: Number(limitOperator),
      max_designers: Number(limitDesigner),
      max_marketers: Number(limitMarketer),
    };
    if (orgModalMode === 'create') {
      const { error } = await supabase.from('organizations').insert(payload);
      if (error) alert(error.message);
    } else {
      if (!selectedOrg) return;
      const { error } = await supabase.from('organizations').update(payload).eq('id', selectedOrg.id);
      if (error) alert(error.message);
    }
    setIsOrgModalOpen(false);
    fetchData();
  };

  const handleDeleteOrg = async (id: string) => {
    if (!confirm('Are you sure? This will permanently delete the organization and all its data.')) return;
    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchData();
  };

  const toggleOrgStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase.from('organizations').update({ status: newStatus }).eq('id', id);
    fetchData();
  };

  const openUserModal = (mode: 'create' | 'edit', user?: ProfileWithRole) => {
    setUserModalMode(mode);
    if (mode === 'edit' && user) {
      setSelectedUser(user);
      setUserFormName(user.username);
      setUserFormEmail(user.email);
      setUserFormOrgId(user.organization_id || null);
      setUserFormRole(user.role !== '-' ? user.role || 'designer' : 'designer');
      setUserFormStatus(user.status === 'active');
      setUserFormPassword('');
    } else {
      setSelectedUser(null);
      setUserFormName(''); setUserFormEmail(''); setUserFormPassword('');
      setUserFormOrgId(null); setUserFormRole('designer'); setUserFormStatus(true);
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const statusValue = userFormStatus ? 'active' : 'inactive';
      if (userModalMode === 'create') {
        if (!userFormEmail || !userFormPassword || !userFormName || !userFormOrgId) {
          alert('Please fill all required fields'); return;
        }
        const { error } = await supabase.functions.invoke('admin-create-user', {
          body: { email: userFormEmail, password: userFormPassword, fullName: userFormName, organizationId: userFormOrgId, role: userFormRole, status: statusValue }
        });
        if (error) throw error;
      } else {
        if (selectedUser?.id) await supabase.from('profiles').update({ username: userFormName }).eq('id', selectedUser.id);
        if (selectedUser?.membership_id) {
          const { error } = await supabase.from('organization_members').update({ role: userFormRole, status: statusValue, organization_id: userFormOrgId }).eq('id', selectedUser.membership_id);
          if (error) throw error;
        } else if (userFormOrgId && selectedUser?.id) {
          const { error } = await supabase.from('organization_members').insert({ user_id: selectedUser.id, organization_id: userFormOrgId, role: userFormRole, status: statusValue });
          if (error) throw error;
        }
      }
      setIsUserModalOpen(false);
      fetchData();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Remove this user profile?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchData();
  };

  const toggleUserStatus = async (membershipId: string | undefined, currentStatus: string) => {
    if (!membershipId) return;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('organization_members').update({ status: newStatus }).eq('id', membershipId);
    if (error) alert(error.message);
    else fetchData();
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <DashboardSidebar collapsed={collapsed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <DashboardHeader onToggleSidebar={() => setCollapsed(c => !c)} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <Container size="xl">
            <Group justify="space-between" mb="xl">
              <div>
                <Title order={2}>Super Admin Console</Title>
                <Text c="dimmed">System Management</Text>
              </div>
            </Group>

            <Paper shadow="sm" withBorder p="md">
                <Tabs
                    value={activeTab}
                    onChange={(val) => {
                        setActiveTab(val);
                        setSearchQuery('');
                        setActivePage(1);
                        setSortBy('created_desc');
                    }}
                >
                <Tabs.List mb="md">
                  <Tabs.Tab value="overview">Overview</Tabs.Tab>
                  <Tabs.Tab value="organizations">Organizations</Tabs.Tab>
                  <Tabs.Tab value="all_users">All Profiles</Tabs.Tab>
                </Tabs.List>

                {/* OVERVIEW */}
                <Tabs.Panel value="overview">
                  {loading ? <Loader /> : (
                    <>
                      <SimpleGrid cols={3} spacing="lg" mb="xl">
                        <Paper shadow="xs" p="xl" radius="md" withBorder>
                          <Group>
                            <ThemeIcon size="xl" radius="md" variant="light" color="blue"><BuildingIcon /></ThemeIcon>
                            <div>
                              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Total Organizations</Text>
                              <Text fw={700} size="xl">{stats.totalOrgs}</Text>
                              <Text size="xs" c="green" mt={4}>{stats.activeOrgs} Active</Text>
                            </div>
                          </Group>
                        </Paper>
                        <Paper shadow="xs" p="xl" radius="md" withBorder>
                          <Group>
                            <ThemeIcon size="xl" radius="md" variant="light" color="cyan"><UsersIcon /></ThemeIcon>
                            <div>
                              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Total Users</Text>
                              <Text fw={700} size="xl">{stats.totalUsers}</Text>
                            </div>
                          </Group>
                        </Paper>
                        <Paper shadow="xs" p="xl" radius="md" withBorder>
                          <Group>
                            <ThemeIcon size="xl" radius="md" variant="light" color="green"><ActivityIcon /></ThemeIcon>
                            <div>
                              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Active Members</Text>
                              <Text fw={700} size="xl">{stats.activeMembers}</Text>
                            </div>
                          </Group>
                        </Paper>
                      </SimpleGrid>
                      <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis dataKey="name" type="category" width={120} />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="users" fill="#228be6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </Tabs.Panel>

                {/* ORGANIZATIONS */}
                <Tabs.Panel value="organizations">
                    <TableControls
                        placeholder="Search organizations..."
                        addLabel="New Organization"
                        onAdd={() => openOrgModal('create')}
                        sortOptions={[
                            { value: 'created_desc', label: 'Newest First' },
                            { value: 'name_asc', label: 'Name (A-Z)' },
                            { value: 'name_desc', label: 'Name (Z-A)' },
                            { value: 'status', label: 'Status' },
                        ]}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        sortBy={sortBy}
                        onSortChange={setSortBy}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                  {loading ? <Loader /> : (
                    <>
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Description</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Actions</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {processOrgs.data.map(org => (
                            <Table.Tr key={org.id} style={{ opacity: org.status === 'inactive' ? 0.6 : 1 }}>
                              <Table.Td fw={700}>{org.name}</Table.Td>
                              <Table.Td style={{ maxWidth: 300 }}>
                                {org.description || <Text c="dimmed" size="xs">No description</Text>}
                              </Table.Td>
                              <Table.Td>
                                <Badge color={org.status === 'active' ? 'green' : 'gray'}>{org.status || 'Active'}</Badge>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  <Tooltip label="Manage Users"><ActionIcon variant="light" color="blue" onClick={() => navigate(`/admin/organization/${org.id}`)}><UsersIcon size={16} /></ActionIcon></Tooltip>
                                  <Tooltip label="Edit Details"><ActionIcon variant="default" onClick={() => openOrgModal('edit', org)}><EditIcon size={16} /></ActionIcon></Tooltip>
                                  <Tooltip label={org.status === 'active' ? 'Deactivate' : 'Activate'}>
                                    <ActionIcon variant="default" color={org.status === 'active' ? 'orange' : 'green'} onClick={() => toggleOrgStatus(org.id, org.status || 'active')}>
                                      {org.status === 'active' ? <BanIcon size={16} /> : <CheckCircleIcon size={16} />}
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip label="Delete"><ActionIcon variant="light" color="red" onClick={() => handleDeleteOrg(org.id)}><TrashIcon size={16} /></ActionIcon></Tooltip>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                      {processOrgs.totalPages > 1 && (
                        <Group justify="flex-end" mt="md">
                          <Pagination total={processOrgs.totalPages} value={activePage} onChange={setActivePage} />
                        </Group>
                      )}
                    </>
                  )}
                </Tabs.Panel>

                {/* ALL USERS */}
                <Tabs.Panel value="all_users">
                    <TableControls
                        placeholder="Search users, emails..."
                        addLabel="Add User"
                        onAdd={() => openUserModal('create')}
                        sortOptions={[
                            { value: 'created_desc', label: 'Newest First' },
                            { value: 'name_asc', label: 'Name (A-Z)' },
                            { value: 'email', label: 'Email' },
                            { value: 'role', label: 'Role' },
                        ]}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        sortBy={sortBy}
                        onSortChange={setSortBy}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                  {loading ? <Loader /> : (
                    <>
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Username</Table.Th>
                            <Table.Th>Email</Table.Th>
                            <Table.Th>Organization</Table.Th>
                            <Table.Th>Role</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Actions</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {processUsers.data.map(u => (
                            <Table.Tr key={u.id}>
                              <Table.Td fw={500}>{u.username || 'N/A'}</Table.Td>
                              <Table.Td>{u.email || 'N/A'}</Table.Td>
                              <Table.Td>{u.organization_name}</Table.Td>
                              <Table.Td>
                                {u.role !== '-' && (
                                  <Badge variant="light" color={u.role === 'admin' ? 'red' : u.role === 'operator' ? 'blue' : u.role === 'designer' ? 'pink' : 'cyan'}>
                                    {u.role?.toUpperCase()}
                                  </Badge>
                                )}
                              </Table.Td>
                              <Table.Td><Badge size="sm" color={u.status === 'active' ? 'green' : 'gray'} variant="dot">{u.status}</Badge></Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  <Tooltip label="Edit User"><ActionIcon variant="default" onClick={() => openUserModal('edit', u)}><EditIcon size={16} /></ActionIcon></Tooltip>
                                  <Tooltip label={u.status === 'active' ? 'Deactivate' : 'Activate'}>
                                    <ActionIcon variant="default" color={u.status === 'active' ? 'orange' : 'green'} disabled={!u.membership_id} onClick={() => toggleUserStatus(u.membership_id, u.status || 'active')}>
                                      {u.status === 'active' ? <BanIcon size={16} /> : <CheckCircleIcon size={16} />}
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip label="Delete User"><ActionIcon variant="light" color="red" onClick={() => handleDeleteUser(u.id)}><TrashIcon size={16} /></ActionIcon></Tooltip>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                      {processUsers.totalPages > 1 && (
                        <Group justify="flex-end" mt="md">
                          <Pagination total={processUsers.totalPages} value={activePage} onChange={setActivePage} />
                        </Group>
                      )}
                    </>
                  )}
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </Container>
        </div>
      </div>

      {/* ORG MODAL */}
      <Modal opened={isOrgModalOpen} onClose={() => setIsOrgModalOpen(false)}
        title={`${orgModalMode === 'create' ? 'Create' : 'Edit'} Organization`} size="lg">
        <TextInput label="Name" placeholder="Company Name" mb="md" value={orgFormName} onChange={(e) => setOrgFormName(e.target.value)} required />
        <Textarea label="Description" placeholder="Description (Optional)" mb="md" value={orgFormDesc} onChange={(e) => setOrgFormDesc(e.target.value)} />
        <SimpleGrid cols={3} mb="xl">
          <NumberInput label="Max Operators" value={limitOperator} onChange={setLimitOperator} min={1} />
          <NumberInput label="Max Designers" value={limitDesigner} onChange={setLimitDesigner} min={1} />
          <NumberInput label="Max Marketers" value={limitMarketer} onChange={setLimitMarketer} min={1} />
        </SimpleGrid>
        <Group justify="space-between" mb="xl">
          <Text size="sm" fw={500}>Status</Text>
          <Switch checked={orgFormStatus} onChange={(e) => setOrgFormStatus(e.currentTarget.checked)} label={orgFormStatus ? 'Active' : 'Inactive'} color="green" />
        </Group>
        <Button fullWidth onClick={handleSaveOrg}>Save</Button>
      </Modal>

      {/* USER MODAL */}
      <Modal opened={isUserModalOpen} onClose={() => setIsUserModalOpen(false)}
        title={`${userModalMode === 'create' ? 'Add New' : 'Edit'} User`}>
        <TextInput label="Full Name" placeholder="John Doe" mb="sm" value={userFormName} onChange={e => setUserFormName(e.target.value)} required />
        <TextInput label="Email" placeholder="user@company.com" mb="sm" value={userFormEmail} onChange={e => setUserFormEmail(e.target.value)} disabled={userModalMode === 'edit'} required />
        {userModalMode === 'create' && (
          <PasswordInput label="Password" placeholder="Initial password" mb="sm" value={userFormPassword} onChange={e => setUserFormPassword(e.target.value)} required />
        )}
        <Select label="Organization" placeholder="Assign to organization" data={orgSelectData} value={userFormOrgId} onChange={setUserFormOrgId} searchable mb="sm" required />
        <Select label="Role"
          data={[{ value: 'operator', label: 'Operator (Admin)' }, { value: 'designer', label: 'Designer' }, { value: 'marketer', label: 'Marketer' }]}
          value={userFormRole} onChange={(val) => setUserFormRole(val || 'designer')} allowDeselect={false} mb="xl" />
        <Group justify="space-between" mb="xl">
          <Text size="sm" fw={500}>Status</Text>
          <Switch checked={userFormStatus} onChange={(e) => setUserFormStatus(e.currentTarget.checked)} label={userFormStatus ? 'Active' : 'Inactive'} color="green" />
        </Group>
        <Button fullWidth onClick={handleSaveUser}>{userModalMode === 'create' ? 'Create & Assign' : 'Update User'}</Button>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
