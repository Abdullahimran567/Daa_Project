import * as React from "react"
import { cn } from "../../lib/utils"

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg" | "icon"

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "text-white border border-white/10 bg-[linear-gradient(120deg,#3f7ff0_0%,#5b6cf7_48%,#8a4fe8_100%)] shadow-[0_1px_0_0_rgba(255,255,255,0.28)_inset,0_12px_34px_-16px_rgba(77,141,255,0.85)] hover:brightness-110 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.35)_inset,0_16px_42px_-14px_rgba(90,120,255,0.95)]",
  secondary:
    "text-foreground border border-white/[0.09] bg-white/[0.055] backdrop-blur-md hover:bg-white/[0.09] hover:border-white/[0.16]",
  outline:
    "border border-white/[0.12] bg-transparent text-muted-strong backdrop-blur-sm hover:text-foreground hover:border-primary/45 hover:bg-primary/[0.08]",
  ghost:
    "bg-transparent text-muted hover:bg-white/[0.06] hover:text-foreground",
  danger:
    "text-danger border border-danger/30 bg-danger/10 hover:bg-danger/18 hover:border-danger/50",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-xl",
  lg: "h-11 px-5 text-[13.5px] gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-xl",
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", type = "button", ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex select-none items-center justify-center font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"
