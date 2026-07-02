import React, { useState, useEffect } from 'react';
import {
  Paper, Text, TextInput, Group, Alert, Loader, Box,
  Badge, Select, Grid, Stack, SegmentedControl, Button,
} from '@mantine/core';
import { AlertCircleIcon, WifiIcon, AlertTriangleIcon, ExternalLinkIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../auth/UserContext';
import { useNavigate } from 'react-router-dom';

interface WhatsappData {
  ctaLink?: string;
  template_name?: string;
  template_language?: string;
  template_param_count?: number;
  params?: string[];
  manualNumbers?: string;
  recipientMode?: string;
  [key: string]: unknown;
}

interface WhatsappFlowProps {
  data: WhatsappData;
  onChange: (data: WhatsappData) => void;
  title?: string;
  content?: string;
  previewMediaUrls?: string[];
}

type ConnectionInfo = {
  phone_number: string;
  device_name: string;
  device_status: string;
  waba_id?: string;
  access_token?: string;
};

type WaTemplate = {
  id: string;
  name: string;
  status: string;
  language: string;
  category: string;
  components: { type: string; text?: string; buttons?: { type: string; text: string; url?: string }[] }[];
};

function countParams(components: WaTemplate['components']): number {
  const body = components.find(c => c.type === 'BODY');
  if (!body?.text) return 0;
  const matches = body.text.match(/\{\{\d+\}\}/g);
  return matches ? new Set(matches).size : 0;
}

const NumberedCircle: React.FC<{ n: number }> = ({ n }) => (
  <Box
    style={{
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: 'var(--mantine-color-blue-6)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: 13,
      flexShrink: 0,
    }}
  >
    {n}
  </Box>
);

const WhatsappFlow: React.FC<WhatsappFlowProps> = ({
  data, onChange, title = '', content = '', previewMediaUrls = [],
}) => {
  const { currentOrgId } = useUserRole();
  const navigate = useNavigate();
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [recipientMode, setRecipientMode] = useState(data.recipientMode || 'All');

  useEffect(() => {
    const fetchConnection = async () => {
      if (!currentOrgId) return;
      setLoading(true);
      setError(null);
      try {
        const { data: integData, error: integError } = await supabase
          .from('organization_integrations')
          .select('*')
          .eq('organization_id', currentOrgId)
          .eq('platform', 'whatsapp')
          .order('connected_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (integError || !integData) throw new Error('WhatsApp not connected. Go to Integrations → WhatsApp.');

        const cleanPhone = String(integData.provider_account_id || '').replace(/\D/g, '');
        setConnection({
          phone_number: cleanPhone,
          device_name: integData.metadata?.device_name || 'My Device',
          device_status: integData.metadata?.device_status || 'connected',
          waba_id: integData.metadata?.waba_id,
          access_token: integData.access_token,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchConnection();
  }, [currentOrgId]);

  useEffect(() => {
    if (!connection?.waba_id || !connection?.access_token) return;
    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${connection.waba_id}/message_templates?fields=id,name,status,category,language,components&limit=100&status=APPROVED`,
          { headers: { Authorization: `Bearer ${connection.access_token}` } }
        );
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        setTemplates((json.data || []).filter((t: WaTemplate) => t.status === 'APPROVED'));
      } catch {
        // non-fatal
      } finally {
        setTemplatesLoading(false);
      }
    };
    fetchTemplates();
  }, [connection?.waba_id, connection?.access_token]);

  const templateOptions = templates.map(t => ({
    value: t.name,
    label: `${t.name} (${t.language})`,
    language: t.language,
    param_count: countParams(t.components),
    category: t.category,
  }));

  const selectedTemplate = templates.find(t => t.name === data.template_name);
  const selectedBody = selectedTemplate?.components.find(c => c.type === 'BODY')?.text || '';
  const selectedCta = selectedTemplate?.components.find(c => c.type === 'BUTTONS')?.buttons?.[0];
  const paramCount = data.template_param_count || 0;
  const selectedCategory = selectedTemplate?.category || '';

  const handleParamChange = (idx: number, val: string) => {
    const params = [...(data.params || [])];
    params[idx] = val;
    onChange({ ...data, params });
  };

  return (
    <Grid gutter="md">
      {/* Left column — form */}
      <Grid.Col span={8}>
        <Stack gap="md">
          {/* Connection status chip */}
          {loading && (
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="xs" c="dimmed">Checking WhatsApp connection...</Text>
            </Group>
          )}

          {error && (
            <Alert
              icon={<AlertCircleIcon size={16} />}
              title="WhatsApp Not Connected"
              color="red"
            >
              <Text size="sm" mb="sm">{error}</Text>
              <Button
                size="xs"
                color="red"
                variant="light"
                leftSection={<ExternalLinkIcon size={12} />}
                onClick={() => navigate('/integrations/whatsapp')}
              >
                Connect WhatsApp
              </Button>
            </Alert>
          )}

          {connection && !error && (
            <Box
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: 'var(--mantine-color-green-0)',
                border: '1px solid var(--mantine-color-green-3)',
                borderRadius: 20,
                width: 'fit-content',
              }}
            >
              <WifiIcon size={13} color="var(--mantine-color-green-7)" />
              <Text size="xs" fw={600} c="green">+{connection.phone_number}</Text>
            </Box>
          )}

          {/* Section 1 — Broadcast details */}
          <Paper withBorder p="md" radius="md">
            <Group gap="xs" mb="md">
              <NumberedCircle n={1} />
              <Box>
                <Text fw={600} size="sm">Broadcast details</Text>
                <Text size="xs" c="dimmed">Select an approved WhatsApp template</Text>
              </Box>
            </Group>

            <Grid gutter="sm">
              <Grid.Col span={6}>
                <TextInput
                  label="Name"
                  value={title}
                  onChange={() => {/* read-only; managed by parent */}}
                  readOnly
                  styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                {templatesLoading ? (
                  <Group gap="xs" pt={28}>
                    <Loader size="xs" />
                    <Text size="xs" c="dimmed">Loading templates...</Text>
                  </Group>
                ) : (
                  <Box>
                    <Text size="sm" fw={500} mb={4}>Template</Text>
                    <Group gap="xs" align="center">
                      <Box style={{ flex: 1 }}>
                        <Select
                          placeholder="Select an approved template"
                          data={templateOptions}
                          value={data.template_name || null}
                          onChange={val => {
                            const opt = templateOptions.find(o => o.value === val);
                            onChange({
                              ...data,
                              template_name: val || undefined,
                              template_language: opt?.language,
                              template_param_count: opt?.param_count,
                            });
                          }}
                          nothingFoundMessage={
                            connection?.waba_id
                              ? 'No approved templates found.'
                              : 'Connect WhatsApp first.'
                          }
                        />
                      </Box>
                      {selectedCategory && (
                        <Badge
                          color={selectedCategory === 'MARKETING' ? 'orange' : selectedCategory === 'UTILITY' ? 'blue' : 'gray'}
                          variant="light"
                          size="sm"
                        >
                          {selectedCategory}
                        </Badge>
                      )}
                    </Group>
                  </Box>
                )}
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Section 2 — Template variables */}
          <Paper withBorder p="md" radius="md">
            <Group gap="xs" mb="md">
              <NumberedCircle n={2} />
              <Box>
                <Text fw={600} size="sm">Template variables</Text>
                <Text size="xs" c="dimmed">Fill in dynamic content for this template</Text>
              </Box>
            </Group>

            {paramCount === 0 ? (
              <Alert variant="light" color="green">
                This template has no dynamic variables. It will be sent as-is to all contacts.
              </Alert>
            ) : (
              <Stack gap="xs">
                {Array.from({ length: paramCount }).map((_, idx) => (
                  <TextInput
                    key={idx}
                    label={`{{${idx + 1}}}`}
                    placeholder={`Value for parameter ${idx + 1}`}
                    value={(data.params || [])[idx] || ''}
                    onChange={e => handleParamChange(idx, e.currentTarget.value)}
                  />
                ))}
              </Stack>
            )}

            {selectedCategory === 'MARKETING' && (
              <Alert
                color="yellow"
                icon={<AlertTriangleIcon size={16} />}
                mt="sm"
              >
                MARKETING category template selected — recipients who opted out will be skipped.
              </Alert>
            )}
          </Paper>

          {/* Section 3 — Recipients */}
          <Paper withBorder p="md" radius="md">
            <Group gap="xs" mb="md">
              <NumberedCircle n={3} />
              <Box style={{ flex: 1 }}>
                <Group gap="xs">
                  <Text fw={600} size="sm">Recipients</Text>
                </Group>
                <Text size="xs" c="dimmed">Choose who receives this broadcast</Text>
              </Box>
            </Group>

            <SegmentedControl
              data={['All', 'Manual', 'By Labels']}
              value={recipientMode}
              onChange={val => {
                setRecipientMode(val);
                onChange({ ...data, recipientMode: val });
              }}
              mb="md"
              fullWidth
            />

            {recipientMode === 'All' && (
              <Text size="sm" c="dimmed">
                This broadcast will be sent to all contacts with a phone number.
              </Text>
            )}

            {recipientMode === 'Manual' && (
              <TextInput
                placeholder="e.g. +62812345678, +6287654321"
                description="Enter phone numbers separated by commas"
                value={data.manualNumbers || ''}
                onChange={e => onChange({ ...data, manualNumbers: e.currentTarget.value })}
              />
            )}

            {recipientMode === 'By Labels' && (
              <Text size="sm" c="dimmed" fs="italic">
                Select from Groups (managed in Schedule step)
              </Text>
            )}
          </Paper>
        </Stack>
      </Grid.Col>

      {/* Right column — preview */}
      <Grid.Col span={4}>
        <Paper withBorder p="md" radius="md" style={{ position: 'sticky', top: 16 }}>
          <Group justify="space-between" mb="md">
            <Text fw={600} size="sm">Preview</Text>
            {selectedCategory && (
              <Badge
                color={selectedCategory === 'MARKETING' ? 'orange' : 'blue'}
                variant="light"
                size="xs"
              >
                {selectedCategory}
              </Badge>
            )}
          </Group>

          {/* Chat bubble */}
          <Box
            style={{
              background: '#ece5dd',
              borderRadius: 12,
              padding: 12,
              minHeight: 120,
            }}
          >
            <Box
              style={{
                background: '#dcf8c6',
                borderRadius: 12,
                padding: 12,
                maxWidth: '85%',
                marginLeft: 'auto',
                position: 'relative',
              }}
            >
              {selectedBody ? (
                <Text size="xs" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {selectedBody}
                </Text>
              ) : (
                <Text size="xs" c="dimmed" fs="italic">
                  Select a template to preview...
                </Text>
              )}
              <Text size="xs" c="dimmed" ta="right" mt={4} style={{ fontSize: 10 }}>
                12:29
              </Text>
            </Box>

            {selectedCta && (
              <Box
                mt="xs"
                style={{
                  border: '1.5px solid var(--mantine-color-blue-4)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  textAlign: 'center',
                  maxWidth: '85%',
                  marginLeft: 'auto',
                  background: '#fff',
                }}
              >
                <Text size="xs" c="blue" fw={500}>{selectedCta.text}</Text>
              </Box>
            )}
          </Box>

          {previewMediaUrls.length > 0 && (
            <Box mt="md">
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>Media</Text>
              <Box
                component="img"
                src={previewMediaUrls[0]}
                style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 140 }}
              />
              {previewMediaUrls.length > 1 && (
                <Text size="xs" c="dimmed" mt={4}>+{previewMediaUrls.length - 1} more</Text>
              )}
            </Box>
          )}
        </Paper>
      </Grid.Col>
    </Grid>
  );
};

export default WhatsappFlow;
