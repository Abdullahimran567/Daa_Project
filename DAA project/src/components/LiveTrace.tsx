import { useEffect, useMemo, useState } from "react"
import { closestPairTraced } from "../ClosetPair"
import { seededRandom } from "../lib/scene"
import { cn } from "../lib/utils"

/**
 * A live, honest feed of the closest-pair algorithm running on a seeded
 * cloud. The hero shows the real trace, not a mock-up.
 */
export function LiveTrace({ className }: { className?: string }) {
  const trace = useMemo(() => {
    const random = seededRandom(4711)
    const points = Array.from({ length: 64 }, () => ({
      x: Math.round(random() * 1000),
      y: Math.round(random() * 1000),
    }))
    return closestPairTraced(points).trace
  }, [])

  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % trace.length)
    }, 950)
    return () => window.clearInterval(id)
  }, [trace.length])

  const step = trace[index] ?? trace[0]

  const tone =
    step?.type === "split"
      ? "text-violet-soft border-violet/30 bg-violet/[0.08]"
      : step?.type === "strip"
        ? "text-warning border-warning/30 bg-warning/[0.08]"
        : step?.type === "check"
          ? "text-accent-soft border-accent/30 bg-accent/[0.08]"
          : step?.type === "done"
            ? "text-success border-success/30 bg-success/[0.08]"
            : "text-primary-soft border-primary/30 bg-primary/[0.08]"

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">Live trace</span>
        <span className="font-mono text-[9px] text-muted/70">
          step {index + 1}/{trace.length}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            "rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]",
            tone,
          )}
        >
          {step?.type}
        </span>
        <span className="font-mono text-[9.5px] text-muted">depth {step?.depth}</span>
      </div>

      <p className="mt-3 min-h-[3.5rem] font-mono text-[11px] leading-relaxed text-muted-strong">
        {step?.message}
      </p>

      {/* Depth ladder */}
      <div className="mt-4 flex items-end gap-1">
        {Array.from({ length: 10 }, (_, i) => {
          const filled = i <= (step?.depth ?? 0)
          return (
            <span
              key={i}
              className={cn(
                "h-3 flex-1 rounded-sm transition-all duration-500",
                filled
                  ? "bg-[linear-gradient(180deg,#8fb6ff,#4d8dff)]"
                  : "bg-white/[0.06]",
              )}
              style={{ height: `${8 + i * 3}px` }}
            />
          )
        })}
      </div>

      <div className="mt-4 h-[2px] w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#8fb6ff,#5ff0d8)] transition-[width] duration-500"
          style={{ width: `${((index + 1) / trace.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
