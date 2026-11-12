import { useEffect, useRef, useState } from "react"

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/**
 * Eases a numeric value towards its target so continuous quantities
 * (distances, split positions, counters) glide instead of jumping.
 */
export function useTween(
  target: number | null | undefined,
  duration = 600,
): number | null | undefined {
  const [value, setValue] = useState<number | null | undefined>(target)
  const currentRef = useRef<number | null | undefined>(target)

  useEffect(() => {
    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      if (!isFiniteNumber(target)) {
        currentRef.current = null
        setValue(null)
        return
      }

      const from = currentRef.current
      if (!isFiniteNumber(from) || duration <= 0) {
        currentRef.current = target
        setValue(target)
        return
      }

      const t = Math.min(1, (now - start) / duration)
      const next = from + (target - from) * easeOutCubic(t)
      currentRef.current = next
      setValue(next)

      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        currentRef.current = target
        setValue(target)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}

/**
 * Reveals a string character by character — used to "type" long products
 * into the board instead of dropping them in at once.
 */
export function useRevealText(target: string, duration = 450): string {
  const [shown, setShown] = useState("")

  useEffect(() => {
    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      if (!target) {
        setShown("")
        return
      }
      const t = Math.min(1, (now - start) / duration)
      setShown(target.slice(0, Math.round(t * target.length)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return shown
}
