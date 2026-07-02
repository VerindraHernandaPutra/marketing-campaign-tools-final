import { useCallback, useEffect, useState } from 'react';
import {
  Title, Card, Text, Button, List, LoadingOverlay, Badge, Group, Box, Avatar, Modal, ThemeIcon, Paper, Flex,
  Alert, Divider, Stack, Anchor, Code, TextInput
} from '@mantine/core';
import { MessagesSquareIcon, PlusIcon, TrashIcon, CheckCircle2Icon, ShieldCheckIcon, InfoIcon, CheckCircleIcon, AlertTriangleIcon, KeyIcon, SaveIcon, EditIcon } from 'lucide-react';
import PageShell from '../../shared/PageShell';
import PageHeader from '../../shared/PageHeader';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../auth/UserContext';
import { useMetaAuth } from '../../hooks/useMetaAuth';
import { useMetaAppId } from '../../hooks/useMetaAppId';

interface Integration {
  id: string;
  platform: string;
  provider_account_id: string;
  metadata?: Record<string, string>;
}

const IntegrationsMessenger = () => {
  const { currentOrgId } = useUserRole();
  const { metaAppId, setMetaAppId, savedAppId, saving, saveAppId } = useMetaAppId();
  const { handleConnectFacebook } = useMetaAuth('messenger', savedAppId);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [editingAppId, setEditingAppId] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    if (!currentOrgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', currentOrgId)
      .ilike('platform', 'facebook%');

    if (!error && data) {
      setIntegrations(data as Integration[]);
    }
    setLoading(false);
  }, [currentOrgId]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleDisconnectAll = async () => {
    if (!window.confirm('Are you sure you want to disconnect all Facebook Pages?')) return;
    const { error } = await supabase
      .from('organization_integrations')
      .delete()
      .eq('organization_id', currentOrgId)
      .ilike('platform', 'facebook%');
    if (error) {
      alert(error.message || 'Failed to disconnect Facebook integration.');
      return;
    }
    setIntegrations([]);
  };

  return (
    <PageShell>
      <Box pos="relative">
        <LoadingOverlay visible={loading} />
        <PageHeader
          icon={<MessagesSquareIcon size={22} />}
          title="Messenger (Facebook Pages)"
          subtitle="Connect Facebook Pages to handle Messenger DMs and manage page-side messaging workflows."
          gradient={{ from: 'blue', to: 'indigo' }}
          action={integrations.length > 0
            ? <Badge color="green" variant="light" size="lg" leftSection={<CheckCircleIcon size={12} />}>Connected</Badge>
            : undefined}
        />

        <Alert icon={<AlertTriangleIcon size={16} />} title="Meta Account Requirement" color="orange" mb="sm">
          <Text size="sm">
            WhatsApp Business, Instagram Business, and Facebook Page <strong>must all be connected under the same Meta Business account</strong>.
            Manage your linked accounts at <Anchor href="https://accountscenter.facebook.com/" target="_blank" size="sm">Meta Account Setting → Settings</Anchor> before connecting here.
          </Text>
        </Alert>

        <Alert icon={<InfoIcon size={16} />} title="Setup Guide" color="blue" mb="lg">
          <Stack gap={4}>
            <Text size="sm"><strong>Step 1:</strong> Make sure you have a <strong>Facebook Page</strong> (not a personal profile). Create one at <Anchor href="https://www.facebook.com/pages/create" target="_blank" size="sm">facebook.com/pages/create</Anchor> if needed.</Text>
            <Text size="sm"><strong>Step 2:</strong> In <Anchor href="https://developers.facebook.com" target="_blank" size="sm">Meta Developer Console</Anchor>, create or open your App → add <strong>Messenger</strong> product → complete Business Verification if prompted.</Text>
            <Text size="sm"><strong>Step 3:</strong> Click <strong>Connect via Meta</strong> below, log in to Facebook, and grant the requested permissions including <Code>pages_messaging</Code> and <Code>pages_manage_metadata</Code>.</Text>
            <Text size="sm"><strong>Step 4:</strong> Select all Facebook Pages you want to connect for Messenger inbox.</Text>
            <Text size="sm"><strong>Step 5:</strong> In your Meta App → Messenger → <strong>Webhooks</strong>, subscribe to the <strong>messages</strong> and <strong>messaging_postbacks</strong> fields on each connected page.</Text>
            <Text size="sm"><strong>Step 6:</strong> Return here and verify connected Pages appear in the list below.</Text>
          </Stack>
        </Alert>

        {/* Meta App ID Configuration */}
        <Paper shadow="xs" p="md" withBorder mb="md" radius="md">
          <Group gap="xs" mb={4}>
            <KeyIcon size={14} />
            <Text size="sm" fw={600}>Meta App ID</Text>
            {savedAppId && !editingAppId && (
              <Badge size="xs" color="green" variant="light">Configured</Badge>
            )}
          </Group>
          {editingAppId || !savedAppId ? (
            <Group gap="xs" mt={6}>
              <TextInput
                placeholder="e.g. 1234567890123456"
                description="Found in Meta Developer Console (App ID at the top of your app)"
                value={metaAppId}
                onChange={e => setMetaAppId(e.currentTarget.value)}
                style={{ flex: 1 }}
                size="sm"
              />
              <Button
                size="sm"
                color="blue"
                mt={22}
                leftSection={<SaveIcon size={14} />}
                loading={saving}
                disabled={!metaAppId.trim()}
                onClick={async () => {
                  const ok = await saveAppId(metaAppId);
                  if (ok) setEditingAppId(false);
                }}
              >
                Save
              </Button>
              {savedAppId && (
                <Button size="sm" variant="subtle" mt={22}
                  onClick={() => { setEditingAppId(false); setMetaAppId(savedAppId); }}>
                  Cancel
                </Button>
              )}
            </Group>
          ) : (
            <Group gap="xs" mt={4}>
              <Text size="sm" ff="monospace" c="dimmed">{savedAppId}</Text>
              <Button size="xs" variant="subtle" leftSection={<EditIcon size={12} />}
                onClick={() => setEditingAppId(true)}>
                Edit
              </Button>
            </Group>
          )}
        </Paper>

        {/* Facebook Consent Modal */}
        <Modal
          opened={connectModalOpen}
          onClose={() => setConnectModalOpen(false)}
          title={
            <Group gap="sm">
              <ThemeIcon size="lg" radius="xl" color="blue">
                <MessagesSquareIcon size={20} />
              </ThemeIcon>
              <Title order={4}>Hubungkan Facebook Page</Title>
            </Group>
          }
          size="xl"
          centered
        >
          <Text mb="md" c="dimmed">
            Kami akan meminta izin berikut dari Facebook Page Anda untuk mengaktifkan percakapan Messenger, analitik, dan penerbitan konten.
          </Text>

          <Paper withBorder p="md" radius="md" mb="md" bg="var(--mantine-color-gray-0)">
            <Group mb="sm">
              <ShieldCheckIcon size={20} color="var(--mantine-color-gray-6)" />
              <Text fw={600}>Data yang akan kami akses dari akun Anda</Text>
            </Group>
            <List spacing="sm" size="sm" center icon={
              <ThemeIcon color="teal" size={20} radius="xl" variant="light">
                <CheckCircle2Icon size={14} />
              </ThemeIcon>
            }>
              <List.Item>Profil Facebook Page: nama, ID, foto profil, kategori</List.Item>
              <List.Item>Percakapan Messenger: menerima & membalas pesan dari pelanggan Anda</List.Item>
              <List.Item>File media dalam percakapan: gambar, video, audio, file</List.Item>
              <List.Item>Status terkirim & dibaca pesan</List.Item>
              <List.Item>Semua Facebook Page yang Anda kelola akan terhubung sekaligus</List.Item>
              <List.Item>Insights halaman: jangkauan, impresi, pertumbuhan fan, engagement postingan</List.Item>
              <List.Item>Menerbitkan postingan, foto, dan video di Page Anda (untuk fitur penjadwalan)</List.Item>
            </List>
          </Paper>

          <Paper withBorder p="md" radius="md" mb="xl" bg="var(--mantine-color-blue-0)" style={{ borderColor: 'var(--mantine-color-blue-2)' }}>
            <Group mb="sm">
              <InfoIcon size={18} color="var(--mantine-color-blue-6)" />
              <Text size="sm" c="blue.7" fw={600}>Izin OAuth yang Diminta</Text>
            </Group>
            <Flex gap="xs" wrap="wrap">
              {['public_profile', 'pages_show_list', 'pages_manage_metadata', 'pages_messaging', 'pages_read_engagement', 'read_insights', 'pages_manage_posts', 'pages_manage_engagement', 'publish_video'].map((scope) => (
                <Badge key={scope} variant="outline" color="blue" radius="sm" style={{ textTransform: 'none' }}>
                  {scope}
                </Badge>
              ))}
            </Flex>
          </Paper>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConnectModalOpen(false)}>
              Batal
            </Button>
            <Button color="green" onClick={() => {
              setConnectModalOpen(false);
              handleConnectFacebook();
            }}>
              Hubungkan Akun
            </Button>
          </Group>
        </Modal>

        <Card shadow="sm" p="xl" radius="md" withBorder>
          <Stack>
            {integrations.length > 0 && (
              <>
                <Alert color="green" icon={<CheckCircleIcon size={16} />} title="Active Integration">
                  {integrations.length} Facebook Page(s) connected. Messenger inbox and chat workflows are ready.
                </Alert>
                <Divider label="Update Configuration" labelPosition="center" />
              </>
            )}

            <List spacing="sm">
              {integrations.map(integration => (
                <List.Item
                  key={integration.id}
                  style={{ padding: '16px', background: 'var(--mantine-color-gray-0)', borderRadius: '8px' }}
                  icon={<Avatar color="blue" variant="light" size="md"><MessagesSquareIcon size={20} /></Avatar>}
                >
                  <Box>
                    <Text fw={600} size="lg">{integration.metadata?.name || 'Facebook Page'}</Text>
                    {integration.metadata?.category && (
                      <Badge size="xs" variant="light" mt={4} color="gray">{integration.metadata.category}</Badge>
                    )}
                  </Box>
                </List.Item>
              ))}

              {integrations.length === 0 && (
                <Box ta="center" py="xl">
                  <MessagesSquareIcon size={48} color="var(--mantine-color-gray-4)" strokeWidth={1} style={{ margin: '0 auto', marginBottom: 12 }} />
                  <Text size="sm" c="dimmed" fs="italic">No Facebook Pages connected yet.</Text>
                </Box>
              )}
            </List>

            <Group justify="space-between" mt="sm">
              {integrations.length > 0 ? (
                <Button variant="subtle" color="red" leftSection={<TrashIcon size={14} />} onClick={handleDisconnectAll}>
                  Disconnect
                </Button>
              ) : <Box />}
              <Button
                leftSection={<PlusIcon size={16} />}
                variant="filled"
                color="blue"
                onClick={() => setConnectModalOpen(true)}
              >
                {integrations.length > 0 ? 'Connect More Pages' : 'Connect via Meta'}
              </Button>
            </Group>
          </Stack>
        </Card>
      </Box>
    </PageShell>
  );
};

export default IntegrationsMessenger;
