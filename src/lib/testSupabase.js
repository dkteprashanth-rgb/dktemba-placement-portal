import { supabase } from './supabase';

export async function testSupabaseConnection() {
  try {
    if (!supabase) {
      console.error('Supabase is not configured.');
      return false;
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase connection failed:', error);
      return false;
    }

    console.log('Supabase connection successful!');
    console.log('Jobs returned:', data);

    return true;
  } catch (error) {
    console.error('Unexpected Supabase error:', error);
    return false;
  }
}