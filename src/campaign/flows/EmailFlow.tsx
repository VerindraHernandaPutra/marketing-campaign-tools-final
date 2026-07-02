import React, { useEffect, useState } from 'react';
import {
  Paper, Text, TextInput, Group, Box, Divider, Badge, Loader, Avatar, Alert,
} from '@mantine/core';
import { MailIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface EmailData {
  subject?: string;
  [key: string]: unknown;
}

interface EmailFlowProps {
  data: EmailData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (data: any) => void;
  title?: string;
  content?: string;
  orgId?: string;
}

interface ResendIntegration {
  from_name?: string;
  from_email?: string;
}

const EmailFlow: React.FC<EmailFlowProps> = ({ data, onChange, title = '', content = '', orgId }) => {
  const [integration, setIntegration] = useState<ResendIntegration | null>(null);
  const [loadingIntegration, setLoadingIntegration] = useState(false);

  useEffect(() => {
    const fetchIntegration = async () => {
      if (!orgId) return;
      setLoadingIntegration(true);
      const { data: intData } = await supabase
        .from('organization_integrations')
        .select('metadata')
        .eq('organization_id', orgId)
        .eq('platform', 'resend')
        .single();
      if (intData?.metadata) {
        setIntegration({
          from_name: intData.metadata.from_name,
          from_email: intData.metadata.from_email,
        });
      }
      setLoadingIntegration(false);
    };
    fetchIntegration();
  }, [orgId]);

  const effectiveSubject = data.subject || title || 'New Campaign';
  const ctaUrl = (content || '').match(/https?:\/\/[^\s<]+/i)?.[0] || null;

  return (
    <Paper shadow="xs" p="md" withBorder radius="md" mb="md">
      {/* Top row: Subject + Sender card */}
      <Group align="flex-start" gap="md" mb="md">
        <TextInput
          label="Subject Line"
          placeholder={title || 'Enter email subject'}
          value={data.subject || ''}
          onChange={e => onChange({ ...data, subject: e.currentTarget.value })}
          style={{ flex: 1 }}
        />

        {/* Sender info card */}
        <Box
          style={{
            border: '1px solid var(--mantine-color-gray-3)',
            borderRadius: 8,
            padding: '8px 12px',
            minWidth: 200,
            background: 'var(--mantine-color-gray-0)',
          }}
        >
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>Sender</Text>
          {loadingIntegration ? (
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="xs" c="dimmed">Loading...</Text>
            </Group>
          ) : integration ? (
            <Group gap="xs" align="center">
              <Avatar size="sm" radius="xl" color="blue">
                {integration.from_name?.[0]?.toUpperCase() || 'M'}
              </Avatar>
              <Box>
                <Text size="xs" fw={600}>{integration.from_name}</Text>
                <Text size="xs" c="dimmed">{integration.from_email}</Text>
              </Box>
              <Badge color="green" size="xs" variant="light" ml="auto">Connected</Badge>
            </Group>
          ) : (
            <Group gap="xs">
              <Badge color="orange" size="xs" variant="light">Not configured</Badge>
            </Group>
          )}
        </Box>
      </Group>

      <Divider mb="md" />

      {/* Email Preview section */}
      <Text size="sm" fw={600} mb="sm">Email Preview</Text>

      <Box
        style={{
          maxWidth: 560,
          margin: '0 auto',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header bar */}
        <Box style={{ background: '#f3f4f6', padding: '10px 14px', borderBottom: '1px solid #e5e7eb' }}>
          <Group gap="xs" mb={3}>
            <Text size="xs" c="dimmed" style={{ width: 52 }}>From:</Text>
            <Text size="xs" fw={500}>
              {integration
                ? `${integration.from_name} <${integration.from_email}>`
                : 'Not configured'}
            </Text>
          </Group>
          <Group gap="xs">
            <Text size="xs" c="dimmed" style={{ width: 52 }}>Subject:</Text>
            <Text size="xs" fw={600}>{effectiveSubject}</Text>
          </Group>
        </Box>

        {/* Body */}
        <Box style={{ background: '#ffffff', padding: '20px 24px' }}>
          {title && (
            <Text fw={700} size="sm" mb={10} style={{ color: '#111827' }}>{title}</Text>
          )}

          {content ? (
            <Text size="xs" style={{ lineHeight: 1.75, color: '#374151', whiteSpace: 'pre-wrap' }}>
              {content.length > 300 ? content.slice(0, 300) + '...' : content}
            </Text>
          ) : (
            <Text size="xs" c="dimmed" fs="italic">Your campaign content will appear here...</Text>
          )}

          {ctaUrl && (
            <Box mt={20} style={{ textAlign: 'center' }}>
              <Box
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: '#fff',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                View Campaign
              </Box>
            </Box>
          )}

          <Divider my={16} />
          <Text size="xs" c="dimmed">Sent via Marketing VHP</Text>
        </Box>
      </Box>

      {!integration && !loadingIntegration && (
        <>
          <Divider my="md" />
          <Alert color="orange" icon={<MailIcon size={16} />}>
            Configure Resend integration to enable email sending. Go to Integrations → Resend (Email).
          </Alert>
        </>
      )}
    </Paper>
  );
};

export default EmailFlow;
