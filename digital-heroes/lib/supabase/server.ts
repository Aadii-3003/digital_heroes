import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Session-aware client (acts as the logged-in user, RLS applies). */
export function createClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component – middleware refreshes the session instead */
        }
      },
    },
  });
}
