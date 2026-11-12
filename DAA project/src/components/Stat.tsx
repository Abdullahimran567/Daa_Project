import type { LucideIcon } from "lucide-react"
import { cn } from "../lib/utils"

type Tone = "primary" | "accent" | "success" | "warning" | "neutral"

const toneClasses: Record<Tone, { icon: string; ring: string }> = {
  primary: {
    icon: "text-primary-soft",
    ring: "bg-primary/10 ring-primary/20",
  },
  accent: {
    icon: "text-accent-soft",
    ring: "bg-accent/10 ring-accent/20",
  },
  success: {
    icon: "text-success",
    ring: "bg-success/10 ring-success/20",
  },
  warning: {
    icon: "text-warning",
    ring: "bg-warning/10 ring-warning/20",
  },
  neutral: {
    icon: "text-muted-strong",
    ring: "bg-white/5 ring-white/10",
  },
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
  const tones = toneClasses[tone]
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-surface/60 p-3.5",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg ring-1",
            tones.ring,
            tones.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
      </div>
      <p className="mt-2 truncate font-mono text-lg font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
