import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "../hooks/useReducedMotion"

const GLYPHS = "0123456789"

interface CountUpProps {
  value: number
  duration?: number
  decimals?: number
  className?: string
  prefix?: string
  suffix?: string
}

/**
 * Counts a number up from zero with an eased ramp the moment it enters the
 * viewport. While the digits are in flight they scramble briefly, then lock
 * onto the final value.
 */
export function CountUp({
  value,
  duration = 1400,
  decimals = 0,
  className,
  prefix = "",
  suffix = "",
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const [started, setStarted] = useState(false)
  const [text, setText] = useState(() => (0).toFixed(decimals))

  useEffect(() => {
    const element = ref.current
    if (!element || started) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setStarted(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started || reduced) return

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4)
      const current = value * eased

      if (t >= 1) {
        setText(value.toFixed(decimals))
        return
      }

      const digits = Math.max(1, Math.floor(current).toString().length)
      let scramble = ""
      for (let i = 0; i < digits; i += 1) {
        scramble += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      }
      setText(scramble)
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [started, value, duration, decimals, reduced])

  const display = reduced ? value.toFixed(decimals) : text

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}
