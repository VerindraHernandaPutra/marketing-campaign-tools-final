import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Flex, Paper, Text, Avatar, Group, ScrollArea,
  TextInput, ActionIcon, UnstyledButton, Badge, Select,
  Loader, FileButton, CloseButton, Modal, Alert, Button, Tooltip
} from '@mantine/core';
import {
  SendIcon, SearchIcon, MessageCircleIcon,
  InstagramIcon, FacebookIcon, PaperclipIcon, ArrowLeftIcon, PhoneIcon,
  WifiOffIcon, RefreshCwIcon, AlertCircleIcon
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../auth/UserContext';
import PageShell from '../../shared/PageShell';

interface Conversation {
  id: string;
  platform: string;
  external_contact_id: string;
  contact_name: string | null;
  unread_count: number;
  last_message_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'contact' | 'agent' | 'system';
  content: string;
  media_url: string | null;
  created_at: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return `+${digits}`;
  return phone;
}

const PLATFORM_COLOR: Record<string, string> = {
  whatsapp: '#25D366',
  messenger: '#00B2FF',
  instagram: '#E4405F',
};

export default function Inbox() {
  const { currentOrgId } = useUserRole();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastPreviews, setLastPreviews] = useState<Record<string, string>>({});
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingRetry, setPendingRetry] = useState<{ text: string; mediaUrl: string | null } | null>(null);

  const resetRef = useRef<() => void>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeConvoRef = useRef<Conversation | null>(null);
  useEffect(() => { activeConvoRef.current = activeConvo; }, [activeConvo]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        const el = scrollRef.current.querySelector('[data-scroll-anchor]');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 80);
  }, []);

  const fetchLastPreviews = useCallback(async (convIds: string[]) => {
    if (convIds.length === 0) return;
    const { data } = await supabase
      .from('messages')
      .select('conversation_id, content, sender_type, media_url')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
      .limit(300);

    if (!data) return;
    const map: Record<string, string> = {};
    for (const msg of data) {
      if (!map[msg.conversation_id]) {
        const prefix = msg.sender_type === 'agent' ? 'You: ' : '';
        const text = msg.content || (msg.media_url ? '📎 Media' : '');
        map[msg.conversation_id] = prefix + text;
      }
    }
    setLastPreviews(map);
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!currentOrgId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', currentOrgId)
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      setConversations(data as Conversation[]);
      fetchLastPreviews(data.map((c: Conversation) => c.id));
    }
    setIsLoading(false);
  }, [currentOrgId, fetchLastPreviews]);

  const fetchMessages = useCallback(async (convoId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
      scrollToBottom();
    }
  }, [scrollToBottom]);

  useEffect(() => {
    if (!currentOrgId) return;
    fetchConversations();

    setRealtimeStatus('connecting');

    const convoSub = supabase
      .channel('inbox-conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `organization_id=eq.${currentOrgId}`,
      }, () => {
        fetchConversations();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('disconnected');
      });

    const msgSub = supabase
      .channel('inbox-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMsg = payload.new as Message;
        const current = activeConvoRef.current;

        if (current && newMsg.conversation_id === current.id) {
          setMessages(prev =>
            prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]
          );
          scrollToBottom();
        }

        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(convoSub);
      supabase.removeChannel(msgSub);
    };
  }, [currentOrgId, fetchConversations, scrollToBottom]);

  const openConversation = useCallback(async (convo: Conversation) => {
    setActiveConvo(convo);
    fetchMessages(convo.id);

    if (convo.unread_count > 0) {
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', convo.id);
      setConversations(prev =>
        prev.map(c => c.id === convo.id ? { ...c, unread_count: 0 } : c)
      );
    }
  }, [fetchMessages]);

  const handleSendMessage = async (retryPayload?: { text: string; mediaUrl: string | null }) => {
    if (!activeConvo) return;
    const textToSend = retryPayload?.text ?? inputText.trim();
    const mediaToSend = retryPayload?.mediaUrl ?? null;
    if (!textToSend && !file && !mediaToSend) return;

    setIsSending(true);
    setSendError(null);
    setPendingRetry(null);

    let uploadedMediaUrl: string | null = mediaToSend;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Upload file if present and no URL yet (handles both first attempt and retry after failed upload)
      if (file && !uploadedMediaUrl) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentOrgId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, file);
        if (uploadError) throw new Error('Upload failed: ' + uploadError.message);
        const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
        uploadedMediaUrl = urlData.publicUrl;
      }

      console.log('[send-chat-message] payload:', { conversationId: activeConvo.id, content: textToSend, mediaUrl: uploadedMediaUrl });

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-chat-message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ conversationId: activeConvo.id, content: textToSend, mediaUrl: uploadedMediaUrl }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengirim pesan');
      }

      setInputText('');
      setFile(null);
      resetRef.current?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setSendError(msg);
      setPendingRetry({ text: textToSend, mediaUrl: uploadedMediaUrl ?? mediaToSend });
    } finally {
      setIsSending(false);
    }
  };

  const getPlatformIcon = (platform: string, size = 16) => {
    if (platform === 'whatsapp') return <MessageCircleIcon size={size} color={PLATFORM_COLOR.whatsapp} />;
    if (platform === 'messenger') return <FacebookIcon size={size} color={PLATFORM_COLOR.messenger} />;
    if (platform === 'instagram') return <InstagramIcon size={size} color={PLATFORM_COLOR.instagram} />;
    return <MessageCircleIcon size={size} />;
  };

  const filteredConvos = conversations.filter(c => {
    const matchChannel = channelFilter ? c.platform === channelFilter : true;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (c.contact_name || '').toLowerCase().includes(q) ||
      c.external_contact_id.toLowerCase().includes(q);
    return matchChannel && matchSearch;
  });

  return (
    <PageShell noPadding>
      <Paper shadow="none" h="100%" radius={0} style={{ overflow: 'hidden' }}>
        <Flex h="100%">

          {/* ─── LEFT: Conversation List ─── */}
          <Box
            w={{ base: '100%', sm: 320 }}
            style={{ borderRight: '1px solid #e9ecef', display: 'flex', flexDirection: 'column' }}
            display={{ base: activeConvo ? ('none' as const) : ('flex' as const), sm: 'flex' as const }}
          >
            <Box p="md" pb={0}>
              <Group justify="space-between" mb="sm">
                <Text fw={700} size="lg">Omnichannel Inbox</Text>
                <Tooltip label={
                  realtimeStatus === 'connected' ? 'Realtime terhubung' :
                  realtimeStatus === 'disconnected' ? 'Koneksi terputus — klik untuk reconnect' :
                  'Menghubungkan...'
                }>
                  <ActionIcon
                    variant="subtle"
                    color={realtimeStatus === 'connected' ? 'green' : realtimeStatus === 'disconnected' ? 'red' : 'yellow'}
                    size="sm"
                    onClick={realtimeStatus === 'disconnected' ? () => { setRealtimeStatus('connecting'); fetchConversations(); } : undefined}
                  >
                    {realtimeStatus === 'disconnected'
                      ? <WifiOffIcon size={14} />
                      : <RefreshCwIcon size={14} style={{ animation: realtimeStatus === 'connecting' ? 'spin 1s linear infinite' : 'none' }} />
                    }
                  </ActionIcon>
                </Tooltip>
              </Group>
              {realtimeStatus === 'disconnected' && (
                <Alert color="red" variant="light" icon={<WifiOffIcon size={14} />} mb="xs" p="xs">
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs">Koneksi realtime terputus</Text>
                    <Button size="xs" color="red" variant="subtle" leftSection={<RefreshCwIcon size={12} />}
                      onClick={() => { setRealtimeStatus('connecting'); fetchConversations(); }}>
                      Reconnect
                    </Button>
                  </Group>
                </Alert>
              )}

              <Select
                data={[
                  { value: '', label: 'All Channels' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'messenger', label: 'Messenger' },
                ]}
                value={channelFilter ?? ''}
                onChange={val => setChannelFilter(val === '' ? null : val)}
                placeholder="All Channels"
                mb="xs"
                size="sm"
              />

              <TextInput
                placeholder="Search by name or number..."
                leftSection={<SearchIcon size={14} />}
                mb="sm"
                size="sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.currentTarget.value)}
              />
            </Box>

            <ScrollArea style={{ flex: 1 }} px="sm" pb="sm">
              {isLoading ? (
                <Loader size="sm" mt="xl" mx="auto" display="block" />
              ) : filteredConvos.length === 0 ? (
                <Text c="dimmed" ta="center" mt="xl" size="sm">No conversations found</Text>
              ) : (
                filteredConvos.map(convo => {
                  const isActive = activeConvo?.id === convo.id;
                  const platformColor = PLATFORM_COLOR[convo.platform] || '#888';
                  const preview = lastPreviews[convo.id] || '';

                  return (
                    <UnstyledButton
                      key={convo.id}
                      w="100%"
                      p="sm"
                      mb={2}
                      style={{
                        borderRadius: 8,
                        backgroundColor: isActive ? '#eff6ff' : 'transparent',
                        borderLeft: isActive ? `3px solid #3b82f6` : '3px solid transparent',
                        transition: 'all 0.15s',
                      }}
                      onClick={() => openConversation(convo)}
                    >
                      <Group wrap="nowrap" gap="sm">
                        <Avatar radius="xl" size="md" style={{ background: `${platformColor}22`, flexShrink: 0 }}>
                          {getPlatformIcon(convo.platform, 18)}
                        </Avatar>
                        <Box style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                          <Group justify="space-between" wrap="nowrap" gap={4}>
                            <Text size="sm" fw={convo.unread_count > 0 ? 700 : 600} truncate style={{ flex: 1 }}>
                              {convo.contact_name || formatPhoneNumber(convo.external_contact_id)}
                            </Text>
                            <Text size="10px" c="dimmed" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                              {formatRelativeTime(convo.last_message_at)}
                            </Text>
                          </Group>

                          {convo.platform === 'whatsapp' && convo.contact_name && (
                            <Text size="xs" c="dimmed" truncate style={{ lineHeight: 1.3 }}>
                              {formatPhoneNumber(convo.external_contact_id)}
                            </Text>
                          )}

                          <Group justify="space-between" wrap="nowrap" gap={4} mt={1}>
                            <Text size="xs" c="dimmed" truncate style={{ flex: 1, lineHeight: 1.3 }}>
                              {preview || <span style={{ color: '#aaa', fontStyle: 'italic' }}>No messages yet</span>}
                            </Text>
                            {convo.unread_count > 0 && (
                              <Badge color="green" size="xs" circle style={{ flexShrink: 0 }}>
                                {convo.unread_count}
                              </Badge>
                            )}
                          </Group>
                        </Box>
                      </Group>
                    </UnstyledButton>
                  );
                })
              )}
            </ScrollArea>
          </Box>

          {/* ─── RIGHT: Chat Thread ─── */}
          <Box
            style={{ flex: 1, flexDirection: 'column', backgroundColor: '#f9fafb', minWidth: 0 }}
            display={{ base: activeConvo ? ('flex' as const) : ('none' as const), sm: 'flex' as const }}
          >
            {!activeConvo ? (
              <Flex direction="column" align="center" justify="center" h="100%" c="dimmed">
                <MessageCircleIcon size={48} opacity={0.15} style={{ marginBottom: 16 }} />
                <Text size="lg" fw={500}>Select a conversation</Text>
                <Text size="sm">Choose a chat from the left to start replying</Text>
              </Flex>
            ) : (
              <>
                {/* Header */}
                <Paper p="sm" shadow="xs" radius={0} style={{ zIndex: 10, borderBottom: '1px solid #e9ecef' }}>
                  <Group gap="sm">
                    <ActionIcon hiddenFrom="sm" onClick={() => setActiveConvo(null)} variant="subtle">
                      <ArrowLeftIcon size={20} />
                    </ActionIcon>
                    <Avatar size="md" radius="xl" style={{ background: `${PLATFORM_COLOR[activeConvo.platform] || '#888'}22` }}>
                      {getPlatformIcon(activeConvo.platform, 20)}
                    </Avatar>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={600} truncate>
                        {activeConvo.contact_name || formatPhoneNumber(activeConvo.external_contact_id)}
                      </Text>
                      <Group gap={6} wrap="nowrap">
                        {activeConvo.platform === 'whatsapp' && (
                          <>
                            <PhoneIcon size={11} color="#888" />
                            <Text size="xs" c="dimmed">
                              {formatPhoneNumber(activeConvo.external_contact_id)}
                            </Text>
                            <Text size="xs" c="dimmed">·</Text>
                          </>
                        )}
                        {getPlatformIcon(activeConvo.platform, 11)}
                        <Text size="xs" c="dimmed" style={{ textTransform: 'capitalize' }}>
                          {activeConvo.platform}
                        </Text>
                      </Group>
                    </Box>
                  </Group>
                </Paper>

                {/* Messages */}
                <ScrollArea style={{ flex: 1, padding: '16px' }} viewportRef={scrollRef}>
                  <Flex direction="column" gap="xs" p="sm">
                    {messages.map((msg, idx) => {
                      const isAgent = msg.sender_type === 'agent' || msg.sender_type === 'system';
                      const showTime = idx === messages.length - 1 ||
                        new Date(messages[idx + 1]?.created_at).getTime() - new Date(msg.created_at).getTime() > 5 * 60 * 1000;

                      return (
                        <Flex key={msg.id} direction="column" align={isAgent ? 'flex-end' : 'flex-start'}>
                          <Paper
                            p="10px 14px"
                            radius="xl"
                            style={{
                              maxWidth: '72%',
                              backgroundColor: isAgent ? '#2563eb' : '#ffffff',
                              color: isAgent ? 'white' : '#111',
                              borderBottomRightRadius: isAgent ? 4 : undefined,
                              borderBottomLeftRadius: !isAgent ? 4 : undefined,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            }}
                          >
                            {msg.media_url && (
                              <img
                                src={msg.media_url}
                                alt="attachment"
                                onClick={() => setPreviewImage(msg.media_url)}
                                style={{
                                  maxWidth: '100%', maxHeight: 220,
                                  objectFit: 'cover', borderRadius: 8,
                                  marginBottom: msg.content ? 6 : 0,
                                  cursor: 'pointer',
                                }}
                              />
                            )}
                            {msg.content && (
                              <Text size="sm" style={{ wordBreak: 'break-word', lineHeight: 1.5 }}>
                                {msg.content}
                              </Text>
                            )}
                            {showTime && (
                              <Text size="10px" style={{ opacity: 0.6 }} ta={isAgent ? 'right' : 'left'} mt={3}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            )}
                          </Paper>
                        </Flex>
                      );
                    })}
                    <div data-scroll-anchor />
                  </Flex>
                </ScrollArea>

                {/* File Preview */}
                {file && (
                  <Box px="md" py="xs" style={{ borderTop: '1px solid #eee', backgroundColor: 'white' }}>
                    <Badge
                      color="blue"
                      variant="light"
                      size="lg"
                      rightSection={
                        <CloseButton size="xs" onClick={() => { setFile(null); resetRef.current?.(); }} />
                      }
                    >
                      {file.name}
                    </Badge>
                  </Box>
                )}

                {/* Send Error + Retry */}
                {sendError && pendingRetry && (
                  <Alert
                    color="red" variant="light" icon={<AlertCircleIcon size={14} />}
                    p="xs" style={{ borderRadius: 0, borderTop: '1px solid #fecaca' }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="xs" c="red">{sendError}</Text>
                      <Group gap="xs">
                        <Button size="xs" color="red" variant="subtle"
                          onClick={() => { setSendError(null); setPendingRetry(null); }}>
                          Batal
                        </Button>
                        <Button size="xs" color="red" variant="light"
                          leftSection={<RefreshCwIcon size={12} />}
                          loading={isSending}
                          onClick={() => handleSendMessage(pendingRetry)}>
                          Kirim Ulang
                        </Button>
                      </Group>
                    </Group>
                  </Alert>
                )}

                {/* Compose */}
                <Paper p="sm" shadow="xs" radius={0} style={{ borderTop: '1px solid #e9ecef' }}>
                  <Group wrap="nowrap" gap="xs">
                    <FileButton resetRef={resetRef} onChange={setFile} accept="image/png,image/jpeg,image/webp">
                      {(props) => (
                        <ActionIcon variant="subtle" size="lg" color={file ? 'blue' : 'gray'} {...props}>
                          <PaperclipIcon size={18} />
                        </ActionIcon>
                      )}
                    </FileButton>

                    <TextInput
                      style={{ flex: 1 }}
                      placeholder="Type a message..."
                      value={inputText}
                      onChange={e => setInputText(e.currentTarget.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      autoFocus
                      radius="xl"
                    />

                    <ActionIcon
                      variant="filled"
                      color="blue"
                      size="lg"
                      radius="xl"
                      onClick={() => handleSendMessage()}
                      loading={isSending}
                      disabled={!inputText.trim() && !file}
                    >
                      <SendIcon size={16} />
                    </ActionIcon>
                  </Group>
                </Paper>
              </>
            )}
          </Box>
        </Flex>
      </Paper>

      {/* Image Preview Modal */}
      <Modal
        opened={!!previewImage}
        onClose={() => setPreviewImage(null)}
        size="auto"
        centered
        withCloseButton={false}
        styles={{ content: { backgroundColor: 'transparent', boxShadow: 'none' } }}
      >
        <img
          src={previewImage || ''}
          alt="Preview"
          style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
        />
      </Modal>
    </PageShell>
  );
}
