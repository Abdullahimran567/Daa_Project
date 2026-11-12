import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  Binary,
  ChevronRight,
  CircleCheck,
  LayoutDashboard,
  Radar,
  SquareFunction,
} from "lucide-react"
import { Overview } from "./pages/Overview"
import { ClosestPairPage } from "./pages/ClosestPair"
import { KaratsubaPage } from "./pages/Karatsuba"
import { Badge } from "./components/ui/badge"
import { cn } from "./lib/utils"

type Page = "overview" | "closest-pair" | "karatsuba"

const NAV: Array<{
  id: Page
  label: string
  icon: typeof LayoutDashboard
  hint: string
  group: string
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, hint: "Project home", group: "Workbench" },
  { id: "closest-pair", label: "Closest Pair", icon: Radar, hint: "O(n log n) · geometry", group: "Algorithms" },
  { id: "karatsuba", label: "Karatsuba", icon: Binary, hint: "O(n¹·⁵⁸⁵) · big integers", group: "Algorithms" },
]

const PAGE_META: Record<Page, { title: string; section: string }> = {
  overview: { title: "Overview", section: "Workbench" },
  "closest-pair": { title: "Closest Pair", section: "Algorithms" },
  karatsuba: { title: "Karatsuba", section: "Algorithms" },
}

function readHash(): Page {
  const hash = window.location.hash.replace(/^#\/?/, "")
  if (hash === "closest-pair" || hash === "karatsuba") return hash
  return "overview"
}

function App() {
  const [page, setPage] = useState<Page>(readHash)

  useEffect(() => {
    const onHashChange = () => setPage(readHash())
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  const navigate = (next: Page) => {
    setPage(next)
    window.location.hash = `/${next}`
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const meta = PAGE_META[page]
  const groups = Array.from(new Set(NAV.map((item) => item.group)))

  return (
    <div className="relative min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1520px]">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border bg-background px-3.5 py-5 lg:flex">
          <button
            type="button"
            onClick={() => navigate("overview")}
            className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-left focus-visible:outline-none"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border-strong bg-elevated">
              <SquareFunction className="h-4 w-4 text-primary-soft" />
            </span>
            <span>
              <span className="block text-[13px] font-semibold tracking-tight">
                AlgoLab
              </span>
              <span className="block font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
                DAA workbench
              </span>
            </span>
          </button>

          <nav className="mt-7 flex-1 space-y-5">
            {groups.map((group) => (
              <div key={group}>
                <p className="px-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted/70">
                  {group}
                </p>
                <div className="mt-1.5 space-y-0.5">
                  {NAV.filter((item) => item.group === group).map((item) => {
                    const active = page === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.id)}
                        className={cn(
                          "group relative flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors duration-150",
                          active
                            ? "bg-elevated text-foreground"
                            : "text-muted hover:bg-white/[0.03] hover:text-foreground",
                        )}
                      >
                        {active ? (
                          <motion.span
                            layoutId="nav-marker"
                            className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          />
                        ) : null}
                        <item.icon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            active ? "text-primary-soft" : "text-muted/70",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-medium leading-tight">
                            {item.label}
                          </span>
                          <span className="block truncate font-mono text-[9.5px] text-muted/70">
                            {item.hint}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="rounded-lg border border-border bg-surface/60 p-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
              Harness
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted-strong">
              <CircleCheck className="h-3.5 w-3.5 text-success" />
              Verification online
            </p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted/80">
              Every result is cross-checked against a brute-force reference.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
            <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate("overview")}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border-strong bg-elevated lg:hidden"
                  aria-label="AlgoLab home"
                >
                  <SquareFunction className="h-4 w-4 text-primary-soft" />
                </button>
                <div className="hidden items-center gap-1.5 text-[11.5px] sm:flex">
                  <span className="text-muted">{meta.section}</span>
                  <ChevronRight className="h-3 w-3 text-muted/50" />
                  <span className="font-medium text-foreground">{meta.title}</span>
                </div>
                <span className="text-[13px] font-semibold tracking-tight sm:hidden">
                  {meta.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden font-mono text-[10px] tracking-tight text-muted/70 md:inline">
                  react 19 · vite 8 · typescript
                </span>
                <Badge variant="success" className="hidden sm:inline-flex">
                  <CircleCheck className="h-3 w-3" />
                  Verified
                </Badge>
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 lg:hidden">
              {NAV.map((item) => {
                const active = page === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium transition-colors",
                      active
                        ? "bg-elevated text-foreground"
                        : "text-muted hover:bg-white/[0.03] hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="px-4 py-6 md:px-6 md:py-8 lg:px-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              >
                {page === "overview" ? <Overview onNavigate={navigate} /> : null}
                {page === "closest-pair" ? <ClosestPairPage /> : null}
                {page === "karatsuba" ? <KaratsubaPage /> : null}
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="border-t border-border px-4 py-5 md:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-1.5 font-mono text-[10px] text-muted/70 sm:flex-row sm:items-center">
              <p>AlgoLab · Design &amp; Analysis of Algorithms</p>
              <p>closest-pair · karatsuba · verified</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
