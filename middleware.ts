import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refreshes the Supabase session cookie and gates private areas.
export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await sb.auth.getUser();

  const p = req.nextUrl.pathname;
  const isPrivate = p.startsWith('/dashboard') || p.startsWith('/admin') || p.startsWith('/subscribe');
  if (!user && isPrivate) {
    const u = req.nextUrl.clone();
    u.pathname = '/login';
    u.search = '';
    return NextResponse.redirect(u);
  }
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/stripe).*)'] };
