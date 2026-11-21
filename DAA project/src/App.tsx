import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react"
import {
  Binary,
  Command,
  Gauge,
  Radar,
  Sparkles,
  SquareFunction,
} from "lucide-react"
import { Overview } from "./pages/Overview"
import { ClosestPairPage } from "./pages/ClosestPair"
import { KaratsubaPage } from "./pages/Karatsuba"
import { VoidField } from "./three/VoidField"
import { TransitionCurtain } from "./three/TransitionCurtain"
import { BrandMark } from "./components/BrandMark"
import { CursorGlow } from "./components/CursorGlow"
import { Grain, HudChip, Spotlight } from "./components/Holo"
import { cn } from "./lib/utils"
import { triggerWarp } from "./lib/warp"

type Page = "overview" | "closest-pair" | "karatsuba"

const NAV: Array<{
  id: Page
  label: string
  icon: typeof Gauge
  hint: string
  shortcut: string
}> = [
  { id: "overview", label: "Overview", icon: Gauge, hint: "Workbench", shortcut: "1" },
  {
    id: "closest-pair",
    label: "Closest Pair",
    icon: Radar,
    hint: "O(n log n)",
    shortcut: "2",
  },
  {
    id: "karatsuba",
    label: "Karatsuba",
    icon: Binary,
    hint: "O(n¹·⁵⁸⁵)",
    shortcut: "3",
  },
]

function readHash(): Page {
  const hash = window.location.hash.replace(/^#\/?/, "")
  if (hash === "closest-pair" || hash === "karatsuba") return hash
  return "overview"
}

/** True when the user is typing into a field, so shortcuts stay out of the way. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  )
}

export default function App() {
  const [page, setPage] = useState<Page>(readHash)
  const [curtain, setCurtain] = useState(false)
  const pageRef = useRef(page)
  const pendingRef = useRef<Page | null>(null)
  const busyRef = useRef(false)

  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 26,
    restDelta: 0.001,
  })

  useEffect(() => {
    pageRef.current = page
  }, [page])

  const applyPage = useCallback((next: Page) => {
    setPage(next)
    pageRef.current = next
    window.location.hash = `/${next}`
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [])

  const navigate = useCallback(
    (next: Page) => {
      if (next === pageRef.current || busyRef.current) return
      busyRef.current = true
      pendingRef.current = next
      setCurtain(true)
      triggerWarp()
    },
    [],
  )

  const handleCover = useCallback(() => {
    const next = pendingRef.current
    if (next) applyPage(next)
  }, [applyPage])

  const handleDone = useCallback(() => {
    setCurtain(false)
    pendingRef.current = null
    busyRef.current = false
  }, [])

  // Keyboard shortcuts: 1 / 2 / 3 jump between the three workbenches.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const target = NAV.find((item) => item.shortcut === event.key)
      if (!target) return
      event.preventDefault()
      navigate(target.id)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [navigate])

  useEffect(() => {
    const onHashChange = () => {
      const next = readHash()
      if (next === pageRef.current) return
      navigate(next)
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [navigate])

  // Fade out the pre-render splash once React has painted.
  useEffect(() => {
    const boot = document.getElementById("boot")
    if (!boot) return
    const timer = window.setTimeout(() => {
      boot.dataset.done = "1"
      window.setTimeout(() => boot.remove(), 900)
    }, 420)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="relative min-h-screen">
      <VoidField />
      <CursorGlow />
      <Grain />

      {/* Scroll progress rail */}
      <motion.div
        aria-hidden
        className="fixed left-0 top-0 z-50 h-[2px] w-full origin-left bg-[linear-gradient(90deg,#8fb6ff,#5ff0d8,#a855f7)]"
        style={{ scaleX: progress }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1560px] px-3 sm:px-5">
        {/* Floating navigation */}
        <motion.header
          initial={{ y: -28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-3 z-40 pt-3"
        >
          <Spotlight
            color="#4d8dff"
            size={420}
            strength={0.85}
            className="rounded-2xl"
          >
            <nav className="glass holo-rim relative flex h-[60px] items-center gap-2 overflow-hidden rounded-2xl px-2.5 sm:px-3">
              <span aria-hidden className="holo-rim-before opacity-40" />

              <button
                type="button"
                onClick={() => navigate("overview")}
                className="group relative z-[2] flex shrink-0 items-center gap-2.5 rounded-xl px-1.5 py-1 pr-3 text-left transition-colors hover:bg-white/[0.04]"
              >
                <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[rgba(255,255,255,0.05)]">
                  <BrandMark className="h-[18px] w-[18px]" />
                </span>
                <span className="hidden sm:block">
                  <span className="font-display block text-[13.5px] font-semibold leading-tight tracking-tight">
                    AlgoLab
                  </span>
                  <span className="block font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted">
                    DAA workbench
                  </span>
                </span>
              </button>

              <span className="mx-1 hidden h-7 w-px bg-white/10 sm:block" />

              <div className="relative z-[2] flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
                {NAV.map((item) => {
                  const active = page === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12.5px] font-medium transition-colors duration-200",
                        active
                          ? "text-foreground"
                          : "text-muted hover:text-foreground",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 -z-10 rounded-xl border border-white/12 bg-[linear-gradient(120deg,rgba(77,141,255,0.26),rgba(34,211,182,0.16))] shadow-[0_0_24px_-6px_rgba(77,141,255,0.6)]"
                          transition={{ type: "spring", stiffness: 340, damping: 30 }}
                        />
                      ) : null}
                      <item.icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-colors",
                          active
                            ? "text-primary-soft"
                            : "text-muted/70 group-hover:text-muted-strong",
                        )}
                      />
                      <span className="whitespace-nowrap">{item.label}</span>
                      <span className="hidden font-mono text-[9px] tracking-tight text-muted/70 lg:inline">
                        {item.hint}
                      </span>
                      <kbd
                        className={cn(
                          "hidden rounded border border-white/10 bg-white/[0.04] px-1 font-mono text-[8.5px] leading-[14px] text-muted/70 transition-colors xl:block",
                          active ? "border-primary/40 text-primary-soft" : "",
                        )}
                      >
                        {item.shortcut}
                      </kbd>
                    </button>
                  )
                })}
              </div>

              <div className="relative z-[2] flex shrink-0 items-center gap-2">
                <HudChip tone="success" dot className="hidden md:inline-flex">
                  Verification online
                </HudChip>
              </div>
            </nav>
          </Spotlight>
        </motion.header>

        {/* Page body */}
        <main className="relative z-10 pb-16 pt-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 18, filter: "blur(8px)", scale: 0.985 }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 1.01 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              {page === "overview" ? <Overview onNavigate={navigate} /> : null}
              {page === "closest-pair" ? <ClosestPairPage /> : null}
              {page === "karatsuba" ? <KaratsubaPage /> : null}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="relative z-10 pb-6 pt-2">
          <div className="glass-soft flex flex-col items-start justify-between gap-1.5 rounded-xl px-4 py-3 font-mono text-[9.5px] text-muted/70 sm:flex-row sm:items-center">
            <p className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-violet-soft/70" />
              AlgoLab · Design &amp; Analysis of Algorithms
            </p>
            <p className="flex items-center gap-3">
              <span>closest-pair · karatsuba · verified</span>
              <span className="hidden items-center gap-1 text-muted/50 sm:flex">
                <Command className="h-2.5 w-2.5" />
                press 1–3 to switch stage
              </span>
            </p>
          </div>
        </footer>
      </div>

      {/* Corner glyph for a little depth */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-6 left-6 z-10 hidden h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm xl:flex"
      >
        <SquareFunction className="h-4 w-4 text-primary-soft/50" />
      </div>

      {/* Route readout */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-6 right-6 z-10 hidden items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted/60 backdrop-blur-sm lg:flex"
      >
        <span className="h-1.5 w-1.5 animate-ticker-blink rounded-full bg-accent" />
        route · {page}
      </div>

      <TransitionCurtain
        active={curtain}
        onCover={handleCover}
        onDone={handleDone}
      />
    </div>
  )
}
