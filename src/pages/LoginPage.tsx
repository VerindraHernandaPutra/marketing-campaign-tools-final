import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import {
  Button, TextInput, PasswordInput, Paper, Title,
  Text, Stack, Box, ThemeIcon, Divider,
} from '@mantine/core';
import { Megaphone } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signInWithEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signInWithEmail(email, password);
    if (signInError) {
      setError(signInError.message);
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <Box style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a4e 40%, #24243e 70%, #302b63 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative glow blobs */}
      <Box style={{ position: 'absolute', top: '-120px', right: '-120px', width: '450px', height: '450px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.18)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <Box style={{ position: 'absolute', bottom: '-120px', left: '-120px', width: '450px', height: '450px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.18)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <Box style={{ position: 'absolute', top: '40%', left: '30%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(79, 70, 229, 0.08)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <Paper shadow="xl" p={44} radius="xl" style={{
        width: '100%', maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.25)',
        position: 'relative', zIndex: 1,
      }}>
        <Stack align="center" gap="xs" mb="lg">
          <ThemeIcon size={68} radius="xl" variant="gradient"
            gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
            style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}>
            <Megaphone size={32} />
          </ThemeIcon>
          <Title order={1} ta="center" style={{
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', marginTop: '4px',
          }}>
            Marketing Campaign Platform
          </Title>
          <Text size="sm" c="dimmed" ta="center" lh={1.4}>
            Integrated AI-Powered Marketing Campaign Management
          </Text>
        </Stack>

        <Divider mb="xl" labelPosition="center"
          label={<Text size="xs" c="dimmed" fw={500}>Sign in to your account</Text>}
        />

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput label="Email" placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.currentTarget.value)}
              required size="md" radius="md" />
            <PasswordInput label="Password" placeholder="Your password"
              value={password} onChange={(e) => setPassword(e.currentTarget.value)}
              required size="md" radius="md" />
            {error && (
              <Text id="login-error" role="alert" c="red" size="sm" ta="center">{error}</Text>
            )}
            <Button type="submit" fullWidth size="md" radius="md" loading={loading}
              variant="gradient" gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
              mt="xs" style={{ boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
              Sign In
            </Button>
          </Stack>
        </form>

        <Text size="xs" c="dimmed" ta="center" mt="xl">
          © 2025 Marketing Campaign Platform · Verindra Hernanda Putra
        </Text>
      </Paper>
    </Box>
  );
};
