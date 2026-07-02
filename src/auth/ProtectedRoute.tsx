import React from 'react';
import { useAuth } from './useAuth';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader, Center } from '@mantine/core';

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader />
      </Center>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
