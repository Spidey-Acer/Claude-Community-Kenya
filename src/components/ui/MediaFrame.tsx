"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

type GlowColor = "green" | "amber" | "cyan"
type MediaFrameVariant = "hero" | "card" | "compact"

interface MediaFrameProps {
  src: string
  alt: string
  title?: string
  width?: number
  height?: number
  variant?: MediaFrameVariant
  priority?: boolean
  glowColor?: GlowColor
  showScanlines?: boolean
  showTitleBar?: boolean
  className?: string
  sizes?: string
}

const GLOW_RGB: Record<GlowColor, string> = {
  green: "0, 255, 65",
  amber: "255, 176, 0",
  cyan: "0, 212, 255",
}

const VARIANT_CONFIG = {
  hero: {
    imageHeight: "max-h-[400px]",
    useFill: false,
    objectFit: "object-contain" as const,
    titleBar: true,
    titlePadding: "px-4 py-2.5",
    cornerSize: "h-5 w-5",
    cornerInset: 12,
    scanlines: true,
    glow: true,
    fadeBottom: false,
  },
  card: {
    imageHeight: "h-52",
    useFill: true,
    objectFit: "object-contain" as const,
    titleBar: true,
    titlePadding: "px-3 py-1.5",
    cornerSize: "h-3 w-3",
    cornerInset: 8,
    scanlines: true,
    glow: true,
    fadeBottom: true,
  },
  compact: {
    imageHeight: "h-32",
    useFill: true,
    objectFit: "object-cover" as const,
    titleBar: false,
    titlePadding: "",
    cornerSize: "h-2.5 w-2.5",
    cornerInset: 6,
    scanlines: false,
    glow: false,
    fadeBottom: false,
  },
} as const

export function MediaFrame({
  src,
  alt,
  title,
  width,
  height,
  variant = "hero",
  priority = false,
  glowColor = "green",
  showScanlines,
  showTitleBar,
  className,
  sizes,
}: MediaFrameProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const config = VARIANT_CONFIG[variant]

  const hasTitleBar = showTitleBar ?? config.titleBar
  const hasScanlines = showScanlines ?? config.scanlines
  const hasGlow = config.glow
  const inset = config.cornerInset

  const cornerBase = cn(
    config.cornerSize,
    "absolute border-green-primary/40 transition-all duration-300",
    "group-hover:border-green-primary/90"
  )

  return (
    <motion.div
      className={cn(
        "group overflow-hidden border border-border-default bg-bg-card",
        hasGlow && "media-frame-glow",
        className
      )}
      style={
        hasGlow
          ? ({ "--media-frame-glow-rgb": GLOW_RGB[glowColor] } as React.CSSProperties)
          : undefined
      }
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Title Bar */}
      {hasTitleBar && (
        <div
          className={cn(
            "flex items-center gap-2 border-b border-border-default",
            config.titlePadding
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red" />
            <span className="h-2 w-2 rounded-full bg-amber" />
            <span className="h-2 w-2 rounded-full bg-green-primary" />
          </div>
          {title && (
            <span className="truncate font-mono text-xs text-text-dim transition-colors duration-200 group-hover:text-green-primary">
              {title}
            </span>
          )}
          <span className="ml-auto font-mono text-[10px] tracking-wider text-text-dim/50">
            IMG
          </span>
        </div>
      )}

      {/* Image Viewport */}
      <div
        className={cn(
          "relative overflow-hidden bg-bg-primary",
          config.useFill && config.imageHeight
        )}
      >
        {/* Image */}
        {config.useFill ? (
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
            className={cn(
              config.objectFit,
              "transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={width ?? 896}
            height={height ?? 504}
            priority={priority}
            sizes={sizes}
            className={cn(
              "mx-auto w-full",
              config.imageHeight,
              config.objectFit,
              "transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        )}

        {/* Bottom fade gradient — blends poster into card bg */}
        {config.fadeBottom && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{
              background: "linear-gradient(to bottom, transparent, var(--bg-primary))",
            }}
            aria-hidden="true"
          />
        )}

        {/* Corner Brackets — HUD viewfinder */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span
            className={cn(cornerBase, "border-l-2 border-t-2")}
            style={{ top: inset, left: inset }}
          />
          <span
            className={cn(cornerBase, "border-r-2 border-t-2")}
            style={{ top: inset, right: inset }}
          />
          <span
            className={cn(cornerBase, "border-b-2 border-l-2")}
            style={{ bottom: inset, left: inset }}
          />
          <span
            className={cn(cornerBase, "border-b-2 border-r-2")}
            style={{ bottom: inset, right: inset }}
          />
        </div>

        {/* Scanline Overlay */}
        {hasScanlines && (
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px)",
            }}
            aria-hidden="true"
          />
        )}

        {/* Loading Shimmer */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-bg-card" aria-hidden="true">
            <div
              className="absolute inset-0 media-frame-shimmer"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(0,255,65,0.06), transparent)",
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}
