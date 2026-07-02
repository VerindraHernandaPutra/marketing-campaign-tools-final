import React from 'react';
import { Box, Text, SimpleGrid, Paper, Group, Stack } from '@mantine/core';
import { MessageCircleIcon, MailIcon, CameraIcon, Share2Icon, UsersIcon, ShareIcon } from 'lucide-react';

interface PlatformSelectorProps {
  selectedPlatforms: string[];
  onChange: (platforms: string[]) => void;
}

const crmPlatforms = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Broadcast via Meta Cloud API',
    icon: MessageCircleIcon,
    color: '#25D366',
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Send via Resend integration',
    icon: MailIcon,
    color: '#EA4335',
  },
];

const postingPlatforms = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Share photos & stories',
    icon: CameraIcon,
    color: '#E4405F',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Post to your page or group',
    icon: Share2Icon,
    color: '#1877F2',
  },
];

interface PlatformCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const PlatformCard: React.FC<PlatformCardProps> = ({ id, name, description, icon: Icon, color, isSelected, onToggle }) => (
  <Paper
    p="md"
    withBorder
    onClick={() => onToggle(id)}
    style={{
      cursor: 'pointer',
      borderWidth: isSelected ? 2 : 1,
      borderColor: isSelected ? color : undefined,
      background: isSelected ? `${color}12` : undefined,
      transition: 'all 0.15s ease',
    }}
    radius="md"
  >
    <Group gap="sm" align="flex-start">
      <Box
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={color} />
      </Box>
      <Box style={{ flex: 1 }}>
        <Text size="sm" fw={600} style={{ color: isSelected ? color : undefined }}>
          {name}
        </Text>
        <Text size="xs" c="dimmed" mt={2}>
          {description}
        </Text>
      </Box>
    </Group>
  </Paper>
);

const PlatformSelector: React.FC<PlatformSelectorProps> = ({ selectedPlatforms, onChange }) => {
  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      onChange(selectedPlatforms.filter(id => id !== platformId));
    } else {
      onChange([...selectedPlatforms, platformId]);
    }
  };

  return (
    <Stack gap="xl">
      <Box>
        <Group gap="xs" mb="sm">
          <UsersIcon size={16} color="var(--mantine-color-blue-6)" />
          <Text size="sm" fw={600} c="blue">CRM</Text>
          <Text size="xs" c="dimmed">— Direct messaging channels</Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {crmPlatforms.map(p => (
            <PlatformCard
              key={p.id}
              {...p}
              isSelected={selectedPlatforms.includes(p.id)}
              onToggle={togglePlatform}
            />
          ))}
        </SimpleGrid>
      </Box>

      <Box>
        <Group gap="xs" mb="sm">
          <ShareIcon size={16} color="var(--mantine-color-violet-6)" />
          <Text size="sm" fw={600} c="violet">Posting</Text>
          <Text size="xs" c="dimmed">— Social media platforms</Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {postingPlatforms.map(p => (
            <PlatformCard
              key={p.id}
              {...p}
              isSelected={selectedPlatforms.includes(p.id)}
              onToggle={togglePlatform}
            />
          ))}
        </SimpleGrid>
      </Box>
    </Stack>
  );
};

export default PlatformSelector;
