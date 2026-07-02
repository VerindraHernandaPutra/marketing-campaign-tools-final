import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useUserRole } from './UserContext';
import type { UserRole } from './UserContext';
import { useAuth } from './useAuth';
import { Loader, Center, Text, Stack, Button } from '@mantine/core';
import { ShieldAlertIcon } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const { role, loadingRole, isSuperAdmin } = useUserRole();
  const { user, loading } = useAuth();

  if (loading || loadingRole) {
    return <Center h="100vh"><Loader /></Center>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isSuperAdmin) {
    return <Outlet />;
  }

  if (role && allowedRoles.includes(role)) {
    return <Outlet />;
  }

  return (
    <Center h="100vh">
      <Stack align="center" gap="md">
        <ShieldAlertIcon size={64} className="text-red-500" />
        <Text size="xl" fw={700} c="red">Access Denied</Text>
        <Text c="dimmed">You do not have permission to view this page.</Text>
        <Text size="sm" c="dimmed" bg="gray.1" p="xs" style={{ borderRadius: 8 }}>
          Your Role: <b>{role || 'None'}</b> <br />
          Required: {allowedRoles.join(', ')}
        </Text>
        <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
      </Stack>
    </Center>
  );
};
