// app/components/ui/Reveal.tsx
// Scroll-reveal wrapper (Lovable `Reveal`). Server and first client render are identical
// (hidden state); visibility flips inside an effect, so there is no hydration mismatch.
"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      // No observer support: reveal immediately (deferred, so it is not a sync setState in the effect body)
      const id = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(id);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-1000 ease-out motion-reduce:transition-none motion-reduce:!opacity-100 motion-reduce:!translate-y-0 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3.5'
      } ${className}`}
    >
      {children}
    </div>
  );
}