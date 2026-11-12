import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Binary,
  Calculator,
  Check,
  CheckCircle2,
  Copy,
  Dices,
  Equal,
  GitBranch,
  Hash,
  Layers,
  Loader2,
  Play,
  Sigma,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react"
import {
  karatsubaTraced,
  type KaratsubaTraceResult,
  type KaratsubaTraceStep,
} from "../Karatsuba"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import { Label, Textarea } from "../components/ui/input"
import { PlayerControls } from "../components/PlayerControls"
import { Stat } from "../components/Stat"
import { StepLog } from "../components/StepLog"
import { usePlayer } from "../hooks/usePlayer"
import { cn, formatMs, formatNumber, shorten } from "../lib/utils"

function randomBig(digits: number): string {
  let value = String(1 + Math.floor(Math.random() * 9))
  for (let i = 1; i < digits; i += 1) {
    value += String(Math.floor(Math.random() * 10))
  }
  return value
}

function schoolbookMultiply(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n
  let result = 0n
  let shift = 1n
  let rest = a
  while (rest > 0n) {
    result += (rest % 10n) * b * shift
    rest /= 10n
    shift *= 10n
  }
  return result
}

const PRESETS = [16, 32, 64, 128, 256, 512]

interface Timing {
  karatsuba: number
  schoolbook: number
}

export function KaratsubaPage() {
  const [a, setA] = useState(() => randomBig(64))
  const [b, setB] = useState(() => randomBig(64))
  const [result, setResult] = useState<KaratsubaTraceResult | null>(null)
  const [trace, setTrace] = useState<KaratsubaTraceStep[]>([])
  const [expected, setExpected] = useState<bigint | null>(null)
  const [timing, setTiming] = useState<Timing | null>(null)
  const [schoolMultiplications, setSchoolMultiplications] = useState<number | null>(
    null,
  )
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const player = usePlayer(300)
  const { clear: clearPlayer, seek, load } = player

  const resetRun = () => {
    setResult(null)
    setTrace([])
    setExpected(null)
    setTiming(null)
    setSchoolMultiplications(null)
    setError(null)
    clearPlayer()
  }

  const applyPreset = (digits: number) => {
    setA(randomBig(digits))
    setB(randomBig(digits))
    resetRun()
  }

  const randomize = (target: "a" | "b") => {
    const digits = target === "a" ? a.length || 64 : b.length || 64
    if (target === "a") setA(randomBig(digits))
    else setB(randomBig(digits))
    resetRun()
  }

  const run = () => {
    if (!a || !b) {
      setError("Both integers need at least one digit.")
      return
    }
    setError(null)
    setIsRunning(true)
    window.requestAnimationFrame(() => {
      const x = BigInt(a)
      const y = BigInt(b)

      const t0 = performance.now()
      const traced = karatsubaTraced(x, y)
      const t1 = performance.now()
      const school = schoolbookMultiply(x, y)
      const t2 = performance.now()

      setResult(traced)
      setTrace(traced.trace)
      setExpected(school)
      setTiming({ karatsuba: t1 - t0, schoolbook: t2 - t1 })
      setSchoolMultiplications(a.length * b.length)
      load(traced.trace.length, { autoplay: true, speed: 300 })
      setIsRunning(false)
    })
  }

  const step = player.index >= 0 ? trace[player.index] ?? null : null
  const stack = step?.stack ?? []
  const liveResult = step?.result
  const displayProduct = liveResult
  const isLive = trace.length > 0
  const finished = !isLive || player.index >= trace.length - 1

  const copyProduct = async () => {
    const value = displayProduct ?? result?.product
    if (value === undefined) return
    try {
      await navigator.clipboard.writeText(value.toString())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError("Could not access the clipboard.")
    }
  }

  const verified =
    result !== null && expected !== null && result.product === expected
  const speedup =
    timing && timing.karatsuba > 0 ? timing.schoolbook / timing.karatsuba : null
  const maxTime = timing
    ? Math.max(timing.karatsuba, timing.schoolbook, 0.001)
    : 1
  const reduction =
    result && schoolMultiplications
      ? schoolMultiplications / Math.max(result.multiplications, 1)
      : null

  const logSteps = useMemo(
    () =>
      trace.map((entry) => ({
        depth: entry.depth,
        text: entry.message,
        kind: entry.type,
      })),
    [trace],
  )

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="accent">
              <Binary className="h-3 w-3" />
              Divide &amp; Conquer
            </Badge>
            <Badge variant="primary">O(n¹·⁵⁸⁵)</Badge>
            <Badge variant="outline">Big integers</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Karatsuba Multiplication
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            Multiply arbitrarily large integers, then replay every split,
            sub-product and recombination as a visual dry run.
          </p>
        </div>
        <Button
          size="lg"
          onClick={run}
          disabled={isRunning || !a || !b}
          className="shrink-0"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
          {trace.length > 0 ? "Replay dry run" : "Multiply"}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary-soft" />
                Operands
              </CardTitle>
              <CardDescription>
                Digits only — leading zeros are ignored by the parser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label htmlFor="operand-a" className="mb-0">
                      Integer A
                    </Label>
                    <span className="font-mono text-[10px] text-muted">
                      {a.length} digits
                    </span>
                  </div>
                  <Textarea
                    id="operand-a"
                    rows={5}
                    value={a}
                    onChange={(event) => {
                      setA(event.target.value.replace(/\D/g, ""))
                      resetRun()
                    }}
                    placeholder="e.g. 12345678901234567890"
                    spellCheck={false}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1.5 w-full"
                    onClick={() => randomize("a")}
                  >
                    <Dices className="h-3.5 w-3.5" />
                    Randomize A
                  </Button>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label htmlFor="operand-b" className="mb-0">
                      Integer B
                    </Label>
                    <span className="font-mono text-[10px] text-muted">
                      {b.length} digits
                    </span>
                  </div>
                  <Textarea
                    id="operand-b"
                    rows={5}
                    value={b}
                    onChange={(event) => {
                      setB(event.target.value.replace(/\D/g, ""))
                      resetRun()
                    }}
                    placeholder="e.g. 98765432109876543210"
                    spellCheck={false}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1.5 w-full"
                    onClick={() => randomize("b")}
                  >
                    <Dices className="h-3.5 w-3.5" />
                    Randomize B
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                <span className="text-[11px] text-muted">Quick sizes</span>
                {PRESETS.map((digits) => (
                  <button
                    key={digits}
                    type="button"
                    onClick={() => applyPreset(digits)}
                    className="rounded-lg border border-border-strong bg-surface/70 px-2.5 py-1 font-mono text-[11px] text-muted-strong transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {digits}d
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              icon={Hash}
              label="Product digits"
              value={
                result
                  ? finished
                    ? formatNumber(result.product.toString().length)
                    : "…"
                  : "—"
              }
              hint={
                result && !finished ? "Reveal at the end" : "Final length"
              }
              tone="primary"
            />
            <Stat
              icon={Sigma}
              label="Base products"
              value={
                result
                  ? finished
                    ? formatNumber(result.multiplications)
                    : "…"
                  : "—"
              }
              hint={
                result && !finished ? "Reveal at the end" : "Single-digit ops"
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
                result
                  ? finished
                    ? verified
                      ? "Exact"
                      : "Mismatch"
                    : "…"
                  : "—"
              }
              hint={
                result && !finished ? "Complete the run" : "vs. schoolbook"
              }
              tone={
                result && finished
                  ? verified
                    ? "success"
                    : "warning"
                  : "neutral"
              }
            />
          </div>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Equal className="h-4 w-4 text-accent-soft" />
                  Product
                </CardTitle>
                <CardDescription>
                  {displayProduct !== undefined
                    ? `${displayProduct.toString().length} digits · current dry-run value`
                    : "Advance the dry run to reveal the product."}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyProduct}
                disabled={displayProduct === undefined}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </CardHeader>
            <CardContent>
              {displayProduct !== undefined ? (
                <div className="max-h-56 overflow-auto rounded-xl border border-border/80 bg-surface/60 p-4">
                  <p className="break-all font-mono text-xs leading-relaxed text-foreground">
                    {displayProduct.toString()}
                  </p>
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border-strong/70 bg-surface/40">
                  <p className="text-xs text-muted">
                    The product appears as the recursion unwinds.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-accent-soft" />
                Performance
              </CardTitle>
              <CardDescription>
                Karatsuba against a schoolbook reference on the same input.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timing ? (
                <div className="space-y-4">
                  <Bar
                    label="Karatsuba"
                    value={timing.karatsuba}
                    max={maxTime}
                    color="bg-gradient-to-r from-accent-soft to-accent"
                  />
                  <Bar
                    label="Schoolbook"
                    value={timing.schoolbook}
                    max={maxTime}
                    color="bg-gradient-to-r from-danger/80 to-danger"
                  />
                  <div className="grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted">Speed-up</span>
                      <Badge
                        variant={speedup && speedup > 1 ? "success" : "outline"}
                      >
                        <Zap className="h-3 w-3" />
                        {speedup ? `${speedup.toFixed(2)}×` : "—"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted">Fewer ops</span>
                      <Badge variant="accent">
                        {reduction ? `${reduction.toFixed(1)}×` : "—"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted/80">
                    Operation counts favour Karatsuba; wall-clock time depends on
                    the native BigInt backend, which is already highly optimised
                    for small inputs.
                  </p>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border-strong/70 bg-surface/40 px-3 py-4 text-center text-xs text-muted">
                  Run the multiplication to benchmark both approaches.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Binary className="h-4 w-4 text-accent-soft" />
                  Dry run
                </CardTitle>
                <CardDescription>
                  Splits, sub-products and recombination.
                </CardDescription>
              </div>
              {step ? (
                <Badge variant="accent">{step.type}</Badge>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {step ? (
                <>
                  <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-accent-soft">
                        Depth {step.depth}
                      </span>
                      {stack.length > 0 ? (
                        <span className="font-mono text-[10px] text-muted">
                          {stack.length} frame{stack.length === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">
                      {step.message}
                    </p>
                  </div>

                  <PlayerControls player={player} />

                  {stack.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
                          Call stack
                        </span>
                        <span className="font-mono text-[10px] text-muted">
                          top = depth {stack[stack.length - 1].depth}
                        </span>
                      </div>
                      <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                        {[...stack].reverse().map((frame, index) => {
                          const isTop = index === 0
                          return (
                            <div
                              key={index}
                              className={cn(
                                "rounded-lg border px-2.5 py-1.5 transition-colors",
                                isTop
                                  ? "border-accent/30 bg-accent/[0.08]"
                                  : "border-border/60 bg-surface/40 opacity-70",
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
                                  depth {frame.depth}
                                </span>
                                <span className="font-mono text-[9px] text-muted">
                                  {frame.x.length} × {frame.y.length} digits
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-strong">
                                <span className="truncate">
                                  {shorten(frame.x, 8, 5)}
                                </span>
                                <span className="text-muted">×</span>
                                <span className="truncate">
                                  {shorten(frame.y, 8, 5)}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  <KaratsubaBoard step={step} />
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong/70 bg-surface/40 px-4 py-8 text-center">
                  <Binary className="h-5 w-5 text-muted/60" />
                  <p className="max-w-48 text-xs leading-relaxed text-muted">
                    Press “Multiply” to launch the visual dry run, then play,
                    step forward, step back or reset.
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
                accent="accent"
                emptyHint="Run the multiplication to inspect its recursion trace."
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
                Three half-size products replace four.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border/80 bg-surface/60 p-4 font-mono text-[11px] leading-relaxed text-muted-strong">
                <p>
                  x = a · 10<sup>m</sup> + b
                </p>
                <p>
                  y = c · 10<sup>m</sup> + d
                </p>
                <p className="mt-2 text-primary-soft">z₂ = a · c</p>
                <p className="text-primary-soft">z₀ = b · d</p>
                <p className="text-primary-soft">
                  z₁ = (a+b)(c+d) − z₂ − z₀
                </p>
                <p className="mt-2 text-foreground">
                  xy = z₂ · 10<sup>2m</sup> + z₁ · 10<sup>m</sup> + z₀
                </p>
              </div>
              <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-accent-soft">
                  <Sparkles className="h-3.5 w-3.5" />
                  Why it is faster
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Each level makes 3 recursive calls instead of 4, giving the
                  recurrence T(n) = 3T(n/2) + O(n) and a running time of Θ(n
                  <sup>1.585</sup>).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DigitRow({
  label,
  high,
  low,
  m,
}: {
  label: string
  high: bigint
  low: bigint
  m: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted">
        <span>{label}</span>
        <span className="font-mono normal-case">m = {m}</span>
      </div>
      <div className="mt-1 flex gap-1">
        <span
          className="min-w-0 flex-1 truncate rounded-md bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary-soft ring-1 ring-primary/20"
          title={high.toString()}
        >
          {shorten(high, 8, 5)}
        </span>
        <span
          className="min-w-0 flex-1 truncate rounded-md bg-accent/10 px-2 py-1 font-mono text-[10px] text-accent-soft ring-1 ring-accent/20"
          title={low.toString()}
        >
          {shorten(low, 8, 5)}
        </span>
      </div>
      <div className="mt-0.5 flex gap-1 text-center font-mono text-[8px] text-muted/70">
        <span className="flex-1">high</span>
        <span className="flex-1">low</span>
      </div>
    </div>
  )
}

function ValueBox({
  label,
  value,
  tone,
}: {
  label: string
  value?: bigint
  tone: "primary" | "accent" | "warning" | "success"
}) {
  const toneClass = {
    primary: "border-primary/25 bg-primary/[0.07] text-primary-soft",
    accent: "border-accent/25 bg-accent/[0.07] text-accent-soft",
    warning: "border-warning/25 bg-warning/[0.07] text-warning",
    success: "border-success/25 bg-success/[0.07] text-success",
  }[tone]

  return (
    <div className={cn("rounded-lg border px-2 py-1.5", toneClass)}>
      <p className="text-[9px] uppercase tracking-wider opacity-80">{label}</p>
      <p
        className="mt-0.5 truncate font-mono text-[10px] text-foreground"
        title={value?.toString()}
      >
        {value === undefined ? "—" : shorten(value, 8, 5)}
      </p>
    </div>
  )
}

function KaratsubaBoard({ step }: { step: KaratsubaTraceStep }) {
  if (step.type === "done") {
    return (
      <div className="rounded-xl border border-success/25 bg-success/[0.06] p-3">
        <p className="text-[10px] uppercase tracking-wider text-success">
          Final product
        </p>
        <p className="mt-1 max-h-32 overflow-auto break-all font-mono text-[11px] leading-relaxed text-foreground">
          {step.result?.toString()}
        </p>
      </div>
    )
  }

  if (step.type === "base") {
    return (
      <div className="rounded-xl border border-warning/25 bg-warning/[0.06] p-3">
        <p className="text-[10px] uppercase tracking-wider text-warning">
          Base case
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted-strong">
          <span className="text-foreground">{shorten(step.x ?? 0n, 10, 6)}</span>
          <span className="text-muted">×</span>
          <span className="text-foreground">{shorten(step.y ?? 0n, 10, 6)}</span>
          <span className="text-muted">=</span>
          <span className="text-success">
            {shorten(step.result ?? 0n, 10, 6)}
          </span>
        </div>
      </div>
    )
  }

  if (step.a === undefined || step.m === undefined) return null

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-surface/50 p-3">
      <div className="grid gap-2">
        <DigitRow label="X" high={step.a} low={step.b ?? 0n} m={step.m} />
        <DigitRow label="Y" high={step.c ?? 0n} low={step.d ?? 0n} m={step.m} />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <ValueBox label="z₂ = ac" value={step.z2} tone="primary" />
        <ValueBox label="z₀ = bd" value={step.z0} tone="accent" />
        <ValueBox label="z₁" value={step.z1} tone="warning" />
      </div>
      {step.result !== undefined ? (
        <ValueBox label="result" value={step.result} tone="success" />
      ) : null}
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
