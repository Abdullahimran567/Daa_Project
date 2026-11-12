import { Crosshair, Ruler } from "lucide-react"
import type { TracePairView } from "./PointCanvas"
import { Stat } from "./Stat"
import { useTween } from "../hooks/useTween"
import { formatDistance } from "../lib/utils"

interface LiveStatsProps {
  best: TracePairView | null
  transitionMs: number
}

/**
 * Distance and pair readouts that ease in lock-step with the canvas, so the
 * numbers on screen always describe the geometry being drawn.
 */
export function LiveStats({ best, transitionMs }: LiveStatsProps) {
  const ax = useTween(best?.a.x, transitionMs)
  const ay = useTween(best?.a.y, transitionMs)
  const bx = useTween(best?.b.x, transitionMs)
  const by = useTween(best?.b.y, transitionMs)
  const d = useTween(best?.d, transitionMs)

  const hasPair =
    typeof ax === "number" &&
    typeof ay === "number" &&
    typeof bx === "number" &&
    typeof by === "number"
  const hasDistance = typeof d === "number"

  return (
    <>
      <Stat
        icon={Ruler}
        label="Distance"
        value={hasDistance ? formatDistance(d) : "—"}
        hint={hasDistance ? "Euclidean minimum" : "Awaiting first pair"}
        tone="primary"
      />
      <Stat
        icon={Crosshair}
        label="Closest pair"
        value={
          hasPair ? `(${Math.round(ax!)}, ${Math.round(ay!)})` : "—"
        }
        hint={hasPair ? `↔ (${Math.round(bx!)}, ${Math.round(by!)})` : "Coordinates"}
        tone="accent"
      />
    </>
  )
}
