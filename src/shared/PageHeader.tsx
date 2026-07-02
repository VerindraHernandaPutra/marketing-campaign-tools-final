import React from 'react';
import { Group, ThemeIcon, Box, Title, Text } from '@mantine/core';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: { from: string; to: string };
  action?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, subtitle, gradient, action }) => (
  <Group justify="space-between" mb="xl" align="flex-start">
    <Group gap="md">
      <ThemeIcon size="xl" radius="md" variant="gradient" gradient={gradient} aria-hidden="true">
        {icon}
      </ThemeIcon>
      <Box>
        <Title order={2} lh={1}>{title}</Title>
        <Text size="sm" c="dimmed" mt={2}>{subtitle}</Text>
      </Box>
    </Group>
    {action}
  </Group>
);

export default PageHeader;
