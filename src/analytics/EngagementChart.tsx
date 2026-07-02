import React from 'react';
import { Paper, Text, Group, Badge } from '@mantine/core';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export interface EngagementData {
  date: string;
  reach: number;
  engagement: number;
  clicks: number;
}

interface EngagementChartProps {
  data: EngagementData[];
}

const EngagementChart: React.FC<EngagementChartProps> = ({ data }) => {
  const totalReach = data.reduce((s, d) => s + d.reach, 0);
  const totalEngagement = data.reduce((s, d) => s + d.engagement, 0);
  const totalClicks = data.reduce((s, d) => s + d.clicks, 0);

  return (
    <Paper shadow="sm" p="lg" withBorder radius="md">
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={600}>Engagement Over Time</Text>
        <Group gap="xs">
          <Badge variant="dot" color="grape" size="sm">{totalReach.toLocaleString()} reach</Badge>
          <Badge variant="dot" color="teal" size="sm">{totalEngagement.toLocaleString()} engaged</Badge>
          <Badge variant="dot" color="orange" size="sm">{totalClicks.toLocaleString()} clicks</Badge>
        </Group>
      </Group>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffc658" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ffc658" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-2)" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--mantine-color-gray-4)" />
          <YAxis tick={{ fontSize: 12 }} stroke="var(--mantine-color-gray-4)" />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--mantine-color-gray-2)' }} />
          <Legend />
          <Area type="monotone" dataKey="reach" stroke="#8884d8" strokeWidth={2} fill="url(#colorReach)" dot={{ r: 3, fill: '#8884d8' }} />
          <Area type="monotone" dataKey="engagement" stroke="#82ca9d" strokeWidth={2} fill="url(#colorEngagement)" dot={{ r: 3, fill: '#82ca9d' }} />
          <Area type="monotone" dataKey="clicks" stroke="#ffc658" strokeWidth={2} fill="url(#colorClicks)" dot={{ r: 3, fill: '#ffc658' }} />
        </AreaChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default EngagementChart;
