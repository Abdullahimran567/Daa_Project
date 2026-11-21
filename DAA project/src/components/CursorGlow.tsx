import { useEffect, useRef } from "react"

/**
 * A soft aurora spotlight that trails the pointer across the whole
 * document. It is written straight to the DOM from a rAF loop so the
 * cursor never triggers a React render.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = ref.current
    const dot = dotRef.current
    if (!layer || !dot) return

    const coarse = window.matchMedia("(pointer: coarse)").matches
    if (coarse) return

    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let x = targetX
    let y = targetY
    let dotX = targetX
    let dotY = targetY
    let frame = 0
    let visible = 0
    let targetVisible = 0

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX
      targetY = event.clientY
      targetVisible = 1
    }
    const onLeave = () => {
      targetVisible = 0
    }

    const tick = () => {
      x += (targetX - x) * 0.12
      y += (targetY - y) * 0.12
      dotX += (targetX - dotX) * 0.42
      dotY += (targetY - dotY) * 0.42
      visible += (targetVisible - visible) * 0.08

      layer.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`
      layer.style.opacity = String(visible * 0.9)
      dot.style.transform = `translate3d(${dotX - 3}px, ${dotY - 3}px, 0)`
      dot.style.opacity = String(visible)

      frame = requestAnimationFrame(tick)
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerleave", onLeave)
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return (
    <>
      <div
        ref={ref}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[1] h-[520px] w-[520px] opacity-0 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle, rgba(77,141,255,0.16) 0%, rgba(168,85,247,0.09) 32%, transparent 68%)",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] h-1.5 w-1.5 rounded-full bg-primary-soft opacity-0 shadow-[0_0_12px_3px_rgba(143,182,255,0.55)]"
      />
    </>
  )
}
