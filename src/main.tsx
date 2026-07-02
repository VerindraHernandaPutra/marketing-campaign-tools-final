import React from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './AppRouter';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { AuthProvider } from './auth/AuthProvider';
import { UserProvider } from './auth/UserContext';
import { NotificationProvider } from './notifications/NotificationProvider';
import { MantineProvider, createTheme } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const container = document.getElementById('root');
const root = createRoot(container!);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const theme = createTheme({
  scale: 0.9,
  fontSizes: {
    xs: '0.65rem',
    sm: '0.75rem',
    md: '0.85rem',
    lg: '1rem',
    xl: '1.15rem',
  },
});

root.render(
  <React.StrictMode>
    <MantineProvider theme={theme} forceColorScheme="light">
      <NotificationProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <UserProvider>
              <AppRouter />
            </UserProvider>
          </AuthProvider>
        </QueryClientProvider>
      </NotificationProvider>
    </MantineProvider>
  </React.StrictMode>
);
