import Link from 'next/link';
export default function Footer() {
  return (
    <footer className="mt-24 bg-plum text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-lg font-extrabold text-white">digital<span className="text-bloom">heroes</span></p>
          <p className="mt-1 max-w-sm">Play your round, fund a cause you care about, and enter a monthly prize draw.</p>
        </div>
        <div className="flex gap-6">
          <Link href="/charities" className="hover:text-white">Charities</Link>
          <Link href="/draws" className="hover:text-white">Draw rules</Link>
          <Link href="/signup" className="hover:text-white">Subscribe</Link>
        </div>
      </div>
    </footer>
  );
}
