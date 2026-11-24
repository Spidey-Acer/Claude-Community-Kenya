"use client"

/**
 * The attending-card flow: find me, type a name, choose a photo, preview, share.
 *
 * The name and the photo live only in this component's memory and are drawn on
 * a local canvas. This file makes no network calls (a test scans it); the only
 * request in the flow is the email lookup inside LookupForm.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { CARD_SIZES, MAX_NAME_LENGTH, buildCaption, type CardContent, type CardSize, type PhotoTransform } from "@/lib/attending/card-layout"
import { decodePhoto, drawCard, loadCardFonts, renderCardBlob, type CardFonts } from "@/lib/attending/compose-card"
import { DISPLAY_FONT_CLASS } from "@/lib/attending/display-font"
import { LookupForm } from "./LookupForm"
import { ShareButtons } from "./ShareButtons"

export interface AttendingFlowProps {
  slug: string
  eventTitle: string
  city: string
  dateLabel: string
  infoLine: string
  eventUrl: string
}

const NO_ZOOM: PhotoTransform = { zoom: 1, panX: 0, panY: 0 }
const INPUT =
  "w-full rounded-lg border border-sand-2 bg-paper-card px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"

export function AttendingFlow(props: AttendingFlowProps) {
  const { slug, eventTitle, city, dateLabel, infoLine, eventUrl } = props
  const [found, setFound] = useState(false)
  const [name, setName] = useState("")
  const [photo, setPhoto] = useState<ImageBitmap | null>(null)
  const [transform, setTransform] = useState<PhotoTransform>(NO_ZOOM)
  const [size, setSize] = useState<CardSize>("portrait")
  const [fonts, setFonts] = useState<CardFonts | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const displayProbe = useRef<HTMLSpanElement>(null)
  const bodyProbe = useRef<HTMLSpanElement>(null)

  const content: CardContent = { eventTitle, name: name.trim() || "Your name", infoLine, eventUrl }

  useEffect(() => {
    if (!found) return
    const resolved: CardFonts = {
      display: getComputedStyle(displayProbe.current!).fontFamily || "serif",
      body: getComputedStyle(bodyProbe.current!).fontFamily || "sans-serif",
    }
    // A failed font load still lets the card draw, with the fallback faces.
    loadCardFonts(resolved)
      .catch(() => undefined)
      .then(() => setFonts(resolved))
  }, [found])

  // Free the decoded bitmap when it is replaced and when the component unmounts.
  useEffect(() => () => photo?.close(), [photo])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !fonts) return
    canvas.width = CARD_SIZES[size].width
    canvas.height = CARD_SIZES[size].height
    drawCard(ctx, size, content, fonts, photo, transform)
  })

  async function choosePhoto(file: File | undefined) {
    setPhotoError(null)
    if (!file) return
    try {
      setPhoto(await decodePhoto(file))
      setTransform(NO_ZOOM)
    } catch {
      setPhotoError("We could not read that picture. Try a JPG or PNG.")
    }
  }

  const getCardBlob = useCallback(
    () => {
      if (!fonts) return Promise.reject(new Error("Card fonts are not ready"))
      return renderCardBlob(size, content, fonts, photo, transform)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `content` is rebuilt from the listed fields every render
    [size, eventTitle, name, infoLine, eventUrl, fonts, photo, transform],
  )

  if (!found) return <LookupForm slug={slug} onFound={() => setFound(true)} />

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <span ref={displayProbe} className={`sr-only ${DISPLAY_FONT_CLASS}`} aria-hidden>.</span>
      <span ref={bodyProbe} className="sr-only font-inter" aria-hidden>.</span>
      <div className="space-y-5">
        <p className="font-inter text-[15px] text-ink">Found you. Make your card.</p>
        <label className="block space-y-1.5">
          <span className="font-inter text-[14px] font-semibold text-ink">Name to print on the card</span>
          <input
            className={INPUT}
            value={name}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="font-inter text-[14px] font-semibold text-ink">Your photo</span>
          <input
            type="file"
            accept="image/*"
            className="block w-full font-inter text-sm text-ink-soft"
            onChange={(event) => choosePhoto(event.target.files?.[0])}
          />
        </label>
        {photoError && <p role="alert" className="font-inter text-[14px] text-ink-soft">{photoError}</p>}
        {photo && <PhotoControls transform={transform} onChange={setTransform} />}
        <SizePicker size={size} onChange={setSize} />
        <ShareButtons
          getCardBlob={getCardBlob}
          caption={buildCaption(eventTitle, city, dateLabel, eventUrl)}
          eventUrl={eventUrl}
        />
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Preview of your attending card for ${eventTitle}`}
        className="h-auto w-full rounded-lg border border-sand-2"
      />
    </div>
  )
}

function SizePicker({ size, onChange }: { size: CardSize; onChange: (size: CardSize) => void }) {
  return (
    <fieldset className="flex gap-4 font-inter text-[14px] text-ink">
      <legend className="mb-1 font-semibold">Size</legend>
      {(["portrait", "square"] as const).map((option) => (
        <label key={option} className="flex items-center gap-2">
          <input type="radio" name="card-size" checked={size === option} onChange={() => onChange(option)} />
          {option === "portrait" ? "Portrait 1080 x 1350" : "Square 1080 x 1080"}
        </label>
      ))}
    </fieldset>
  )
}

interface PhotoControlsProps {
  transform: PhotoTransform
  onChange: (transform: PhotoTransform) => void
}

/** Zoom and pan sliders: how the photo sits inside the circle. */
function PhotoControls({ transform, onChange }: PhotoControlsProps) {
  const slider = (label: string, key: keyof PhotoTransform, min: number, max: number, step: number) => (
    <label className="flex items-center gap-3 font-inter text-[14px] text-ink">
      <span className="w-14">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={transform[key]}
        onChange={(event) => onChange({ ...transform, [key]: Number(event.target.value) })}
        className="flex-1"
      />
    </label>
  )
  return (
    <div className="space-y-2">
      {slider("Zoom", "zoom", 1, 4, 0.05)}
      {slider("Left / right", "panX", -1, 1, 0.02)}
      {slider("Up / down", "panY", -1, 1, 0.02)}
    </div>
  )
}
