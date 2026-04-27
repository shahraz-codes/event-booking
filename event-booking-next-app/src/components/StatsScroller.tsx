"use client";

import { CounterAnimation } from "@/components/HeroAnimations";
import { StaggerContainer, StaggerItem } from "@/components/AnimateOnScroll";

interface StatItem {
  id: string;
  value: number;
  suffix: string;
  label: string;
}

interface StatsScrollerProps {
  items: StatItem[];
}

// More than this many stats won't fit comfortably on one row, so we switch
// to an auto-scrolling marquee instead of a centred flex row.
const MARQUEE_THRESHOLD = 4;

export default function StatsScroller({ items }: StatsScrollerProps) {
  if (items.length === 0) return null;

  if (items.length <= MARQUEE_THRESHOLD) {
    return (
      <StaggerContainer className="mx-auto flex max-w-5xl flex-wrap items-start justify-center gap-x-10 gap-y-6 sm:gap-x-16">
        {items.map((stat) => (
          <StaggerItem key={stat.id} variant="scaleUp">
            <StatCard stat={stat} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    );
  }

  // Duplicate the items so the marquee can loop seamlessly with translateX(-50%).
  // Spacing lives on each item (pr-*) instead of `gap-*` on the track so that
  // half the total width corresponds exactly to one full set of items.
  const tracks: { items: StatItem[]; ariaHidden: boolean }[] = [
    { items, ariaHidden: false },
    { items, ariaHidden: true },
  ];

  return (
    <div className="marquee-pause marquee-mask overflow-hidden">
      <div className="marquee-track">
        {tracks.map((track, trackIdx) =>
          track.items.map((stat) => (
            <div
              key={`${trackIdx}-${stat.id}`}
              aria-hidden={track.ariaHidden || undefined}
              className="shrink-0 pr-10 sm:pr-16"
            >
              <StatCard stat={stat} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: StatItem }) {
  return (
    <div className="w-32 text-center sm:w-40">
      <p className="text-3xl font-bold text-brand-800 sm:text-4xl">
        <CounterAnimation value={stat.value} suffix={stat.suffix} />
      </p>
      <p className="mt-1 whitespace-nowrap text-xs font-medium text-gray-600 sm:text-sm">
        {stat.label}
      </p>
    </div>
  );
}
