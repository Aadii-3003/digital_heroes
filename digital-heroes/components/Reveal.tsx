'use client';
import { useEffect, useRef, useState } from 'react';

/** Fades content in once when it scrolls into view. */
export default function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setOn(true);
        io.disconnect();
      }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition duration-700 ease-out ${on ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'} ${className}`}>
      {children}
    </div>
  );
}
