import React, { useEffect, useState } from 'react'; // useState still needed for accounts & loading
import { Paper, Text, Group, Box, Stack, Alert, Textarea, Badge, Button, Loader } from '@mantine/core';
import { CameraIcon, Share2Icon, SparklesIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../auth/UserContext';

interface SocialMediaFlowProps {
  selectedPlatforms?: string[];
  onGenerateAI?: () => void;
  captions?: Record<string, string>;
  onCaptionChange?: (platform: string, value: string) => void;
}

interface SocialAccount {
  platform: string;
  account_name?: string;
  provider_account_id?: string;
}

const platformMeta: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  instagram: { label: 'Instagram', icon: CameraIcon, color: '#E4405F' },
  facebook: { label: 'Facebook', icon: Share2Icon, color: '#1877F2' },
};

const SocialMediaFlow: React.FC<SocialMediaFlowProps> = ({
  selectedPlatforms = [], onGenerateAI, captions = {}, onCaptionChange,
}) => {
  const { currentOrgId } = useUserRole();
  const [accounts, setAccounts] = useState<Record<string, SocialAccount | null>>({});
  const [loading, setLoading] = useState(false);

  const activeSocials = ['instagram', 'facebook'].filter(p => selectedPlatforms.includes(p));

  // DB platform keys: instagram → instagram_business, facebook → facebook_page
  const DB_PLATFORM_MAP: Record<string, string> = {
    instagram: 'instagram_business',
    facebook: 'facebook_page',
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!currentOrgId || activeSocials.length === 0) return;
      setLoading(true);
      try {
        const dbPlatforms = activeSocials.map(p => DB_PLATFORM_MAP[p]);
        const { data } = await supabase
          .from('organization_integrations')
          .select('platform, provider_account_id, metadata')
          .eq('organization_id', currentOrgId)
          .in('platform', dbPlatforms)
          .eq('status', 'active');

        const map: Record<string, SocialAccount | null> = {};
        for (const p of activeSocials) {
          const dbKey = DB_PLATFORM_MAP[p];
          const found = data?.find((d: { platform: string; provider_account_id?: string; metadata?: Record<string, string> }) => d.platform === dbKey);
          map[p] = found
            ? {
                platform: p,
                account_name: found.metadata?.name || found.metadata?.facebook_page_name || found.provider_account_id,
                provider_account_id: found.provider_account_id,
              }
            : null;
        }
        setAccounts(map);
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrgId, selectedPlatforms.join(',')]);

  if (activeSocials.length === 0) {
    return (
      <Alert variant="light" color="orange" title="No Social Platform Selected">
        Please select Facebook or Instagram in the "Platforms" step.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Group gap="xs" py="md">
        <Loader size="xs" />
        <Text size="xs" c="dimmed">Loading social accounts...</Text>
      </Group>
    );
  }

  return (
    <Stack gap="md">
      {activeSocials.map(platformId => {
        const meta = platformMeta[platformId];
        if (!meta) return null;
        const Icon = meta.icon;
        const account = accounts[platformId];
        const caption = captions[platformId] || '';

        return (
          <Paper key={platformId} withBorder p="md" radius="md">
            {/* Platform header */}
            <Group gap="xs" mb="md" justify="space-between">
              <Group gap="xs">
                <Box
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${meta.color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={meta.color} />
                </Box>
                <Box>
                  <Text fw={600} size="sm">{meta.label}</Text>
                  {account ? (
                    <Text size="xs" c="dimmed">@{account.account_name}</Text>
                  ) : (
                    <Text size="xs" c="orange">Not connected</Text>
                  )}
                </Box>
              </Group>
              {account ? (
                <Badge color="green" variant="light" size="xs">Connected</Badge>
              ) : (
                <Badge color="orange" variant="light" size="xs">Not connected</Badge>
              )}
            </Group>

            {account ? (
              <>
                {/* Caption area */}
                <Box pos="relative">
                  <Group justify="space-between" align="flex-end" mb={4}>
                    <Text size="xs" fw={500} c="dimmed">Caption</Text>
                    {onGenerateAI && (
                      <Button
                        variant="gradient"
                        gradient={{ from: 'pink', to: 'purple' }}
                        leftSection={<SparklesIcon size={14} />}
                        size="compact-xs"
                        onClick={onGenerateAI}
                      >
                        AI Generate
                      </Button>
                    )}
                  </Group>
                  <Textarea
                    placeholder={`Write your ${meta.label} caption here...`}
                    value={caption}
                    onChange={e => onCaptionChange?.(platformId, e.currentTarget.value)}
                    minRows={3}
                    autosize
                  />
                </Box>

                <Text size="xs" c="dimmed" mt="xs">
                  Attach media in the Campaign Name step above.
                </Text>

                {/* Post preview */}
                <Box
                  mt="md"
                  style={{
                    border: '1px solid var(--mantine-color-gray-3)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: '#fff',
                  }}
                >
                  <Box style={{ background: 'var(--mantine-color-gray-0)', padding: '8px 12px', borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                    <Group gap={6}>
                      <Icon size={14} color={meta.color} />
                      <Text size="xs" fw={600}>{meta.label} Post Preview</Text>
                    </Group>
                  </Box>
                  <Box style={{ padding: '10px 12px' }}>
                    <Text size="xs" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#333' }}>
                      {caption || <span style={{ color: '#aaa', fontStyle: 'italic' }}>Caption will appear here...</span>}
                    </Text>
                    <Text size="xs" c="dimmed" mt={6}>
                      Posted by @{account.account_name}
                    </Text>
                  </Box>
                </Box>
              </>
            ) : (
              <Alert color="orange" variant="light">
                Connect {meta.label} first in Integrations → Meta
              </Alert>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
};

export default SocialMediaFlow;
