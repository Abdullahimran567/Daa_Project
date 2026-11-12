import { useCallback, useMemo, useRef, useState, type MouseEvent } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clapperboard,
  Crosshair,
  GitBranch,
  Layers,
  Loader2,
  MousePointerClick,
  Play,
  Radar,
  Ruler,
  Shuffle,
  Sparkles,
  Timer,
  Trash2,
  Zap,
} from "lucide-react"
import {
  closestPairBrute,
  closestPairTraced,
  type ClosestPairTraceResult,
  type ClosestPairTraceStep,
  type Point,
} from "../ClosetPair"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import { PlayerControls } from "../components/PlayerControls"
import { Stat } from "../components/Stat"
import { StepLog } from "../components/StepLog"
import { usePlayer } from "../hooks/usePlayer"
import { cn, formatDistance, formatMs, formatNumber } from "../lib/utils"

const MAX_POINTS = 1000
const SPACE = 1000
const ZOOM_SIZE = 200
const ZOOM_X = SPACE - ZOOM_SIZE - 20
const ZOOM_Y = SPACE - ZOOM_SIZE - 20
const ZOOM_SCALE = 14

const pointKey = (p: Point) => `${p.x},${p.y}`

const STEP_BADGE: Record<string, string> = {
  sort: "bg-white/10 text-muted-strong",
  split: "bg-primary/20 text-primary-soft",
  base: "bg-warning/15 text-warning",
  merge: "bg-success/15 text-success",
  strip: "bg-accent/15 text-accent-soft",
  check: "bg-accent/10 text-accent-soft",
  done: "bg-success/15 text-success",
}

function randomPoints(count: number): Point[] {
  return Array.from({ length: count }, () => ({
    x: Math.round(Math.random() * SPACE),
    y: Math.round(Math.random() * SPACE),
  }))
}

interface Timing {
  divide: number
  brute: number
}

export function ClosestPairPage() {
  const [count, setCount] = useState(120)
  const [points, setPoints] = useState<Point[]>(() => randomPoints(120))
  const [result, setResult] = useState<ClosestPairTraceResult | null>(null)
  const [trace, setTrace] = useState<ClosestPairTraceStep[]>([])
  const [bruteDistance, setBruteDistance] = useState<number | null>(null)
  const [timing, setTiming] = useState<Timing | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const player = usePlayer(300)
  const { clear: clearPlayer, seek, load } = player

  const clearRun = useCallback(() => {
    setResult(null)
    setTrace([])
    setBruteDistance(null)
    setTiming(null)
    setError(null)
    clearPlayer()
  }, [clearPlayer])

  const regenerate = useCallback(
    (next: number) => {
      setCount(next)
      setPoints(randomPoints(next))
      clearRun()
    },
    [clearRun],
  )

  const addPoint = (event: MouseEvent<SVGSVGElement>) => {
    if (trace.length > 0) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = Math.round(((event.clientX - rect.left) / rect.width) * SPACE)
    const y = Math.round(((event.clientY - rect.top) / rect.height) * SPACE)
    if (x < 0 || y < 0 || x > SPACE || y > SPACE) return
    setPoints((prev) => [...prev, { x, y }])
    setCount((prev) => Math.min(prev + 1, MAX_POINTS + 1))
    clearRun()
  }

  const clear = () => {
    setPoints([])
    setCount(0)
    clearRun()
  }

  const run = () => {
    if (points.length < 2) {
      setError("Add at least two points to search for a closest pair.")
      return
    }
    setError(null)
    setIsRunning(true)
    window.requestAnimationFrame(() => {
      const t0 = performance.now()
      const traced = closestPairTraced(points)
      const t1 = performance.now()
      const brute = closestPairBrute(points)
      const t2 = performance.now()
      setResult(traced)
      setTrace(traced.trace)
      setBruteDistance(brute)
      setTiming({ divide: t1 - t0, brute: t2 - t1 })
      load(traced.trace.length, { autoplay: true, speed: 300 })
      setIsRunning(false)
    })
  }

  const step = player.index >= 0 ? trace[player.index] ?? null : null
  const bestPair = step?.best ?? null
  const check = step?.check
  const midX = step?.midX
  const hasStrip = Boolean(step?.strip)
  const isLive = trace.length > 0
  const finished = !isLive || player.index >= trace.length - 1
  const displayPair =
    finished && result ? { a: result.a, b: result.b } : (step?.best ?? null)

  const subsetSet = useMemo(() => {
    if (!step?.subset) return null
    return new Set(step.subset.map(pointKey))
  }, [step])

  const roleMap = useMemo(() => {
    const map = new Map<string, "left" | "right" | "strip">()
    step?.left?.forEach((p) => map.set(pointKey(p), "left"))
    step?.right?.forEach((p) => map.set(pointKey(p), "right"))
    step?.strip?.forEach((p) => map.set(pointKey(p), "strip"))
    return map
  }, [step])

  const zoomPoints = useMemo(() => {
    if (!bestPair) return []
    const cx = (bestPair.a.x + bestPair.b.x) / 2
    const cy = (bestPair.a.y + bestPair.b.y) / 2
    const radius = (ZOOM_SIZE / (2 * ZOOM_SCALE)) * 1.5
    return points.filter(
      (p) => Math.abs(p.x - cx) <= radius && Math.abs(p.y - cy) <= radius,
    )
  }, [points, bestPair])

  const logSteps = useMemo(
    () =>
      trace.map((entry) => ({
        depth: entry.depth,
        text: entry.message,
        kind: entry.type,
      })),
    [trace],
  )

  const verified =
    result !== null &&
    bruteDistance !== null &&
    Math.abs(result.distance - bruteDistance) < 1e-9

  const speedup =
    timing && timing.divide > 0 ? timing.brute / timing.divide : null
  const maxTime = timing ? Math.max(timing.divide, timing.brute, 0.001) : 1

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="primary">
              <Radar className="h-3 w-3" />
              Divide &amp; Conquer
            </Badge>
            <Badge variant="accent">O(n log n)</Badge>
            <Badge variant="outline">2D geometry</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Closest Pair of Points
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            Generate a point cloud, drop your own points, then replay the
            divide-and-conquer dry run step by step.
          </p>
        </div>
        <Button
          size="lg"
          onClick={run}
          disabled={isRunning || points.length < 2}
          className="shrink-0"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
          {isLive ? "Replay dry run" : "Run algorithm"}
        </Button>
      </header>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-primary-soft" />
                  Point cloud
                </CardTitle>
                <CardDescription>
                  {isLive
                    ? "Dry run active — highlighted points follow the current step."
                    : "Click anywhere on the canvas to add a point."}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {formatNumber(points.length)} points
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => regenerate(count || 120)}
                  aria-label="Randomize points"
                  title="Randomize points"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/80 bg-[#08080e]">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${SPACE} ${SPACE}`}
                  className={cn(
                    "h-full w-full",
                    isLive ? "cursor-default" : "cursor-crosshair",
                  )}
                  onClick={addPoint}
                  role="img"
                  aria-label="Point cloud with closest pair dry run highlighted"
                >
                  <defs>
                    <pattern
                      id="cp-grid"
                      width="100"
                      height="100"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 100 0 L 0 0 0 100"
                        fill="none"
                        stroke="rgba(255,255,255,0.045)"
                        strokeWidth="1"
                      />
                    </pattern>
                    <linearGradient
                      id="cp-pair"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                    <radialGradient id="cp-glow">
                      <stop offset="0%" stopColor="rgba(167,139,250,0.5)" />
                      <stop offset="100%" stopColor="rgba(167,139,250,0)" />
                    </radialGradient>
                    <clipPath id="cp-zoom-clip">
                      <rect
                        x={ZOOM_X}
                        y={ZOOM_Y}
                        width={ZOOM_SIZE}
                        height={ZOOM_SIZE}
                        rx={16}
                      />
                    </clipPath>
                  </defs>
                  <rect width={SPACE} height={SPACE} fill="url(#cp-grid)" />

                  {hasStrip && bestPair && midX !== undefined ? (
                    <rect
                      x={midX - bestPair.d}
                      y={0}
                      width={bestPair.d * 2}
                      height={SPACE}
                      fill="rgba(34,211,238,0.05)"
                      stroke="rgba(34,211,238,0.25)"
                      strokeWidth="1"
                      strokeDasharray="6 6"
                    />
                  ) : null}

                  {midX !== undefined ? (
                    <line
                      x1={midX}
                      y1={0}
                      x2={midX}
                      y2={SPACE}
                      stroke="rgba(167,139,250,0.55)"
                      strokeWidth="1.5"
                      strokeDasharray="8 6"
                    />
                  ) : null}

                  {points.map((p, index) => {
                    const key = pointKey(p)
                    const inSubset = !subsetSet || subsetSet.has(key)
                    const role = roleMap.get(key)
                    const isA =
                      bestPair !== null &&
                      p.x === bestPair.a.x &&
                      p.y === bestPair.a.y
                    const isB =
                      bestPair !== null &&
                      p.x === bestPair.b.x &&
                      p.y === bestPair.b.y
                    const isBest = isA || isB
                    const fill = isA
                      ? "#c4b5fd"
                      : isB
                        ? "#67e8f9"
                        : role === "left"
                          ? "#a78bfa"
                          : role === "right"
                            ? "#67e8f9"
                            : role === "strip"
                              ? "#fbbf24"
                              : "#6f6f92"
                    return (
                      <circle
                        key={index}
                        cx={p.x}
                        cy={p.y}
                        r={isBest ? 6 : role ? 3.8 : 2.6}
                        fill={fill}
                        opacity={inSubset ? 1 : 0.12}
                      />
                    )
                  })}

                  {check ? (
                    <g>
                      <line
                        x1={check.p.x}
                        y1={check.p.y}
                        x2={check.q.x}
                        y2={check.q.y}
                        stroke={check.improved ? "#34d399" : "#fbbf24"}
                        strokeWidth="1.5"
                        strokeDasharray="5 5"
                        opacity="0.9"
                      />
                      <circle
                        cx={check.p.x}
                        cy={check.p.y}
                        r={10}
                        fill="none"
                        stroke={check.improved ? "#34d399" : "#fbbf24"}
                        strokeWidth="1.5"
                        opacity="0.8"
                      />
                      <circle
                        cx={check.q.x}
                        cy={check.q.y}
                        r={10}
                        fill="none"
                        stroke={check.improved ? "#34d399" : "#fbbf24"}
                        strokeWidth="1.5"
                        opacity="0.8"
                      />
                    </g>
                  ) : null}

                  {bestPair ? (
                    <g>
                      <circle
                        cx={bestPair.a.x}
                        cy={bestPair.a.y}
                        r={26}
                        fill="url(#cp-glow)"
                      />
                      <circle
                        cx={bestPair.b.x}
                        cy={bestPair.b.y}
                        r={26}
                        fill="url(#cp-glow)"
                      />
                      <line
                        x1={bestPair.a.x}
                        y1={bestPair.a.y}
                        x2={bestPair.b.x}
                        y2={bestPair.b.y}
                        stroke="url(#cp-pair)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle
                        cx={bestPair.a.x}
                        cy={bestPair.a.y}
                        r={11}
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="1.5"
                        className="animate-pulse-ring"
                        style={{
                          transformOrigin: `${bestPair.a.x}px ${bestPair.a.y}px`,
                        }}
                      />
                      <circle
                        cx={bestPair.b.x}
                        cy={bestPair.b.y}
                        r={11}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="1.5"
                        className="animate-pulse-ring"
                        style={{
                          transformOrigin: `${bestPair.b.x}px ${bestPair.b.y}px`,
                        }}
                      />
                    </g>
                  ) : null}

                  {bestPair ? (
                    <g>
                      <rect
                        x={ZOOM_X}
                        y={ZOOM_Y}
                        width={ZOOM_SIZE}
                        height={ZOOM_SIZE}
                        rx={16}
                        fill="#08080e"
                        stroke="rgba(167,139,250,0.35)"
                        strokeWidth="1.5"
                      />
                      <g clipPath="url(#cp-zoom-clip)">
                        <g
                          transform={`translate(${ZOOM_X + ZOOM_SIZE / 2}, ${
                            ZOOM_Y + ZOOM_SIZE / 2
                          }) scale(${ZOOM_SCALE}) translate(${
                            -((bestPair.a.x + bestPair.b.x) / 2)
                          }, ${-((bestPair.a.y + bestPair.b.y) / 2)})`}
                        >
                          {zoomPoints.map((p, index) => {
                            const isA =
                              p.x === bestPair.a.x && p.y === bestPair.a.y
                            const isB =
                              p.x === bestPair.b.x && p.y === bestPair.b.y
                            return (
                              <circle
                                key={index}
                                cx={p.x}
                                cy={p.y}
                                r={2.6 / ZOOM_SCALE}
                                fill={
                                  isA
                                    ? "#c4b5fd"
                                    : isB
                                      ? "#67e8f9"
                                      : "#6f6f92"
                                }
                                opacity={isA || isB ? 1 : 0.5}
                              />
                            )
                          })}
                          <line
                            x1={bestPair.a.x}
                            y1={bestPair.a.y}
                            x2={bestPair.b.x}
                            y2={bestPair.b.y}
                            stroke="url(#cp-pair)"
                            strokeWidth={2 / ZOOM_SCALE}
                            strokeLinecap="round"
                          />
                          <circle
                            cx={bestPair.a.x}
                            cy={bestPair.a.y}
                            r={6 / ZOOM_SCALE}
                            fill="#c4b5fd"
                          />
                          <circle
                            cx={bestPair.b.x}
                            cy={bestPair.b.y}
                            r={6 / ZOOM_SCALE}
                            fill="#67e8f9"
                          />
                        </g>
                      </g>
                      <rect
                        x={ZOOM_X}
                        y={ZOOM_Y}
                        width={ZOOM_SIZE}
                        height={ZOOM_SIZE}
                        rx={16}
                        fill="none"
                        stroke="rgba(167,139,250,0.35)"
                        strokeWidth="1.5"
                      />
                      <text
                        x={ZOOM_X + 14}
                        y={ZOOM_Y + 24}
                        fill="#8f8fa8"
                        fontSize="12"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        ZOOM ×{ZOOM_SCALE}
                      </text>
                    </g>
                  ) : null}
                </svg>

                {points.length === 0 ? (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                    <MousePointerClick className="h-7 w-7 text-muted/60" />
                    <p className="text-xs text-muted">
                      Click to add points or randomize the cloud.
                    </p>
                  </div>
                ) : null}

                {step ? (
                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg border border-border-strong bg-[#0b0b13]/85 px-2.5 py-1.5 backdrop-blur">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                        STEP_BADGE[step.type] ?? "bg-white/10 text-muted-strong",
                      )}
                    >
                      {step.type}
                    </span>
                    <span className="font-mono text-[10px] text-muted">
                      depth {step.depth}
                    </span>
                  </div>
                ) : null}

                {bestPair ? (
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border border-border-strong bg-[#0b0b13]/85 px-3 py-1.5 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary-soft to-accent" />
                    <span className="font-mono text-[11px] text-muted-strong">
                      d = {formatDistance(bestPair.d)}
                    </span>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              icon={Ruler}
              label="Distance"
              value={
                finished && result
                  ? formatDistance(result.distance)
                  : step?.best
                    ? formatDistance(step.best.d)
                    : isLive
                      ? "…"
                      : "—"
              }
              hint={
                finished
                  ? "Euclidean minimum"
                  : step?.best
                    ? "Live best so far"
                    : isLive
                      ? "Reveal at the end"
                      : "Euclidean minimum"
              }
              tone="primary"
            />
            <Stat
              icon={Crosshair}
              label="Closest pair"
              value={
                displayPair
                  ? `(${displayPair.a.x}, ${displayPair.a.y})`
                  : isLive
                    ? "…"
                    : "—"
              }
              hint={
                displayPair
                  ? `↔ (${displayPair.b.x}, ${displayPair.b.y})`
                  : isLive
                    ? "Reveal at the end"
                    : "Coordinates"
              }
              tone="accent"
            />
            <Stat
              icon={GitBranch}
              label="Trace steps"
              value={result ? formatNumber(trace.length) : "—"}
              hint="Replayable events"
              tone="neutral"
            />
            <Stat
              icon={CheckCircle2}
              label="Verified"
              value={
                finished && result
                  ? verified
                    ? "Exact"
                    : "Mismatch"
                  : isLive
                    ? "…"
                    : "—"
              }
              hint={
                finished && bruteDistance !== null
                  ? `Brute d = ${formatDistance(bruteDistance)}`
                  : isLive
                    ? "Complete the run"
                    : "vs. brute force"
              }
              tone={
                finished && result
                  ? verified
                    ? "success"
                    : "warning"
                  : "neutral"
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-accent-soft" />
                Performance
              </CardTitle>
              <CardDescription>
                Measured on this machine for the current cloud.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timing ? (
                <div className="space-y-4">
                  <Bar
                    label="Divide & conquer"
                    value={timing.divide}
                    max={maxTime}
                    color="bg-gradient-to-r from-primary-soft to-primary"
                  />
                  <Bar
                    label="Brute force"
                    value={timing.brute}
                    max={maxTime}
                    color="bg-gradient-to-r from-danger/80 to-danger"
                  />
                  <div className="flex items-center justify-between border-t border-border/70 pt-3">
                    <span className="text-[11px] text-muted">
                      Speed-up vs. brute force
                    </span>
                    <Badge
                      variant={speedup && speedup > 1 ? "success" : "outline"}
                    >
                      <Zap className="h-3 w-3" />
                      {speedup ? `${speedup.toFixed(2)}×` : "—"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border-strong/70 bg-surface/40 px-3 py-4 text-center text-xs text-muted">
                  Run the algorithm to benchmark both approaches.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Tune the input size, then generate a fresh cloud.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-strong">
                    Number of points
                  </span>
                  <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-xs text-foreground">
                    {formatNumber(count)}
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={MAX_POINTS}
                  value={Math.min(count, MAX_POINTS)}
                  onChange={(event) => regenerate(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border-strong accent-[#8b5cf6]"
                  aria-label="Number of points"
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
                  <span>2</span>
                  <span>{MAX_POINTS}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => regenerate(count || 120)}
                >
                  <Shuffle className="h-4 w-4" />
                  Generate
                </Button>
                <Button variant="outline" onClick={clear}>
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-primary-soft">
                  <MousePointerClick className="h-3.5 w-3.5" />
                  Canvas editing
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Click the point cloud to drop a point at that coordinate.
                  Editing is locked while a dry run is loaded.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clapperboard className="h-4 w-4 text-primary-soft" />
                  Dry run
                </CardTitle>
                <CardDescription>
                  Watch each split, comparison and merge.
                </CardDescription>
              </div>
              {step ? (
                <Badge variant="primary">{step.type}</Badge>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {step ? (
                <>
                  <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-primary-soft">
                        Depth {step.depth}
                      </span>
                      {step.best ? (
                        <span className="font-mono text-[10px] text-muted">
                          best d ={" "}
                          <span className="text-foreground">
                            {step.best.d.toFixed(4)}
                          </span>
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">
                      {step.message}
                    </p>
                  </div>
                  <PlayerControls player={player} />
                  <Legend />
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong/70 bg-surface/40 px-4 py-8 text-center">
                  <MousePointerClick className="h-5 w-5 text-muted/60" />
                  <p className="max-w-48 text-xs leading-relaxed text-muted">
                    Press “Run algorithm” to launch the visual dry run, then use
                    play, next, previous and reset.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary-soft" />
                  Recursion trace
                </CardTitle>
                <CardDescription>
                  Click any step to jump straight to it.
                </CardDescription>
              </div>
              {trace.length > 0 ? (
                <Badge variant="outline">{trace.length}</Badge>
              ) : null}
            </CardHeader>
            <CardContent>
              <StepLog
                steps={logSteps}
                activeIndex={player.index}
                onSelect={seek}
                emptyHint="Run the algorithm to inspect its divide-and-conquer trace."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent-soft" />
                How it works
              </CardTitle>
              <CardDescription>
                Two halves, then a narrow strip check.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="space-y-2.5">
                {[
                  {
                    title: "Sort",
                    body: "Order the points by x-coordinate.",
                  },
                  {
                    title: "Divide",
                    body: "Split the set into left and right halves at the median x.",
                  },
                  {
                    title: "Conquer",
                    body: "Recursively find the closest pair in each half.",
                  },
                  {
                    title: "Combine",
                    body: "Scan points within d of the split line, comparing by y.",
                  },
                ].map((item, index) => (
                  <li key={item.title} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface font-mono text-[10px] text-muted-strong">
                      {index + 1}
                    </span>
                    <p className="text-[11px] leading-relaxed text-muted">
                      <span className="font-medium text-foreground">
                        {item.title}.
                      </span>{" "}
                      {item.body}
                    </p>
                  </li>
                ))}
              </ol>
              <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-primary-soft">
                  <Sparkles className="h-3.5 w-3.5" />
                  Complexity
                </p>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                  T(n) = 2T(n/2) + O(n) → Θ(n log n)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Legend() {
  const items = [
    { color: "bg-primary-soft", label: "Left half" },
    { color: "bg-accent-soft", label: "Right half" },
    { color: "bg-warning", label: "Strip" },
    { color: "bg-[#c4b5fd]", label: "Pair A" },
    { color: "bg-[#67e8f9]", label: "Pair B" },
  ]
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-border/70 pt-3">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-[10px] text-muted"
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", item.color)} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const width = Math.max((value / max) * 100, 2)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] text-muted-strong">{label}</span>
        <span className="font-mono text-[11px] text-foreground">
          {formatMs(value)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
