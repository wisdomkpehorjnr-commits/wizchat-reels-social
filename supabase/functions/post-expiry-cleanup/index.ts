import { authenticateCronRequest } from '../_shared/cron-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const authFailure = authenticateCronRequest(req)
  if (authFailure) return authFailure

  try {
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const { data: result, error: rpcError } = await supabase.rpc('delete_expired_posts')
    if (rpcError) throw new Error(rpcError.message)

    return Response.json({ ok: true, deleted: result ?? 0 })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 500 },
    )
  }
})
