import React from 'react';
import { Modal, Button, Group, Text, Stack, ThemeIcon } from '@mantine/core';
import { AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';

interface ConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  opened, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  isDanger = false, loading = false,
}) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      centered
      size="sm"
      padding="xl"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      radius="md"
    >
      <Stack align="center" gap="md" mb="lg">
        {isDanger ? (
          <ThemeIcon size={80} radius="100%" color="red" variant="light"
            style={{ border: '8px solid var(--mantine-color-red-0)' }}>
            <AlertTriangleIcon size={40} />
          </ThemeIcon>
        ) : (
          <ThemeIcon size={80} radius="100%" color="blue" variant="light"
            style={{ border: '8px solid var(--mantine-color-blue-0)' }}>
            <CheckCircleIcon size={40} />
          </ThemeIcon>
        )}
        <Stack gap={4} align="center">
          <Text ta="center" size="xl" fw={700}>{title}</Text>
          <Text ta="center" c="dimmed" size="sm" style={{ lineHeight: 1.4 }}>{message}</Text>
        </Stack>
      </Stack>
      <Group grow gap="md">
        <Button variant="default" size="md" onClick={onClose} disabled={loading} radius="md">
          {cancelLabel}
        </Button>
        <Button color={isDanger ? 'red' : 'blue'} size="md" onClick={onConfirm} loading={loading} radius="md">
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
};

export default ConfirmationModal;
