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

const glowClasses: Record<Tone, string> = {
  primary: "from-primary/25",
  accent: "from-accent/25",
  success: "from-success/25",
  warning: "from-warning/25",
  neutral: "from-white/10",
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
        "glass-soft relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl px-3.5 py-3",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 -top-8 h-16 bg-gradient-to-b to-transparent opacity-70",
          glowClasses[tone],
        )}
      />
      <div className="relative flex items-center gap-1.5">
        <Icon
          className={cn("h-3 w-3 shrink-0", toneClasses[tone])}
          strokeWidth={2}
        />
        <span className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
      </div>
      <p className="relative mt-2.5 truncate font-mono text-[15px] font-medium tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="relative mt-0.5 truncate text-[10.5px] text-muted/80">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
