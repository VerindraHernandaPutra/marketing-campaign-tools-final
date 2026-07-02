import { useState, useEffect } from 'react';
import {
  Card, Text, Button, PasswordInput, TextInput,
  Group, Stack, Alert, Badge, Divider, Anchor,
} from '@mantine/core';
import { MailIcon, SaveIcon, InfoIcon, CheckCircleIcon, Trash2Icon } from 'lucide-react';
import PageShell from '../../shared/PageShell';
import PageHeader from '../../shared/PageHeader';
import { useNotification } from '../../notifications/NotificationContext';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../auth/UserContext';

const IntegrationsResend = () => {
  const notify = useNotification();
  const { currentOrgId } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');

  useEffect(() => {
    const fetchExisting = async () => {
      if (!currentOrgId) return;
      const { data } = await supabase
        .from('organization_integrations')
        .select('*')
        .eq('organization_id', currentOrgId)
        .eq('platform', 'resend')
        .order('connected_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setIsConnected(true);
        setApiKey('••••••••••••••••••••••••••••••••');
        setFromEmail(data.metadata?.from_email || '');
        setFromName(data.metadata?.from_name || '');
      }
    };
    fetchExisting();
  }, [currentOrgId]);

  const handleSave = async () => {
    if (!apiKey || !fromEmail || !fromName) {
      notify.error('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (apiKey.startsWith('••')) {
      notify.error('No Change', 'Please enter a new API key to update.');
      return;
    }

    setLoading(true);
    try {
      const { error: dbError } = await supabase
        .from('organization_integrations')
        .upsert({
          organization_id: currentOrgId,
          platform: 'resend',
          provider_account_id: fromEmail,
          access_token: apiKey,
          metadata: {
            from_email: fromEmail,
            from_name: fromName,
          },
        }, { onConflict: 'organization_id, platform, provider_account_id' });

      if (dbError) throw dbError;

      notify.success('Saved!', 'Resend configuration saved. Send a test email to verify your API key!');
      setIsConnected(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save configuration.';
      notify.error('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to remove the Resend integration?')) return;
    setLoading(true);
    const { error } = await supabase
      .from('organization_integrations')
      .delete()
      .eq('organization_id', currentOrgId)
      .ilike('platform', 'resend%');
    if (error) {
      notify.error('Disconnect Failed', error.message || 'Could not disconnect.');
      setLoading(false);
      return;
    }
    setIsConnected(false);
    setApiKey('');
    setFromEmail('');
    setFromName('');
    setLoading(false);
    notify.success('Disconnected', 'Resend integration has been removed.');
  };

  return (
    <PageShell>
      <PageHeader
        icon={<MailIcon size={22} />}
        title="Resend Email API"
        subtitle="Connect your Resend account to send beautifully crafted marketing emails directly from your own domain."
        gradient={{ from: 'violet', to: 'indigo' }}
        action={isConnected
          ? <Badge color="green" variant="light" size="lg" leftSection={<CheckCircleIcon size={12} />}>Connected</Badge>
          : undefined}
      />

      <Alert icon={<InfoIcon size={16} />} title="Setup Guide" color="blue" mb="lg">
        <Stack gap={4}>
          <Text size="sm"><strong>Step 1:</strong> Create a free account at <Anchor href="https://resend.com/signup" target="_blank" size="sm">resend.com/signup</Anchor>.</Text>
          <Text size="sm"><strong>Step 2:</strong> Go to <Anchor href="https://resend.com/domains" target="_blank" size="sm">Resend → Domains</Anchor>, click <strong>Add Domain</strong>, and follow the instructions to add DNS records (SPF, DKIM, DMARC) for your sending domain. Wait for verification (usually a few minutes).</Text>
          <Text size="sm"><strong>Step 3:</strong> Go to <Anchor href="https://resend.com/api-keys" target="_blank" size="sm">Resend → API Keys</Anchor>, click <strong>Create API Key</strong>, choose <em>Sending Access</em> (not Full Access), and copy the key — it is only shown once.</Text>
          <Text size="sm"><strong>Step 4:</strong> Fill in your verified sender email (e.g. <em>hello@yourdomain.com</em>), display name, and paste the API key below, then click <strong>Save & Connect</strong>.</Text>
          <Text size="sm" c="dimmed"><strong>Testing:</strong> During development you can use <em>onboarding@resend.dev</em> as the sender address — this is Resend's shared test domain and does not require domain verification, but emails only reach the address registered to your Resend account.</Text>
        </Stack>
      </Alert>

      <Card shadow="sm" p="xl" radius="md" withBorder>
        <Stack>
          {isConnected && (
            <>
              <Alert color="green" icon={<CheckCircleIcon size={16} />} title="Active Integration">
                Your Resend API is connected. Campaigns with Email channel will use the settings below.
              </Alert>
              <Divider label="Update Configuration" labelPosition="center" />
            </>
          )}

          <TextInput
            label="Sender Name"
            placeholder="Marketing VHP"
            value={fromName}
            onChange={(e) => setFromName(e.currentTarget.value)}
            description="The display name your recipients will see."
            required
          />

          <TextInput
            label="Sender Email Address"
            placeholder="hello@yourdomain.com"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.currentTarget.value)}
            description="Must be a verified domain in your Resend account."
            required
          />

          <PasswordInput
            label="Resend API Key"
            placeholder="re_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.currentTarget.value)}
            description="Create a restricted API key with Sending permissions only."
            required
          />

          <Group justify="space-between" mt="md">
            {isConnected && (
              <Button
                variant="subtle"
                color="red"
                leftSection={<Trash2Icon size={14} />}
                onClick={handleDisconnect}
                loading={loading}
              >
                Disconnect
              </Button>
            )}
            <Button
              variant="filled"
              color="dark"
              leftSection={<SaveIcon size={16} />}
              onClick={handleSave}
              loading={loading}
              ml="auto"
            >
              {isConnected ? 'Update Configuration' : 'Save & Connect'}
            </Button>
          </Group>
        </Stack>
      </Card>
    </PageShell>
  );
};

export default IntegrationsResend;
