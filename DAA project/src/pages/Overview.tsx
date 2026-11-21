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
} from "lucide-react"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { GrowthChart } from "../components/GrowthChart"

interface OverviewProps {
  onNavigate: (page: "closest-pair" | "karatsuba") => void
}

const META = [
  { label: "Course", value: "Design & Analysis of Algorithms" },
  { label: "Paradigm", value: "Divide & conquer" },
  { label: "Algorithms", value: "Closest pair · Karatsuba" },
  { label: "Verification", value: "Brute-force cross-check" },
]

export function Overview({ onNavigate }: OverviewProps) {
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-6 md:px-8 md:py-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-soft">
            Design &amp; Analysis of Algorithms
          </p>
          <h1 className="mt-3 max-w-3xl text-[1.9rem] font-semibold leading-[1.18] tracking-tight md:text-[2.25rem]">
            An interactive workbench for divide-and-conquer algorithms.
          </h1>
          <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            Generate inputs, replay the recursion trace step by step, and verify
            every answer against a brute-force reference. Two classic
            algorithms, instrumented rather than merely demonstrated.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Button size="lg" onClick={() => onNavigate("closest-pair")}>
              <Radar className="h-3.5 w-3.5" />
              Closest Pair
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => onNavigate("karatsuba")}
            >
              <Binary className="h-3.5 w-3.5" />
              Karatsuba
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-y divide-border border-border md:grid-cols-4 md:divide-y-0">
          {META.map((item) => (
            <div key={item.label} className="px-6 py-4">
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
                {item.label}
              </dt>
              <dd className="mt-1 text-[12px] leading-snug text-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavigate("closest-pair")}
          className="group text-left focus-visible:outline-none"
        >
          <Card className="h-full transition-colors duration-200 hover:border-border-strong">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong bg-elevated">
                  <Radar className="h-4 w-4 text-primary-soft" />
                </span>
                <Badge variant="primary">O(n log n)</Badge>
              </div>
              <h2 className="mt-4 text-[15px] font-semibold tracking-tight">
                Closest Pair of Points
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                Split the plane, solve each half recursively, then scan the
                vertical strip for the nearest pair in optimal time.
              </p>
              <div className="mt-5 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-primary-soft">
                Open workbench
                <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("karatsuba")}
          className="group text-left focus-visible:outline-none"
        >
          <Card className="h-full transition-colors duration-200 hover:border-border-strong">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong bg-elevated">
                  <Binary className="h-4 w-4 text-accent-soft" />
                </span>
                <Badge variant="accent">O(n¹·⁵⁸⁵)</Badge>
              </div>
              <h2 className="mt-4 text-[15px] font-semibold tracking-tight">
                Karatsuba Multiplication
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                Multiply huge integers with three recursive half-size products
                instead of four — sub-quadratic by divide and conquer.
              </p>
              <div className="mt-5 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-accent-soft">
                Open workbench
                <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
            </CardContent>
          </Card>
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
                  <LineChartIcon className="h-3.5 w-3.5 text-primary-soft" />
                  Operation growth
                </h2>
                <p className="mt-1 text-[11.5px] text-muted">
                  Logarithmic scale — why divide and conquer wins as inputs grow.
                </p>
              </div>
              <Badge variant="outline">log scale</Badge>
            </div>
            <GrowthChart />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
              <FlaskConical className="h-3.5 w-3.5 text-accent-soft" />
              Project pipeline
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">
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
                    <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong bg-surface text-muted-strong">
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    {index < 3 ? (
                      <span className="mt-1 h-4 w-px bg-border-strong" />
                    ) : null}
                  </span>
                  <div className="pb-1">
                    <p className="text-[12px] font-semibold text-foreground">
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
