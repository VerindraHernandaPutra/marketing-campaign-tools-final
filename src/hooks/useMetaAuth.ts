import { useCallback } from 'react';
import { useUserRole } from '../auth/UserContext';
import { useNotification } from '../notifications/NotificationContext';

const REDIRECT_URI = `${window.location.origin}/integrations/meta-callback`;

export function useMetaAuth(sourcePlatform: 'instagram' | 'messenger', metaAppId: string) {
  const { currentOrgId } = useUserRole();
  const notify = useNotification();

  const handleConnectFacebook = useCallback(() => {
    if (!metaAppId) {
      notify.error('Meta App ID Belum Dikonfigurasi', 'Masukkan Meta App ID terlebih dahulu sebelum menghubungkan akun.');
      return;
    }

    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_content_publish',
      'pages_messaging',
      'business_management',
    ].join(',');

    const returnTo = encodeURIComponent(window.location.origin);
    const statePayload = `${currentOrgId}|${sourcePlatform}|${returnTo}`;
    const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(statePayload)}&auth_type=rerequest&return_scopes=true`;

    window.location.href = oauthUrl;
  }, [currentOrgId, sourcePlatform, notify, metaAppId]);

  return { handleConnectFacebook };
}
