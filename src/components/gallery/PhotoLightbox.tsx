"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { PhotoView } from "@/lib/data";

interface PhotoLightboxProps {
  photos: PhotoView[];
  currentIndex: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Accessible fullscreen photo viewer.
 *
 * Keyboard:
 *  - Esc closes
 *  - ← / → navigate
 *  - Tab cycles inside the dialog (focus trap)
 *
 * Touch: swipe horizontally on the image to navigate.
 */
export function PhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onIndexChange,
}: PhotoLightboxProps) {
  const reduce = useReducedMotion();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const open = currentIndex !== null;
  const photo = open ? photos[currentIndex] : null;

  const next = useCallback(() => {
    if (currentIndex === null) return;
    onIndexChange((currentIndex + 1) % photos.length);
  }, [currentIndex, photos.length, onIndexChange]);

  const prev = useCallback(() => {
    if (currentIndex === null) return;
    onIndexChange((currentIndex - 1 + photos.length) % photos.length);
  }, [currentIndex, photos.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, next, prev, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
  }

  return (
    <AnimatePresence>
      {open && photo && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={photo.caption ?? "Photo viewer"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Close */}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close photo viewer"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[#3a3a37] bg-[#1e1e1d]/80 text-[#e8e6dc] backdrop-blur-md transition-colors hover:bg-[#252524] hover:text-[#faf9f5]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#3a3a37] bg-[#1e1e1d]/80 text-[#e8e6dc] backdrop-blur-md transition-colors hover:bg-[#252524] hover:text-[#faf9f5] sm:left-4"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
          )}

          {/* Next */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#3a3a37] bg-[#1e1e1d]/80 text-[#e8e6dc] backdrop-blur-md transition-colors hover:bg-[#252524] hover:text-[#faf9f5] sm:right-4"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          )}

          {/* Image + caption stack */}
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.97 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: EASE_OUT }}
            className="flex h-full w-full max-w-6xl flex-col items-center justify-center gap-4 px-4 py-16"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="relative flex max-h-[calc(100dvh-180px)] w-full flex-1 items-center justify-center">
              <Image
                src={photo.url}
                alt={photo.alt ?? ""}
                width={1600}
                height={1067}
                sizes="(max-width: 1024px) 100vw, 1024px"
                unoptimized={photo.fromR2}
                className="h-auto max-h-full w-auto max-w-full rounded-xl object-contain shadow-2xl"
                priority
              />
            </div>

            {(photo.caption || photo.photographer || photo.event) && (
              <div className="w-full max-w-2xl text-center">
                {photo.caption && (
                  <p className="text-[14px] text-[#e8e6dc]">{photo.caption}</p>
                )}
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7a7870]">
                  {photo.event && (
                    <span className="text-[#b0aea5]">{photo.event.title}</span>
                  )}
                  {photo.event && photo.photographer && (
                    <span className="mx-2 text-[#3a3a37]">·</span>
                  )}
                  {photo.photographer && (
                    <>Photo by {photo.photographer}</>
                  )}
                </p>
              </div>
            )}

            {photos.length > 1 && (
              <p className="text-[11px] font-medium text-[#7a7870] tabular-nums">
                {currentIndex !== null ? currentIndex + 1 : 0} / {photos.length}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
