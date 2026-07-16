import React, { useState, useEffect } from 'react';
import {
  Paper, TextInput, Textarea, Button, Group, FileInput, Box, Text,
  Stepper, Modal, LoadingOverlay, Select, Title, SimpleGrid, ActionIcon,
  Image, Badge, Avatar, ScrollArea, Divider, Stack,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { UploadIcon, SendIcon, ClockIcon, SaveIcon, XIcon, SparklesIcon, CopyIcon } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/useAuth';
import { useUserRole } from '../auth/UserContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PlatformSelector from './PlatformSelector';
import WhatsappFlow from './flows/WhatsappFlow';
import EmailFlow from './flows/EmailFlow';
import SocialMediaFlow from './flows/SocialMediaFlow';
import ProjectMediaModal from './ProjectMediaModal';
import CampaignResultModal from './CampaignResultModal';
import type { CampaignResult } from './CampaignResultModal';

const CampaignForm: React.FC = () => {
  const { user } = useAuth();
  const { currentOrgId } = useUserRole();
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const location = useLocation();

  const [activeStep, setActiveStep] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [existingMedia, setExistingMedia] = useState<string[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [platformData, setPlatformData] = useState<Record<string, Record<string, any>>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [campaignResult, setCampaignResult] = useState<CampaignResult | null>(null);

  const [groups, setGroups] = useState<{ value: string; label: string }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const selectedClientIds: string[] = [];
  const [groupClients, setGroupClients] = useState<{ name: string; email?: string; phone?: string; country?: string }[]>([]);
  const [localMediaPreviewUrls, setLocalMediaPreviewUrls] = useState<string[]>([]);
  const [socialCaptions, setSocialCaptions] = useState<Record<string, string>>({});
  const [waApplyError, setWaApplyError] = useState<string | null>(null);

  // Handle imported design from Dashboard
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = location.state as any;
    if (state?.importedDesign) {
      const { title: designTitle, thumbnail } = state.importedDesign;
      if (!title && designTitle) setTitle(designTitle);
      if (thumbnail) {
        setExistingMedia(prev => {
          if (prev.includes(thumbnail)) return prev;
          return [...prev, thumbnail];
        });
      }
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchTargets = async () => {
      if (!user) return;
      const { data: gData } = await supabase.from('groups').select('id, name').eq('user_id', user.id);
      if (gData) setGroups(gData.map(g => ({ value: g.id, label: g.name })));
    };
    fetchTargets();
  }, [currentOrgId, user]);

  useEffect(() => {
    const fetchGroupClients = async () => {
      if (!selectedGroupId) { setGroupClients([]); return; }
      const { data: cg } = await supabase
        .from('client_groups')
        .select('client_id')
        .eq('group_id', selectedGroupId);
      if (!cg || cg.length === 0) { setGroupClients([]); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ids = cg.map((r: any) => r.client_id).filter(Boolean);
      const { data } = await supabase
        .from('clients')
        .select('name, email, phone, country')
        .in('id', ids);
      if (data) setGroupClients(data);
    };
    fetchGroupClients();
  }, [selectedGroupId]);

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setLocalMediaPreviewUrls(urls);
    return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [files]);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId || !user) return;
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      if (error) {
        console.error('Error fetching campaign:', error);
        alert('Could not load campaign.');
      } else if (data) {
        setTitle(data.title);
        setContent(data.content || '');
        setSelectedPlatforms(data.platforms || []);
        if (data.scheduled_date) setScheduledDate(new Date(data.scheduled_date));
        if (data.platform_data) {
          setPlatformData(data.platform_data);
          if (data.platform_data.target_group_id) setSelectedGroupId(data.platform_data.target_group_id);
          if (Array.isArray(data.platform_data.media)) setExistingMedia(data.platform_data.media);
        }
      }
      setIsSubmitting(false);
    };
    fetchCampaign();
  }, [campaignId, user]);

  const handleFileChange = (newFiles: File[]) => { setFiles([...files, ...newFiles]); };
  const removeFile = (index: number) => { setFiles(files.filter((_, i) => i !== index)); };
  const removeExistingMedia = (index: number) => { setExistingMedia(existingMedia.filter((_, i) => i !== index)); };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });

  const getAudienceContext = async (): Promise<string> => {
    if (!selectedGroupId) return 'General Global Audience (English)';
    const { data: cg } = await supabase
      .from('client_groups')
      .select('client_id')
      .eq('group_id', selectedGroupId)
      .limit(5);
    if (!cg || cg.length === 0) return 'General Global Audience';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cgIds = cg.map((r: any) => r.client_id).filter(Boolean);
    const { data } = await supabase
      .from('clients')
      .select('country')
      .in('id', cgIds)
      .limit(5);
    if (!data || data.length === 0) return 'General Global Audience';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countries = data.map((d: any) => d.country).filter(Boolean);
    if (countries.length === 0) return 'General Global Audience';
    return `Target Audience Location: ${countries[0]}. The content MUST be in the official language of ${countries[0]}.`;
  };

  const handleGenerateContent = async () => {
    if (files.length === 0) { alert('Please upload an image first so the AI can analyze it!'); return; }
    const imageToAnalyze = await fileToBase64(files[0]);
    setIsGeneratingAI(true);
    try {
      const audienceContext = await getAudienceContext();
      const { data, error } = await supabase.functions.invoke('generate-caption', {
        body: { imageBase64: imageToAnalyze, context: audienceContext, currentTitle: title, currentContent: content },
      });
      if (error) throw error;
      if (data) {
        if (data.title) setTitle(data.title);
        if (data.content) setContent(data.content);
      }
    } catch (error: unknown) {
      console.error('AI Generation failed:', error);
      alert('AI Error: ' + (error instanceof Error ? error.message : 'Failed to generate content.'));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getClientsFromGroup = async (groupId: string) => {
    const { data: cg, error } = await supabase
      .from('client_groups')
      .select('client_id')
      .eq('group_id', groupId);
    if (error || !cg || cg.length === 0) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = cg.map((r: any) => r.client_id).filter(Boolean);
    const { data } = await supabase
      .from('clients')
      .select('phone, email')
      .in('id', ids);
    return data || [];
  };

  const getSpecificClients = async (clientIds: string[]) => {
    if (clientIds.length === 0) return [];
    const { data, error } = await supabase.from('clients').select('phone, email').in('id', clientIds);
    if (error || !data) return [];
    return data;
  };

  type ClientRecord = { phone?: string | null; email?: string | null };

  const getRecipientsForPlatform = async (groupId: string | null, platformType: 'phone' | 'email' | 'messenger'): Promise<string[]> => {
    let combinedClients: ClientRecord[] = [];
    if (groupId) combinedClients = [...combinedClients, ...await getClientsFromGroup(groupId)];
    if (selectedClientIds.length > 0) combinedClients = [...combinedClients, ...await getSpecificClients(selectedClientIds)];

    if (combinedClients.length > 0) {
      let targets: string[];
      if (platformType === 'phone') {
        targets = combinedClients.map(c => c?.phone).filter((p): p is string => !!p).map(p => p.replace(/\D/g, ''));
      } else {
        targets = combinedClients.map(c => c?.email).filter((e): e is string => !!e);
      }
      return Array.from(new Set(targets));
    }

    const typeLabel = platformType === 'phone' ? 'Phone Numbers' : 'Emails';
    const input = prompt(`Enter ${typeLabel} (comma separated):`);
    if (input) return input.split(',').map(s => s.trim()).filter(s => s.length > 5);
    return [];
  };

  const scheduleSocialPost = async (finalMediaList: string[], currentCampaignId: string) => {
    const platformsToPost = selectedPlatforms.filter(p => ['facebook', 'instagram'].includes(p));
    if (platformsToPost.length === 0) return;
    for (const p of platformsToPost) {
      const row = {
        campaign_id: currentCampaignId,
        organization_id: currentOrgId,
        content: socialCaptions[p] || content,
        platforms: [p],
        media_urls: finalMediaList,
        status: 'scheduling',
      };
      const { data: inserted, error } = await supabase.from('social_posts').insert(row).select().single();
      if (error) throw error;
      if (inserted) {
        await supabase.functions.invoke('send-social', { body: { record: inserted } });
      }
    }
  };

  const scheduleWhatsappMessage = async (numbers: string[], finalMediaList: string[], currentCampaignId: string) => {
    if (numbers.length === 0) return;
    const metadata = {
      campaign_id: currentCampaignId, title, content,
      template_name: platformData.whatsapp?.template_name,
      template_language: platformData.whatsapp?.template_language,
      param_count: platformData.whatsapp?.template_param_count,
      params: platformData.whatsapp?.params,
    };
    const waCta = platformData.whatsapp?.ctaLink ? `\n\n${platformData.whatsapp.ctaLink}` : '';
    for (const num of numbers) {
      const row = {
        campaign_id: currentCampaignId,
        organization_id: currentOrgId,
        phone: num,
        message: `*${title}*\n\n${content}${waCta}`,
        status: 'scheduling',
        media_urls: finalMediaList,
        metadata,
      };
      const { data: inserted, error } = await supabase.from('whatsapp_outbox').insert(row).select().single();
      if (error) throw error;
      if (inserted) {
        await supabase.functions.invoke('send-whatsapp', { body: { record: inserted } });
      }
    }
  };

  const sendEmail = async (currentCampaignId: string, forceImmediate = false, mediaUrls: string[] = []) => {
    let recipients: string[] = [];
    let combinedClients: ClientRecord[] = [];
    if (selectedGroupId) combinedClients = [...combinedClients, ...await getClientsFromGroup(selectedGroupId)];
    if (selectedClientIds.length > 0) combinedClients = [...combinedClients, ...await getSpecificClients(selectedClientIds)];
    if (combinedClients.length > 0) {
      recipients = Array.from(new Set(combinedClients.map(c => c?.email).filter((e): e is string => !!e)));
    } else {
      const testEmail = prompt('Enter a test email address:');
      if (testEmail) recipients = [testEmail];
    }
    if (recipients.length === 0) { alert('No valid emails found.'); return; }

    try {
      const emailConfig = platformData.email || {};
      let scheduledAtISO: string | undefined;
      if (!forceImmediate && scheduledDate) {
        const dateObj = new Date(scheduledDate);
        const maxDate = new Date(Date.now() + 72 * 60 * 60 * 1000);
        if (dateObj > maxDate) { alert('Error: Resend Free Tier limit is 72 hours.'); throw new Error('Date limit'); }
        scheduledAtISO = dateObj.toISOString();
      }

      const ctaUrl = (content || '').match(/https?:\/\/[^\s<]+/i)?.[0] || null;
      const linkifiedContent = (content || '')
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">$1</a>')
        .replace(/\n/g, '<br/>');
      const ctaLabel = (platformData.email?.ctaLabel || 'View Campaign').toString().trim() || 'View Campaign';
      const ctaButtonHtml = ctaUrl
        ? `<div style="margin:28px 0 20px;text-align:center;"><a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">${ctaLabel}</a></div>`
        : '';
      const mediaImagesHtml = mediaUrls.length > 0
        ? mediaUrls.map(url => `<div style="margin:16px 0;"><img src="${url}" alt="Campaign Image" style="max-width:100%;border-radius:8px;display:block;" /></div>`).join('')
        : '';
      const emailHtml = `<div style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto;">${title ? `<h2 style="color:#111;margin-bottom:12px;">${title}</h2>` : ''}${mediaImagesHtml}<p style="line-height:1.7;margin-bottom:24px;">${linkifiedContent}</p>${ctaButtonHtml}<hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/><p style="font-size:12px;color:#aaa;">Sent via Markivo Campaign Manager</p></div>`;

      for (const email of recipients) {
        const payload = {
          to: email,
          subject: emailConfig.subject || title || 'New Campaign',
          html: emailHtml,
          scheduledAt: scheduledAtISO,
          organizationId: currentOrgId,
          campaignId: currentCampaignId,
        };
        const { data: resultData, error: invokeError } = await supabase.functions.invoke('send-email', { body: payload });
        if (invokeError) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const body = (invokeError as any).context?.body;
          let detail = invokeError.message;
          if (body) {
            try { detail = JSON.parse(body)?.error || detail; } catch { detail = body; }
          }
          throw new Error(detail);
        }
        if (resultData?.error) throw new Error(resultData.error);
      }
    } catch (error: unknown) {
      console.error('Email failed:', error);
      alert('Failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const uploadFilesToStorage = async (): Promise<string[]> => {
    if (files.length === 0) return [];
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('campaign-media').upload(filePath, file);
      if (uploadError) {
        if (uploadError.message?.toLowerCase().includes('bucket')) {
          throw new Error('Storage bucket "campaign-media" not found. Please create it in Supabase Dashboard → Storage.');
        }
        throw new Error(`Media upload failed: ${uploadError.message}`);
      }
      const { data } = supabase.storage.from('campaign-media').getPublicUrl(filePath);
      if (data) uploadedUrls.push(data.publicUrl);
    }
    return uploadedUrls;
  };

  const upsertCampaignHistory = async (status: string, finalMediaList: string[]): Promise<string | null> => {
    if (!user) return null;
    const campaignData = {
      user_id: user.id,
      organization_id: currentOrgId,
      title, content,
      platforms: selectedPlatforms,
      status,
      scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      platform_data: { ...platformData, target_group_id: selectedGroupId, media: finalMediaList },
    };
    if (campaignId) {
      const { error } = await supabase.from('marketing_campaigns').update(campaignData).eq('id', campaignId);
      if (error) throw error;
      return campaignId;
    } else {
      const { data, error } = await supabase.from('marketing_campaigns').insert(campaignData).select('id').single();
      if (error) throw error;
      return data?.id || null;
    }
  };

  const handleSubmit = async (action: 'immediate' | 'schedule' | 'draft') => {
    if (action === 'draft') {
      if (!title) { alert('Title is required for draft.'); return; }
      setIsSubmitting(true);
      try {
        const newUploadedUrls = await uploadFilesToStorage();
        await upsertCampaignHistory('draft', [...existingMedia, ...newUploadedUrls]);
      } finally { setIsSubmitting(false); }
      setCampaignResult({ type: 'draft', platforms: selectedPlatforms });
      return;
    }
    if (action === 'schedule' && !scheduledDate) { alert('Please select a date.'); return; }

    setIsSubmitting(true);
    try {
      const newUploadedUrls = await uploadFilesToStorage();
      const finalMediaList = [...existingMedia, ...newUploadedUrls];
      const statusToSave = action === 'immediate' ? 'sent' : 'scheduled';
      const currentCampaignId = await upsertCampaignHistory(statusToSave, finalMediaList);
      if (!currentCampaignId) throw new Error('Failed to create campaign record.');

      if (selectedPlatforms.includes('whatsapp')) {
        const waData = platformData.whatsapp || {};
        const recipientMode = waData.recipientMode || 'All';
        let numbers: string[] = [];
        if (recipientMode === 'Manual') {
          numbers = (waData.manualNumbers || '').split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 5);
        } else {
          numbers = await getRecipientsForPlatform(selectedGroupId, 'phone');
        }
        if (numbers.length > 0) await scheduleWhatsappMessage(numbers, finalMediaList, currentCampaignId);
      }

      const isSocialSelected = selectedPlatforms.some(p => ['facebook', 'instagram'].includes(p));
      if (isSocialSelected) await scheduleSocialPost(finalMediaList, currentCampaignId);

      if (selectedPlatforms.includes('email')) await sendEmail(currentCampaignId, action === 'immediate', finalMediaList);

      if (action === 'schedule' && selectedPlatforms.includes('email') && scheduledDate) {
        if (new Date(scheduledDate).getTime() <= Date.now() + 60_000) {
          await supabase.from('marketing_campaigns').update({ status: 'sent' }).eq('id', currentCampaignId).eq('status', 'scheduled');
        }
      }

      setCampaignResult({
        type: action === 'immediate' ? 'sent' : 'scheduled',
        platforms: selectedPlatforms,
        scheduledAt: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
      });
    } catch (error: unknown) {
      console.error('Campaign Failed:', error);
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      setCampaignResult({ type: 'error', errorMessage: msg });
      try {
        const newUploadedUrls = await uploadFilesToStorage();
        await upsertCampaignHistory('failed', [...existingMedia, ...newUploadedUrls]);
      } catch (saveErr) { console.error('Failed to persist failed campaign state:', saveErr); }
    }
    setIsSubmitting(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlatformDataChange = (platform: string, data: Record<string, any>) => {
    setPlatformData(prev => ({ ...prev, [platform]: data }));
  };

  const isStepCompleted = (step: number) => {
    if (step === 0) return selectedPlatforms.length > 0;
    if (step === 1) return title.trim() !== '';
    return true;
  };

  const handleStepClick = (step: number) => { if (step < activeStep) setActiveStep(step); };

  const applyContentToPlatforms = () => {
    const updated: Record<string, string> = { ...socialCaptions };
    if (selectedPlatforms.includes('instagram')) {
      updated['instagram'] = title ? `${title}\n\n${content}` : content;
    }
    if (selectedPlatforms.includes('facebook')) {
      updated['facebook'] = title ? `${title}\n\n${content}` : content;
    }
    setSocialCaptions(updated);

    if (selectedPlatforms.includes('whatsapp')) {
      const paramCount = platformData.whatsapp?.template_param_count || 0;
      if (paramCount > 2) {
        setWaApplyError('Template has more than 2 variables — please fill them manually.');
      } else if (paramCount > 0) {
        setWaApplyError(null);
        const params: string[] = [];
        if (paramCount >= 1) params[0] = title;
        if (paramCount >= 2) params[1] = content;
        handlePlatformDataChange('whatsapp', { ...platformData.whatsapp, params });
      } else {
        setWaApplyError(null);
      }
    } else {
      setWaApplyError(null);
    }
  };

  const renderFlow = () => {
    const flows = [];
    if (selectedPlatforms.includes('whatsapp')) {
      flows.push(
        <WhatsappFlow key="whatsapp" data={platformData.whatsapp || {}} onChange={data => handlePlatformDataChange('whatsapp', data)}
          title={title} content={content} previewMediaUrls={[...existingMedia, ...localMediaPreviewUrls]} />
      );
    }
    if (selectedPlatforms.includes('email')) {
      flows.push(
        <EmailFlow key="email" data={platformData.email || {}} onChange={data => handlePlatformDataChange('email', data)}
          title={title} content={content} orgId={currentOrgId || ''} />
      );
    }
    if (selectedPlatforms.some(p => ['facebook', 'instagram', 'twitter', 'linkedin'].includes(p))) {
      flows.push(
        <SocialMediaFlow
          key="social"
          selectedPlatforms={selectedPlatforms}
          onGenerateAI={() => handleGenerateContent()}
          captions={socialCaptions}
          onCaptionChange={(platform, value) => setSocialCaptions(prev => ({ ...prev, [platform]: value }))}
        />
      );
    }
    if (flows.length === 0) return <Text>Please select a platform.</Text>;
    return flows;
  };

  const nextStep = () => setActiveStep(current => (current < 2 ? current + 1 : current));
  const prevStep = () => setActiveStep(current => (current > 0 ? current - 1 : current));

  return (
    <>
      <CampaignResultModal
        result={campaignResult}
        onClose={() => setCampaignResult(null)}
        onGoToManager={() => { setCampaignResult(null); navigate('/campaign-manager'); }}
        onRetry={() => setCampaignResult(null)}
      />

      <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)} title="Choose from Project" size="xl">
        <ProjectMediaModal onSelect={(selectedFiles: File[]) => { setFiles([...files, ...selectedFiles]); setIsModalOpen(false); }} />
      </Modal>

      <Paper shadow="sm" p="xl" mb="xl" pos="relative">
        <LoadingOverlay visible={isSubmitting} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />
        <Stepper
          active={activeStep}
          onStepClick={handleStepClick}
          styles={{ stepDescription: { color: 'var(--mantine-color-gray-7)' } }}
        >
          <Stepper.Step label="Platform" description="Channels" />
          <Stepper.Step label="Campaign" description="Content" />
          <Stepper.Step label="Schedule" description="Finish" />
        </Stepper>

        <Box mt="xl">
          {/* Step 0 — Platform selection */}
          {activeStep === 0 && (
            <PlatformSelector selectedPlatforms={selectedPlatforms} onChange={setSelectedPlatforms} />
          )}

          {/* Step 1 — Campaign content + audience + platform context */}
          {activeStep === 1 && (
            <Stack gap="md">
              {/* Row 1: Campaign Name + AI Generate */}
              <Box>
                <Group justify="space-between" align="flex-end" mb={4}>
                  <Text size="sm" fw={500}>Campaign Name <span style={{ color: 'var(--mantine-color-red-6)' }}>*</span></Text>
                  <Button
                    variant="gradient"
                    gradient={{ from: 'indigo', to: 'cyan' }}
                    leftSection={<SparklesIcon size={16} />}
                    onClick={handleGenerateContent}
                    loading={isGeneratingAI}
                    size="xs"
                  >
                    {(title || content) ? 'Refine with AI' : 'Auto-fill with AI'}
                  </Button>
                </Group>
                <TextInput
                  placeholder="e.g. Summer Sale Campaign 2024"
                  value={title}
                  onChange={e => setTitle(e.currentTarget.value)}
                  required
                />
              </Box>

              {/* Row 2: Content textarea */}
              <Textarea
                label="Content"
                placeholder="Write your engaging caption here..."
                value={content}
                onChange={e => setContent(e.currentTarget.value)}
                minRows={4}
                required
              />

              {/* Row 3: Media upload */}
              <Box>
                <Text size="sm" fw={500} mb="xs">Media</Text>
                <Group>
                  <FileInput
                    placeholder="Upload files"
                    multiple
                    leftSection={<UploadIcon size={16} />}
                    onChange={newFiles => newFiles && handleFileChange(newFiles)}
                    style={{ flex: 1 }}
                    value={files}
                  />
                  <Button onClick={() => setIsModalOpen(true)}>Project</Button>
                </Group>

                {(files.length > 0 || existingMedia.length > 0) && (
                  <SimpleGrid cols={{ base: 3, sm: 4 }} mt="md">
                    {existingMedia.map((url, index) => (
                      <Box key={`exist-${index}`} pos="relative">
                        <Image src={url} h={120} fit="cover" radius="md" />
                        <ActionIcon color="red" variant="filled" size="sm" pos="absolute" top={5} right={5} onClick={() => removeExistingMedia(index)}>
                          <XIcon size={12} />
                        </ActionIcon>
                        <Text size="xs" c="dimmed" mt={4} ta="center">Saved</Text>
                      </Box>
                    ))}
                    {files.map((file, index) => (
                      <Box key={`new-${index}`} pos="relative">
                        <Image src={URL.createObjectURL(file)} h={120} fit="cover" radius="md" />
                        <ActionIcon color="red" variant="filled" size="sm" pos="absolute" top={5} right={5} onClick={() => removeFile(index)}>
                          <XIcon size={12} />
                        </ActionIcon>
                        <Text size="xs" lineClamp={1} mt={4} ta="center">{file.name}</Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </Box>

              {/* Row 4: Target Audience Group */}
              <Box>
                <Title order={5} mb="sm">Select Target Audience Group</Title>
                <Select
                  label="Audience Group"
                  placeholder="Select group to broadcast to"
                  data={groups}
                  value={selectedGroupId}
                  onChange={setSelectedGroupId}
                  clearable
                  w={{ base: '100%', sm: 400 }}
                  mb="sm"
                />

                {selectedGroupId && (
                  <Box mb="sm">
                    {groupClients.length > 0 ? (
                      <>
                        <Group gap="xs" mb="xs">
                          <Badge color="blue" variant="light" size="sm">{groupClients.length} contacts in group</Badge>
                        </Group>
                        <ScrollArea h={groupClients.length > 5 ? 180 : undefined} type="auto">
                          <Stack gap={6}>
                            {groupClients.map((c, i) => (
                              <Group key={i} gap="xs" p={6} style={{ borderRadius: 6, background: '#f8f9fa' }}>
                                <Avatar size="xs" radius="xl" color="blue">{c.name?.[0]?.toUpperCase() || '?'}</Avatar>
                                <Box style={{ flex: 1, minWidth: 0 }}>
                                  <Text size="xs" fw={500} truncate>{c.name}</Text>
                                  {c.email ? <Text size="xs" c="dimmed" truncate>{c.email}</Text> : null}
                                  {c.phone ? <Text size="xs" c="dimmed">{c.phone}</Text> : null}
                                  {c.country ? <Text size="xs" c="dimmed">Country: {c.country}</Text> : null}
                                </Box>
                              </Group>
                            ))}
                          </Stack>
                        </ScrollArea>
                      </>
                    ) : (
                      <Text size="xs" c="dimmed">No contacts found in this group.</Text>
                    )}
                  </Box>
                )}
              </Box>

              {/* Row 5: Platform Context */}
              <Box>
                <Divider mb="md" />
                <Group justify="space-between" align="center" mb={waApplyError ? 4 : 'md'}>
                  <Title order={5}>Platform Context</Title>
                  {selectedPlatforms.some(p => ['facebook', 'instagram', 'whatsapp'].includes(p)) && (title || content) && (
                    <Button
                      size="xs"
                      variant="light"
                      color="violet"
                      leftSection={<CopyIcon size={13} />}
                      onClick={applyContentToPlatforms}
                    >
                      Apply to all platforms
                    </Button>
                  )}
                </Group>
                {waApplyError && (
                  <Text size="xs" c="red" mb="sm">{waApplyError}</Text>
                )}
                {renderFlow()}
              </Box>
            </Stack>
          )}

          {/* Step 2 — Schedule */}
          {activeStep === 2 && (
            <Box>
              <Text mb="sm">Pick a date to schedule, or use "Post Now".</Text>
              <DateTimePicker
                label="Schedule"
                placeholder="Pick a date and time"
                value={scheduledDate}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(value: any) => setScheduledDate(value)}
                minDate={new Date()}
                clearable
              />
            </Box>
          )}
        </Box>

        <Group justify="flex-end" mt="xl">
          {activeStep > 0 && <Button variant="default" onClick={prevStep}>Back</Button>}
          {activeStep < 2 && <Button onClick={nextStep} disabled={!isStepCompleted(activeStep)}>Next</Button>}
          {activeStep === 2 && (
            <Group>
              <Button variant="subtle" leftSection={<SaveIcon size={16} />} onClick={() => handleSubmit('draft')}>Save Draft</Button>
              <Button variant="light" color="blue" leftSection={<SendIcon size={16} />} onClick={() => handleSubmit('immediate')}>Post Now</Button>
              <Button leftSection={<ClockIcon size={16} />} onClick={() => handleSubmit('schedule')} color="blue" disabled={!scheduledDate}>Schedule</Button>
            </Group>
          )}
        </Group>
      </Paper>
    </>
  );
};

export default CampaignForm;
