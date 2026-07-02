import React from 'react';
import { Paper, Text, Group, ThemeIcon, Box } from '@mantine/core';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
  icon?: LucideIcon;
  color?: string;
  subtitle?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title, value, change, trend, icon: Icon, color = 'blue', subtitle
}) => {
  const trendColor = trend === 'up' ? 'green' : 'red';
  return (
    <Paper shadow="sm" p="lg" withBorder radius="md" style={{ overflow: 'hidden', position: 'relative' }}>
      <Box style={{
        position: 'absolute', top: 0, right: 0, width: 72, height: 72,
        background: `var(--mantine-color-${color}-1)`,
        borderRadius: '0 12px 0 72px',
        pointerEvents: 'none',
      }} />
      <Group justify="space-between" mb="xs">
        <Text size="xs" c="gray.7" fw={700} tt="uppercase">{title}</Text>
        {Icon && (
          <ThemeIcon variant="light" color={color} size="md" radius="xl">
            <Icon size={16} />
          </ThemeIcon>
        )}
      </Group>
      <Text size="xl" fw={800} mt={2}>{value}</Text>
      {subtitle && <Text size="xs" c="dimmed" mt={2}>{subtitle}</Text>}
      <Group gap={4} mt="sm">
        {trend === 'up'
          ? <TrendingUpIcon size={13} color="var(--mantine-color-green-6)" />
          : <TrendingDownIcon size={13} color="var(--mantine-color-red-6)" />}
        <Text size="xs" fw={600} c={trendColor}>{Math.abs(change)}% this period</Text>
      </Group>
    </Paper>
  );
};

export default MetricsCard;
