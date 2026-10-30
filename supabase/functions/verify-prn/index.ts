
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed.' }),
        { status: 405, headers }
      );
    }

    const { prn } = await req.json();

    if (!prn || typeof prn !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Please enter your PRN.' }),
        { status: 400, headers }
      );
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await admin
      .from('approved_prns')
      .select('is_registered')
      .eq('prn', prn.trim().toUpperCase())
      .maybeSingle();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        verified: Boolean(data && !data.is_registered),
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('PRN verification error:', error);

    return new Response(
      JSON.stringify({
        error: 'Unable to verify PRN. Please try again.',
      }),
      { status: 500, headers }
    );
  }
});
