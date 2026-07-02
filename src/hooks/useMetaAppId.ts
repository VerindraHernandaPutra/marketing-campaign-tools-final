import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useUserRole } from '../auth/UserContext';

export function useMetaAppId() {
  const { currentOrgId } = useUserRole();
  const [metaAppId, setMetaAppId] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [savedAppId, setSavedAppId] = useState('');
  const [savedAppSecret, setSavedAppSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAppId = useCallback(async () => {
    if (!currentOrgId) return;
    setLoading(true);
    const { data } = await supabase
      .from('organization_integrations')
      .select('provider_account_id, access_token')
      .eq('organization_id', currentOrgId)
      .eq('platform', 'meta_app')
      .maybeSingle();
    const id = data?.provider_account_id || '';
    const secret = data?.access_token || '';
    setMetaAppId(id);
    setSavedAppId(id);
    setMetaAppSecret(secret);
    setSavedAppSecret(secret);
    setLoading(false);
  }, [currentOrgId]);

  useEffect(() => { fetchAppId(); }, [fetchAppId]);

  const saveAppId = async (id: string, secret: string) => {
    if (!currentOrgId || !id.trim() || !secret.trim()) return false;
    setSaving(true);
    const { error } = await supabase
      .from('organization_integrations')
      .upsert({
        organization_id: currentOrgId,
        platform: 'meta_app',
        provider_account_id: id.trim(),
        access_token: secret.trim(),
        status: 'active',
      }, { onConflict: 'organization_id, platform, provider_account_id' });
    setSaving(false);
    if (!error) {
      setSavedAppId(id.trim());
      setSavedAppSecret(secret.trim());
      return true;
    }
    return false;
  };

  return { metaAppId, setMetaAppId, metaAppSecret, setMetaAppSecret, savedAppId, savedAppSecret, loading, saving, saveAppId };
}
