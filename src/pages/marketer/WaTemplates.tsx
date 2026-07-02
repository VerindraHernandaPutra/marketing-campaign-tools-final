import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Button, Group, Text, Paper, Badge, Table, ActionIcon,
  TextInput, Textarea, Select, Stack, Modal, Alert,
  SimpleGrid, ThemeIcon, FileInput, Image, Drawer, Pagination,
  Divider, LoadingOverlay, Code,
} from '@mantine/core';
import PageShell from '../../shared/PageShell';
import PageHeader from '../../shared/PageHeader';
import {
  MessageSquareIcon, PlusIcon, TrashIcon, RefreshCwIcon,
  AlertCircleIcon, CheckCircleIcon, ClockIcon, XCircleIcon,
  ImageIcon, SearchIcon, EyeIcon, SortAscIcon,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../auth/UserContext';
import { useNavigate } from 'react-router-dom';

interface WaTemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
}

interface WaTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  category: string;
  language: string;
  components: WaTemplateComponent[];
}

const STATUS_COLOR: Record<string, string> = {
  APPROVED: 'green', PENDING: 'yellow', REJECTED: 'red', PAUSED: 'gray',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  APPROVED: <CheckCircleIcon size={12} />,
  PENDING:  <ClockIcon size={12} />,
  REJECTED: <XCircleIcon size={12} />,
  PAUSED:   <XCircleIcon size={12} />,
};

function extractVars(text: string): string[] {
  return [...new Set((text.match(/\{\{\d+\}\}/g) || []).map(m => m.replace(/\D/g, '')))]
    .sort((a, b) => Number(a) - Number(b));
}

export default function WaTemplates() {
  const { currentOrgId } = useUserRole();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ wabaId: string; accessToken: string } | null>(null);

  // Table controls
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [itemsPerPage, setItemsPerPage] = useState('10');
  const [activePage, setActivePage] = useState(1);

  // Detail drawer
  const [detailTemplate, setDetailTemplate] = useState<WaTemplate | null>(null);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('id');
  const [headerType, setHeaderType] = useState('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerImage, setHeaderImage] = useState<File | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [bodySamples, setBodySamples] = useState<Record<string, string>>({});

  const bodyVars = extractVars(body);

  useEffect(() => {
    if (!currentOrgId) return;
    supabase
      .from('organization_integrations')
      .select('access_token, metadata')
      .eq('organization_id', currentOrgId)
      .eq('platform', 'whatsapp')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.metadata?.waba_id && data.access_token)
          setCreds({ wabaId: data.metadata.waba_id, accessToken: data.access_token });
      });
  }, [currentOrgId]);

  const fetchTemplates = useCallback(async () => {
    if (!creds) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${creds.wabaId}/message_templates?fields=id,name,status,category,language,components&limit=100&access_token=${creds.accessToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setTemplates((data.data || []) as WaTemplate[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [creds]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { setActivePage(1); }, [searchQuery, sortBy, itemsPerPage]);

  useEffect(() => {
    if (!headerImage) { setHeaderPreview(null); return; }
    const url = URL.createObjectURL(headerImage);
    setHeaderPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [headerImage]);

  // Filtered + sorted + paginated
  const processed = useMemo(() => {
    let data = [...templates];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
      );
    }
    data.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':  return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'status':    return a.status.localeCompare(b.status);
        default:          return a.name.localeCompare(b.name);
      }
    });
    const total = data.length;
    const limit = parseInt(itemsPerPage);
    const totalPages = Math.ceil(total / limit);
    const paginated = data.slice((activePage - 1) * limit, activePage * limit);
    return { data: paginated, total, totalPages };
  }, [templates, searchQuery, sortBy, activePage, itemsPerPage]);

  const resetForm = () => {
    setName(''); setNameError(null); setCategory('MARKETING'); setLanguage('id');
    setHeaderType('NONE'); setHeaderText(''); setHeaderImage(null);
    setBody(''); setFooter(''); setBodySamples({});
  };

  const handleCreate = async () => {
    const nameClean = name.trim().toLowerCase().replace(/\s+/g, '_');
    if (!/^[a-z0-9_]+$/.test(nameClean)) {
      setNameError('Lowercase letters, numbers, underscores only');
      return;
    }
    setNameError(null);
    if (!body.trim() || !currentOrgId) return;
    for (const v of bodyVars) {
      if (!bodySamples[v]?.trim()) {
        alert(`Please fill in the sample value for {{${v}}}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      let imageBase64: string | null = null;
      let imageMimeType: string | null = null;
      if (headerType === 'IMAGE' && headerImage) {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(headerImage);
        });
        imageMimeType = headerImage.type;
      }
      const sampleValues = bodyVars.map(v => bodySamples[v]?.trim() || '');
      const { data, error: fnErr } = await supabase.functions.invoke('create-wa-template', {
        body: {
          organizationId: currentOrgId,
          name: nameClean, category, language,
          body: body.trim(),
          bodySamples: sampleValues.length > 0 ? sampleValues : undefined,
          footer: footer.trim() || undefined,
          headerType,
          headerText: headerType === 'TEXT' ? headerText.trim() : undefined,
          imageBase64, imageMimeType,
        },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setCreateOpen(false);
      resetForm();
      fetchTemplates();
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (templateName: string) => {
    if (!creds || !confirm(`Delete template "${templateName}"? This cannot be undone.`)) return;
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${creds.wabaId}/message_templates?name=${encodeURIComponent(templateName)}&access_token=${creds.accessToken}`,
      { method: 'DELETE' }
    );
    const data = await res.json();
    if (data.error) { alert(data.error.message); return; }
    if (detailTemplate?.name === templateName) setDetailTemplate(null);
    fetchTemplates();
  };

  const renderPreview = (
    previewBody: string,
    previewHeader?: WaTemplateComponent,
    previewFooter?: string,
    imgSrc?: string | null
  ) => (
    <Box style={{ background: '#e5ddd5', borderRadius: 12, padding: 16, minHeight: 160 }}>
      <Box style={{
        background: 'white', borderRadius: 8, overflow: 'hidden',
        maxWidth: 260, marginLeft: 'auto',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      }}>
        {previewHeader?.format === 'IMAGE' && (
          imgSrc
            ? <Image src={imgSrc} h={130} fit="cover" style={{ width: '100%' }} />
            : <Box style={{ height: 100, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={28} color="#bbb" />
              </Box>
        )}
        {previewHeader?.format === 'TEXT' && previewHeader.text && (
          <Box px="sm" pt="sm">
            <Text fw={700} size="sm">{previewHeader.text}</Text>
          </Box>
        )}
        <Box p="sm">
          {previewBody
            ? <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{previewBody}</Text>
            : <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>Message body preview...</Text>
          }
          {previewFooter && <Text size="xs" c="dimmed" mt={6}>{previewFooter}</Text>}
          <Text size="10px" c="dimmed" ta="right" mt={4}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Box>
      </Box>
    </Box>
  );

  const approvedCount = templates.filter(t => t.status === 'APPROVED').length;
  const pendingCount  = templates.filter(t => t.status === 'PENDING').length;
  const rejectedCount = templates.filter(t => t.status === 'REJECTED').length;

  return (
    <PageShell>
      <PageHeader
        icon={<MessageSquareIcon size={22} />}
        title="WA Templates"
        subtitle="Manage WhatsApp message templates for broadcast campaigns"
        gradient={{ from: 'green', to: 'teal' }}
        action={
          <Group>
            <Button variant="light" color="green" leftSection={<RefreshCwIcon size={16} />}
              onClick={fetchTemplates} loading={loading}>
              Sync from Meta
            </Button>
            {creds && (
              <Button leftSection={<PlusIcon size={16} />} variant="gradient"
                gradient={{ from: 'green', to: 'teal' }}
                onClick={() => { resetForm(); setCreateOpen(true); }}>
                Create Template
              </Button>
            )}
          </Group>
        }
      />

      {!creds && !loading && (
        <Alert icon={<AlertCircleIcon size={14} />} color="orange" mb="md"
          title="WhatsApp belum terhubung">
          <Group gap="xs">
            <Text size="sm">Hubungkan WhatsApp di halaman Integrations terlebih dahulu.</Text>
            <Button size="xs" variant="light" color="orange"
              onClick={() => navigate('/integrations/whatsapp')}>
              Hubungkan Sekarang
            </Button>
          </Group>
        </Alert>
      )}

      {error && (
        <Alert icon={<AlertCircleIcon size={14} />} color="red" mb="md" title="Gagal memuat template">
          {error}
        </Alert>
      )}

      <Paper shadow="xs" p="md" withBorder>
        <LoadingOverlay visible={loading} />

        {/* Controls */}
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <TextInput
              placeholder="Search templates..."
              leftSection={<SearchIcon size={14} />}
              value={searchQuery}
              onChange={e => setSearchQuery(e.currentTarget.value)}
              w={250}
            />
            <Select
              data={[
                { value: 'name_asc',  label: 'Name (A-Z)' },
                { value: 'name_desc', label: 'Name (Z-A)' },
                { value: 'status',    label: 'By Status' },
              ]}
              value={sortBy}
              onChange={v => setSortBy(v || 'name_asc')}
              leftSection={<SortAscIcon size={14} />}
              w={160}
              allowDeselect={false}
            />
            <Select
              data={['5', '10', '25']}
              value={itemsPerPage}
              onChange={v => setItemsPerPage(v || '10')}
              w={90}
              allowDeselect={false}
              leftSection={<Text size="xs" c="dimmed">Show</Text>}
            />
          </Group>
          <Group gap="xs">
            {approvedCount > 0 && <Badge color="green"  size="sm" variant="light">Approved {approvedCount}</Badge>}
            {pendingCount  > 0 && <Badge color="yellow" size="sm" variant="light">Pending {pendingCount}</Badge>}
            {rejectedCount > 0 && <Badge color="red"    size="sm" variant="light">Rejected {rejectedCount}</Badge>}
            <Text size="sm" c="dimmed">Total: <b>{processed.total}</b></Text>
          </Group>
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Template</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Language</Table.Th>
              <Table.Th>Variables</Table.Th>
              <Table.Th align="right">Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {processed.data.map(t => {
              const bodyComp   = t.components.find(c => c.type === 'BODY');
              const headerComp = t.components.find(c => c.type === 'HEADER');
              const varCount   = bodyComp?.text ? extractVars(bodyComp.text).length : 0;
              return (
                <Table.Tr key={t.id} style={{ cursor: 'pointer' }}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      {headerComp?.format === 'IMAGE' && (
                        <ThemeIcon color="gray" variant="light" size="sm" radius="sm">
                          <ImageIcon size={12} />
                        </ThemeIcon>
                      )}
                      <Box>
                        <Text fw={600} size="sm">{t.name}</Text>
                        <Text size="xs" c="dimmed" lineClamp={1} maw={280}>
                          {bodyComp?.text || '—'}
                        </Text>
                      </Box>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLOR[t.status] || 'gray'} variant="light" size="sm"
                      leftSection={STATUS_ICON[t.status]}>
                      {t.status.charAt(0) + t.status.slice(1).toLowerCase()}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="outline" color="grape">{t.category}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{t.language?.toUpperCase()}</Text>
                  </Table.Td>
                  <Table.Td>
                    {varCount > 0
                      ? <Badge size="xs" variant="light" color="blue">{varCount} var</Badge>
                      : <Text size="xs" c="dimmed">—</Text>}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end">
                      <ActionIcon variant="light" color="blue" onClick={() => setDetailTemplate(t)}>
                        <EyeIcon size={16} />
                      </ActionIcon>
                      <ActionIcon variant="light" color="red" onClick={() => handleDelete(t.name)}>
                        <TrashIcon size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
            {processed.total === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6} align="center" style={{ height: 120 }}>
                  <Text c="dimmed">
                    {searchQuery ? 'No templates match your search.' : 'No templates found. Create one or sync from Meta.'}
                  </Text>
                  {searchQuery && (
                    <Button variant="subtle" size="xs" mt="xs" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  )}
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        {processed.totalPages > 1 && (
          <Group justify="space-between" mt="lg">
            <Text size="sm" c="dimmed">
              Showing {(activePage - 1) * parseInt(itemsPerPage) + 1}–{Math.min(activePage * parseInt(itemsPerPage), processed.total)} of {processed.total}
            </Text>
            <Pagination total={processed.totalPages} value={activePage} onChange={setActivePage} color="green" />
          </Group>
        )}
      </Paper>

      {/* ── Detail Drawer ────────────────────────────────────────────────────── */}
      <Drawer
        opened={!!detailTemplate}
        onClose={() => setDetailTemplate(null)}
        title={
          detailTemplate && (
            <Group gap="sm">
              <ThemeIcon color="green" variant="light" size="md" radius="md">
                <MessageSquareIcon size={16} />
              </ThemeIcon>
              <Box>
                <Text fw={700} size="sm" ff="monospace">{detailTemplate.name}</Text>
                <Text size="xs" c="dimmed">{detailTemplate.category} · {detailTemplate.language?.toUpperCase()}</Text>
              </Box>
              <Badge color={STATUS_COLOR[detailTemplate.status] || 'gray'} variant="light" size="sm"
                leftSection={STATUS_ICON[detailTemplate.status]}>
                {detailTemplate.status.charAt(0) + detailTemplate.status.slice(1).toLowerCase()}
              </Badge>
            </Group>
          )
        }
        position="right"
        size="lg"
        overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
      >
        {detailTemplate && (() => {
          const headerComp = detailTemplate.components.find(c => c.type === 'HEADER');
          const bodyComp   = detailTemplate.components.find(c => c.type === 'BODY');
          const footerComp = detailTemplate.components.find(c => c.type === 'FOOTER');
          const buttonsComp = detailTemplate.components.find(c => c.type === 'BUTTONS');
          const vars = bodyComp?.text ? extractVars(bodyComp.text) : [];

          return (
            <Stack gap="md">
              {/* Preview */}
              <Paper withBorder p="md" radius="md">
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="sm">Preview</Text>
                {renderPreview(bodyComp?.text || '', headerComp, footerComp?.text)}
              </Paper>

              {/* Components */}
              {headerComp && (
                <Paper withBorder p="md" radius="md">
                  <Group gap="xs" mb="sm">
                    <Badge size="xs" color="gray" variant="filled">HEADER</Badge>
                    <Badge size="xs" color="gray" variant="outline">{headerComp.format}</Badge>
                  </Group>
                  {headerComp.format === 'TEXT' && headerComp.text
                    ? <Text size="sm" fw={600}>{headerComp.text}</Text>
                    : <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>Image media</Text>}
                </Paper>
              )}

              {bodyComp?.text && (
                <Paper withBorder p="md" radius="md">
                  <Badge size="xs" color="gray" variant="filled" mb="sm">BODY</Badge>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {bodyComp.text}
                  </Text>
                  {vars.length > 0 && (
                    <>
                      <Divider my="sm" />
                      <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>Variables</Text>
                      <Group gap="xs">
                        {vars.map(v => (
                          <Code key={v}>{`{{${v}}}`}</Code>
                        ))}
                      </Group>
                    </>
                  )}
                </Paper>
              )}

              {footerComp?.text && (
                <Paper withBorder p="md" radius="md">
                  <Badge size="xs" color="gray" variant="filled" mb="sm">FOOTER</Badge>
                  <Text size="sm" c="dimmed">{footerComp.text}</Text>
                </Paper>
              )}

              {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
                <Paper withBorder p="md" radius="md">
                  <Badge size="xs" color="gray" variant="filled" mb="sm">BUTTONS</Badge>
                  <Stack gap="xs">
                    {buttonsComp.buttons.map((btn, i) => (
                      <Group key={i} gap="xs">
                        <Badge size="xs" color="blue" variant="light">{btn.type}</Badge>
                        <Text size="sm">{btn.text}</Text>
                        {btn.url && <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>{btn.url}</Text>}
                        {btn.phone_number && <Text size="xs" c="dimmed">{btn.phone_number}</Text>}
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              )}

              <Divider />

              <Button
                color="red"
                variant="light"
                leftSection={<TrashIcon size={14} />}
                onClick={() => handleDelete(detailTemplate.name)}
                fullWidth
              >
                Delete Template
              </Button>
            </Stack>
          );
        })()}
      </Drawer>

      {/* ── Create Modal ─────────────────────────────────────────────────────── */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title={<Text fw={700} size="lg">Create Template</Text>}
        size="1100px"
        padding="xl"
      >
        <SimpleGrid cols={2} spacing="xl">
          {/* FORM */}
          <Stack gap="md">
            <TextInput
              label="Template Name"
              placeholder="hotel_promo"
              description="Lowercase letters, numbers, underscores only"
              value={name}
              onChange={e => { setName(e.target.value); setNameError(null); }}
              error={nameError}
              required
            />
            <SimpleGrid cols={2}>
              <Select
                label="Category"
                data={[
                  { value: 'MARKETING', label: 'Marketing' },
                  { value: 'UTILITY',   label: 'Utility' },
                ]}
                value={category}
                onChange={v => setCategory(v || 'MARKETING')}
                allowDeselect={false}
              />
              <Select
                label="Language"
                data={[
                  { value: 'id',    label: 'Indonesian' },
                  { value: 'en_US', label: 'English (US)' },
                ]}
                value={language}
                onChange={v => setLanguage(v || 'id')}
                allowDeselect={false}
              />
            </SimpleGrid>

            <Paper withBorder p="md" radius="md">
              <Text size="sm" fw={600} mb="sm">Header (Optional)</Text>
              <Select
                label="Header Type"
                data={[
                  { value: 'NONE',  label: 'None' },
                  { value: 'TEXT',  label: 'Text' },
                  { value: 'IMAGE', label: 'Image' },
                ]}
                value={headerType}
                onChange={v => { setHeaderType(v || 'NONE'); setHeaderImage(null); setHeaderText(''); }}
                allowDeselect={false}
                mb="sm"
              />
              {headerType === 'TEXT' && (
                <TextInput placeholder="Header text..." value={headerText}
                  onChange={e => setHeaderText(e.target.value)} />
              )}
              {headerType === 'IMAGE' && (
                <FileInput
                  placeholder="Upload image (JPG/PNG, max 5MB)"
                  accept="image/jpeg,image/png"
                  value={headerImage}
                  onChange={setHeaderImage}
                  leftSection={<ImageIcon size={14} />}
                  description="JPG/PNG, max 5MB. Will be uploaded to Meta on submit."
                  clearable
                />
              )}
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={600}>Body (Required)</Text>
                <Text size="xs" c="dimmed">{body.length}/1024</Text>
              </Group>
              <Textarea
                placeholder={`We would like to share an update.\n\n*{{1}}*\n\n{{2}}\n\nReply if you have any questions.`}
                value={body}
                onChange={e => {
                  const val = e.target.value;
                  setBody(val);
                  const vars = extractVars(val);
                  setBodySamples(prev => {
                    const next: Record<string, string> = {};
                    vars.forEach(v => { next[v] = prev[v] || ''; });
                    return next;
                  });
                }}
                minRows={4}
                maxLength={1024}
                description="Use {{1}}, {{2}}, etc. for variables. Supports *bold*, _italic_."
              />
              {bodyVars.length > 0 && (
                <Box mt="sm">
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>
                    Sample Values (required by Meta)
                  </Text>
                  <Stack gap={6}>
                    {bodyVars.map(v => (
                      <TextInput
                        key={v}
                        label={`{{${v}}} example`}
                        placeholder={`Sample value for variable ${v}`}
                        size="xs"
                        value={bodySamples[v] || ''}
                        onChange={e => setBodySamples(prev => ({ ...prev, [v]: e.target.value }))}
                        required
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>

            <TextInput
              label="Footer (Optional)"
              placeholder="Reply STOP to unsubscribe"
              description="Max 60 characters."
              value={footer}
              onChange={e => setFooter(e.target.value)}
              maxLength={60}
            />

            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button color="green" onClick={handleCreate} loading={submitting}
                disabled={!name.trim() || !body.trim()}>
                Create Template
              </Button>
            </Group>
          </Stack>

          {/* PREVIEW */}
          <Stack gap="md">
            <Paper withBorder p="md" radius="md">
              <Group gap="xs" mb="md">
                <ThemeIcon color="green" variant="light" size="sm">
                  <MessageSquareIcon size={12} />
                </ThemeIcon>
                <Text size="sm" fw={600}>Preview</Text>
                <Badge size="xs" color="grape" variant="light">
                  {category.charAt(0) + category.slice(1).toLowerCase()}
                </Badge>
              </Group>
              {renderPreview(
                body.replace(/\{\{(\d+)\}\}/g, (_, n) =>
                  bodySamples[n]?.trim() ? bodySamples[n] : `{{${n}}}`
                ),
                headerType !== 'NONE' ? { type: 'HEADER', format: headerType, text: headerText } : undefined,
                footer || undefined,
                headerPreview,
              )}
            </Paper>

            <Alert icon={<AlertCircleIcon size={14} />} color="blue" variant="light"
              title="Error or rejected by Meta?">
              <Text size="xs">
                You can also create templates directly in{' '}
                <Text component="a" href="https://business.facebook.com/wa/manage/message-templates/"
                  target="_blank" size="xs" c="blue">
                  Meta WhatsApp Manager ↗
                </Text>
                . Once approved, return here and click <b>Sync from Meta</b>.
              </Text>
            </Alert>
          </Stack>
        </SimpleGrid>
      </Modal>
    </PageShell>
  );
}
