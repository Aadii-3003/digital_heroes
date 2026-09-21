import Link from 'next/link';
import { signIn } from '@/lib/actions/auth';
import Flash from '@/components/Flash';

export default function Login({ searchParams }: { searchParams: any }) {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-4xl font-extrabold">Welcome back</h1>
      <p className="mt-2 text-plum/70">Log in to manage your scores, charity and winnings.</p>
      <div className="mt-6"><Flash sp={searchParams} /></div>
      <form action={signIn} className="card space-y-4">
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" /></div>
        <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className="input" /></div>
        <button className="btn btn-primary w-full">Log in</button>
      </form>
      <p className="mt-5 text-center text-sm text-plum/70">New here? <Link href="/signup" className="font-semibold text-bloom">Create an account</Link></p>
    </div>
  );
}
