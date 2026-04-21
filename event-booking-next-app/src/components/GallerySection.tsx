"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import GalleryImage from "./GalleryImage";

interface GalleryItem {
  id: string;
  title: string;
  desc: string;
  gradient: string;
  imageUrl: string;
}

export default function GallerySection({ gallery }: { gallery: GalleryItem[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  const open = (index: number) => {
    setSelectedIndex(index);
    requestAnimationFrame(() => setVisible(true));
  };

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(() => setSelectedIndex(null), 200);
  }, []);

  const prev = useCallback(() => {
    setSelectedIndex((i) => (i === null ? null : (i - 1 + gallery.length) % gallery.length));
  }, [gallery.length]);

  const next = useCallback(() => {
    setSelectedIndex((i) => (i === null ? null : (i + 1) % gallery.length));
  }, [gallery.length]);

  useEffect(() => {
    if (selectedIndex === null) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIndex, close, prev, next]);

  const selected = selectedIndex !== null ? gallery[selectedIndex] : null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-amber-600">
          Our Venue
        </p>
        <h2 className="text-3xl font-bold text-gray-900">
          A Glimpse of AR Banquets
        </h2>
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        {gallery.map((img, index) => (
          <div
            key={img.id}
            onClick={() => open(index)}
            className={`group relative flex h-64 w-full cursor-pointer flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] ${img.gradient} p-6 shadow-lg transition-transform hover:-translate-y-1`}
          >
            {img.imageUrl && <GalleryImage src={img.imageUrl} alt={img.title} />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-white">{img.title}</h3>
              <p className="text-sm text-white/70">{img.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div
          className={`fixed inset-0 z-[110] flex items-center justify-center transition-colors duration-200 ${
            visible ? "bg-black/80" : "bg-black/0"
          }`}
          onClick={close}
        >
          {/* Close button */}
          <button
            onClick={close}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev arrow */}
          {gallery.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 z-10 rounded-full bg-black/40 p-3 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
              aria-label="Previous image"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Next arrow */}
          {gallery.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 z-10 rounded-full bg-black/40 p-3 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
              aria-label="Next image"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`flex max-h-[90vh] w-full max-w-5xl flex-col items-center px-4 transition-all duration-200 ${
              visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            <div className="relative h-[75vh] w-full">
              {selected.imageUrl ? (
                <Image
                  src={selected.imageUrl}
                  alt={selected.title}
                  fill
                  className="rounded-lg object-contain"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-white/50">
                  No image available
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-semibold text-white">{selected.title}</h3>
              <p className="text-sm text-white/70">{selected.desc}</p>
              <p className="mt-2 text-xs text-white/50">
                {selectedIndex! + 1} / {gallery.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
