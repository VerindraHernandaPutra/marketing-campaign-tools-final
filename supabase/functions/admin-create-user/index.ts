import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserBody {
  email: string;
  password?: string;
  fullName: string;
  organizationId: string;
  role: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, fullName, organizationId, role } = await req.json() as CreateUserBody

    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || undefined,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (createError) throw createError
    if (!user.user) throw new Error("Failed to create user object")

    await new Promise(r => setTimeout(r, 1000));

    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: user.user.id,
        role: role,
        status: 'active'
      })

    if (memberError) {
      await new Promise(r => setTimeout(r, 1000));
      const { error: retryError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: user.user.id,
          role: role,
          status: 'active'
        })
      if (retryError) throw retryError;
    }

    return new Response(
      JSON.stringify({ user: user.user, message: "User created and assigned!" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
