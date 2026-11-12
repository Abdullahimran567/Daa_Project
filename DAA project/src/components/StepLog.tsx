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
  primary: "bg-primary-soft",
  accent: "bg-accent-soft",
}

const kindDots: Record<string, string> = {
  sort: "bg-muted-strong",
  split: "bg-primary-soft",
  base: "bg-warning",
  merge: "bg-success",
  strip: "bg-warning",
  check: "bg-accent-soft",
  done: "bg-success",
  z2: "bg-primary-soft",
  z0: "bg-accent-soft",
  z1: "bg-warning",
  combine: "bg-success",
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
          "flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong/70 bg-surface/40 p-6 text-center",
          className,
        )}
      >
        <div className="flex gap-1.5">
          <span className="h-1 w-1 animate-pulse rounded-full bg-muted/50" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-muted/30 [animation-delay:150ms]" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-muted/20 [animation-delay:300ms]" />
        </div>
        <p className="max-w-56 text-[11.5px] leading-relaxed text-muted">
          {emptyHint}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative max-h-[22rem] overflow-y-auto rounded-xl border border-border bg-surface/40 p-1.5",
        className,
      )}
    >
      <ol className="space-y-px">
        {start > 0 ? (
          <li>
            <button
              type="button"
              onClick={() => onSelect?.(start - 1)}
              className="w-full rounded-md px-2 py-1.5 text-center font-mono text-[10px] text-muted transition-colors hover:bg-white/[0.03] hover:text-foreground"
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
                  "group relative flex w-full items-start gap-2 rounded-md py-1.5 pr-2 text-left transition-colors duration-200",
                  isActive
                    ? "bg-primary/10"
                    : "hover:bg-white/[0.025]",
                )}
                style={{ paddingLeft: `${8 + Math.min(step.depth, 12) * 9}px` }}
              >
                {isActive ? (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" />
                ) : null}
                <span className="mt-[5px] flex w-3 shrink-0 justify-center">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-transform duration-200",
                      kindDots[step.kind ?? ""] ?? accentDots[accent],
                      isActive && "scale-125",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 font-mono text-[10.5px] leading-relaxed transition-colors",
                    isActive ? "text-foreground" : "text-muted",
                  )}
                >
                  {step.text}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-mono text-[9px] tabular-nums transition-colors",
                    isActive ? "text-primary-soft" : "text-muted/50",
                  )}
                >
                  {step.depth}
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
              className="w-full rounded-md px-2 py-1.5 text-center font-mono text-[10px] text-muted transition-colors hover:bg-white/[0.03] hover:text-foreground"
            >
              ↓ {steps.length - end} more step{steps.length - end === 1 ? "" : "s"}
            </button>
          </li>
        ) : null}
      </ol>
    </div>
  )
}
