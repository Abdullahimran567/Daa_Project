import { useEffect, useRef, type ReactNode } from "react"
import { useReducedMotion } from "../hooks/useReducedMotion"

interface MagneticProps {
  children: ReactNode
  /** Maximum pull in pixels. */
  strength?: number
  className?: string
}

/**
 * Pulls its child toward the pointer while hovered, then releases it with a
 * spring-like settle. Used on primary calls-to-action.
 */
export function Magnetic({ children, strength = 12, className }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || reduced) return
    if (window.matchMedia("(pointer: coarse)").matches) return

    let frame = 0
    let targetX = 0
    let targetY = 0
    let x = 0
    let y = 0
    let active = false

    const tick = () => {
      x += (targetX - x) * 0.16
      y += (targetY - y) * 0.16
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`
      frame = requestAnimationFrame(tick)
    }

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = event.clientX - cx
      const dy = event.clientY - cy
      const distance = Math.hypot(dx, dy)
      const radius = Math.max(rect.width, rect.height) * 0.85
      const falloff = Math.max(0, 1 - distance / radius)
      targetX = (dx / (radius || 1)) * strength * falloff
      targetY = (dy / (radius || 1)) * strength * falloff
      if (!active) {
        active = true
        frame = requestAnimationFrame(tick)
      }
    }

    const onLeave = () => {
      targetX = 0
      targetY = 0
    }

    element.addEventListener("pointermove", onMove)
    element.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("pointermove", onMove)
      element.removeEventListener("pointerleave", onLeave)
    }
  }, [strength, reduced])

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  )
}
