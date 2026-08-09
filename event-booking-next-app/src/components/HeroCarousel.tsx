"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";

interface CarouselImage {
  id: string;
  imageUrl: string;
  alt: string;
  mediaType?: "image" | "video";
}

interface HeroCarouselProps {
  images: CarouselImage[];
}

export default function HeroCarousel({ images }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const count = images.length;
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const reduce = useReducedMotion();

  const goTo = useCallback((index: number) => setCurrent(index), []);
  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % count);
  }, [count]);

  // Play only the current slide's video (from the start); pause the others.
  // Reduced-motion users: keep videos paused (no autoplay).
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === current && !reduce) {
        try {
          v.currentTime = 0;
        } catch {
          /* ignore */
        }
        void v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [current, reduce]);

  // Image slides auto-advance after 5s. Video slides are NOT timed here — they
  // advance when the video finishes (see onEnded on the <video> below).
  // No autoplay for reduced-motion users, single-image carousels, or while the
  // tab is backgrounded.
  useEffect(() => {
    if (count <= 1 || reduce) return;
    if (images[current]?.mediaType === "video") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const start = () => {
      if (timer === null) timer = setTimeout(advance, 5000);
    };
    const stop = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
      else start();
    };

    if (document.visibilityState !== "hidden") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [current, count, images, advance, reduce]);

  if (count === 0) return null;

  return (
    <>
      {images.map((img, i) => (
        <div
          key={img.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          {img.mediaType === "video" ? (
            <video
              ref={(el) => {
                videoRefs.current[i] = el;
              }}
              src={img.imageUrl}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              playsInline
              loop={count <= 1}
              preload={i === current ? "auto" : "metadata"}
              onEnded={() => {
                if (!reduce && count > 1 && i === current) advance();
              }}
              aria-label={img.alt || "Hero video"}
            />
          ) : (
            <Image
              src={img.imageUrl}
              alt={img.alt || "Hero image"}
              fill
              className="object-cover"
              priority={i === 0}
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-black/50" />
        </div>
      ))}

      {count > 1 && (
        <>
          <button
            onClick={() => goTo((current - 1 + count) % count)}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
            aria-label="Previous slide"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => goTo((current + 1) % count)}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
            aria-label="Next slide"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-6 bg-white"
                    : "w-2 bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
