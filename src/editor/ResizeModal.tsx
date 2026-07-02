import React, { useState, useEffect } from 'react';
import { Modal, NumberInput, Button, Group, Stack } from '@mantine/core';

interface ResizeModalProps {
  opened: boolean;
  onClose: () => void;
  onResize: (newDimensions: { width: number; height: number }) => void;
  currentDimensions: { width: number; height: number };
}

const ResizeModal: React.FC<ResizeModalProps> = ({ opened, onClose, onResize, currentDimensions }) => {
  const [width, setWidth] = useState(currentDimensions.width);
  const [height, setHeight] = useState(currentDimensions.height);

  useEffect(() => {
    setWidth(currentDimensions.width);
    setHeight(currentDimensions.height);
  }, [currentDimensions]);

  const handleSubmit = () => {
    onResize({ width, height });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Resize Canvas">
      <Stack>
        <NumberInput
          label="Width (px)"
          value={width}
          onChange={(value) => setWidth(Number(value) || 0)}
          min={1}
        />
        <NumberInput
          label="Height (px)"
          value={height}
          onChange={(value) => setHeight(Number(value) || 0)}
          min={1}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Resize</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ResizeModal;
