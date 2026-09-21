const COLORS = ['#E8467C', '#0FA596', '#FFC145', '#6E56CF', '#F97316', '#2F80ED'];
/** Deterministic colour block used when a charity has no image. */
export default function CharityArt({ name, image, className = '' }: { name: string; image?: string | null; className?: string }) {
  if (image) return <img src={image} alt="" className={`object-cover ${className}`} />;
  const h = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  const a = COLORS[h % COLORS.length];
  const b = COLORS[(h + 2) % COLORS.length];
  return (
    <div aria-hidden className={`relative overflow-hidden ${className}`} style={{ background: a }}>
      <div className="absolute -right-6 -top-6 h-2/3 w-2/3 rounded-full opacity-90" style={{ background: b }} />
      <div className="absolute -bottom-8 left-4 h-1/2 w-1/3 rounded-full bg-white/25" />
      <span className="absolute bottom-3 left-4 font-display text-4xl font-bold text-white/90">{name.slice(0, 1)}</span>
    </div>
  );
}
