import React, { useState, useEffect } from 'react';
import {
  Container, Title, Paper, TextInput, Button,
  Avatar, Group, Text, LoadingOverlay, Box
} from '@mantine/core';
import { UserIcon, SaveIcon } from 'lucide-react';
import DashboardHeader from '../shared/DashboardHeader';
import DashboardSidebar from '../shared/DashboardSidebar';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/useAuth';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const getProfile = async () => {
      if (!user) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Error loading user data:', error.message);
      } else if (data) {
        setUsername(data.username || '');
      }
      setLoading(false);
    };

    getProfile();
  }, [user]);

  const updateProfile = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert(error.message);
    } else {
      alert('Profile updated successfully!');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      <DashboardSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <DashboardHeader />
        <Box style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <Container size="sm">
            <Title order={2} mb="xl">Profile Settings</Title>

            <Paper shadow="sm" p="xl" withBorder pos="relative">
              <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />

              <Group mb="xl">
                <Avatar size={80} radius={80} color="blue">
                  <UserIcon size={40} />
                </Avatar>
                <div>
                  <Text size="lg" fw={600}>{username || 'User'}</Text>
                  <Text c="dimmed" size="sm">{user?.email}</Text>
                </div>
              </Group>

              <TextInput
                label="Email"
                value={user?.email || ''}
                disabled
                mb="md"
                description="Your email address cannot be changed."
              />

              <TextInput
                label="Username"
                placeholder="Enter your display name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                mb="xl"
              />

              <Group justify="flex-end">
                <Button
                  leftSection={<SaveIcon size={16} />}
                  onClick={updateProfile}
                  color="blue"
                >
                  Save Changes
                </Button>
              </Group>
            </Paper>
          </Container>
        </Box>
      </div>
    </div>
  );
};

export default Profile;
