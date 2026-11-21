import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "../hooks/useReducedMotion"

const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#01"

/**
 * Reveals text character by character, cycling through glyphs before each
 * letter locks into place. Used for hero headlines.
 */
export function TextScramble({
  text,
  className,
  delay = 0,
  speed = 34,
}: {
  text: string
  className?: string
  delay?: number
  speed?: number
}) {
  const reduced = useReducedMotion()
  const [output, setOutput] = useState("")
  const frameRef = useRef(0)

  useEffect(() => {
    if (reduced) return

    let start = 0
    let lastTime = 0

    const tick = (now: number) => {
      if (!start) {
        start = now + delay
      }
      const elapsed = now - start
      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }

      const progress = Math.min(1, elapsed / (text.length * speed))
      const resolved = Math.floor(progress * text.length)
      let next = ""

      for (let i = 0; i < text.length; i += 1) {
        const char = text[i]
        if (char === " ") {
          next += " "
          continue
        }
        if (i < resolved) {
          next += char
        } else if (Math.random() > 0.62) {
          next += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        } else {
          next += " "
        }
      }

      setOutput(next)

      if (now - lastTime > speed * 0.6) {
        lastTime = now
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        setOutput(text)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [text, delay, speed, reduced])

  const display = reduced ? text : output

  return <span className={className}>{display || "\u00A0"}</span>
}
