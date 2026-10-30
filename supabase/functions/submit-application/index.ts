
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    // 1. Authenticate the student
    const authorization = req.headers.get('Authorization');

    if (!authorization) {
      return json({ error: 'Authentication required.' }, 401);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !anonKey || !serviceKey) {
      throw new Error('Server configuration is incomplete.');
    }

    const userClient = createClient(url, anonKey, {
      global: {
        headers: { Authorization: authorization },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return json({ error: 'Invalid session.' }, 401);
    }

    const admin = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 2. Read only the job and position IDs from the request
    const { job_id, position_id } = await req.json();

    if (!job_id || !position_id) {
      return json({
        error: 'Job and position are required.',
      }, 400);
    }

    // 3. Retrieve the authenticated student's profile
    const { data: student, error: studentError } = await admin
      .from('student_profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (studentError) throw studentError;

    if (!student) {
      return json({ error: 'Student profile not found.' }, 403);
    }

    // 4. Retrieve the student's academic record
    const { data: academic, error: academicError } = await admin
      .from('student_academic_records')
      .select('*')
      .eq('student_id', student.id)
      .maybeSingle();

    if (academicError) throw academicError;

    if (!academic) {
      return json({
        error: 'Your academic record is incomplete. Contact the Placement Cell.',
      }, 400);
    }

    // 5. Retrieve the published job and its positions
    const { data: job, error: jobError } = await admin
      .from('jobs')
      .select('*, job_positions(*)')
      .eq('id', job_id)
      .eq('status', 'published')
      .maybeSingle();

    if (jobError) throw jobError;

    if (!job) {
      return json({
        error: 'This opening is not available.',
      }, 404);
    }

    // 6. Check application deadline
    if (job.deadline) {
      const deadline = new Date(`${job.deadline}T23:59:59`);
      
      if (deadline < new Date()) {
        return json({
          error: 'The application deadline has passed.',
        }, 400);
      }
    }

    // 7. Validate selected position
    const validPosition = (job.job_positions || []).some(
      (position: { id: string }) => position.id === position_id
    );

    if (!validPosition) {
      return json({
        error: 'Please select a valid position.',
      }, 400);
    }

    // 8. Check graduation stream eligibility
    const { data: streams, error: streamError } = await admin
      .from('job_streams')
      .select('stream_name')
      .eq('job_id', job_id);

    if (streamError) throw streamError;

    if (
      streams?.length &&
      !streams.some(
        (stream: { stream_name: string }) =>
          stream.stream_name.trim().toLowerCase() ===
          student.graduation_stream.trim().toLowerCase()
      )
    ) {
      return json({
        error: 'Your graduation stream is not eligible for this opening.',
      }, 400);
    }

    // 9. Retrieve eligibility criteria
    const { data: criteria, error: criteriaError } = await admin
      .from('eligibility_criteria')
      .select('*')
      .eq('job_id', job_id);

    if (criteriaError) throw criteriaError;

    // Map qualification names to the actual academic columns
    const academicValues: Record<string, number | null> = {
      '10th': academic.tenth_percentage,
      '12th': academic.twelfth_percentage,
      graduation: academic.graduation_marks,
      mba_fy: academic.mba_fy_cgpa,
    };

    // 10. Validate each eligibility requirement
    for (const criterion of criteria || []) {
      const qualification = criterion.qualification;
      const studentMarks = academicValues[qualification];

      if (studentMarks === null || studentMarks === undefined) {
        return json({
          error: `Your ${qualification} academic record is incomplete.`,
        }, 400);
      }

      // Graduation percentage and CGPA must use matching formats
      if (
        qualification === 'graduation' &&
        criterion.marks_type &&
        criterion.marks_type !== academic.graduation_marks_type
      ) {
        return json({
          error: 'Your graduation marks type does not match the required format.',
        }, 400);
      }

      if (Number(studentMarks) < Number(criterion.minimum_value)) {
        return json({
          error: `You do not meet the minimum ${qualification} eligibility requirement.`,
        }, 400);
      }
    }

    // 11. Insert application
    // student_id is always taken from the authenticated profile.
    // status and timestamps use their database defaults.
    const { data: application, error: applicationError } = await admin
      .from('applications')
      .insert({
        job_id,
        student_id: student.id,
        position_id,
        eligibility_status: 'eligible',
        application_status: 'submitted',
      })
      .select('id')
      .single();

    if (applicationError) {
      if (applicationError.code === '23505') {
        return json({
          error: 'You have already applied for this opening.',
        }, 409);
      }

      throw applicationError;
    }

    return json({
      success: true,
      message: 'Application submitted successfully.',
      application_id: application.id,
    });

  } catch (error) {
    console.error('Application submission error:', error);

    return json({
      error: error instanceof Error
        ? error.message
        : 'Unable to submit application.',
    }, 500);
  }
});
