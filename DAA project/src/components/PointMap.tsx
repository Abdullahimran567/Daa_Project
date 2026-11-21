import { useMemo } from "react"
import type { ClosestPairTraceStep, Point, TracePair } from "../ClosetPair"
import { cn } from "../lib/utils"

/**
 * A precise, flat rendering of the same point cloud the 3D stage shows.
 * It is the instrument reading: exact coordinates, the split line, the
 * strip corridor and the winning pair.
 */
interface PointMapProps {
  points: Point[]
  step: ClosestPairTraceStep | null
  best: TracePair | null
  space?: number
  className?: string
}

export function PointMap({
  points,
  step,
  best,
  space = 1000,
  className,
}: PointMapProps) {
  const scale = 100 / space

  const strip = step?.strip ?? null
  const midX = step?.midX ?? null
  // The algorithm sweeps every point within d of the split line, so the
  // corridor reaches d to either side of it.
  const halfWidth = best && midX !== null ? best.d : 0

  const dots = useMemo(
    () =>
      points.map((point) => {
        const x = point.x * scale
        const y = 100 - point.y * scale
        return { x, y, key: `${point.x}:${point.y}` }
      }),
    [points, scale],
  )

  const bestKeys = useMemo(() => {
    if (!best) return new Set<string>()
    return new Set([`${best.a.x}:${best.a.y}`, `${best.b.x}:${best.b.y}`])
  }, [best])

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Exact two-dimensional map of the point cloud"
    >
      <defs>
        <pattern id="pm-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path
            d="M 10 0 L 0 0 0 10"
            fill="none"
            stroke="rgba(143,182,255,0.10)"
            strokeWidth="0.3"
          />
        </pattern>
      </defs>

      <rect x="0" y="0" width="100" height="100" fill="url(#pm-grid)" />

      {strip && midX !== null ? (
        <rect
          x={(midX - halfWidth) * scale}
          y="0"
          width={Math.max(halfWidth * 2 * scale, 0.4)}
          height="100"
          fill="rgba(240,179,74,0.14)"
          stroke="rgba(240,179,74,0.45)"
          strokeWidth="0.3"
        />
      ) : null}

      {midX !== null ? (
        <line
          x1={midX * scale}
          y1="0"
          x2={midX * scale}
          y2="100"
          stroke="rgba(143,182,255,0.85)"
          strokeWidth="0.4"
          strokeDasharray="2 2"
        />
      ) : null}

      {dots.map((dot) => {
        const isBest = bestKeys.has(dot.key)
        return (
          <circle
            key={dot.key}
            cx={dot.x}
            cy={dot.y}
            r={isBest ? 1.5 : 0.8}
            fill={isBest ? "#5ff0d8" : "rgba(160,178,220,0.72)"}
          />
        )
      })}

      {best ? (
        <line
          x1={best.a.x * scale}
          y1={100 - best.a.y * scale}
          x2={best.b.x * scale}
          y2={100 - best.b.y * scale}
          stroke="#5ff0d8"
          strokeWidth="0.5"
          strokeDasharray="1.5 1.5"
        />
      ) : null}

      <rect
        x="0.4"
        y="0.4"
        width="99.2"
        height="99.2"
        fill="none"
        stroke="rgba(143,182,255,0.22)"
        strokeWidth="0.4"
      />
    </svg>
  )
}
