"use client";
import { useEffect, useRef, useState } from "react";

/** Pixel burst: square "sparks" fly out from the centre once. Pure CSS, stepped, ~700ms. */
export function Burst({ colors = ["#ffb547", "#8df25f", "#43e6c6", "#dce7ee"], count = 14, spread = 120, size = 8 }: {
  colors?: string[]; count?: number; spread?: number; size?: number;
}) {
  const parts = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + (i % 2) * 0.3;
    const r = spread * (0.55 + ((i * 37) % 10) / 22);
    return { dx: Math.round((Math.cos(a) * r) / 4) * 4, dy: Math.round((Math.sin(a) * r) / 4) * 4, c: colors[i % colors.length], d: (i % 3) * 40 };
  });
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
      {parts.map((p, i) => (
        <i key={i} className="burst-px absolute block"
          style={{ width: size, height: size, background: p.c, left: -size / 2, top: -size / 2, animationDelay: `${p.d}ms`, ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px` }} />
      ))}
    </span>
  );
}

/** Counts from the previous value to the new one in integer steps (~600ms). Returns the shown number and the last delta. */
export function useCountUp(value: number) {
  const [shown, setShown] = useState(value);
  const [delta, setDelta] = useState<{ n: number; key: number } | null>(null);
  const prev = useRef(value);
  const loaded = useRef(value !== 0);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    // The first real value (state loading in) snaps into place; only later changes animate.
    if (!loaded.current) { loaded.current = true; setShown(value); return; }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setDelta({ n: value - from, key: Date.now() });
    if (reduce) { setShown(value); return; }
    const steps = 12;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setShown(Math.round(from + ((value - from) * i) / steps));
      if (i >= steps) clearInterval(t);
    }, 50);
    return () => clearInterval(t);
  }, [value]);
  return { shown, delta };
}

/** "+20" that floats up and fades, keyed so each change replays. */
export function FloatDelta({ delta, className = "" }: { delta: { n: number; key: number } | null; className?: string }) {
  if (!delta || delta.n === 0) return null;
  return (
    <span key={delta.key} className={`float-up pointer-events-none absolute font-num text-[20px] ${delta.n > 0 ? "text-led" : "text-alarm"} ${className}`} aria-hidden>
      {delta.n > 0 ? `+${delta.n}` : delta.n}
    </span>
  );
}
