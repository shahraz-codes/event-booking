"use client";

import { useState, useEffect, useRef } from "react";
import { motion, animate, useInView, useReducedMotion } from "framer-motion";

export function HeroContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.15 } },
      }}
      className="relative z-10 mx-auto max-w-4xl"
    >
      {children}
    </motion.div>
  );
}

export function HeroItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FloatingLogo({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) return <div>{children}</div>;

  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export function ShimmerText({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) {
    // Static gradient text, no animated background sweep.
    return (
      <span className="inline-block bg-gradient-to-r from-brand-200 via-brand-400 to-brand-200 bg-clip-text text-transparent">
        {children}
      </span>
    );
  }

  return (
    <motion.span
      className="inline-block bg-gradient-to-r from-brand-200 via-brand-400 to-brand-200 bg-clip-text text-transparent bg-[length:200%_100%]"
      animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.span>
  );
}

export function FloatingParticles() {
  const reduce = useReducedMotion();
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; duration: number; delay: number }[]
  >([]);

  useEffect(() => {
    if (reduce) return; // no perpetual motion for reduced-motion users
    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 8 + 6,
        delay: Math.random() * 4,
      }))
    );
  }, [reduce]);

  if (reduce || particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-brand-400/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/**
 * UX-1: real count-up. The previous version only faded a static value in
 * (a redundant double motion.span). This animates 0 -> value once, when the
 * element scrolls into view, and respects reduced-motion by showing the final
 * value immediately.
 */
export function CounterAnimation({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
