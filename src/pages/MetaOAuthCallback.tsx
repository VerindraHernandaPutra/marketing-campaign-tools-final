import React, { useEffect, useMemo, useState } from 'react';
import { Box, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Module-level flag — survives StrictMode unmount/remount so code is only exchanged once
let oauthExchanged = false;

const MetaOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Completing Meta connection...');

  const code = useMemo(() => searchParams.get('code') || '', [searchParams]);
  const state = useMemo(() => searchParams.get('state') || '', [searchParams]);

  useEffect(() => {
    if (oauthExchanged) return;
    oauthExchanged = true;

    const finishOAuth = async () => {
      if (!code || !state) {
        setStatus('error');
        setMessage('Missing OAuth callback parameters. Please reconnect from Integrations page.');
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/integrations/meta-callback`;

        const { data, error } = await supabase.functions.invoke('meta-oauth', {
          body: { code, state, redirectUri },
        });

        if (error) {
          let message = error.message;
          try {
            const body = await (error as any).context?.json?.();
            if (body?.error) message = body.error;
          } catch {}
          throw new Error(message);
        }
        if (data?.error) {
          throw new Error(data.error);
        }

        const sourcePlatform = String(data?.sourcePlatform || 'messenger');
        navigate(`/integrations/${sourcePlatform}?success=true`, { replace: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'OAuth callback failed';
        setStatus('error');
        setMessage(msg);
      }
    };

    finishOAuth();
  }, [code, state, navigate]);

  return (
    <Box maw={680} mx="auto" mt={80} px="md">
      <Paper withBorder radius="md" p="xl">
        <Stack align="center" gap="sm">
          <Loader color={status === 'error' ? 'red' : 'blue'} />
          <Title order={4}>
            {status === 'error' ? 'Meta Connection Failed' : 'Connecting Meta Account'}
          </Title>
          <Text c="dimmed" ta="center">{message}</Text>
        </Stack>
      </Paper>
    </Box>
  );
};

export default MetaOAuthCallback;
