import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { cn } from "../lib/utils"
import { useReducedMotion } from "../hooks/useReducedMotion"

/* ------------------------------------------------------------------ *
 * A replay of the algorithm's source code. The panel walks through
 * the four phases of divide and conquer, highlighting the lines that
 * are executing and narrating what each one does.
 * ------------------------------------------------------------------ */

interface CodeLine {
  text: string
  phase: number
}

const PHASES = [
  { key: "sort", label: "Sort" },
  { key: "divide", label: "Divide" },
  { key: "conquer", label: "Conquer" },
  { key: "combine", label: "Combine" },
]

const LINES: CodeLine[] = [
  { phase: 0, text: "const px = [...points].sort((p, q) => p.x - q.x || p.y - q.y)" },
  { phase: 0, text: "// every point is now ordered along the x-axis" },
  { phase: 1, text: "const mid = Math.floor(n / 2)" },
  { phase: 1, text: "const midX = arr[mid].x" },
  { phase: 1, text: "const left = arr.slice(0, mid)" },
  { phase: 1, text: "const right = arr.slice(mid)" },
  { phase: 2, text: "const rl = solve(left, depth + 1)" },
  { phase: 2, text: "const rr = solve(right, depth + 1)" },
  { phase: 2, text: "let best = rl.d <= rr.d ? rl : rr" },
  { phase: 3, text: "const strip = arr.filter(p => Math.abs(p.x - midX) < best.d)" },
  { phase: 3, text: "//           .sort((p, q) => p.y - q.y)" },
  { phase: 3, text: "for (let i = 0; i < strip.length; i++)" },
  { phase: 3, text: "  for (let j = i + 1; j < strip.length; j++)" },
  { phase: 3, text: "    if (dist(strip[i], strip[j]) < best.d) best = ..." },
  { phase: 3, text: "return best" },
]

const NARRATION: Record<number, string> = {
  0: "Sort the cloud along the x-axis so a median split is possible.",
  1: "Cut the set in half at the median x — this is the divide step.",
  2: "Recurse into both halves until only two or three points remain.",
  3: "Scan the narrow strip around the cut and keep the tighter pair.",
}

/** How many 30ms ticks make up one phase. */
const TICKS_PER_PHASE = 115
const TICK_MS = 30

export function CodeReplay({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  const [tick, setTick] = useState(0)
  const [manual, setManual] = useState<number | null>(null)
  const frozenRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => {
      if (!frozenRef.current) setTick((value) => value + 1)
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [reduced])

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const autoPhase = Math.floor(tick / TICKS_PER_PHASE) % PHASES.length
  const phaseIndex = manual ?? autoPhase
  const phaseTick = manual !== null ? Number.MAX_SAFE_INTEGER : tick % TICKS_PER_PHASE
  const narration = NARRATION[phaseIndex]
  const typed = reduced
    ? narration
    : narration.slice(0, Math.min(phaseTick, narration.length))

  const choose = (index: number) => {
    frozenRef.current = true
    setManual(index)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      frozenRef.current = false
      setManual(null)
      setTick(index * TICKS_PER_PHASE)
    }, 4200)
  }

  const firstLine = LINES.findIndex((line) => line.phase === phaseIndex)
  const lastLine = LINES.reduce(
    (acc, line, index) => (line.phase === phaseIndex ? index : acc),
    firstLine,
  )

  return (
    <div className={cn("relative", className)}>
      {/* Phase selector */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PHASES.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => choose(index)}
            className={cn(
              "relative rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
              index === phaseIndex
                ? "border-white/20 bg-white/[0.08] text-foreground"
                : "border-white/[0.07] text-muted hover:text-muted-strong",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Code */}
      <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[rgba(4,7,14,0.75)]">
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-danger/60" />
          <span className="h-2 w-2 rounded-full bg-warning/60" />
          <span className="h-2 w-2 rounded-full bg-success/60" />
          <span className="ml-2 font-mono text-[9.5px] text-muted">
            closest-pair.ts — solve()
          </span>
        </div>

        <div className="relative py-3">
          <motion.div
            key={phaseIndex}
            aria-hidden
            className="absolute inset-x-0 rounded-sm bg-[linear-gradient(90deg,rgba(143,182,255,0.16),rgba(95,240,216,0.05),transparent)]"
            initial={{ top: `${(firstLine / LINES.length) * 100}%` }}
            animate={{ top: `${(firstLine / LINES.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            style={{
              height: `${((lastLine - firstLine + 1) / LINES.length) * 100}%`,
            }}
          />

          <pre className="relative px-3 font-mono text-[11px] leading-[1.65]">
            {LINES.map((line, index) => {
              const active = line.phase === phaseIndex
              return (
                <div
                  key={`${line.text}-${index}`}
                  className={cn(
                    "flex gap-3 rounded-sm px-1 transition-colors duration-500",
                    active ? "text-foreground" : "text-muted/45",
                  )}
                >
                  <span className="w-5 shrink-0 select-none text-right text-muted/25">
                    {index + 1}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{line.text}</span>
                </div>
              )
            })}
          </pre>
        </div>
      </div>

      <p className="mt-3 min-h-[2.5rem] font-mono text-[11px] leading-relaxed text-muted-strong">
        <span className="text-primary-soft">▸ </span>
        {typed}
        <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-primary/70 animate-pulse" />
      </p>
    </div>
  )
}
