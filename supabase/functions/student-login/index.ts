
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

async function createDobHash(
  prn: string,
  dob: string,
  secret: string
) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${prn}|${dob}`)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const { prn, dob } = await req.json();

    const normalizedPRN = String(prn || '').trim().toUpperCase();

    if (
      !normalizedPRN ||
      typeof dob !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dob)
    ) {
      return json({
        error: 'Please enter a valid PRN and date of birth.',
      }, 400);
    }

    const secret = Deno.env.get('DOB_HASH_SECRET');
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!secret || !url || !serviceKey) {
      throw new Error('Server configuration is incomplete.');
    }

    const admin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find the registered PRN and its DOB hash.
    const { data: record, error: lookupError } = await admin
      .from('approved_prns')
      .select('dob_verification_hash')
      .eq('prn', normalizedPRN)
      .eq('is_registered', true)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (!record?.dob_verification_hash) {
      return json({
        error: 'Invalid PRN or date of birth.',
      }, 401);
    }

    // Verify the submitted DOB.
    const submittedHash = await createDobHash(
      normalizedPRN,
      dob,
      secret
    );

    if (!safeEqual(submittedHash, record.dob_verification_hash)) {
      return json({
        error: 'Invalid PRN or date of birth.',
      }, 401);
    }

    // Find the student's registered email.
    const { data: profile, error: profileError } = await admin
      .from('student_profiles')
      .select('email')
      .eq('prn', normalizedPRN)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile?.email) {
      return json({
        error: 'Student account not found.',
      }, 404);
    }

    // Generate a magic-link token without sending an email.
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.email,
      });

    if (linkError) throw linkError;

    const tokenHash = linkData.properties?.hashed_token;

    if (!tokenHash) {
      throw new Error('Unable to establish login session.');
    }

    return json({
      success: true,
      token_hash: tokenHash,
      email: profile.email,
    });

  } catch (error) {
    console.error('Student login error:', error);

    return json({
      error: 'Unable to log in. Please try again.',
    }, 500);
  }
});
