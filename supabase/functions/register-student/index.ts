
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

async function createDobHash(prn: string, dob: string, secret: string) {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  let createdUserId: string | null = null;

  try {
    const body = await req.json();

    const {
      prn,
      dob,
      email,
      password,
      name,
      mobile,
      address,
      stream,
      tenth,
      twelfth,
      graduation,
      graduation_type,
      graduation_max_cgpa,
      mba_fy,
    } = body;

    const normalizedPRN = String(prn || '').trim().toUpperCase();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (
      !normalizedPRN ||
      !dob ||
      !normalizedEmail ||
      !password ||
      !name ||
      !mobile ||
      !address ||
      !stream ||
      tenth === '' || tenth == null ||
      twelfth === '' || twelfth == null ||
      graduation === '' || graduation == null ||
      !graduation_type ||
      mba_fy === '' || mba_fy == null
    ) {
      return json({ error: 'Please complete all required fields.' }, 400);
    }

    if (password.length < 8) {
      return json({
        error: 'Password must contain at least 8 characters.',
      }, 400);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return json({ error: 'Please enter a valid date of birth.' }, 400);
    }

    if (!['percentage', 'cgpa'].includes(graduation_type)) {
      return json({ error: 'Invalid graduation marks type.' }, 400);
    }

    const tenthValue = Number(tenth);
    const twelfthValue = Number(twelfth);
    const graduationValue = Number(graduation);
    const mbaValue = Number(mba_fy);
    const maxCgpa = graduation_max_cgpa == null || graduation_max_cgpa === ''
      ? null
      : Number(graduation_max_cgpa);

    if (
      !Number.isFinite(tenthValue) ||
      tenthValue < 0 || tenthValue > 100 ||
      !Number.isFinite(twelfthValue) ||
      twelfthValue < 0 || twelfthValue > 100 ||
      !Number.isFinite(graduationValue) ||
      graduationValue < 0 ||
      !Number.isFinite(mbaValue) ||
      mbaValue < 0
    ) {
      return json({ error: 'Please check your academic marks.' }, 400);
    }

    if (
      graduation_type === 'percentage' &&
      graduationValue > 100
    ) {
      return json({
        error: 'Graduation percentage cannot exceed 100.',
      }, 400);
    }

    if (
      graduation_type === 'cgpa' &&
      (
        maxCgpa === null ||
        !Number.isFinite(maxCgpa) ||
        maxCgpa <= 0 ||
        graduationValue > maxCgpa
      )
    ) {
      return json({
        error: 'For graduation CGPA, provide the maximum CGPA scale and a valid CGPA.',
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

    // Verify that the PRN is approved and unused.
    const { data: approved, error: prnError } = await admin
      .from('approved_prns')
      .select('is_registered')
      .eq('prn', normalizedPRN)
      .maybeSingle();

    if (prnError) throw prnError;

    if (!approved || approved.is_registered) {
      return json({
        error: 'This PRN is invalid or has already been registered.',
      }, 400);
    }

    // Generate a server-side HMAC of PRN and DOB.
    const dobHash = await createDobHash(
      normalizedPRN,
      dob,
      secret
    );

    // Create the Supabase Auth account.
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'student',
        },
      });

    if (createError) throw createError;

    createdUserId = created.user.id;

    // Create the student profile and academic record.
    // The SQL function also atomically claims the PRN.
    const { error: claimError } = await admin.rpc(
      'claim_student_prn',
      {
        p_prn: normalizedPRN,
        p_auth_user_id: createdUserId,
        p_dob_hash: dobHash,

        p_profile: {
          full_name: name.trim(),
          mobile: mobile.trim(),
          email: normalizedEmail,
          address: address.trim(),
          graduation_stream: stream,
        },

        p_academic: {
          tenth_percentage: String(tenthValue),
          twelfth_percentage: String(twelfthValue),
          graduation_marks: String(graduationValue),
          graduation_marks_type: graduation_type,
          graduation_max_cgpa: maxCgpa === null
            ? ''
            : String(maxCgpa),
          mba_fy_cgpa: String(mbaValue),
        },
      }
    );

    if (claimError) throw claimError;

    return json({
      success: true,
      message: 'Registration successful. You can now sign in.',
    });

  } catch (error) {
    console.error('Student registration error:', error);

    // Remove the Auth account if database registration failed.
    if (createdUserId) {
      const url = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (url && serviceKey) {
        const admin = createClient(url, serviceKey);
        const { error: deleteError } =
          await admin.auth.admin.deleteUser(createdUserId);

        if (deleteError) {
          console.error('Auth cleanup error:', deleteError);
        }
      }
    }

    return json({
      error: error instanceof Error
        ? error.message
        : 'Registration failed. Please try again.',
    }, 400);
  }
});
