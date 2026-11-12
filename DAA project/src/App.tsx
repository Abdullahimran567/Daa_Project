import { useEffect, useState } from "react"
import {
  Binary,
  ChevronRight,
  CircleDot,
  LayoutDashboard,
  Orbit,
  Radar,
  Sparkles,
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
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, hint: "Project home" },
  { id: "closest-pair", label: "Closest Pair", icon: Radar, hint: "Geometry" },
  { id: "karatsuba", label: "Karatsuba", icon: Binary, hint: "Big integers" },
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

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none fixed -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none fixed -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-accent/[0.06] blur-[140px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1560px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/70 bg-surface/40 px-4 py-6 backdrop-blur-xl lg:flex">
          <button
            type="button"
            onClick={() => navigate("overview")}
            className="flex items-center gap-3 rounded-xl px-2 text-left focus-visible:outline-none"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft via-primary to-primary-deep shadow-[0_10px_30px_-12px_rgba(139,92,246,0.9)]">
              <Orbit className="h-5 w-5 text-white" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">
                AlgoLab
              </span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-muted">
                Workbench
              </span>
            </span>
          </button>

          <div className="mt-8 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted/70">
            Navigation
          </div>
          <nav className="mt-2 space-y-1">
            {NAV.map((item) => {
              const active = page === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                    active
                      ? "border-primary/25 bg-primary/10 text-foreground shadow-[0_10px_30px_-20px_rgba(139,92,246,0.9)]"
                      : "border-transparent text-muted hover:border-border/80 hover:bg-white/[0.03] hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                      active
                        ? "border-primary/30 bg-primary/15 text-primary-soft"
                        : "border-border/70 bg-surface text-muted group-hover:text-muted-strong",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-muted">
                      {item.hint}
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-all",
                      active
                        ? "translate-x-0 text-primary-soft opacity-100"
                        : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60",
                    )}
                  />
                </button>
              )
            })}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-border/80 bg-card/60 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary-soft" />
                Design &amp; Analysis
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                A course project exploring two divide-and-conquer algorithms
                with verified, reproducible results.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-success">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                Verification harness online
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-30 border-b border-border/70 glass">
            <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("overview")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft to-primary-deep lg:hidden"
                  aria-label="AlgoLab home"
                >
                  <Orbit className="h-4 w-4 text-white" />
                </button>
                <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
                  <span className="font-medium text-muted-strong">
                    {meta.section}
                  </span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="font-medium text-foreground">
                    {meta.title}
                  </span>
                </div>
                <span className="text-sm font-semibold tracking-tight sm:hidden">
                  {meta.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="success" className="hidden sm:inline-flex">
                  <CircleDot className="h-3 w-3" />
                  Verified
                </Badge>
                <Badge variant="outline" className="hidden md:inline-flex">
                  React 19
                </Badge>
                <Badge variant="outline" className="hidden md:inline-flex">
                  Vite 8
                </Badge>
                <Badge variant="primary" className="hidden lg:inline-flex">
                  TypeScript
                </Badge>
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto border-t border-border/60 px-4 py-2 lg:hidden">
              {NAV.map((item) => {
                const active = page === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary/15 text-primary-soft"
                        : "text-muted hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-4 md:p-6 lg:p-8">
            {page === "overview" ? <Overview onNavigate={navigate} /> : null}
            {page === "closest-pair" ? <ClosestPairPage /> : null}
            {page === "karatsuba" ? <KaratsubaPage /> : null}
          </div>

          <footer className="border-t border-border/60 px-4 py-6 md:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-2 text-[11px] text-muted sm:flex-row sm:items-center">
              <p>
                AlgoLab · Design &amp; Analysis of Algorithms workbench
              </p>
              <p className="font-mono text-muted/80">
                closest pair · karatsuba · verified
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
