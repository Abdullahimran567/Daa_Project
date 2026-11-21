import { useMemo, useRef, type CSSProperties } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import {
  ArrowRight,
  Binary,
  CheckCircle2,
  FileCode2,
  FlaskConical,
  LineChart as LineChartIcon,
  Radar,
  Sigma,
  Sparkles,
  Waypoints,
} from "lucide-react"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { ClosestPairPreview } from "../components/ClosestPairPreview"
import { KaratsubaPreview } from "../components/KaratsubaPreview"
import { CountUp } from "../components/CountUp"
import { Magnetic } from "../components/Magnetic"
import { Reveal } from "../components/Reveal"
import { TextScramble } from "../components/TextScramble"
import { GrowthChart } from "../components/GrowthChart"
import { CodeReplay } from "../components/CodeReplay"
import { LiveTrace } from "../components/LiveTrace"
import {
  HoloPanel,
  HudChip,
  Marquee,
  SectionHeading,
  Spotlight,
  TiltCard,
} from "../components/Holo"
import { FractureScene } from "../three/FractureScene"

interface OverviewProps {
  onNavigate: (page: "closest-pair" | "karatsuba") => void
}

const PIPELINE = [
  {
    icon: FileCode2,
    title: "Generate",
    body: "Deterministic test inputs across ten increasing sizes.",
    code: "generate.ts",
  },
  {
    icon: Sigma,
    title: "Solve",
    body: "Run the divide-and-conquer core with a full step trace.",
    code: "karatsuba.ts",
  },
  {
    icon: CheckCircle2,
    title: "Verify",
    body: "Cross-check results against brute force and schoolbook.",
    code: "check.ts",
  },
  {
    icon: Waypoints,
    title: "Compare",
    body: "Inspect timing, operation counts, and complexity.",
    code: "harness",
  },
]

const TICKER = [
  "T(n) = 2T(n/2) + O(n) → Θ(n log n)",
  "T(n) = 3T(n/2) + O(n) → Θ(n^1.585)",
  "Θ(n^log₂ b) — the Master Theorem",
  "every result cross-checked against brute force",
  "every step replayable, scrubbable, pausable",
  "WebGL · React 19 · TypeScript · Tailwind v4",
  "3^d base multiplications, visualised in 3D",
  "no chart library, no magic — just the algorithm",
]

export function Overview({ onNavigate }: OverviewProps) {
  const heroStats = useMemo(
    () => [
      { label: "Algorithms", value: 2, decimals: 0, suffix: "" },
      { label: "Closest pair", value: 1, decimals: 0, suffix: "" },
      { label: "Karatsuba", value: 1.585, decimals: 3, suffix: "" },
      { label: "Verified", value: 100, decimals: 0, suffix: "%" },
    ],
    [],
  )

  // Cinematic parallax: the dendrite drifts slower than the copy so the
  // hero feels like a shot with real depth.
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const sceneY = useTransform(heroProgress, [0, 1], [0, 110])
  const sceneScale = useTransform(heroProgress, [0, 1], [1, 1.1])
  const sceneFade = useTransform(heroProgress, [0, 0.85], [1, 0.25])
  const copyY = useTransform(heroProgress, [0, 1], [0, -46])

  return (
    <div className="space-y-16">
      {/* ---------------------------------------------------------- *
       * Hero
       * ---------------------------------------------------------- */}
      <section
        ref={heroRef}
        className="relative overflow-hidden rounded-3xl border border-white/[0.08] shadow-[0_40px_120px_-60px_rgba(0,0,0,1)]"
      >
        <motion.div
          className="absolute inset-0"
          style={{ y: sceneY, scale: sceneScale, opacity: sceneFade }}
        >
          <FractureScene
            count={420}
            seed={90210}
            maxDepth={3}
            offsetX={1.55}
            className="h-full w-full"
          />
        </motion.div>

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(4,6,13,0.985)_0%,rgba(4,6,13,0.94)_30%,rgba(4,6,13,0.5)_58%,rgba(4,6,13,0.08)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,rgba(4,6,13,0.94),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(143,182,255,0.55),rgba(95,240,216,0.4),transparent)]" />

        {/* Cinematic frame corners */}
        <div aria-hidden className="pointer-events-none absolute inset-3 hidden lg:block">
          <span className="absolute left-0 top-0 h-6 w-6 border-l border-t border-primary/35" />
          <span className="absolute right-0 top-0 h-6 w-6 border-r border-t border-primary/35" />
          <span className="absolute bottom-0 left-0 h-6 w-6 border-b border-l border-primary/35" />
          <span className="absolute bottom-0 right-0 h-6 w-6 border-b border-r border-primary/35" />
        </div>

        <motion.div
          className="relative grid gap-10 px-6 py-14 md:px-10 md:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:px-14 lg:py-20"
          style={{ y: copyY }}
        >
          <div className="flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <HudChip tone="violet" className="gap-2">
                <Sparkles className="h-3 w-3 text-violet-soft" />
                Design &amp; Analysis of Algorithms
              </HudChip>
            </motion.div>

            <h1 className="font-display mt-6 max-w-2xl text-[2.5rem] font-bold leading-[1.04] tracking-tight text-white sm:text-[3.1rem] lg:text-[3.5rem]">
              <motion.span
                className="block"
                initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                Algorithms, made
              </motion.span>
              <motion.span
                className="text-aurora block"
                initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <TextScramble text="spatial." delay={380} />
              </motion.span>
            </h1>

            <motion.p
              className="mt-6 max-w-xl text-[14px] leading-relaxed text-muted-strong/90"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Two classic divide-and-conquer algorithms rebuilt as a live WebGL
              laboratory. Watch a plane get cut in half, a recursion cone
              ignite node by node, and every claim the UI makes get
              cross-checked against a brute-force reference.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Magnetic strength={10}>
                <Button size="lg" onClick={() => onNavigate("closest-pair")}>
                  <Radar className="h-4 w-4" />
                  Closest Pair
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Magnetic>
              <Magnetic strength={10}>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => onNavigate("karatsuba")}
                >
                  <Binary className="h-4 w-4" />
                  Karatsuba
                </Button>
              </Magnetic>
            </motion.div>

            <motion.dl
              className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.08] pt-6 sm:grid-cols-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.55 }}
            >
              {heroStats.map((item) => (
                <div key={item.label}>
                  <dt className="eyebrow">{item.label}</dt>
                  <dd className="mt-1 font-mono text-[15px] font-medium tabular-nums text-foreground">
                    <CountUp
                      value={item.value}
                      decimals={item.decimals}
                      suffix={item.suffix}
                    />
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* Floating HUD */}
          <motion.div
            className="hidden self-center lg:block"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <TiltCard strength={4}>
              <Spotlight color="#5ff0d8" size={320} strength={0.7}>
                <HoloPanel className="rounded-2xl p-5" bracket="rgba(143,182,255,0.45)">
                  <LiveTrace />
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4">
                    <div>
                      <p className="eyebrow">Split</p>
                      <p className="mt-1 font-mono text-[11px] text-foreground">
                        median x
                      </p>
                    </div>
                    <div>
                      <p className="eyebrow">Combine</p>
                      <p className="mt-1 font-mono text-[11px] text-foreground">
                        strip scan
                      </p>
                    </div>
                  </div>
                </HoloPanel>
              </Spotlight>
            </TiltCard>
          </motion.div>
        </motion.div>
      </section>

      {/* Ticker */}
      <Reveal>
        <Marquee items={TICKER} />
      </Reveal>

      {/* ---------------------------------------------------------- *
       * The two workbenches
       * ---------------------------------------------------------- */}
      <section className="space-y-7">
        <Reveal>
          <SectionHeading
            eyebrow="Two workbenches"
            title="Pick a laboratory and take it apart"
            description="Every run is reproducible, every step is scrubbable, and every result is cross-checked before it is shown."
          />
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal delay={0.05}>
            <TiltCard strength={5}>
              <button
                type="button"
                onClick={() => onNavigate("closest-pair")}
                className="group block h-full w-full text-left focus-visible:outline-none"
              >
                <HoloPanel
                  className="group-hover:shadow-[0_0_0_1px_rgba(77,141,255,0.25),0_30px_80px_-40px_rgba(77,141,255,0.55)] h-full"
                  bracket="rgba(143,182,255,0.5)"
                >
                  <div className="relative h-52 overflow-hidden border-b border-white/[0.07] bg-[rgba(4,6,12,0.55)]">
                    <ClosestPairPreview />
                    <Spotlight
                      color="#4d8dff"
                      size={300}
                      strength={0.55}
                      overlay
                      rim={false}
                      className="absolute inset-0"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(5,7,14,0.92))]" />
                    <div className="absolute left-4 top-4">
                      <Badge variant="primary">O(n log n)</Badge>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur">
                        <Radar className="h-[18px] w-[18px] text-primary-soft" />
                      </span>
                    </div>
                    <h3 className="font-display mt-4 text-[17px] font-semibold tracking-tight">
                      Closest Pair of Points
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">
                      Split the plane, solve each half recursively, then scan
                      the narrow strip for the nearest pair — rendered as a
                      real surface you can orbit around.
                    </p>
                    <div className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary-soft">
                      Open workbench
                      <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </HoloPanel>
              </button>
            </TiltCard>
          </Reveal>

          <Reveal delay={0.12}>
            <TiltCard strength={5}>
              <button
                type="button"
                onClick={() => onNavigate("karatsuba")}
                className="group block h-full w-full text-left focus-visible:outline-none"
              >
                <HoloPanel
                  className="group-hover:shadow-[0_0_0_1px_rgba(34,211,182,0.25),0_30px_80px_-40px_rgba(34,211,182,0.5)] h-full"
                  bracket="rgba(95,240,216,0.5)"
                >
                  <div className="relative h-52 overflow-hidden border-b border-white/[0.07] bg-[rgba(4,6,12,0.55)]">
                    <KaratsubaPreview />
                    <Spotlight
                      color="#5ff0d8"
                      size={300}
                      strength={0.55}
                      overlay
                      rim={false}
                      className="absolute inset-0"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(5,7,14,0.92))]" />
                    <div className="absolute left-4 top-4">
                      <Badge variant="accent">O(n¹·⁵⁸⁵)</Badge>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur">
                        <Binary className="h-[18px] w-[18px] text-accent-soft" />
                      </span>
                    </div>
                    <h3 className="font-display mt-4 text-[17px] font-semibold tracking-tight">
                      Karatsuba Multiplication
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">
                      Multiply huge integers with three recursive half-size
                      products instead of four — the recursion cone ignites
                      node by node as the algorithm runs.
                    </p>
                    <div className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-soft">
                      Open workbench
                      <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </HoloPanel>
              </button>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- *
       * Anatomy
       * ---------------------------------------------------------- */}
      <section className="grid gap-5 lg:grid-cols-2">
        <Reveal>
          <HoloPanel
            halo
            className="h-full p-6"
            bracket="rgba(168,85,247,0.45)"
            style={{ "--halo-color": "#a855f7" } as CSSProperties}
          >
            <SectionHeading
              eyebrow="Anatomy of the split"
              title={
                <>
                  Read the source, <span className="text-aurora">watch it run</span>
                </>
              }
              description="The UI is a thin skin over the same code the CLI harness grades. Nothing is faked."
              tone="violet"
            />
            <div className="mt-6">
              <CodeReplay />
            </div>
          </HoloPanel>
        </Reveal>

        <Reveal delay={0.1}>
          <HoloPanel className="h-full p-6" bracket="rgba(95,240,216,0.4)">
            <SectionHeading
              eyebrow="Why the complexity differs"
              title="Same split, different number of halves"
              description="Both algorithms cut the problem in half — the difference is how many halves they have to solve."
              tone="accent"
            />

            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="font-mono text-[11px] text-primary-soft">
                  T(n) = 2T(n/2) + O(n)
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                  Closest pair spawns{" "}
                  <span className="text-foreground">two</span> halves and merges
                  them in linear time.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="font-mono text-[11px] text-accent-soft">
                  T(n) = 3T(n/2) + O(n)
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                  Karatsuba spawns{" "}
                  <span className="text-foreground">three</span> halves, so the
                  recursion tree grows as 3<sup>d</sup>.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="eyebrow">Master theorem</p>
              <p className="mt-2 font-mono text-[12px] leading-relaxed text-muted-strong">
                Θ(n<sup>log₂ b</sup>) where b is the branching factor —
                b = 2 gives n, b = 3 gives n<sup>1.585</sup>.
              </p>
            </div>
          </HoloPanel>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------- *
       * Complexity
       * ---------------------------------------------------------- */}
      <section>
        <Reveal>
          <HoloPanel className="p-6" bracket="rgba(143,182,255,0.35)">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display flex items-center gap-2 text-[14px] font-semibold tracking-tight">
                  <LineChartIcon className="h-4 w-4 text-primary-soft" />
                  Operation growth
                </h2>
                <p className="mt-1 text-[12px] text-muted">
                  Logarithmic scale — why divide and conquer wins as inputs
                  grow.
                </p>
              </div>
              <Badge variant="outline">log scale</Badge>
            </div>
            <GrowthChart />
          </HoloPanel>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------- *
       * Pipeline
       * ---------------------------------------------------------- */}
      <section>
        <Reveal>
          <div className="mb-6">
            <SectionHeading
              eyebrow="Project pipeline"
              title="The same generate → solve → verify loop that powers the CLI"
              tone="violet"
            />
          </div>
        </Reveal>

        <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="pointer-events-none absolute left-0 right-0 top-[30px] hidden h-px bg-[linear-gradient(90deg,transparent,rgba(143,182,255,0.35),rgba(95,240,216,0.35),transparent)] xl:block" />
          {PIPELINE.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.08}>
              <HoloPanel className="h-full p-5" bracket="rgba(168,85,247,0.3)">
                <div className="flex items-center justify-between">
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                    <item.icon className="h-4 w-4 text-primary-soft" />
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(10,14,26,0.95)] font-mono text-[8.5px] text-muted-strong">
                      {index + 1}
                    </span>
                  </span>
                  <span className="font-mono text-[9px] tracking-tight text-muted/60">
                    {item.code}
                  </span>
                </div>
                <h3 className="font-display mt-4 text-[14px] font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                  {item.body}
                </p>
              </HoloPanel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- *
       * Closing call to action
       * ---------------------------------------------------------- */}
      <Reveal>
        <section className="aurora-sweep relative overflow-hidden rounded-3xl border border-white/[0.08] px-6 py-14 text-center md:px-10">
          <div aria-hidden className="aurora-sweep-before" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_50%_0%,rgba(77,141,255,0.24),rgba(168,85,247,0.14)_45%,transparent_72%)]" />
          <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-50" />
          <div className="relative">
            <h2 className="font-display mx-auto max-w-2xl text-[1.8rem] font-semibold tracking-tight text-foreground md:text-[2.25rem]">
              Stop reading about recursion.{" "}
              <span className="text-aurora">Step inside it.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[13.5px] leading-relaxed text-muted">
              Load a workbench, generate a cloud, and press play. The dry run
              walks the algorithm one event at a time — in space, in colour,
              in real time.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Magnetic strength={10}>
                <Button size="lg" onClick={() => onNavigate("closest-pair")}>
                  <Radar className="h-4 w-4" />
                  Start with Closest Pair
                </Button>
              </Magnetic>
              <Magnetic strength={10}>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => onNavigate("karatsuba")}
                >
                  <Binary className="h-4 w-4" />
                  Try Karatsuba
                </Button>
              </Magnetic>
            </div>
            <p className="mt-8 flex items-center justify-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted/60">
              <FlaskConical className="h-3 w-3" />
              verified against brute force on every run
            </p>
          </div>
        </section>
      </Reveal>
    </div>
  )
}
