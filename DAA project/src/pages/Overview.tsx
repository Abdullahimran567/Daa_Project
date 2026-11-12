import { useMemo } from "react"
import {
  ArrowRight,
  Binary,
  CheckCircle2,
  FileCode2,
  FlaskConical,
  Gauge,
  LineChart as LineChartIcon,
  Radar,
  Sigma,
  Sparkles,
} from "lucide-react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"

interface OverviewProps {
  onNavigate: (page: "closest-pair" | "karatsuba") => void
}

function growthData() {
  const sizes = [10, 25, 50, 100, 200, 400, 800, 1200]
  return sizes.map((n) => ({
    n,
    divide: Math.round(n * Math.log2(n)),
    brute: n * n,
    karatsuba: Math.round(Math.pow(n, 1.585)),
    schoolbook: n * n,
  }))
}

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border-strong bg-[#0c0c14]/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="mb-1.5 font-mono text-[11px] text-muted">n = {label}</p>
      {payload.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center justify-between gap-4 text-[11px]"
        >
          <span className="flex items-center gap-1.5 text-muted-strong">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-mono text-foreground">
            {entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Overview({ onNavigate }: OverviewProps) {
  const data = useMemo(() => growthData(), [])

  return (
    <div className="animate-rise space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-8 shadow-card md:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/20 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
        <div className="relative max-w-2xl">
          <Badge variant="primary" className="mb-5">
            <Sparkles className="h-3 w-3" />
            Design &amp; Analysis of Algorithms
          </Badge>
          <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
            An interactive workbench for{" "}
            <span className="text-gradient">divide &amp; conquer</span>.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted md:text-base">
            Explore two classic algorithms — the Closest Pair of Points and
            Karatsuba integer multiplication. Generate inputs, watch the
            recursion trace, and verify every answer against a brute-force
            reference.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => onNavigate("closest-pair")}>
              <Radar className="h-4 w-4" />
              Closest Pair
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => onNavigate("karatsuba")}
            >
              <Binary className="h-4 w-4" />
              Karatsuba
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavigate("closest-pair")}
          className="group text-left focus-visible:outline-none"
        >
          <Card className="h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary-soft ring-1 ring-primary/25">
                  <Radar className="h-5 w-5" />
                </span>
                <Badge variant="accent">O(n log n)</Badge>
              </div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">
                Closest Pair of Points
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Split the plane, solve each half recursively, then scan the
                vertical strip to find the nearest pair in optimal time.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs font-medium text-primary-soft">
                Open workbench
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("karatsuba")}
          className="group text-left focus-visible:outline-none"
        >
          <Card className="h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-glow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent-soft ring-1 ring-accent/25">
                  <Binary className="h-5 w-5" />
                </span>
                <Badge variant="accent">O(n¹·⁵⁸⁵)</Badge>
              </div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">
                Karatsuba Multiplication
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Multiply huge integers with three recursive half-size products
                instead of four — sub-quadratic by divide and conquer.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs font-medium text-accent-soft">
                Open workbench
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        </button>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <LineChartIcon className="h-4 w-4 text-primary-soft" />
                  Operation growth
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Logarithmic scale — why divide and conquer wins as inputs grow.
                </p>
              </div>
              <Badge variant="outline">log scale</Badge>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke="#222232" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="n"
                    stroke="#6b6b85"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "#2a2a3d" }}
                  />
                  <YAxis
                    scale="log"
                    domain={[10, 2000000]}
                    stroke="#6b6b85"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${v / 1000}k` : `${v}`
                    }
                  />
                  <Tooltip content={<TooltipBox />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#8f8fa8" }}
                    iconType="circle"
                    iconSize={7}
                  />
                  <Line
                    type="monotone"
                    dataKey="divide"
                    name="Closest Pair · n log n"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="brute"
                    name="Brute force · n²"
                    stroke="#fb7185"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="karatsuba"
                    name="Karatsuba · n¹·⁵⁸⁵"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <FlaskConical className="h-4 w-4 text-accent-soft" />
              Project pipeline
            </h2>
            <p className="mt-1 text-xs text-muted">
              The same generate → solve → verify loop that powers the CLI
              harness.
            </p>
            <ol className="mt-5 space-y-3">
              {[
                {
                  icon: FileCode2,
                  title: "Generate",
                  body: "Deterministic test inputs across ten increasing sizes.",
                },
                {
                  icon: Sigma,
                  title: "Solve",
                  body: "Run the divide-and-conquer core with a full step trace.",
                },
                {
                  icon: CheckCircle2,
                  title: "Verify",
                  body: "Cross-check results against brute force and schoolbook.",
                },
                {
                  icon: Gauge,
                  title: "Compare",
                  body: "Inspect timing, operation counts, and complexity.",
                },
              ].map((item, index) => (
                <li key={item.title} className="flex gap-3">
                  <span className="relative flex flex-col items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong bg-surface text-muted-strong">
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    {index < 3 ? (
                      <span className="mt-1 h-4 w-px bg-border-strong" />
                    ) : null}
                  </span>
                  <div className="pb-1">
                    <p className="text-xs font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
