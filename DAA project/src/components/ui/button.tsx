import * as React from "react"
import { cn } from "../../lib/utils"

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg" | "icon"

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-soft active:bg-primary-deep shadow-[0_1px_0_0_rgba(255,255,255,0.14)_inset,0_10px_26px_-16px_rgba(75,135,240,0.9)]",
  secondary:
    "bg-elevated text-foreground border border-border-strong hover:border-border-strong hover:bg-[#1b1d23]",
  outline:
    "border border-border-strong bg-transparent text-muted-strong hover:text-foreground hover:border-[#3a3e49] hover:bg-white/[0.03]",
  ghost: "bg-transparent text-muted hover:bg-white/[0.05] hover:text-foreground",
  danger:
    "bg-danger/12 text-danger border border-danger/30 hover:bg-danger/20 hover:border-danger/50",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-lg",
  lg: "h-10 px-4 text-[13px] gap-2 rounded-lg",
  icon: "h-9 w-9 rounded-lg",
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
          "inline-flex select-none items-center justify-center font-medium tracking-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45",
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
