import Link from 'next/link';
import { admin } from '@/lib/supabase/admin';
import { subscription } from '@/lib/auth';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Users({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || '').trim();
  let query = admin().from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
  if (q) query = query.or(`email.ilike.%${q.replace(/[,()]/g, '')}%,full_name.ilike.%${q.replace(/[,()]/g, '')}%`);
  const users = (await query).data || [];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Users</h1>
        <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search name or email" className="input w-64" aria-label="Search users" /><button className="btn btn-dark">Search</button></form>
      </div>
      <div className="card mt-6 overflow-x-auto p-2">
        <table className="w-full min-w-[640px]">
          <thead><tr className="border-b border-plum/10"><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th">Subscription</th><th className="th">Joined</th><th className="th"></th></tr></thead>
          <tbody>
            {users.map((u) => {
              const s = subscription(u);
              return (
                <tr key={u.id} className="border-b border-plum/5">
                  <td className="td font-medium">{u.full_name || '—'}</td><td className="td">{u.email}</td>
                  <td className="td">{u.role}</td>
                  <td className="td"><span className={`badge ${s.active ? 'bg-lagoon/15 text-lagoon-dark' : 'bg-plum/10'}`}>{s.label}</span> <span className="text-xs text-plum/55">{u.plan}</span></td>
                  <td className="td">{fmtDate(u.created_at)}</td>
                  <td className="td text-right"><Link href={`/admin/users/${u.id}`} className="btn btn-ghost btn-sm">Manage</Link></td>
                </tr>
              );
            })}
            {users.length === 0 && <tr><td colSpan={6} className="td text-center text-plum/60">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
