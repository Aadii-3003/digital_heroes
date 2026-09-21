import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TABS = [
  ['/admin', 'Reports'],
  ['/admin/users', 'Users'],
  ['/admin/draws', 'Draws'],
  ['/admin/charities', 'Charities'],
  ['/admin/winners', 'Winners'],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <nav className="mb-8 flex gap-1 overflow-x-auto rounded-full bg-white p-1.5 ring-1 ring-plum/[.07]" aria-label="Admin sections">
        {TABS.map(([href, label]) => (
          <Link key={href} href={href} className="whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold text-plum/70 transition hover:bg-paper-deep hover:text-plum">{label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
