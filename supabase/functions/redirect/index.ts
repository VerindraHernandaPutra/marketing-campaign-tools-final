import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  const url = new URL(req.url);
  const clickId = url.searchParams.get('id');

  if (!clickId) {
    return new Response('Missing link ID', { status: 400 });
  }

  const { data: linkRecord, error } = await supabase
    .from('link_clicks')
    .select('*')
    .eq('id', clickId)
    .single();

  if (error || !linkRecord) {
    console.error("Link not found or error:", error);
    return new Response('Link not found', { status: 404 });
  }

  const { error: updateError } = await supabase
    .from('link_clicks')
    .update({ clicks: linkRecord.clicks + 1 })
    .eq('id', clickId);

  if (updateError) {
      console.error("Failed to increment click metric:", updateError);
  } else {
      console.log(`Successfully recorded click for Campaign: ${linkRecord.campaign_id}, Platform: ${linkRecord.platform}`);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: linkRecord.original_url,
    },
  });
});
