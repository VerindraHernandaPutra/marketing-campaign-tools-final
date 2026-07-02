import React, { useState } from 'react';
import { Paper, Text, Box, UnstyledButton, ThemeIcon, Loader } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/useAuth';

interface CreateNewCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  width?: number;
  height?: number;
  onClick?: () => void;
}

interface ProjectPayload {
  title: string;
  user_id: string;
  canvas_data: {
    version: string;
    width: number;
    height: number;
    objects: Record<string, unknown>[];
    backgroundColor: string;
  };
}

const CreateNewCard: React.FC<CreateNewCardProps> = ({ icon, title, description, width, height, onClick }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNew = async () => {
    if (onClick) { onClick(); return; }
    if (!user) return;
    setIsCreating(true);
    try {
      const payload: ProjectPayload = {
        title: title === 'Custom Size' ? 'Untitled Project' : title,
        user_id: user.id,
        canvas_data: {
          version: '5.3.0',
          width: width || 850,
          height: height || 500,
          objects: [],
          backgroundColor: '#ffffff'
        }
      };
      const { data, error } = await supabase.from('projects').insert(payload).select('id').single();
      if (error) throw error;
      if (data) navigate(`/editor/${data.id}`);
    } catch (error: unknown) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <UnstyledButton onClick={handleCreateNew} disabled={isCreating} style={{ width: '100%' }}>
      <Paper
        shadow="xs"
        p="sm"
        radius="md"
        withBorder
        style={{
          height: 90,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <ThemeIcon size={48} radius="xl" variant="light" color="blue" style={{ flexShrink: 0 }}>
          {isCreating ? <Loader size="sm" /> : icon}
        </ThemeIcon>
        <Box>
          <Text fw={600} size="sm">{title}</Text>
          <Text size="xs" c="dimmed" mt={2}>{description}</Text>
        </Box>
      </Paper>
    </UnstyledButton>
  );
};

export default CreateNewCard;
