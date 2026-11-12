import type { LucideIcon } from "lucide-react"
import { cn } from "../lib/utils"

type Tone = "primary" | "accent" | "success" | "warning" | "neutral"

const toneClasses: Record<Tone, string> = {
  primary: "text-primary-soft",
  accent: "text-accent-soft",
  success: "text-success",
  warning: "text-warning",
  neutral: "text-muted-strong",
}

interface StatProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  tone?: Tone
  className?: string
}

export function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
  className,
}: StatProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-between rounded-xl border border-border bg-surface/60 px-3.5 py-3",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn("h-3 w-3 shrink-0", toneClasses[tone])}
          strokeWidth={2}
        />
        <span className="truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
          {label}
        </span>
      </div>
      <p className="mt-2.5 truncate font-mono text-[15px] font-medium tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[10.5px] text-muted/80">{hint}</p>
      ) : null}
    </div>
  )
}
