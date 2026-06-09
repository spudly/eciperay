import {createClient} from '@supabase/supabase-js';

/* c8 ignore next 2 -- env vars read at module load; routes mock supabase client */
const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
const supabaseServiceRoleKey = process.env['SUPABASE_SECRET_KEY'] ?? '';

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {persistSession: false},
});
