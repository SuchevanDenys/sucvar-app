"use client";

import React, { useState } from 'react';
import { MoveHorizontal } from 'lucide-react';

interface Props {
  beforeImg: string;
  afterImg: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function BeforeAfterSlider({
  beforeImg,
  afterImg,
  beforeLabel = 'BEFORE',
  afterLabel = 'AFTER',
}: Props) {
  // Divider position in % (0 = all "after", 100 = all "before")
  const [pos, setPos] = useState<number>(50);

  return (
    <div className="relative w-full h-[360px] sm:h-[480px] rounded-md overflow-hidden select-none bg-[#141413] border border-stone-300/40 z-10">
      {/* Layer 1: "after" image fills the whole frame */}
      <img
        src={afterImg}
        alt="After"
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Layer 2: "before" image, clipped from the right so it reveals up to `pos` */}
      <img
        src={beforeImg}
        alt="Before"
        draggable={false}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Divider: wrapper is centered on `pos` so line and handle always align */}
      <div
        style={{ left: `${pos}%` }}
        className="absolute inset-y-0 w-9 -translate-x-1/2 pointer-events-none z-20"
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.6)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#141413] border border-white flex items-center justify-center shadow-lg">
          <MoveHorizontal className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 z-20 bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-sm pointer-events-none">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 z-20 bg-[#3B4D43] text-white text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-sm pointer-events-none">
        {afterLabel}
      </span>

      {/* Invisible native range input handles mouse + touch.
          touch-pan-y lets the page still scroll vertically on iOS. */}
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Before / after comparison"
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30 touch-manipulation touch-pan-y"
      />
    </div>
  );
}