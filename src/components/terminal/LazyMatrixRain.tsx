"use client";

import dynamic from "next/dynamic";

const MatrixRain = dynamic(
  () => import("@/components/terminal/MatrixRain").then((mod) => ({ default: mod.MatrixRain })),
  { ssr: false }
);

interface LazyMatrixRainProps {
  opacity?: number;
  density?: number;
}

export function LazyMatrixRain(props: LazyMatrixRainProps) {
  return <MatrixRain {...props} />;
}
