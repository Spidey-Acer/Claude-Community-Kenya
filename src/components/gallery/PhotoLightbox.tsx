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
 *  - focus returns to the tile that opened the dialog on close
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
  const dialogRef = useRef<HTMLDivElement>(null);
  // The element that had focus when the dialog opened — almost always the grid
  // tile that was clicked. Restoring to it on close is what keeps keyboard
  // users from being dumped back at the top of the document.
  const previouslyFocused = useRef<HTMLElement | null>(null);
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

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
        return;
      }
      if (e.key !== "Tab") return;

      // Focus trap. Without this, Tab walks straight out of the dialog and
      // into the page behind it — which is still rendered and still
      // scrollable-to — leaving a keyboard or screen-reader user navigating a
      // page they cannot see, with no obvious way back.
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      // Guard the node still being in the document: a photo can be removed, or
      // the grid re-rendered under a filter change, while the dialog is open.
      const target = previouslyFocused.current;
      if (target && document.contains(target)) target.focus();
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
          ref={dialogRef}
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
                alt={photo.alt ?? photo.caption ?? "Community photo"}
                width={1600}
                height={1067}
                sizes="(max-width: 1024px) 100vw, 1024px"
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
