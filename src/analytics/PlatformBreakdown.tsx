import React from 'react';
import { Paper, Text, Group, Box, Stack, Progress } from '@mantine/core';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PlatformBreakdownProps {
  data: { name: string; value: number }[];
}

const PLATFORM_COLORS: Record<string, string> = {
  Facebook: '#1877F2',
  Instagram: '#E4405F',
  WhatsApp: '#25D366',
  Email: '#7C3AED',
  Twitter: '#1DA1F2',
  LinkedIn: '#0A66C2',
};

const DEFAULT_COLORS = ['#1877F2', '#E4405F', '#25D366', '#7C3AED', '#1DA1F2', '#0A66C2'];

const PlatformBreakdown: React.FC<PlatformBreakdownProps> = ({ data }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  const dataWithColors = data.map((item, i) => ({
    ...item,
    color: PLATFORM_COLORS[item.name] || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  return (
    <Paper shadow="sm" p="lg" withBorder radius="md">
      <Text size="lg" fw={600} mb="md">Platform Distribution</Text>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={dataWithColors}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {dataWithColors.map((item, index) => (
              <Cell key={`cell-${index}`} fill={item.color} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} (${Math.round((value / total) * 100)}%)`, name]}
            contentStyle={{ borderRadius: 8, border: '1px solid var(--mantine-color-gray-2)', fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>

      <Stack gap="xs" mt="md">
        {dataWithColors.map(item => (
          <Box key={item.name}>
            <Group justify="space-between" mb={4}>
              <Group gap={6}>
                <Box w={10} h={10} style={{ borderRadius: 2, background: item.color, flexShrink: 0 }} />
                <Text size="xs" fw={500}>{item.name}</Text>
              </Group>
              <Group gap={4}>
                <Text size="xs" fw={700}>{item.value.toLocaleString()}</Text>
                <Text size="xs" c="dimmed">({Math.round((item.value / total) * 100)}%)</Text>
              </Group>
            </Group>
            <Progress value={(item.value / total) * 100} size="xs" color={item.color} radius="xl" />
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default PlatformBreakdown;
