import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { signOut } from '@/lib/actions/auth';

export default async function Nav() {
  const p = process.env.NEXT_PUBLIC_SUPABASE_URL ? await getProfile().catch(() => null) : null;
  const links = [
    { href: '/charities', label: 'Charities' },
    { href: '/draws', label: 'How the draw works' },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-plum/10 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
          digital<span className="text-bloom">heroes</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-plum/70 transition hover:text-plum">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {p ? (
            <>
              <Link href={p.role === 'admin' ? '/admin' : '/dashboard'} className="btn btn-ghost btn-sm">
                {p.role === 'admin' ? 'Admin' : 'Dashboard'}
              </Link>
              <form action={signOut}>
                <button className="btn btn-sm text-plum/70 hover:text-plum">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm text-plum/80 hover:text-plum">Log in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Subscribe</Link>
            </>
          )}
        </div>
        <details className="relative md:hidden">
          <summary className="btn btn-ghost btn-sm cursor-pointer list-none">Menu</summary>
          <div className="absolute right-0 mt-2 flex w-56 flex-col gap-1 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-plum/10">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">{l.label}</Link>
            ))}
            {p ? (
              <>
                <Link href={p.role === 'admin' ? '/admin' : '/dashboard'} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">{p.role === 'admin' ? 'Admin' : 'Dashboard'}</Link>
                <form action={signOut}><button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-paper">Log out</button></form>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-paper">Log in</Link>
                <Link href="/signup" className="btn btn-primary mt-1">Subscribe</Link>
              </>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
