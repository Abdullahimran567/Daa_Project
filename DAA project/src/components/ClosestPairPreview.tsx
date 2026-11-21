import { useMemo } from "react"
import { seededRandom } from "../lib/scene"

const WIDTH = 320
const HEIGHT = 200

/**
 * A looping miniature of the closest-pair scan: a split line sweeps across
 * the cloud and the winning pair snaps into view.
 */
export function ClosestPairPreview() {
  const { points, pair } = useMemo(() => {
    const random = seededRandom(20240517)
    const list = Array.from({ length: 38 }, () => ({
      x: 14 + random() * (WIDTH - 28),
      y: 12 + random() * (HEIGHT - 24),
    }))

    let best: { a: (typeof list)[0]; b: (typeof list)[0]; d: number } | null = null
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const dx = list[i].x - list[j].x
        const dy = list[i].y - list[j].y
        const d = Math.hypot(dx, dy)
        if (!best || d < best.d) best = { a: list[i], b: list[j], d }
      }
    }

    return { points: list, pair: best }
  }, [])

  if (!pair) return null

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="cp-prev-scan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4d8dff" stopOpacity="0" />
          <stop offset="50%" stopColor="#8fb6ff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#5ff0d8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="cp-prev-glow">
          <stop offset="0%" stopColor="#8fb6ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8fb6ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g opacity={0.55}>
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={1.9}
            fill="#7d8db3"
            opacity={0.7}
          />
        ))}
      </g>

      {/* Sweeping scan line */}
      <g className="animate-scan">
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={HEIGHT}
          stroke="url(#cp-prev-scan)"
          strokeWidth={1.4}
        />
        <line x1={0} y1={0} x2={0} y2={HEIGHT} stroke="#8fb6ff" strokeWidth={3} opacity={0.18} />
      </g>

      {/* Winning pair */}
      <g className="animate-lockon">
        <circle
          cx={pair.a.x}
          cy={pair.a.y}
          r={16}
          fill="url(#cp-prev-glow)"
        />
        <line
          x1={pair.a.x}
          y1={pair.a.y}
          x2={pair.b.x}
          y2={pair.b.y}
          stroke="#5ff0d8"
          strokeWidth={1.4}
          strokeDasharray="4 3"
        />
        <circle cx={pair.a.x} cy={pair.a.y} r={3.2} fill="#8fb6ff" />
        <circle cx={pair.b.x} cy={pair.b.y} r={3.2} fill="#5ff0d8" />
      </g>
    </svg>
  )
}
