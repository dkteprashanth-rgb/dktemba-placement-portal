
import { supabase } from './supabase';

// Check whether Supabase is configured
export async function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Check your .env.local file.'
    );
  }
}

// Get the currently logged-in session
export async function getSession() {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  return data.session;
}

// Get the profile of the currently logged-in student
export async function getMyProfile() {
  await requireSupabase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase
    .from('student_profiles')
    .select(`
      *,
      student_academic_records(*)
    `)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

// Get all published job openings
export async function getPublishedJobs() {
  await requireSupabase();

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      job_positions(*),
      eligibility_criteria(*)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

// Get applications of the currently logged-in student
// RLS must restrict this query to the authenticated student's records.
export async function getMyApplications() {
  await requireSupabase();

  const { data, error } = await supabase
    .from('applications')
    .select(`
      id,
      status,
      created_at,
      job:jobs(company_name, opening_title),
      position:job_positions(position_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}
