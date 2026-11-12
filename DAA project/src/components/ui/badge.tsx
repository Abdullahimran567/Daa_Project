import * as React from "react"
import { cn } from "../../lib/utils"

type BadgeVariant =
  | "default"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "outline"

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-white/[0.04] text-muted-strong border-border-strong",
  primary: "bg-primary/12 text-primary-soft border-primary/30",
  accent: "bg-accent/10 text-accent-soft border-accent/25",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/25",
  outline: "bg-transparent text-muted-strong border-border-strong",
}

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-tight whitespace-nowrap",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
