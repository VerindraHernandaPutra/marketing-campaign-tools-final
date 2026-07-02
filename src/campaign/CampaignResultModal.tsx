import React from 'react';
import { Modal, Box, Text, Button, Group, Stack, Badge, Divider } from '@mantine/core';
import {
  CheckCircleIcon, XCircleIcon, CalendarIcon, BookmarkIcon,
  RocketIcon, ClockIcon, ArrowRightIcon, RefreshCwIcon,
} from 'lucide-react';

export type CampaignResultType = 'sent' | 'scheduled' | 'draft' | 'error';

export interface CampaignResult {
  type: CampaignResultType;
  platforms?: string[];
  scheduledAt?: string;
  errorMessage?: string;
  recipientCount?: number;
}

interface Props {
  result: CampaignResult | null;
  onClose: () => void;
  onGoToManager: () => void;
  onRetry?: () => void;
}

const platformLabels: Record<string, string> = {
  email:     '📧 Email',
  whatsapp:  '💬 WhatsApp',
  facebook:  '📘 Facebook',
  instagram: '📸 Instagram',
  twitter:   '🐦 Twitter / X',
  linkedin:  '💼 LinkedIn',
};

const configs = {
  sent: {
    color: 'teal',
    icon: <CheckCircleIcon size={48} color="#12b886" />,
    title: 'Campaign Launched! 🚀',
    subtitle: 'Your campaign has been sent successfully.',
    badgeColor: 'teal',
    badgeLabel: 'Sent',
    bgColor: '#f0fff4',
  },
  scheduled: {
    color: 'blue',
    icon: <CalendarIcon size={48} color="#228be6" />,
    title: 'Campaign Scheduled! 📅',
    subtitle: 'Your campaign is queued and will be delivered at the specified time.',
    badgeColor: 'blue',
    badgeLabel: 'Scheduled',
    bgColor: '#e7f5ff',
  },
  draft: {
    color: 'gray',
    icon: <BookmarkIcon size={48} color="#868e96" />,
    title: 'Draft Saved!',
    subtitle: 'Your campaign has been saved as a draft. You can resume it anytime.',
    badgeColor: 'gray',
    badgeLabel: 'Draft',
    bgColor: '#f8f9fa',
  },
  error: {
    color: 'red',
    icon: <XCircleIcon size={48} color="#fa5252" />,
    title: 'Campaign Failed ❌',
    subtitle: 'Something went wrong while processing your campaign.',
    badgeColor: 'red',
    badgeLabel: 'Error',
    bgColor: '#fff5f5',
  },
};

const CampaignResultModal: React.FC<Props> = ({ result, onClose, onGoToManager, onRetry }) => {
  if (!result) return null;
  const cfg = configs[result.type];

  return (
    <Modal
      opened={!!result}
      onClose={onClose}
      centered
      size="md"
      withCloseButton={result.type === 'error'}
      closeOnClickOutside={result.type === 'error'}
      styles={{
        content: { borderRadius: 16, overflow: 'hidden' },
        header: { background: '#f8f9fa', borderBottom: '1px solid #e9ecef' },
      }}
      title={
        <Group gap="xs">
          <Badge color={cfg.badgeColor} variant="filled" size="sm">{cfg.badgeLabel}</Badge>
          <Text size="sm" fw={600} c="dimmed">Campaign Status</Text>
        </Group>
      }
    >
      <Stack align="center" gap="md" py="xl">
        <Box
          style={{
            animation: result.type !== 'error' ? 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'shake 0.4s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 88, height: 88, borderRadius: '50%',
            background: cfg.bgColor,
          }}
        >
          {cfg.icon}
        </Box>

        <Stack align="center" gap={4}>
          <Text fw={700} size="xl" ta="center">{cfg.title}</Text>
          <Text size="sm" c="dimmed" ta="center" maw={340}>{cfg.subtitle}</Text>
        </Stack>

        {result.type !== 'error' && result.type !== 'draft' && (
          <Box w="100%" p="md" style={{ background: '#f8f9fa', borderRadius: 10 }}>
            {result.platforms && result.platforms.length > 0 && (
              <>
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>Channels</Text>
                <Group gap={6} mb={result.scheduledAt ? 'sm' : 0}>
                  {result.platforms.map(p => (
                    <Badge key={p} size="sm" variant="light" color="blue">
                      {platformLabels[p] || p}
                    </Badge>
                  ))}
                </Group>
              </>
            )}
            {result.scheduledAt && (
              <>
                <Divider my="sm" />
                <Group gap="xs">
                  <ClockIcon size={14} color="#868e96" />
                  <Text size="xs" c="dimmed">Scheduled for:</Text>
                  <Text size="xs" fw={600}>{new Date(result.scheduledAt).toLocaleString()}</Text>
                </Group>
              </>
            )}
            {result.recipientCount !== undefined && (
              <>
                <Divider my="sm" />
                <Group gap="xs">
                  <RocketIcon size={14} color="#868e96" />
                  <Text size="xs" c="dimmed">Recipients:</Text>
                  <Text size="xs" fw={600}>{result.recipientCount} contacts</Text>
                </Group>
              </>
            )}
          </Box>
        )}

        {result.type === 'error' && result.errorMessage && (
          <Box w="100%" p="md" style={{ background: '#fff5f5', borderRadius: 10, border: '1px solid #ffc9c9' }}>
            <Text size="xs" fw={600} c="red" mb={4}>Error Details:</Text>
            <Text size="xs" c="dimmed" style={{ wordBreak: 'break-word' }}>{result.errorMessage}</Text>
          </Box>
        )}

        <Group w="100%" mt="sm">
          {result.type === 'error' && onRetry && (
            <Button variant="light" color="red" leftSection={<RefreshCwIcon size={14} />}
              onClick={onRetry} style={{ flex: 1 }}>
              Try Again
            </Button>
          )}
          <Button
            variant={result.type === 'error' ? 'default' : 'filled'}
            color={result.type === 'error' ? undefined : cfg.color}
            rightSection={<ArrowRightIcon size={14} />}
            onClick={onGoToManager}
            style={{ flex: 1 }}
          >
            {result.type === 'error' ? 'Back to Campaigns' : 'Go to Campaign Manager'}
          </Button>
        </Group>
      </Stack>

      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </Modal>
  );
};

export default CampaignResultModal;
