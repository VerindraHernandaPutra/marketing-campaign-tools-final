import React, { useState } from 'react';
import { Modal, Select, Slider, Button, Group, Text, Stack, Collapse } from '@mantine/core';
import { DownloadIcon, Settings2Icon } from 'lucide-react';

interface DownloadModalProps {
  opened: boolean;
  onClose: () => void;
  onDownload: (format: 'png' | 'jpeg' | 'pdf', quality: number, multiplier: number) => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ opened, onClose, onDownload }) => {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');
  const [quality, setQuality] = useState(0.8);
  const [multiplier, setMultiplier] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleDownload = () => {
    onDownload(format, quality, multiplier);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Download Design">
      <Stack gap="md">
        <Select
          label="File Type"
          data={[
            { value: 'png', label: 'PNG (High Quality Image)' },
            { value: 'jpeg', label: 'JPG (Small File Size)' },
            { value: 'pdf', label: 'PDF (Standard Document)' },
          ]}
          value={format}
          onChange={(val) => {
            if (val === 'png' || val === 'jpeg' || val === 'pdf') setFormat(val);
          }}
          allowDeselect={false}
        />

        {format !== 'pdf' && (
          <>
            <div>
              <Text size="sm" fw={500} mb={4}>Size / Quality ({multiplier}x)</Text>
              <Slider
                value={multiplier}
                onChange={setMultiplier}
                min={0.5}
                max={3}
                step={0.5}
                marks={[
                  { value: 1, label: '1x' },
                  { value: 2, label: '2x' },
                  { value: 3, label: '3x' },
                ]}
                mb="lg"
              />
            </div>
            {format === 'jpeg' && (
              <div>
                <Text size="sm" fw={500} mb={4}>Compression Quality ({Math.round(quality * 100)}%)</Text>
                <Slider value={quality} onChange={setQuality} min={0.1} max={1} step={0.1} />
              </div>
            )}
          </>
        )}

        <Button
          variant="subtle"
          size="xs"
          leftSection={<Settings2Icon size={14} />}
          onClick={() => setShowAdvanced(!showAdvanced)}
          color="gray"
        >
          {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
        </Button>

        <Collapse in={showAdvanced}>
          <Text size="xs" c="dimmed" mb="xs">
            Custom resizing is applied via the multiplier slider above. For example, 2x will double the dimensions.
          </Text>
        </Collapse>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDownload} leftSection={<DownloadIcon size={16} />}>Download</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default DownloadModal;
