import { admin } from '@/lib/supabase/admin';
import { markPaid, reviewWinner } from '@/lib/actions/admin';
import { fmtMonth, money } from '@/lib/format';
import Flash from '@/components/Flash';

export const dynamic = 'force-dynamic';

export default async function WinnersAdmin({ searchParams }: { searchParams: any }) {
  const db = admin();
  const rows = (await db.from('winners').select('*, profiles(full_name,email), draws(draw_month)').order('created_at', { ascending: false })).data || [];
  // short-lived signed links so admins can open the private screenshots
  const links: Record<string, string> = {};
  await Promise.all(rows.filter((w) => w.proof_path).map(async (w) => {
    const { data } = await db.storage.from('proofs').createSignedUrl(w.proof_path, 600);
    if (data?.signedUrl) links[w.id] = data.signedUrl;
  }));
  const tone: Record<string, string> = { awaiting_proof: 'bg-sun/40', submitted: 'bg-bloom/15 text-bloom-dark', approved: 'bg-lagoon/15 text-lagoon-dark', rejected: 'bg-red-100 text-red-700' };

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Winners</h1>
      <div className="mt-5"><Flash sp={searchParams} /></div>
      <div className="card overflow-x-auto p-2">
        <table className="w-full min-w-[820px]">
          <thead><tr className="border-b border-plum/10"><th className="th">Winner</th><th className="th">Draw</th><th className="th">Match</th><th className="th">Prize</th><th className="th">Proof</th><th className="th">Verification</th><th className="th">Payout</th></tr></thead>
          <tbody>
            {rows.map((w: any) => (
              <tr key={w.id} className="border-b border-plum/5">
                <td className="td"><p className="font-medium">{w.profiles?.full_name || '—'}</p><p className="text-xs text-plum/55">{w.profiles?.email}</p></td>
                <td className="td">{fmtMonth(w.draws?.draw_month)}</td>
                <td className="td">{w.match_count}</td>
                <td className="td font-semibold">{money(w.prize_amount)}</td>
                <td className="td">{links[w.id] ? <a href={links[w.id]} target="_blank" rel="noreferrer" className="font-semibold text-bloom">View</a> : <span className="text-plum/45">None</span>}</td>
                <td className="td">
                  <span className={`badge ${tone[w.verification_status]}`}>{w.verification_status.replace('_', ' ')}</span>
                  {w.verification_status === 'submitted' && (
                    <form action={reviewWinner} className="mt-2 flex gap-2"><input type="hidden" name="id" value={w.id} />
                      <button name="decision" value="approve" className="btn btn-dark btn-sm">Approve</button>
                      <button name="decision" value="reject" className="btn btn-danger btn-sm">Reject</button></form>
                  )}
                </td>
                <td className="td">
                  {w.payment_status === 'paid' ? <span className="badge bg-lagoon/15 text-lagoon-dark">Paid</span> : w.verification_status === 'approved' ? (
                    <form action={markPaid}><input type="hidden" name="id" value={w.id} /><button className="btn btn-primary btn-sm">Mark as paid</button></form>
                  ) : <span className="badge bg-plum/10">Pending</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="td text-center text-plum/60">No winners yet. They appear here once a draw is published.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
