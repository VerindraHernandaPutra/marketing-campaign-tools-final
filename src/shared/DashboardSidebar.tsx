import React from 'react';
import { Box, NavLink, ScrollArea, Text, Divider, Loader, Center, Avatar, Tooltip } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon, LayoutIcon, ImageIcon, SendIcon, BarChartIcon,
  UsersIcon, LayersIcon, ShieldIcon, MegaphoneIcon,
  MessageCircleIcon, InstagramIcon, MessageSquareIcon,
  BuildingIcon, PaletteIcon, RadioTowerIcon, MailIcon
} from 'lucide-react';
import { useUserRole } from '../auth/UserContext';
import { useAuth } from '../auth/useAuth';

interface DashboardSidebarProps {
  collapsed?: boolean;
}

const NAV_STYLES = {
  root: { borderRadius: 6, padding: '5px 8px' },
  label: { fontSize: '0.8rem', fontWeight: 400 },
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text size="xs" fw={600} c="gray.7" mb={3} mt={6} tt="uppercase"
    style={{ letterSpacing: '0.07em', fontSize: '0.66rem' }}>
    {children}
  </Text>
);

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  href?: string;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, active, onClick, collapsed, href }) => {
  if (collapsed) {
    return (
      <Tooltip label={label} position="right" withArrow>
        <Box
          role="button" tabIndex={0} aria-label={label}
          aria-current={active ? 'page' : undefined}
          onClick={onClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 32, borderRadius: 8, margin: '2px auto', cursor: 'pointer',
            backgroundColor: active ? 'var(--mantine-color-blue-0)' : 'transparent',
            color: active ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--mantine-color-gray-0)'; }}
          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          onFocus={e => (e.currentTarget.style.outline = '2px solid var(--mantine-color-blue-5)')}
          onBlur={e => (e.currentTarget.style.outline = 'none')}
        >
          {icon}
        </Box>
      </Tooltip>
    );
  }

  return (
    <NavLink href={href} label={label} leftSection={icon} active={active}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      styles={NAV_STYLES} aria-current={active ? 'page' : undefined}
    />
  );
};

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isSuperAdmin, loadingRole, orgName } = useUserRole();
  const { user } = useAuth();

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const sidebarWidth = collapsed ? 52 : 220;

  if (loadingRole) {
    return (
      <Box w={sidebarWidth} style={{
        borderRight: '1px solid var(--mantine-color-gray-2)',
        flexShrink: 0, height: '100vh',
        transition: 'width 0.2s ease', backgroundColor: 'white',
      }}>
        <Center h="100%"><Loader size="xs" /></Center>
      </Box>
    );
  }

  let roleLabel = 'User';
  let roleColor = '#6b7280';
  if (isSuperAdmin)          { roleLabel = 'Super Admin'; roleColor = '#991b1b'; }
  else if (role === 'operator') { roleLabel = 'Operator';   roleColor = '#1e40af'; }
  else if (role === 'designer') { roleLabel = 'Designer';   roleColor = '#9d174d'; }
  else if (role === 'marketer') { roleLabel = 'Marketer';   roleColor = '#155e75'; }

  const canAccessDesign    = role === 'operator' || role === 'designer';
  const canAccessMarketing = role === 'operator' || role === 'marketer';
  const canAccessCRM       = role === 'operator';

  const displayName = orgName || user?.email?.split('@')[0] || 'My Organization';

  const roleIconLg = isSuperAdmin      ? <ShieldIcon size={15} />
    : role === 'designer'  ? <PaletteIcon size={15} />
    : role === 'marketer'  ? <RadioTowerIcon size={15} />
    : <BuildingIcon size={15} />;

  const roleIconSm = isSuperAdmin      ? <ShieldIcon size={10} />
    : role === 'designer'  ? <PaletteIcon size={10} />
    : role === 'marketer'  ? <RadioTowerIcon size={10} />
    : <BuildingIcon size={10} />;

  if (isSuperAdmin) {
    return (
      <Box component="nav" aria-label="Main navigation" w={sidebarWidth} style={{
        borderRight: '1px solid var(--mantine-color-gray-2)',
        flexShrink: 0, height: '100vh',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden', backgroundColor: 'white',
        display: 'flex', flexDirection: 'column',
      }}>
        <ScrollArea style={{ flex: 1 }} scrollbarSize={4}>
          <Box px={collapsed ? 6 : 10} pt={10} pb={8}
            style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}>
            {collapsed ? (
              <Tooltip label="Markivo · Super Admin" position="right" withArrow>
                <Box style={{ display: 'flex', justifyContent: 'center' }}>
                  <img src="/Logo.png" alt="Markivo" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover' }} />
                </Box>
              </Tooltip>
            ) : (
              <Box>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <img src="/Logo.png" alt="Markivo" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                  <Box style={{ overflow: 'hidden', flex: 1 }}>
                    <Text size="xs" fw={500} truncate style={{ lineHeight: 1.3, fontSize: '0.78rem' }}>Markivo</Text>
                    <Text size="xs" c="dimmed" truncate style={{ fontSize: '0.64rem', lineHeight: 1.2 }}>System Administration</Text>
                  </Box>
                </Box>
                <Box style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 4, padding: '2px 7px', backgroundColor: '#f3f4f6' }}>
                  <Box style={{ color: '#ef4444' }}><ShieldIcon size={10} /></Box>
                  <Text style={{ fontSize: '0.66rem', color: '#ef4444', fontWeight: 400 }}>Super Admin</Text>
                </Box>
              </Box>
            )}
          </Box>

          <Box px={collapsed ? 6 : 8} py={8}>
            {!collapsed && <SectionLabel>Overview</SectionLabel>}
            <NavItem label="Dashboard" href="/" icon={<HomeIcon size={14} />}
              active={isActive('/', true)} onClick={() => navigate('/')} collapsed={collapsed} />
            {collapsed ? <Divider my={6} /> : <Divider my={8} />}
            {!collapsed && <SectionLabel>Administration</SectionLabel>}
            <NavItem label="Admin Console" href="/admin" icon={<ShieldIcon size={14} />}
              active={isActive('/admin', true)} onClick={() => navigate('/admin')} collapsed={collapsed} />
          </Box>
        </ScrollArea>

      </Box>
    );
  }

  return (
    <Box component="nav" aria-label="Main navigation" w={sidebarWidth} style={{
      borderRight: '1px solid var(--mantine-color-gray-2)',
      flexShrink: 0, height: '100vh',
      transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden', backgroundColor: 'white',
      display: 'flex', flexDirection: 'column',
    }}>
      <ScrollArea style={{ flex: 1 }} scrollbarSize={4}>

        {/* Org Branding */}
        <Box px={collapsed ? 6 : 10} pt={10} pb={8}
          style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}>
          {collapsed ? (
            <Tooltip label={`${displayName} · ${roleLabel}`} position="right" withArrow>
              <Box style={{ display: 'flex', justifyContent: 'center' }}>
                <img src="/Logo.png" alt="Markivo" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover' }} />
                <Avatar size={30} radius="md" variant="light" style={{ color: roleColor, display: 'none' }}>
                  {roleIconLg}
                </Avatar>
              </Box>
            </Tooltip>
          ) : (
            <Box>
              <Box style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <img src="/Logo.png" alt="Markivo" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                <Box style={{ overflow: 'hidden', flex: 1 }}>
                  <Text size="xs" fw={500} truncate style={{ lineHeight: 1.3, fontSize: '0.78rem' }}>{displayName}</Text>
                  <Text size="xs" c="dimmed" truncate style={{ fontSize: '0.64rem', lineHeight: 1.2 }}>Marketing Platform</Text>
                </Box>
              </Box>
              <Box style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 4, padding: '2px 7px', backgroundColor: '#f3f4f6' }}>
                <Box style={{ color: roleColor }}>{roleIconSm}</Box>
                <Text style={{ fontSize: '0.66rem', color: roleColor, fontWeight: 600 }}>{roleLabel}</Text>
              </Box>
            </Box>
          )}
        </Box>

        {/* Nav items */}
        <Box px={collapsed ? 6 : 8} py={8}>

          {!collapsed && <SectionLabel>Global</SectionLabel>}
          <NavItem label="Dashboard" href="/" icon={<HomeIcon size={14} />} active={isActive('/', true)} onClick={() => navigate('/')} collapsed={collapsed} />

          {canAccessMarketing && (
            <>
              <NavItem label="Inbox" href="/inbox" icon={<MessageCircleIcon size={14} />} active={isActive('/inbox', true)} onClick={() => navigate('/inbox')} collapsed={collapsed} />
              <NavItem label="Broadcast" href="/campaign-manager" icon={<SendIcon size={14} />} active={isActive('/campaign-manager')} onClick={() => navigate('/campaign-manager')} collapsed={collapsed} />
              <NavItem label="Campaign Designs" href="/campaigns" icon={<MegaphoneIcon size={14} />} active={isActive('/campaigns', true)} onClick={() => navigate('/campaigns')} collapsed={collapsed} />
              <NavItem label="WA Templates" href="/wa-templates" icon={<MessageSquareIcon size={14} />} active={isActive('/wa-templates', true)} onClick={() => navigate('/wa-templates')} collapsed={collapsed} />
              <NavItem label="Insight" href="/analytics" icon={<BarChartIcon size={14} />} active={isActive('/analytics', true)} onClick={() => navigate('/analytics')} collapsed={collapsed} />
            </>
          )}

          {canAccessDesign && (
            <>
              {collapsed ? <Divider my={6} /> : <Divider my={8} />}
              {!collapsed && <SectionLabel>Design</SectionLabel>}
              <NavItem label="Design Dashboard" href="/design-dashboard" icon={<LayoutIcon size={14} />} active={isActive('/design-dashboard', true)} onClick={() => navigate('/design-dashboard')} collapsed={collapsed} />
              <NavItem label="Projects" href="/projects" icon={<LayersIcon size={14} />} active={isActive('/projects', true)} onClick={() => navigate('/projects')} collapsed={collapsed} />
              <NavItem label="Templates" href="/templates" icon={<ImageIcon size={14} />} active={isActive('/templates', true)} onClick={() => navigate('/templates')} collapsed={collapsed} />
              {role === 'designer' && (
                <NavItem label="Campaign Designs" href="/campaigns" icon={<MegaphoneIcon size={14} />} active={isActive('/campaigns', true)} onClick={() => navigate('/campaigns')} collapsed={collapsed} />
              )}
            </>
          )}

          {canAccessCRM && (
            <>
              {collapsed ? <Divider my={6} /> : <Divider my={8} />}
              {!collapsed && <SectionLabel>CRM</SectionLabel>}
              <NavItem label="Clients" href="/clients" icon={<UsersIcon size={14} />} active={isActive('/clients', true)} onClick={() => navigate('/clients')} collapsed={collapsed} />
              <NavItem label="Groups" href="/groups" icon={<LayersIcon size={14} />} active={isActive('/groups', true)} onClick={() => navigate('/groups')} collapsed={collapsed} />
              <NavItem label="Users" href="/organization/users" icon={<UsersIcon size={14} />} active={isActive('/organization/users', true)} onClick={() => navigate('/organization/users')} collapsed={collapsed} />
            </>
          )}

          {canAccessCRM && (
            <>
              {collapsed ? <Divider my={6} /> : <Divider my={8} />}
              {!collapsed && <SectionLabel>Platform</SectionLabel>}
              <NavItem label="WhatsApp" href="/integrations/whatsapp" icon={<MessageCircleIcon size={14} />} active={isActive('/integrations/whatsapp')} onClick={() => navigate('/integrations/whatsapp')} collapsed={collapsed} />
              <NavItem label="Meta (IG & Messenger)" href="/integrations/meta" icon={<InstagramIcon size={14} />} active={isActive('/integrations/meta')} onClick={() => navigate('/integrations/meta')} collapsed={collapsed} />
              <NavItem label="Resend (Email)" href="/integrations/resend" icon={<MailIcon size={14} />} active={isActive('/integrations/resend')} onClick={() => navigate('/integrations/resend')} collapsed={collapsed} />
            </>
          )}
        </Box>
      </ScrollArea>

    </Box>
  );
};

export default DashboardSidebar;
