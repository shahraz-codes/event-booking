"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface HorizontalScrollerProps {
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

export default function HorizontalScroller({
  children,
  ariaLabel,
  className = "",
}: HorizontalScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const updateState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    setOverflows(hasOverflow);
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateState();
    el.addEventListener("scroll", updateState, { passive: true });
    const ro = new ResizeObserver(updateState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateState);
      ro.disconnect();
    };
  }, [updateState]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.85, 280);
    el.scrollBy({ left: amount * dir, behavior: "smooth" });
  };

  return (
    <div className="relative" aria-label={ariaLabel} role="region">
      {/* Reserve horizontal space on sm+ so the prev/next buttons don't
          overlap items. Buttons are hidden on mobile (touch swipe is the
          primary gesture) so no clearance is needed there. */}
      <div className="sm:px-16">
        <div
          ref={scrollerRef}
          className={`flex snap-x snap-mandatory scroll-smooth overflow-x-auto px-4 pb-4 [justify-content:safe_center] sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
        >
          {children}
        </div>
      </div>

      {overflows && (
        <>
          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            disabled={!canPrev}
            aria-label="Previous"
            className="absolute left-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100 bg-white/95 text-amber-900 shadow-lg backdrop-blur-sm transition-all hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-0 sm:left-2 sm:flex sm:h-12 sm:w-12"
          >
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            disabled={!canNext}
            aria-label="Next"
            className="absolute right-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100 bg-white/95 text-amber-900 shadow-lg backdrop-blur-sm transition-all hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-0 sm:right-2 sm:flex sm:h-12 sm:w-12"
          >
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
