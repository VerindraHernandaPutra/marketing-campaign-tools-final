import React from 'react';
import {
  Box, Text, Title, Group, SimpleGrid, Paper, ThemeIcon,
  Badge, Divider, Stack, Avatar, Timeline
} from '@mantine/core';
import {
  UserCircleIcon, SendIcon, BarChartIcon, UsersIcon,
  LayoutIcon, ImageIcon, MegaphoneIcon, MessageCircleIcon,
  InstagramIcon, LayersIcon, CheckCircleIcon, CircleIcon,
  ShieldIcon, BuildingIcon, ZapIcon
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useUserRole } from '../auth/UserContext';

const ROLE_CONFIG = {
  operator: {
    label: 'Operator',
    color: '#3b82f6',
    bg: '#eff6ff',
    icon: <BuildingIcon size={20} />,
    tagline: 'Full access to manage your organization, campaigns, CRM and platform integrations.',
    capabilities: [
      { icon: <SendIcon size={14} />, label: 'Broadcast Campaigns', desc: 'Create and send WhatsApp, email, and social campaigns to your entire CRM.', available: true },
      { icon: <BarChartIcon size={14} />, label: 'Insights & Analytics', desc: 'View performance metrics for all campaigns across all channels.', available: true },
      { icon: <UsersIcon size={14} />, label: 'CRM — Clients & Groups', desc: 'Manage your full customer database including individual clients and groups.', available: true },
      { icon: <LayoutIcon size={14} />, label: 'Design Projects', desc: 'Create and edit canvas-based marketing materials and templates.', available: true },
      { icon: <MegaphoneIcon size={14} />, label: 'Campaign Designs', desc: 'Manage visual assets tied to marketing campaigns.', available: true },
      { icon: <MessageCircleIcon size={14} />, label: 'WhatsApp Integration', desc: 'Connect your WhatsApp Business number and send messages.', available: true },
      { icon: <InstagramIcon size={14} />, label: 'Instagram & Messenger', desc: 'Link Meta accounts for direct social DMs and campaign posting.', available: true },
      { icon: <LayersIcon size={14} />, label: 'User Management', desc: 'Invite and manage team members in your organization.', available: true },
    ],
    quickStats: [
      { label: 'Access Level', value: 'Full Access', color: '#3b82f6' },
      { label: 'CRM', value: 'Enabled', color: '#10b981' },
      { label: 'Campaigns', value: 'Enabled', color: '#10b981' },
      { label: 'Design Tools', value: 'Enabled', color: '#10b981' },
    ],
    gettingStarted: [
      'Go to CRM → Clients to import or add your customers',
      'Connect your WhatsApp / Instagram in Platform settings',
      'Create your first campaign in Broadcast',
      'Invite your team members under Users',
    ],
  },
  designer: {
    label: 'Designer',
    color: '#ec4899',
    bg: '#fdf2f8',
    icon: <ImageIcon size={20} />,
    tagline: 'Access to design tools, project creation, and template management.',
    capabilities: [
      { icon: <LayoutIcon size={14} />, label: 'Design Projects', desc: 'Full access to create and edit canvas-based marketing assets.', available: true },
      { icon: <ImageIcon size={14} />, label: 'Templates', desc: 'Browse, use, and publish design templates for the team.', available: true },
      { icon: <MegaphoneIcon size={14} />, label: 'Campaign Designs', desc: 'Design visual assets assigned to marketing campaigns.', available: true },
      { icon: <SendIcon size={14} />, label: 'Broadcast Campaigns', desc: 'Sending campaigns requires Operator or Marketer role.', available: false },
      { icon: <UsersIcon size={14} />, label: 'CRM Access', desc: 'CRM data requires Operator role.', available: false },
      { icon: <BarChartIcon size={14} />, label: 'Analytics', desc: 'Analytics access requires Operator or Marketer role.', available: false },
    ],
    quickStats: [
      { label: 'Access Level', value: 'Design Only', color: '#ec4899' },
      { label: 'Design Tools', value: 'Enabled', color: '#10b981' },
      { label: 'Campaigns', value: 'Limited', color: '#f59e0b' },
      { label: 'CRM', value: 'Disabled', color: '#9ca3af' },
    ],
    gettingStarted: [
      'Open Projects to start a new design canvas',
      'Browse Templates for inspiration and starting points',
      'Upload and tag assets for Campaign Designs',
      'Collaborate with Operators/Marketers on designs',
    ],
  },
  marketer: {
    label: 'Marketer',
    color: '#06b6d4',
    bg: '#f0fdf4',
    icon: <SendIcon size={20} />,
    tagline: 'Access to broadcast campaigns, analytics, and campaign design management.',
    capabilities: [
      { icon: <SendIcon size={14} />, label: 'Broadcast Campaigns', desc: 'Create, schedule and send campaigns across all channels.', available: true },
      { icon: <BarChartIcon size={14} />, label: 'Insights & Analytics', desc: 'Track campaign performance and audience engagement.', available: true },
      { icon: <MegaphoneIcon size={14} />, label: 'Campaign Designs', desc: 'Manage visual assets associated with marketing campaigns.', available: true },
      { icon: <LayoutIcon size={14} />, label: 'Design Projects', desc: 'Design canvas access requires Designer or Operator role.', available: false },
      { icon: <UsersIcon size={14} />, label: 'CRM — Clients', desc: 'Managing CRM requires Operator role.', available: false },
      { icon: <LayersIcon size={14} />, label: 'User Management', desc: 'User management requires Operator role.', available: false },
    ],
    quickStats: [
      { label: 'Access Level', value: 'Marketing', color: '#06b6d4' },
      { label: 'Campaigns', value: 'Enabled', color: '#10b981' },
      { label: 'Analytics', value: 'Enabled', color: '#10b981' },
      { label: 'Design Tools', value: 'Disabled', color: '#9ca3af' },
    ],
    gettingStarted: [
      'Open Broadcast to create your first campaign',
      'Check Insight for performance of past campaigns',
      'Use Campaign Designs to browse visual assets',
      'Schedule campaigns for optimal send times',
    ],
  },
  admin: {
    label: 'Super Admin',
    color: '#ef4444',
    bg: '#fef2f2',
    icon: <ShieldIcon size={20} />,
    tagline: 'Super administrator. Manage all organizations and users.',
    capabilities: [
      { icon: <BuildingIcon size={14} />, label: 'Manage Organizations', desc: 'View, create and configure all organizations on the platform.', available: true },
      { icon: <UsersIcon size={14} />, label: 'User Management', desc: 'Manage all users and assign roles across organizations.', available: true },
      { icon: <ShieldIcon size={14} />, label: 'Admin Console', desc: 'Access the administrator control panel.', available: true },
    ],
    quickStats: [
      { label: 'Access Level', value: 'Super Admin', color: '#ef4444' },
      { label: 'Scope', value: 'Super Access', color: '#ef4444' },
      { label: 'Organizations', value: 'All', color: '#10b981' },
      { label: 'Users', value: 'All', color: '#10b981' },
    ],
    gettingStarted: [
      'Visit Admin Console to view all organizations',
      'Review user assignments and role permissions',
      'Manage platform configurations and settings',
    ],
  },
};

const GlobalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { role, isSuperAdmin, orgName, loadingRole } = useUserRole();

  const effectiveRole = isSuperAdmin ? 'admin' : (role || 'operator');
  const config = ROLE_CONFIG[effectiveRole as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.operator;
  const displayName = user?.email?.split('@')[0] || 'User';
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  if (loadingRole) {
    return (
      <Box p="xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Text c="dimmed" size="sm">Loading dashboard…</Text>
      </Box>
    );
  }

  return (
    <Box p="xl" style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* Welcome header */}
      <Group align="flex-start" justify="space-between" mb="xl">
        <Box>
          <Text size="sm" c="dimmed" mb={2}>{greeting},</Text>
          <Title order={2} fw={600} style={{ letterSpacing: '-0.01em' }}>{displayName}</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {orgName ? `${orgName} · ` : ''}{config.tagline}
          </Text>
        </Box>
        <Box style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: config.bg, border: `1px solid ${config.color}22`,
          borderRadius: 10, padding: '10px 16px',
        }}>
          <ThemeIcon size={36} radius="md" style={{ background: config.color + '18', color: config.color }}>
            {config.icon}
          </ThemeIcon>
          <Box>
            <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>Logged in as</Text>
            <Text size="sm" fw={600} style={{ color: config.color, lineHeight: 1.3 }}>{config.label}</Text>
          </Box>
        </Box>
      </Group>

      {/* Quick stats */}
      <SimpleGrid cols={4} spacing="sm" mb="xl">
        {config.quickStats.map((stat, i) => (
          <Paper key={i} p="md" radius="md" withBorder style={{ borderColor: '#e5e7eb' }}>
            <Text size="xs" c="dimmed" mb={4}>{stat.label}</Text>
            <Badge size="sm" variant="light"
              style={{ background: stat.color + '18', color: stat.color, fontWeight: 500, fontSize: '0.72rem' }}>
              {stat.value}
            </Badge>
          </Paper>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={2} spacing="lg">

        {/* Capabilities */}
        <Paper p="lg" radius="md" withBorder style={{ borderColor: '#e5e7eb' }}>
          <Group mb="md">
            <ZapIcon size={14} color={config.color} />
            <Text size="sm" fw={500}>What you can do</Text>
          </Group>
          <Stack gap={8}>
            {config.capabilities.map((cap, i) => (
              <Box key={i}>
                <Group gap={8} wrap="nowrap">
                  <Box style={{ color: cap.available ? config.color : '#d1d5db', flexShrink: 0 }}>
                    {cap.available ? <CheckCircleIcon size={14} /> : <CircleIcon size={14} />}
                  </Box>
                  <Box style={{ flex: 1 }}>
                    <Text size="xs" fw={500} style={{ color: cap.available ? '#111827' : '#9ca3af' }}>
                      {cap.label}
                    </Text>
                    <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>{cap.desc}</Text>
                  </Box>
                </Group>
                {i < config.capabilities.length - 1 && <Divider mt={8} color="#f3f4f6" />}
              </Box>
            ))}
          </Stack>
        </Paper>

        {/* Right column */}
        <Box>
          {/* Getting Started */}
          <Paper p="lg" radius="md" withBorder style={{ borderColor: '#e5e7eb', marginBottom: 16 }}>
            <Group mb="md">
              <CheckCircleIcon size={14} color={config.color} />
              <Text size="sm" fw={500}>Getting started</Text>
            </Group>
            <Timeline active={-1} bulletSize={20} lineWidth={1} color={config.color}>
              {config.gettingStarted.map((step, i) => (
                <Timeline.Item key={i} bullet={
                  <Text size="xs" fw={600} style={{ color: config.color }}>{i + 1}</Text>
                }>
                  <Text size="xs" style={{ lineHeight: 1.5, color: '#374151' }}>{step}</Text>
                </Timeline.Item>
              ))}
            </Timeline>
          </Paper>

          {/* Profile quick info */}
          <Paper p="md" radius="md" withBorder style={{ borderColor: '#e5e7eb' }}>
            <Group gap={10}>
              <Avatar size={36} radius="xl" style={{ background: config.bg }}>
                <UserCircleIcon size={18} color={config.color} />
              </Avatar>
              <Box style={{ flex: 1 }}>
                <Text size="xs" fw={500}>{displayName}</Text>
                <Text size="xs" c="dimmed">{user?.email}</Text>
              </Box>
              <Badge size="xs" style={{ background: config.color + '18', color: config.color, border: 'none', fontWeight: 500 }}>
                {config.label}
              </Badge>
            </Group>
            {orgName && (
              <>
                <Divider my={10} color="#f3f4f6" />
                <Group gap={6}>
                  <BuildingIcon size={12} color="#9ca3af" />
                  <Text size="xs" c="dimmed">{orgName}</Text>
                </Group>
              </>
            )}
          </Paper>
        </Box>
      </SimpleGrid>
    </Box>
  );
};

export default GlobalDashboard;
