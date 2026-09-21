/** Shows the ?msg= / ?error= banner set by server actions. */
export default function Flash({ sp }: { sp?: { msg?: string; error?: string } }) {
  if (!sp?.msg && !sp?.error) return null;
  const bad = !!sp.error;
  return (
    <div role={bad ? 'alert' : 'status'} className={`mb-6 animate-fadeIn rounded-xl px-4 py-3 text-sm font-medium ${bad ? 'bg-red-50 text-red-800 ring-1 ring-red-200' : 'bg-lagoon/10 text-lagoon-dark ring-1 ring-lagoon/30'}`}>
      {sp.error || sp.msg}
    </div>
  );
}
