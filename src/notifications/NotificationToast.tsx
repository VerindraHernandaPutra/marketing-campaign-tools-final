import React, { useEffect } from 'react';
import { Paper, Text, Group, ThemeIcon, CloseButton, Box } from '@mantine/core';
import { CheckCircleIcon, AlertCircleIcon, XCircleIcon, InfoIcon } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationProps {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: AlertCircleIcon,
  info: InfoIcon,
};

const colors = {
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'blue',
};

const NotificationToast: React.FC<NotificationProps> = ({ id, title, message, type, onClose }) => {
  const Icon = icons[type];
  const color = colors[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <Paper
      shadow="md"
      radius="md"
      p="md"
      withBorder
      style={{
        marginBottom: '10px',
        minWidth: '300px',
        maxWidth: '400px',
        pointerEvents: 'auto',
        animation: 'slideIn 0.3s ease-out forwards',
      }}
    >
      <Group align="flex-start" wrap="nowrap">
        <ThemeIcon color={color} size="lg" radius="xl" variant="light">
          <Icon size={20} />
        </ThemeIcon>
        <Box style={{ flex: 1 }}>
          <Text size="sm" fw={600} mb={2}>{title}</Text>
          <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>{message}</Text>
        </Box>
        <CloseButton onClick={() => onClose(id)} />
      </Group>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </Paper>
  );
};

export default NotificationToast;
