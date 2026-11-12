import * as React from "react"
import { cn } from "../../lib/utils"

export const inputClasses =
  "w-full rounded-xl border border-border-strong bg-surface/80 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"

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
    className={cn(inputClasses, "resize-none font-mono text-xs leading-relaxed", className)}
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
        "mb-1.5 flex items-center gap-2 text-xs font-medium tracking-tight text-muted-strong",
        className,
      )}
      {...props}
    />
  )
}
