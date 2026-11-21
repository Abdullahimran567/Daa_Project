import { useCallback, useMemo, useRef, useState, type MouseEvent } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  GitBranch,
  Layers,
  Loader2,
  MousePointerClick,
  Play,
  Radar,
  Shuffle,
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
import { DryRunPanel } from "../components/DryRunPanel"
import { LiveStats } from "../components/LiveStats"
import { PointCanvas } from "../components/PointCanvas"
import { Stat } from "../components/Stat"
import { StepLog } from "../components/StepLog"
import { DEFAULT_SPEED, usePlayer } from "../hooks/usePlayer"
import { cn, formatDistance, formatMs, formatNumber } from "../lib/utils"

const MAX_POINTS = 1000
const SPACE = 1000

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
  const player = usePlayer(DEFAULT_SPEED)
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
      load(traced.trace.length, { autoplay: true, speed: DEFAULT_SPEED })
      setIsRunning(false)
    })
  }

  const step = player.index >= 0 ? (trace[player.index] ?? null) : null
  const hasStrip = Boolean(step?.strip)
  const isLive = trace.length > 0
  const finished = !isLive || player.index >= trace.length - 1

  // The winning pair persists across steps: split events do not carry a pair
  // of their own, so the most recent one is carried forward and eased into.
  const bestTimeline = useMemo(() => {
    const timeline: (ClosestPairTraceStep["best"] | null)[] = []
    let last: ClosestPairTraceStep["best"] | null = null
    for (const entry of trace) {
      if (entry.best) last = entry.best
      timeline.push(last)
    }
    return timeline
  }, [trace])

  const liveBest = useMemo(() => {
    if (finished && result) {
      return { a: result.a, b: result.b, d: result.distance }
    }
    return player.index >= 0 ? (bestTimeline[player.index] ?? null) : null
  }, [bestTimeline, finished, result, player.index])

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
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <Badge variant="primary">
              <Radar className="h-3 w-3" />
              Divide &amp; Conquer
            </Badge>
            <Badge variant="outline">O(n log n)</Badge>
            <Badge variant="outline">2D geometry</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            Closest Pair of Points
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">
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
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
          {isLive ? "Replay dry run" : "Run algorithm"}
        </Button>
      </header>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/[0.08] px-3.5 py-2.5 text-[12px] text-danger">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>
                  <Crosshair className="h-3.5 w-3.5 text-primary-soft" />
                  Point cloud
                </CardTitle>
                <CardDescription>
                  {isLive
                    ? "Dry run active — highlights follow the current step."
                    : "Click anywhere on the canvas to add a point."}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{formatNumber(points.length)} pts</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => regenerate(count || 120)}
                  aria-label="Randomize points"
                  title="Randomize points"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-[#0a0b0d]">
                <PointCanvas
                  points={points}
                  step={step}
                  best={liveBest}
                  transitionMs={player.transitionMs}
                  interactive={trace.length === 0}
                  svgRef={svgRef}
                  onAddPoint={addPoint}
                />

                {points.length === 0 ? (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                    <MousePointerClick className="h-6 w-6 text-muted/50" />
                    <p className="text-[11.5px] text-muted">
                      Click to add points or randomize the cloud.
                    </p>
                  </div>
                ) : null}

                {step ? (
                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border border-border-strong bg-[#0b0c0f]/90 px-2 py-1">
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-primary-soft">
                      {step.type}
                    </span>
                    <span className="font-mono text-[9.5px] text-muted">
                      depth {step.depth}
                    </span>
                  </div>
                ) : null}

                {hasStrip && step?.strip?.length ? (
                  <div className="absolute right-3 top-3 rounded-md border border-warning/30 bg-[#0b0c0f]/90 px-2 py-1 font-mono text-[9.5px] text-warning">
                    strip · {step.strip.length}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <LiveStats
              best={liveBest}
              transitionMs={player.transitionMs}
            />
            <Stat
              icon={GitBranch}
              label="Trace steps"
              value={result ? formatNumber(trace.length) : "—"}
              hint="Recorded events"
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
              <CardTitle>
                <Timer className="h-3.5 w-3.5 text-accent-soft" />
                Performance
              </CardTitle>
              <CardDescription>
                Measured on this machine for the current cloud.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timing ? (
                <div className="space-y-3.5">
                  <Bar
                    label="Divide & conquer"
                    value={timing.divide}
                    max={maxTime}
                    color="bg-primary"
                  />
                  <Bar
                    label="Brute force"
                    value={timing.brute}
                    max={maxTime}
                    color="bg-danger/80"
                  />
                  <div className="flex items-center justify-between border-t border-border pt-3">
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
                <p className="rounded-lg border border-dashed border-border-strong/70 bg-surface/40 px-3 py-3.5 text-center text-[11.5px] text-muted">
                  Run the algorithm to benchmark both approaches.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Tune the input size, then generate a fresh cloud.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    Number of points
                  </span>
                  <span className="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-foreground">
                    {formatNumber(count)}
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={MAX_POINTS}
                  value={Math.min(count, MAX_POINTS)}
                  onChange={(event) => regenerate(Number(event.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-elevated accent-[#4b87f0]"
                  aria-label="Number of points"
                />
                <div className="mt-1.5 flex justify-between font-mono text-[9.5px] text-muted/70">
                  <span>2</span>
                  <span>{MAX_POINTS}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => regenerate(count || 120)}
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Generate
                </Button>
                <Button variant="outline" onClick={clear}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-surface/50 p-3">
                <p className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
                  <MousePointerClick className="h-3 w-3" />
                  Canvas editing
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                  Click the point cloud to drop a point at that coordinate.
                  Editing is locked while a dry run is loaded.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>
                  <Play className="h-3.5 w-3.5 text-primary-soft" />
                  Dry run
                </CardTitle>
                <CardDescription>
                  Watch each split, comparison and merge.
                </CardDescription>
              </div>
              {step ? <Badge variant="primary">{step.type}</Badge> : null}
            </CardHeader>
            <CardContent>
              <DryRunPanel
                player={player}
                step={
                  step
                    ? {
                        type: step.type,
                        depth: step.depth,
                        message: step.message,
                      }
                    : null
                }
                emptyIcon={
                  <MousePointerClick className="h-4 w-4 text-muted/50" />
                }
                emptyHint="Press “Run algorithm” to launch the visual dry run, then use play, next, previous and reset."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>
                  <GitBranch className="h-3.5 w-3.5 text-primary-soft" />
                  Recursion trace
                </CardTitle>
                <CardDescription>Click any step to jump straight to it.</CardDescription>
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
              <CardTitle>
                <Layers className="h-3.5 w-3.5 text-accent-soft" />
                How it works
              </CardTitle>
              <CardDescription>Two halves, then a narrow strip check.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="space-y-2">
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
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border-strong bg-surface font-mono text-[10px] text-muted-strong">
                      {index + 1}
                    </span>
                    <p className="text-[11.5px] leading-relaxed text-muted">
                      <span className="font-medium text-foreground">
                        {item.title}.
                      </span>{" "}
                      {item.body}
                    </p>
                  </li>
                ))}
              </ol>
              <div className="rounded-lg border border-border bg-surface/50 p-3">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
                  Complexity
                </p>
                <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-foreground">
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
        <span className="text-[11.5px] text-muted-strong">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-foreground">
          {formatMs(value)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
