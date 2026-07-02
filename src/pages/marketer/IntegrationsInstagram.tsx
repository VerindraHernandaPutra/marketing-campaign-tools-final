import { useCallback, useEffect, useState } from 'react';
import { Card, Text, Button, List, LoadingOverlay, Badge, Group, Box, Avatar, Alert, Stack, Divider, Anchor, Code, TextInput, Paper } from '@mantine/core';
import { InstagramIcon, PlusIcon, TrashIcon, InfoIcon, CheckCircleIcon, AlertTriangleIcon, KeyIcon, SaveIcon, EditIcon } from 'lucide-react';
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

const IntegrationsInstagram = () => {
  const { currentOrgId } = useUserRole();
  const { metaAppId, setMetaAppId, metaAppSecret, savedAppId, saving, saveAppId } = useMetaAppId();
  const { handleConnectFacebook } = useMetaAuth('instagram', savedAppId);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAppId, setEditingAppId] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    if (!currentOrgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', currentOrgId)
      .ilike('platform', 'instagram%')
      .eq('status', 'active');

    if (!error && data) {
      setIntegrations(data as Integration[]);
    }
    setLoading(false);
  }, [currentOrgId]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleDisconnectAll = async () => {
    if (!window.confirm('Are you sure you want to disconnect all Instagram accounts?')) return;
    if (!currentOrgId) return;

    setLoading(true);
    const { error } = await supabase
      .from('organization_integrations')
      .delete()
      .eq('organization_id', currentOrgId)
      .ilike('platform', 'instagram%');

    if (error) {
      alert(error.message || 'Failed to disconnect Instagram integration.');
      setLoading(false);
      return;
    }

    await fetchIntegrations();
    setLoading(false);
  };

  return (
    <PageShell>
      <Box pos="relative">
        <LoadingOverlay visible={loading} />
        <PageHeader
          icon={<InstagramIcon size={22} />}
          title="Instagram Business"
          subtitle="Connect Instagram Business accounts for posting workflows and Instagram messaging features."
          gradient={{ from: 'pink', to: 'grape' }}
          action={integrations.length > 0
            ? <Badge color="green" variant="light" size="lg" leftSection={<CheckCircleIcon size={12} />}>Connected</Badge>
            : undefined}
        />

        <Alert icon={<AlertTriangleIcon size={16} />} title="Meta Account Requirement" color="orange" mb="sm">
          <Text size="sm">
            WhatsApp Business, Instagram Business, and Facebook Page <strong>must all be connected under the same Meta Business account</strong>.
            Go to <Anchor href="https://accountscenter.facebook.com/" target="_blank" size="sm">Meta Account Setting</Anchor> to link your accounts before proceeding.
          </Text>
        </Alert>

        <Alert icon={<InfoIcon size={16} />} title="Setup Guide" color="blue" mb="lg">
          <Stack gap={4}>
            <Text size="sm"><strong>Step 1:</strong> Make sure your Instagram account is set to <strong>Professional (Business)</strong> mode — go to Instagram app → Settings → Account → Switch to Professional Account.</Text>
            <Text size="sm"><strong>Step 2:</strong> Link your Instagram Business account to a Facebook Page in <Anchor href="https://accountscenter.facebook.com/" target="_blank" size="sm">Meta Account Setting</Anchor>.</Text>
            <Text size="sm"><strong>Step 3:</strong> In <Anchor href="https://developers.facebook.com" target="_blank" size="sm">Meta Developer Console</Anchor>, create or open your App → add <strong>Instagram Graph API</strong> product → complete Business Verification if prompted.</Text>
            <Text size="sm"><strong>Step 4:</strong> Click <strong>Connect via Meta</strong> below, log in to Facebook, and grant the requested permissions.</Text>
            <Text size="sm"><strong>Step 5:</strong> Select the <strong>Facebook Page</strong> that is linked to your Instagram Business account.</Text>
            <Text size="sm"><strong>Step 6:</strong> Confirm the Instagram account appears in the list below as connected. Required permissions: <Code>instagram_basic</Code>, <Code>instagram_manage_messages</Code>, <Code>pages_show_list</Code>.</Text>
          </Stack>
        </Alert>

        {/* Meta App ID Configuration */}
        <Paper shadow="xs" p="md" withBorder mb="md" radius="md">
          <Group justify="space-between" align="flex-start">
            <Box style={{ flex: 1 }}>
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
                    color="pink"
                    mt={22}
                    leftSection={<SaveIcon size={14} />}
                    loading={saving}
                    disabled={!metaAppId.trim()}
                    onClick={async () => {
                      const ok = await saveAppId(metaAppId, metaAppSecret);
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
            </Box>
          </Group>
        </Paper>

        <Card shadow="sm" p="xl" radius="md" withBorder>
          <Stack>
            {integrations.length > 0 && (
              <>
                <Alert color="green" icon={<CheckCircleIcon size={16} />} title="Active Integration">
                  {integrations.length} Instagram Business account(s) connected and ready.
                </Alert>
                <Divider label="Update Configuration" labelPosition="center" />
              </>
            )}

            <List spacing="sm">
              {integrations.map(integration => (
                <List.Item
                  key={integration.id}
                  style={{ padding: '16px', background: 'var(--mantine-color-gray-0)', borderRadius: '8px' }}
                  icon={<Avatar color="pink" variant="light" size="md"><InstagramIcon size={20} /></Avatar>}
                >
                  <Box>
                    <Group gap="xs">
                      <Text fw={600} size="lg">{integration.metadata?.name || 'Instagram Business Account'}</Text>
                    </Group>
                    {integration.metadata?.facebook_page_name && (
                      <Text size="xs" c="dimmed">Linked via Facebook Page: {integration.metadata.facebook_page_name}</Text>
                    )}
                  </Box>
                </List.Item>
              ))}

              {integrations.length === 0 && (
                <Box ta="center" py="xl">
                  <InstagramIcon size={48} color="var(--mantine-color-gray-4)" strokeWidth={1} style={{ margin: '0 auto', marginBottom: 12 }} />
                  <Text size="sm" c="dimmed" fs="italic">No Instagram Business accounts connected yet.</Text>
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
                variant="gradient"
                gradient={{ from: 'pink', to: 'orange' }}
                onClick={handleConnectFacebook}
              >
                {integrations.length > 0 ? 'Connect Another Account' : 'Connect via Meta'}
              </Button>
            </Group>
          </Stack>
        </Card>
      </Box>
    </PageShell>
  );
};

export default IntegrationsInstagram;
