import * as React from "react"
import { cn } from "../../lib/utils"

export const inputClasses =
  "w-full rounded-xl border border-white/[0.09] bg-[rgba(6,9,18,0.55)] px-3 py-2 text-[13px] text-foreground placeholder:text-muted/50 backdrop-blur-md transition-all duration-200 focus:border-primary/55 focus:outline-none focus:ring-1 focus:ring-primary/35 focus:bg-[rgba(6,9,18,0.72)]"

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputClasses, className)} {...props} />
))
Input.displayName = "Input"

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      inputClasses,
      "resize-none font-mono text-xs leading-relaxed",
      className,
    )}
    {...props}
  />
))
Textarea.displayName = "Textarea"

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-muted",
        className,
      )}
      {...props}
    />
  )
}
