import { useEffect, useRef } from "react"
import { cn } from "../lib/utils"

export interface LogStep {
  depth: number
  text: string
  kind?: string
}

interface StepLogProps {
  steps: LogStep[]
  activeIndex?: number
  onSelect?: (index: number) => void
  emptyHint?: string
  className?: string
  accent?: "primary" | "accent"
}

const accentDots = {
  primary: "bg-primary-soft shadow-[0_0_8px_rgba(167,139,250,0.9)]",
  accent: "bg-accent-soft shadow-[0_0_8px_rgba(103,232,249,0.9)]",
}

const kindDots: Record<string, string> = {
  sort: "bg-muted-strong",
  split: "bg-primary-soft shadow-[0_0_8px_rgba(167,139,250,0.8)]",
  base: "bg-warning shadow-[0_0_8px_rgba(251,191,36,0.8)]",
  merge: "bg-success shadow-[0_0_8px_rgba(52,211,153,0.8)]",
  strip: "bg-accent shadow-[0_0_8px_rgba(34,211,238,0.8)]",
  check: "bg-accent-soft shadow-[0_0_8px_rgba(103,232,249,0.8)]",
  done: "bg-success shadow-[0_0_8px_rgba(52,211,153,0.8)]",
  z2: "bg-primary-soft shadow-[0_0_8px_rgba(167,139,250,0.8)]",
  z0: "bg-accent-soft shadow-[0_0_8px_rgba(103,232,249,0.8)]",
  z1: "bg-warning shadow-[0_0_8px_rgba(251,191,36,0.8)]",
  combine: "bg-success shadow-[0_0_8px_rgba(52,211,153,0.8)]",
}

const MAX_RENDER = 400

export function StepLog({
  steps,
  activeIndex,
  onSelect,
  emptyHint = "Run the algorithm to inspect its recursion trace.",
  className,
  accent = "primary",
}: StepLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  const start =
    steps.length > MAX_RENDER && activeIndex !== undefined && activeIndex >= 0
      ? Math.max(
          0,
          Math.min(activeIndex - Math.floor(MAX_RENDER / 2), steps.length - MAX_RENDER),
        )
      : 0
  const end = Math.min(steps.length, start + MAX_RENDER)
  const visible = steps.slice(start, end)

  useEffect(() => {
    const container = containerRef.current
    const element = activeRef.current
    if (!container || !element) return
    const top = element.offsetTop
    const bottom = top + element.offsetHeight
    const viewTop = container.scrollTop
    const viewBottom = viewTop + container.clientHeight
    if (top < viewTop || bottom > viewBottom) {
      container.scrollTo({
        top: top - container.clientHeight / 2,
        behavior: "smooth",
      })
    }
  }, [activeIndex, start])

  if (steps.length === 0) {
    return (
      <div
        className={cn(
          "flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong/80 bg-surface/40 p-6 text-center",
          className,
        )}
      >
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted/60" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted/40 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted/20 [animation-delay:300ms]" />
        </div>
        <p className="max-w-56 text-xs leading-relaxed text-muted">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative max-h-[24rem] overflow-y-auto rounded-xl border border-border/80 bg-surface/50 p-2",
        className,
      )}
    >
      <ol className="space-y-0.5">
        {start > 0 ? (
          <li>
            <button
              type="button"
              onClick={() => onSelect?.(start - 1)}
              className="w-full rounded-lg px-2 py-1.5 text-center text-[10px] text-muted transition-colors hover:bg-white/[0.03] hover:text-foreground"
            >
              ↑ {start} earlier step{start === 1 ? "" : "s"}
            </button>
          </li>
        ) : null}

        {visible.map((step, offset) => {
          const index = start + offset
          const isActive = index === activeIndex
          return (
            <li key={index}>
              <button
                type="button"
                ref={isActive ? activeRef : undefined}
                onClick={() => onSelect?.(index)}
                className={cn(
                  "group flex w-full items-start gap-2.5 rounded-lg py-1.5 pr-2 text-left transition-colors",
                  isActive
                    ? "bg-primary/10 ring-1 ring-inset ring-primary/25"
                    : "hover:bg-white/[0.03]",
                )}
                style={{ paddingLeft: `${8 + Math.min(step.depth, 12) * 10}px` }}
              >
                <span className="mt-0.5 flex w-5 shrink-0 justify-center">
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 rounded-full transition-transform",
                      kindDots[step.kind ?? ""] ?? accentDots[accent],
                      isActive && "scale-150",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 font-mono text-[11px] leading-relaxed",
                    isActive ? "text-foreground" : "text-muted-strong",
                  )}
                >
                  {step.text}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px]",
                    isActive
                      ? "bg-primary/15 text-primary-soft"
                      : "bg-white/5 text-muted",
                  )}
                >
                  d{step.depth}
                </span>
              </button>
            </li>
          )
        })}

        {end < steps.length ? (
          <li>
            <button
              type="button"
              onClick={() => onSelect?.(end)}
              className="w-full rounded-lg px-2 py-1.5 text-center text-[10px] text-muted transition-colors hover:bg-white/[0.03] hover:text-foreground"
            >
              ↓ {steps.length - end} more step{steps.length - end === 1 ? "" : "s"}
            </button>
          </li>
        ) : null}
      </ol>
    </div>
  )
}
