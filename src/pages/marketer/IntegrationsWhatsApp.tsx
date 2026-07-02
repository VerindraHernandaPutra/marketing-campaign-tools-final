import { useState, useEffect } from 'react';
import {
  Card, Text, Button, Box, TextInput, PasswordInput,
  Group, Stack, Alert, Badge, Divider, ThemeIcon, Paper, Anchor, List, Code,
  CopyButton, Tooltip, ActionIcon
} from '@mantine/core';
import PageHeader from '../../shared/PageHeader';
import {
  MessageCircleIcon, KeyIcon, CheckCircleIcon, Trash2Icon,
  RefreshCwIcon, PhoneIcon, AlertCircleIcon, ExternalLinkIcon, ShieldIcon,
  CopyIcon, CheckIcon
} from 'lucide-react';
import PageShell from '../../shared/PageShell';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../auth/UserContext';
import { useNotification } from '../../notifications/NotificationContext';

interface ConnectedInfo {
  phone_number_id: string;
  waba_id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
}

const IntegrationsWhatsApp = () => {
  const { currentOrgId } = useUserRole();
  const notify = useNotification();

  const [step, setStep] = useState<'credentials' | 'connected'>('credentials');
  const [loading, setLoading] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [connectedInfo, setConnectedInfo] = useState<ConnectedInfo | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!currentOrgId) return;
      const { data, error } = await supabase
        .from('organization_integrations')
        .select('*')
        .eq('organization_id', currentOrgId)
        .eq('platform', 'whatsapp')
        .order('connected_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Failed to load WhatsApp integration:', error.message);
        return;
      }

      if (data) {
        setConnectedInfo({
          phone_number_id: data.provider_account_id,
          waba_id: data.metadata?.waba_id || '',
          display_phone_number: data.metadata?.display_phone_number || data.provider_account_id,
          verified_name: data.metadata?.verified_name || 'WhatsApp Business',
          quality_rating: data.metadata?.quality_rating || 'UNKNOWN',
        });
        setStep('connected');
      }
    };
    fetchStatus();
  }, [currentOrgId]);

  const handleConnect = async () => {
    if (!phoneNumberId.trim() || !wabaId.trim() || !accessToken.trim()) {
      notify.error('Missing Fields', 'Please enter the Phone Number ID, WABA ID, and Access Token.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId.trim()}?fields=display_phone_number,verified_name,quality_rating&access_token=${encodeURIComponent(accessToken.trim())}`
      );
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message || 'Invalid credentials. Check your Phone Number ID and Access Token.');
      }

      if (!data.display_phone_number) {
        throw new Error('Could not retrieve phone number details from Meta. Verify your Phone Number ID.');
      }

      const { error: dbError } = await supabase
        .from('organization_integrations')
        .upsert({
          organization_id: currentOrgId,
          platform: 'whatsapp',
          provider_account_id: phoneNumberId.trim(),
          access_token: accessToken.trim(),
          metadata: {
            provider: 'meta',
            waba_id: wabaId.trim(),
            display_phone_number: data.display_phone_number,
            verified_name: data.verified_name || '',
            quality_rating: data.quality_rating || 'UNKNOWN',
          },
        }, { onConflict: 'organization_id, platform, provider_account_id' });

      if (dbError) throw dbError;

      setConnectedInfo({
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim(),
        display_phone_number: data.display_phone_number,
        verified_name: data.verified_name || 'WhatsApp Business',
        quality_rating: data.quality_rating || 'UNKNOWN',
      });
      setStep('connected');
      notify.success('Connected!', `WhatsApp ${data.display_phone_number} is now linked via Meta Cloud API.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      notify.error('Connection Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect WhatsApp? Campaign messages and inbox will stop working.')) return;
    setLoading(true);
    const { error } = await supabase
      .from('organization_integrations')
      .delete()
      .eq('organization_id', currentOrgId)
      .ilike('platform', 'whatsapp%');
    if (error) {
      notify.error('Disconnect Failed', error.message || 'Could not disconnect.');
      setLoading(false);
      return;
    }
    setConnectedInfo(null);
    setPhoneNumberId('');
    setWabaId('');
    setAccessToken('');
    setStep('credentials');
    setLoading(false);
    notify.success('Disconnected', 'WhatsApp Meta integration has been removed.');
  };

  const qualityColor: Record<string, string> = {
    GREEN: 'teal', YELLOW: 'yellow', RED: 'red', UNKNOWN: 'gray',
  };

  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  useEffect(() => {
    const fetchWaConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-wa-config');
        if (!error && data) {
          setWebhookUrl(data.webhook_url);
          setVerifyToken(data.verify_token);
        }
      } catch {
        setWebhookUrl(`${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/whatsapp-webhook`);
      }
    };
    fetchWaConfig();
  }, []);

  return (
    <PageShell>
      <PageHeader
        icon={<MessageCircleIcon size={22} />}
        title="WhatsApp Business"
        subtitle="Powered by Meta WhatsApp Cloud API — connect your WhatsApp Business number directly via Meta."
        gradient={{ from: 'green', to: 'teal' }}
        action={step === 'connected'
          ? <Badge color="green" variant="light" size="lg" leftSection={<CheckCircleIcon size={12} />}>Connected</Badge>
          : undefined}
      />

      <Alert color="blue" variant="light" icon={<AlertCircleIcon size={14} />} mb="lg" title="Setup Guide">
        <Stack gap={6}>
          <Text size="xs">
            <strong>Step 1:</strong> Go to{' '}
            <Anchor href="https://developers.facebook.com" target="_blank" size="xs">
              developers.facebook.com <ExternalLinkIcon size={10} />
            </Anchor>{' '}
            → your App → <strong>WhatsApp → API Setup</strong>.
          </Text>
          <Text size="xs">
            <strong>Step 2:</strong> Copy your <strong>Phone Number ID</strong> (not the phone number itself — it is a long numeric ID shown in the API Setup panel).
          </Text>
          <Text size="xs">
            <strong>Step 3:</strong> Generate a <strong>System User Access Token</strong> with{' '}
            <Code>whatsapp_business_messaging</Code> and <Code>whatsapp_business_management</Code> permissions.
            Use a permanent token, not the 24-hour test token.
          </Text>
          <Text size="xs">
            <strong>Step 4:</strong> In WhatsApp → <strong>Configuration → Webhooks</strong>, enter the URL below
            and subscribe to the <strong>messages</strong> field. Use the value of your{' '}
            <Code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</Code> Supabase secret as the Verify Token.
          </Text>
          <Text size="xs" ff="monospace" style={{ wordBreak: 'break-all' }}>
            {webhookUrl}
          </Text>
          <Divider my={4} />
          <Text size="xs" fw={600} c="orange.7">Test Number vs. Registered Number</Text>
          <List size="xs" spacing={4}>
            <List.Item><strong>Test number (free):</strong> Meta provides a shared test number you can use during development — no payment method required, but you can only message pre-verified recipient numbers.</List.Item>
            <List.Item><strong>Registered number (paid):</strong> Register your own WhatsApp Business number in Meta Developer Console. Requires adding a payment method to your WABA. Once registered, you can send to hundreds of contacts at once without verifying each recipient.</List.Item>
          </List>
          <Divider my={4} />
          <Text size="xs" fw={600}>Troubleshooting Checklist</Text>
          <List size="xs" spacing={4}>
            <List.Item>Phone Number ID is a numeric string from Meta Developer Console — not the actual phone number.</List.Item>
            <List.Item>Use a permanent System User token; temporary test tokens expire in 24 hours.</List.Item>
            <List.Item>Ensure your WhatsApp Business Account (WABA) is approved and the phone number is verified.</List.Item>
            <List.Item>If campaign status is stuck at <Code>scheduling</Code>, verify the Supabase webhook trigger on <Code>whatsapp_outbox</Code> is active.</List.Item>
            <List.Item>For out-of-window messages, use approved templates via the WhatsApp Templates page.</List.Item>
          </List>
        </Stack>
      </Alert>

      {step === 'connected' && connectedInfo && (
        <Card shadow="sm" p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Alert color="green" icon={<CheckCircleIcon size={16} />} title="Active Connection">
              Your WhatsApp Business number is connected via Meta Cloud API and ready for campaigns and inbox.
            </Alert>

            <Paper p="md" radius="md" withBorder>
              <Group gap="md">
                <ThemeIcon color="green" variant="light" size="xl" radius="xl">
                  <PhoneIcon size={20} />
                </ThemeIcon>
                <Box style={{ flex: 1 }}>
                  <Text fw={700} size="lg">{connectedInfo.display_phone_number}</Text>
                  <Text size="sm" c="dimmed">{connectedInfo.verified_name}</Text>
                  <Text size="xs" c="dimmed">Phone Number ID: {connectedInfo.phone_number_id}</Text>
                  <Text size="xs" c="dimmed">WABA ID: {connectedInfo.waba_id || '—'}</Text>
                </Box>
                <Badge
                  color={qualityColor[connectedInfo.quality_rating] || 'gray'}
                  variant="light"
                  leftSection={<ShieldIcon size={11} />}
                >
                  {connectedInfo.quality_rating}
                </Badge>
              </Group>
            </Paper>

            <Box p="sm" style={{ background: '#f8f9fa', borderRadius: 8 }}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>Webhook URL for Meta</Text>
              <Group gap="xs" align="center" wrap="nowrap">
                <Text size="xs" ff="monospace" style={{ wordBreak: 'break-all', flex: 1 }}>
                  {webhookUrl}
                </Text>
                <CopyButton value={webhookUrl} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied!' : 'Copy URL'} withArrow>
                      <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} size="sm" onClick={copy}>
                        {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              <Divider my={8} />
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>Verify Token</Text>
              <Group gap="xs" align="center" wrap="nowrap">
                <Text size="xs" ff="monospace" style={{ flex: 1 }}>
                  {verifyToken || '(not set — deploy get-wa-config function)'}
                </Text>
                <CopyButton value={verifyToken} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied!' : 'Copy Token'} withArrow>
                      <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} size="sm" onClick={copy} disabled={!verifyToken}>
                        {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              <Text size="xs" c="dimmed" mt={6}>
                Configure di Meta Developer Console → WhatsApp → Configuration → Webhooks.
                Subscribe ke field <strong>messages</strong>.
              </Text>
            </Box>

            <Group justify="space-between" mt="sm">
              <Button
                variant="subtle"
                color="red"
                leftSection={<Trash2Icon size={14} />}
                onClick={handleDisconnect}
                loading={loading}
              >
                Disconnect
              </Button>
              <Button
                variant="filled"
                color="dark"
                leftSection={<RefreshCwIcon size={14} />}
                onClick={() => { setStep('credentials'); setPhoneNumberId(''); setWabaId(''); setAccessToken(''); setConnectedInfo(null); }}
              >
                Update Configuration
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {step === 'credentials' && (
        <Card shadow="sm" p="xl" radius="md" withBorder>
          <Group gap="xs" mb="md">
            <ThemeIcon color="green" variant="light" size="sm" radius="xl">
              <KeyIcon size={12} />
            </ThemeIcon>
            <Text fw={600}>Connect with Meta WhatsApp Cloud API</Text>
          </Group>

          <Stack gap="md">
            <TextInput
              label="Phone Number ID"
              placeholder="e.g. 123456789012345"
              description="Found in Meta Developer Console → WhatsApp → API Setup (numeric ID, not the phone number)"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.currentTarget.value)}
              required
            />
            <TextInput
              label="WhatsApp Business Account ID (WABA ID)"
              placeholder="e.g. 987654321098765"
              description="Found in Meta Developer Console → WhatsApp → API Setup, listed as 'WhatsApp Business Account ID'"
              value={wabaId}
              onChange={(e) => setWabaId(e.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Access Token"
              placeholder="Paste your System User access token here..."
              description="Permanent System User token with whatsapp_business_messaging permission"
              value={accessToken}
              onChange={(e) => setAccessToken(e.currentTarget.value)}
              required
            />
            <Button
              fullWidth
              color="green"
              size="md"
              leftSection={<MessageCircleIcon size={16} />}
              onClick={handleConnect}
              loading={loading}
            >
              {loading ? 'Verifying & Connecting...' : 'Connect WhatsApp'}
            </Button>
          </Stack>
        </Card>
      )}
    </PageShell>
  );
};

export default IntegrationsWhatsApp;
