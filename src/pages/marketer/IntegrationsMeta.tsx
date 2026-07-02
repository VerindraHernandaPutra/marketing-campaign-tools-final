import { useCallback, useEffect, useState } from 'react';
import {
  Card, Text, Button, LoadingOverlay, Badge, Group, Box, Avatar,
  Alert, Stack, Divider, Anchor, Code, TextInput, Paper, ThemeIcon,
} from '@mantine/core';
import {
  CameraIcon, MessagesSquareIcon, PlusIcon, TrashIcon,
  CheckCircleIcon, AlertTriangleIcon, KeyIcon, SaveIcon, EditIcon,
  InfoIcon, ExternalLinkIcon,
} from 'lucide-react';
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

const IntegrationsMeta = () => {
  const { currentOrgId } = useUserRole();
  const { metaAppId, setMetaAppId, metaAppSecret, setMetaAppSecret, savedAppId, savedAppSecret, saving, saveAppId } = useMetaAppId();
  const { handleConnectFacebook } = useMetaAuth('instagram', savedAppId);
  const [instagramAccounts, setInstagramAccounts] = useState<Integration[]>([]);
  const [messengerPages, setMessengerPages]       = useState<Integration[]>([]);
  const [loading, setLoading]       = useState(false);
  const [editingAppId, setEditingAppId] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    if (!currentOrgId) return;
    setLoading(true);
    const { data } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', currentOrgId)
      .or('platform.ilike.instagram%,platform.ilike.facebook%')
      .eq('status', 'active');

    if (data) {
      setInstagramAccounts(data.filter((d: Integration) => d.platform.startsWith('instagram')));
      setMessengerPages(data.filter((d: Integration) => d.platform.startsWith('facebook')));
    }
    setLoading(false);
  }, [currentOrgId]);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const handleDisconnect = async (platform: 'instagram' | 'facebook') => {
    const label = platform === 'instagram' ? 'Instagram accounts' : 'Facebook Pages';
    if (!window.confirm(`Disconnect all ${label}?`)) return;
    setLoading(true);
    await supabase
      .from('organization_integrations')
      .delete()
      .eq('organization_id', currentOrgId)
      .ilike('platform', `${platform}%`);
    await fetchIntegrations();
    setLoading(false);
  };

  const isConnected = instagramAccounts.length > 0 || messengerPages.length > 0;

  return (
    <PageShell>
      <Box pos="relative">
        <LoadingOverlay visible={loading} />
        <PageHeader
          icon={<CameraIcon size={22} />}
          title="Meta (Instagram & Messenger)"
          subtitle="Connect your Instagram Business account and Facebook Page using a single Meta OAuth flow."
          gradient={{ from: 'pink', to: 'indigo' }}
          action={isConnected
            ? <Badge color="green" variant="light" size="lg" leftSection={<CheckCircleIcon size={12} />}>Connected</Badge>
            : undefined}
        />

        <Alert icon={<AlertTriangleIcon size={16} />} title="Prerequisites" color="orange" mb="sm">
          <Stack gap={4}>
            <Text size="sm">✦ You must have a <strong>Facebook Page</strong> (not a personal profile). Create one at <Anchor href="https://www.facebook.com/pages/create" target="_blank" size="sm">facebook.com/pages/create</Anchor>.</Text>
            <Text size="sm">✦ Your Instagram must be in <strong>Professional (Business)</strong> mode and <strong>linked to that Facebook Page</strong> — Instagram app → Settings → Account type and tools → Switch to Professional Account, then link your Facebook Page.</Text>
          </Stack>
        </Alert>

        <Alert icon={<InfoIcon size={16} />} title="Setup Guide" color="blue" mb="lg">
          <Stack gap={4}>
            <Text size="sm"><strong>Step 1:</strong> Go to <Anchor href="https://developers.facebook.com" target="_blank" size="sm">Meta Developer Console</Anchor> → your app → <strong>Settings → Basic</strong> → add your app domain and copy <strong>App ID</strong> and <strong>App Secret</strong>.</Text>
            <Text size="sm"><strong>Step 2:</strong> In your app, go to <strong>Facebook Login → Settings</strong> (or Use Cases → Customize) → add this exact URL to <strong>Valid OAuth Redirect URIs</strong>:</Text>
            <Code block style={{ fontSize: '0.7rem' }}>{`${window.location.origin}/integrations/meta-callback`}</Code>
            <Text size="sm"><strong>Step 3:</strong> Make sure your app has these products added: <strong>Instagram Graph API</strong> and <strong>Messenger</strong>.</Text>
            <Text size="sm"><strong>Step 4:</strong> Enter the App ID and App Secret in the fields below → Save → click <strong>Connect via Meta</strong> → select your Facebook Page and Instagram account.</Text>
            <Text size="sm" c="dimmed">Required permissions: <Code>instagram_basic</Code>, <Code>instagram_manage_messages</Code>, <Code>instagram_content_publish</Code>, <Code>pages_messaging</Code>, <Code>pages_show_list</Code>, <Code>pages_read_engagement</Code>, <Code>pages_manage_posts</Code>, <Code>business_management</Code>.</Text>
          </Stack>
        </Alert>

        {/* Meta App Credentials */}
        <Paper shadow="xs" p="md" withBorder mb="md" radius="md">
          <Group gap="xs" mb={8}>
            <KeyIcon size={14} />
            <Text size="sm" fw={600}>Meta App Credentials</Text>
            {savedAppId && savedAppSecret && !editingAppId && (
              <Badge size="xs" color="green" variant="light">Configured</Badge>
            )}
          </Group>
          {editingAppId || !savedAppId || !savedAppSecret ? (
            <Stack gap="xs" mt={4}>
              <TextInput
                label="App ID"
                placeholder="e.g. 1234567890123456"
                description="Found at the top of your app page in Meta Developer Console"
                value={metaAppId}
                onChange={e => setMetaAppId(e.currentTarget.value)}
                size="sm"
              />
              <TextInput
                label="App Secret"
                placeholder="e.g. abc123def456..."
                description="Meta Developer Console → Settings → Basic → click Show next to App Secret"
                value={metaAppSecret}
                onChange={e => setMetaAppSecret(e.currentTarget.value)}
                type="password"
                size="sm"
              />
              <Group gap="xs">
                <Button size="sm" color="pink" leftSection={<SaveIcon size={14} />}
                  loading={saving} disabled={!metaAppId.trim() || !metaAppSecret.trim()}
                  onClick={async () => { const ok = await saveAppId(metaAppId, metaAppSecret); if (ok) setEditingAppId(false); }}>
                  Save
                </Button>
                {savedAppId && savedAppSecret && (
                  <Button size="sm" variant="subtle"
                    onClick={() => { setEditingAppId(false); setMetaAppId(savedAppId); setMetaAppSecret(savedAppSecret); }}>
                    Cancel
                  </Button>
                )}
              </Group>
            </Stack>
          ) : (
            <Group gap="xs" mt={4}>
              <Text size="sm" ff="monospace" c="dimmed">{savedAppId}</Text>
              <Text size="sm" c="dimmed">·</Text>
              <Text size="sm" c="dimmed">{'•'.repeat(8)}</Text>
              <Button size="xs" variant="subtle" leftSection={<EditIcon size={12} />}
                onClick={() => setEditingAppId(true)}>
                Edit
              </Button>
            </Group>
          )}
        </Paper>

        <Card shadow="sm" p="xl" radius="md" withBorder>
          <Stack gap="lg">

            {/* Instagram Section */}
            <Box>
              <Group gap="xs" mb="sm">
                <ThemeIcon size="sm" variant="light" color="pink" radius="sm">
                  <CameraIcon size={13} />
                </ThemeIcon>
                <Text fw={600} size="sm">Instagram Business</Text>
                {instagramAccounts.length > 0 && (
                  <Badge size="xs" color="green" variant="light">{instagramAccounts.length} connected</Badge>
                )}
              </Group>

              {instagramAccounts.length > 0 ? (
                <Stack gap="xs">
                  {instagramAccounts.map(acc => (
                    <Paper key={acc.id} p="sm" withBorder radius="sm">
                      <Group gap="sm">
                        <Avatar color="pink" variant="light" size="sm">
                          <CameraIcon size={14} />
                        </Avatar>
                        <Box style={{ flex: 1 }}>
                          <Text fw={600} size="sm">{acc.metadata?.name || 'Instagram Account'}</Text>
                          <Text size="xs" c="dimmed">ID: {acc.provider_account_id}</Text>
                        </Box>
                        <Button
                          size="xs" variant="light" color="pink"
                          leftSection={<ExternalLinkIcon size={11} />}
                          component="a" href="https://www.instagram.com/" target="_blank"
                        >
                          Open Instagram
                        </Button>
                      </Group>
                    </Paper>
                  ))}
                  <Button size="xs" variant="subtle" color="red" leftSection={<TrashIcon size={12} />}
                    onClick={() => handleDisconnect('instagram')} w="fit-content">
                    Disconnect Instagram
                  </Button>
                </Stack>
              ) : (
                <Text size="sm" c="dimmed" fs="italic">No Instagram account connected yet.</Text>
              )}
            </Box>

            <Divider />

            {/* Messenger Section */}
            <Box>
              <Group gap="xs" mb="sm">
                <ThemeIcon size="sm" variant="light" color="blue" radius="sm">
                  <MessagesSquareIcon size={13} />
                </ThemeIcon>
                <Text fw={600} size="sm">Messenger (Facebook Pages)</Text>
                {messengerPages.length > 0 && (
                  <Badge size="xs" color="green" variant="light">{messengerPages.length} connected</Badge>
                )}
              </Group>

              {messengerPages.length > 0 ? (
                <Stack gap="xs">
                  {messengerPages.map(page => (
                    <Paper key={page.id} p="sm" withBorder radius="sm">
                      <Group gap="sm">
                        <Avatar color="blue" variant="light" size="sm">
                          <MessagesSquareIcon size={14} />
                        </Avatar>
                        <Box style={{ flex: 1 }}>
                          <Text fw={600} size="sm">{page.metadata?.name || 'Facebook Page'}</Text>
                          {page.metadata?.category && (
                            <Text size="xs" c="dimmed">{page.metadata.category}</Text>
                          )}
                        </Box>
                        <Button
                          size="xs" variant="light" color="blue"
                          leftSection={<ExternalLinkIcon size={11} />}
                          component="a"
                          href={`https://www.facebook.com/${page.provider_account_id}`}
                          target="_blank"
                        >
                          Open Page
                        </Button>
                      </Group>
                    </Paper>
                  ))}
                  <Button size="xs" variant="subtle" color="red" leftSection={<TrashIcon size={12} />}
                    onClick={() => handleDisconnect('facebook')} w="fit-content">
                    Disconnect Messenger
                  </Button>
                </Stack>
              ) : (
                <Text size="sm" c="dimmed" fs="italic">No Facebook Page connected yet.</Text>
              )}
            </Box>

            <Divider />

            <Group justify="flex-end">
              <Button
                leftSection={<PlusIcon size={16} />}
                variant="gradient"
                gradient={{ from: 'pink', to: 'indigo' }}
                disabled={!savedAppId || !savedAppSecret}
                onClick={handleConnectFacebook}
              >
                {isConnected ? 'Connect More Accounts' : 'Connect via Meta'}
              </Button>
            </Group>

            {(!savedAppId || !savedAppSecret) && (
              <Text size="xs" c="dimmed" ta="right">Enter and save your Meta App ID and App Secret above to enable the Connect button.</Text>
            )}
          </Stack>
        </Card>
      </Box>
    </PageShell>
  );
};

export default IntegrationsMeta;
