import * as React from "react"
import { cn } from "../../lib/utils"

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg" | "icon"

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-primary-soft to-primary text-white shadow-[0_10px_30px_-12px_rgba(139,92,246,0.8)] hover:from-primary hover:to-primary-deep hover:shadow-[0_14px_34px_-12px_rgba(139,92,246,0.95)]",
  secondary:
    "bg-elevated text-foreground border border-border-strong hover:bg-[#1a1a28] hover:border-primary/40",
  outline:
    "border border-border-strong bg-transparent text-muted-strong hover:border-primary/50 hover:text-foreground hover:bg-primary/5",
  ghost: "bg-transparent text-muted hover:bg-white/5 hover:text-foreground",
  danger:
    "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 hover:border-danger/50",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-11 px-5 text-sm gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-lg",
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex select-none items-center justify-center font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
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
