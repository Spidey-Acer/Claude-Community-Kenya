/**
 * PhotoGrid — the "faces of the community" tile grid (home, /gallery, event
 * detail). Server component: pure markup over real photos, no placeholder
 * tiles — pass only photos that exist.
 */

import Image from "next/image";

export interface GridPhoto {
  src: string;
  alt: string;
}

interface PhotoGridProps {
  photos: GridPhoto[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const COLS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

export function PhotoGrid({ photos, columns = 4, className }: PhotoGridProps) {
  if (photos.length === 0) return null;
  return (
    <div className={`grid gap-3 ${COLS[columns]} ${className ?? ""}`}>
      {photos.map((photo) => (
        <div key={photo.src} className="frame-base frame-tile rounded-xl">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
