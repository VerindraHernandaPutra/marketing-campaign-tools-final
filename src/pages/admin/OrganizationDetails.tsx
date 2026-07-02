import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Title, Table, Button, Group, Modal, Select, Loader,
  Badge, ActionIcon, Text, Paper, Breadcrumbs, Anchor, Tabs,
  TextInput, PasswordInput, Tooltip, Switch, SimpleGrid, Box
} from '@mantine/core';
import { supabase } from '../../supabaseClient';
import DashboardHeader from '../../shared/DashboardHeader';
import DashboardSidebar from '../../shared/DashboardSidebar';
import { useUserRole } from '../../auth/UserContext';
import { TrashIcon, EditIcon, PlusIcon, ArrowLeftIcon, UserPlusIcon, SearchIcon, BanIcon, CheckCircleIcon } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  profiles: { username: string; email: string };
}

interface AvailableUser {
  id: string;
  username: string;
  email: string;
  updated_at: string;
}

interface OrganizationData {
  name: string;
  max_operators: number;
  max_designers: number;
  max_marketers: number;
}

const StatRing = ({
  label, count, limit, color,
}: {
  label: string;
  count: number;
  limit: number;
  color: string;
}) => {
  const percentage = limit > 0 ? Math.min(100, (count / limit) * 100) : 0;
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const colorMap: Record<string, string> = { blue: '#3b82f6', pink: '#ec4899', cyan: '#06b6d4' };
  const strokeColor = colorMap[color] || '#3b82f6';

  return (
    <Paper withBorder p="md" radius="md">
      <Group wrap="nowrap" gap="md" align="center">
        <Box w={60} h={60} style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="100%" height="100%" viewBox="0 0 60 60" style={{ position: 'absolute', top: 0, left: 0 }}>
            <circle cx="30" cy="30" r={radius} stroke="#f3f4f6" strokeWidth="5" fill="none" />
            <circle cx="30" cy="30" r={radius} stroke={strokeColor} strokeWidth="5" fill="none"
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 0.5s ease' }} />
          </svg>
          <Text fz={12} fw={500} ta="center" lh={1} c="black" style={{ position: 'relative', zIndex: 1 }}>
            {Math.round(percentage)}%
          </Text>
        </Box>
        <div>
          <Text c="dimmed" size="xs" tt="uppercase" fw={600} style={{ letterSpacing: '0.05em' }}>{label}</Text>
          <Text fw={700} size="xl" lh={1.1} mt={4}>
            {count} <span style={{ fontSize: '0.65em', color: '#9ca3af', fontWeight: 500 }}>/ {limit}</span>
          </Text>
        </div>
      </Group>
    </Paper>
  );
};

const OrganizationDetails: React.FC = () => {
  const { orgId: paramOrgId } = useParams();
  const { currentOrgId, isSuperAdmin } = useUserRole();
  const navigate = useNavigate();

  const activeOrgId = isSuperAdmin ? paramOrgId : currentOrgId;

  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleCounts, setRoleCounts] = useState({ operator: 0, designer: 0, marketer: 0 });
  const [collapsed, setCollapsed] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [addMethod, setAddMethod] = useState<'existing' | 'new'>('existing');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [formUserId, setFormUserId] = useState<string | null>(null);
  const [formRole, setFormRole] = useState<string>('designer');
  const [formStatus, setFormStatus] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<{ value: string; label: string }[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrgDetails = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);

    const { data: org } = await supabase
      .from('organizations')
      .select('name, max_operators, max_designers, max_marketers')
      .eq('id', activeOrgId)
      .single();
    if (org) setOrgData(org as unknown as OrganizationData);

    const { data: memberData, error } = await supabase
      .from('organization_members')
      .select('id, user_id, role, status, profiles(username, email)')
      .eq('organization_id', activeOrgId);

    if (!error && memberData) {
      const rawData = memberData as unknown as Member[];
      setMembers(rawData);
      const counts = { operator: 0, designer: 0, marketer: 0 };
      rawData.forEach(m => {
        if (m.status === 'active') {
          if (m.role === 'operator') counts.operator++;
          else if (m.role === 'designer') counts.designer++;
          else if (m.role === 'marketer') counts.marketer++;
        }
      });
      setRoleCounts(counts);
    }
    setLoading(false);
  }, [activeOrgId]);
  // eslint-disable-next-line
  useEffect(() => { fetchOrgDetails(); }, [fetchOrgDetails]);

  const fetchAvailableUsers = async () => {
    if (!activeOrgId) return;
    const { data, error } = await supabase.rpc('get_available_users_for_org', { org_id: activeOrgId });
    if (!error && data) {
      const users = data as unknown as AvailableUser[];
      setAvailableUsers(users.map(u => ({
        value: u.id,
        label: `${u.username || 'No Name'} (${u.email || 'No Email'})`,
      })));
    }
  };

  const handleOpenModal = (mode: 'add' | 'edit', member?: Member) => {
    setModalMode(mode);
    setAddMethod('existing');
    setIsSubmitting(false);
    if (mode === 'add') {
      setFormUserId(null); setFormRole('designer'); setFormStatus(true);
      setNewUserEmail(''); setNewUserName(''); setNewUserPass('');
      fetchAvailableUsers();
    } else if (member) {
      setSelectedMemberId(member.id);
      setFormUserId(member.user_id);
      setFormRole(member.role);
      setFormStatus(member.status === 'active');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!activeOrgId) return;
    setIsSubmitting(true);
    try {
      const statusVal = formStatus ? 'active' : 'inactive';

      if (formStatus && orgData) {
        let currentCount = 0, limit = 0;
        if (formRole === 'operator') { currentCount = roleCounts.operator; limit = orgData.max_operators; }
        if (formRole === 'designer') { currentCount = roleCounts.designer; limit = orgData.max_designers; }
        if (formRole === 'marketer') { currentCount = roleCounts.marketer; limit = orgData.max_marketers; }
        if (currentCount >= limit && (modalMode === 'add' || (modalMode === 'edit' && members.find(m => m.id === selectedMemberId)?.status !== 'active'))) {
          throw new Error(`Limit reached for ${formRole}s (${limit}). Cannot add more active users.`);
        }
      }

      if (modalMode === 'add') {
        if (addMethod === 'existing') {
          if (!formUserId) throw new Error('Please select a user');
          const { error } = await supabase.from('organization_members').insert({ organization_id: activeOrgId, user_id: formUserId, role: formRole, status: statusVal });
          if (error) throw error;
        } else {
          if (!newUserEmail || !newUserPass || !newUserName) throw new Error('Please fill all fields');
          const { error } = await supabase.functions.invoke('admin-create-user', {
            body: { email: newUserEmail, password: newUserPass, fullName: newUserName, organizationId: activeOrgId, role: formRole, status: statusVal }
          });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('organization_members').update({ role: formRole, status: statusVal }).eq('id', selectedMemberId);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchOrgDetails();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this user from the organization?')) return;
    await supabase.from('organization_members').delete().eq('id', id);
    fetchOrgDetails();
  };

  const toggleUserStatus = async (membershipId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('organization_members').update({ status: newStatus }).eq('id', membershipId);
    if (error) alert(error.message);
    else fetchOrgDetails();
  };

  const breadcrumbs = [
    { title: 'Dashboard', href: '/' },
    ...(isSuperAdmin ? [{ title: 'Super Admin', href: '/admin' }] : []),
    { title: orgData?.name || 'Organization', href: '#' },
  ].map((item, index) => (
    <Anchor href={item.href} key={index} onClick={(e) => {
      if (item.href === '#') e.preventDefault();
      else { e.preventDefault(); navigate(item.href); }
    }}>{item.title}</Anchor>
  ));

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <DashboardSidebar collapsed={collapsed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <DashboardHeader onToggleSidebar={() => setCollapsed(c => !c)} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <Container size="xl">
            <Breadcrumbs mb="md">{breadcrumbs}</Breadcrumbs>
            <Group justify="space-between" mb="lg">
              <Group>
                {isSuperAdmin && (
                  <ActionIcon variant="subtle" onClick={() => navigate('/admin')}>
                    <ArrowLeftIcon size={18} />
                  </ActionIcon>
                )}
                <div>
                  <Title order={2}>{orgData?.name || 'Loading...'}</Title>
                  <Text c="dimmed">User Management</Text>
                </div>
              </Group>
              <Button leftSection={<PlusIcon size={16} />} onClick={() => handleOpenModal('add')}>Add User</Button>
            </Group>

            {orgData && (
              <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
                <StatRing label="Operators" count={roleCounts.operator} limit={orgData.max_operators || 1} color="blue" />
                <StatRing label="Designers" count={roleCounts.designer} limit={orgData.max_designers || 5} color="pink" />
                <StatRing label="Marketers" count={roleCounts.marketer} limit={orgData.max_marketers || 3} color="cyan" />
              </SimpleGrid>
            )}

            <Paper shadow="sm" p="md" withBorder>
              {loading ? <Loader /> : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>Role</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {members.map(m => (
                      <Table.Tr key={m.id} style={{ opacity: m.status === 'inactive' ? 0.5 : 1 }}>
                        <Table.Td fw={500}>{m.profiles?.username || 'Unknown'}</Table.Td>
                        <Table.Td>{m.profiles?.email || 'No Email'}</Table.Td>
                        <Table.Td>
                          <Badge variant="light" color={m.role === 'admin' ? 'red' : m.role === 'operator' ? 'blue' : m.role === 'designer' ? 'pink' : 'cyan'}>
                            {m.role.toUpperCase()}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" color={m.status === 'active' ? 'green' : 'gray'} variant="dot">{m.status}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Tooltip label="Edit User"><ActionIcon variant="default" onClick={() => handleOpenModal('edit', m)}><EditIcon size={16} /></ActionIcon></Tooltip>
                            <Tooltip label={m.status === 'active' ? 'Deactivate User' : 'Activate User'}>
                              <ActionIcon variant="default" color={m.status === 'active' ? 'orange' : 'green'} onClick={() => toggleUserStatus(m.id, m.status || 'active')}>
                                {m.status === 'active' ? <BanIcon size={16} /> : <CheckCircleIcon size={16} />}
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Remove User"><ActionIcon variant="light" color="red" onClick={() => handleDelete(m.id)}><TrashIcon size={16} /></ActionIcon></Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {members.length === 0 && (
                      <Table.Tr><Table.Td colSpan={5} align="center">No members found</Table.Td></Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Container>
        </div>
      </div>

      <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Add User to Organization' : 'Edit User Role'}
        size={modalMode === 'add' ? 'lg' : 'md'}>
        {modalMode === 'add' && (
          <Tabs value={addMethod} onChange={(val) => setAddMethod(val as 'existing' | 'new')} mb="md">
            <Tabs.List>
              <Tabs.Tab value="existing" leftSection={<SearchIcon size={14} />}>Existing User</Tabs.Tab>
              <Tabs.Tab value="new" leftSection={<UserPlusIcon size={14} />}>Create New</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="existing" pt="xs">
              <Select label="Select User" placeholder="Search users..." data={availableUsers}
                value={formUserId} onChange={setFormUserId} searchable
                nothingFoundMessage="No available users found" mb="md" />
            </Tabs.Panel>
            <Tabs.Panel value="new" pt="xs">
              <TextInput label="Full Name" placeholder="John Doe" mb="sm" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
              <TextInput label="Email" placeholder="john@company.com" mb="sm" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
              <PasswordInput label="Password" placeholder="Set initial password" mb="md" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} />
            </Tabs.Panel>
          </Tabs>
        )}
        <Select label="Role"
          data={[{ value: 'operator', label: 'Operator (Admin)' }, { value: 'designer', label: 'Designer' }, { value: 'marketer', label: 'Marketer' }]}
          value={formRole} onChange={(val) => setFormRole(val || 'designer')} allowDeselect={false} mb="md" />
        <Group justify="space-between" mb="xl">
          <Text size="sm" fw={500}>Status</Text>
          <Switch checked={formStatus} onChange={(e) => setFormStatus(e.currentTarget.checked)} label={formStatus ? 'Active' : 'Inactive'} color="green" />
        </Group>
        <Button fullWidth onClick={handleSave} loading={isSubmitting}>
          {modalMode === 'add' ? (addMethod === 'new' ? 'Create & Add User' : 'Add User') : 'Save Changes'}
        </Button>
      </Modal>
    </div>
  );
};

export default OrganizationDetails;
