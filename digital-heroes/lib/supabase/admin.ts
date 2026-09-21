import { createClient } from '@supabase/supabase-js';

/** Service-role client. SERVER ONLY – bypasses RLS. Always check the caller's role first. */
export function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
