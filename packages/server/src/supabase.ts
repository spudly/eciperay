import {createClient} from '@supabase/supabase-js';

/* c8 ignore next 2 */
const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
const supabaseServiceRoleKey = process.env['SUPABASE_SECRET_KEY'] ?? '';

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {persistSession: false},
});
