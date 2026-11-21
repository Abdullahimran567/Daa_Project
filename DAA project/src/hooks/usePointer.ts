import { useEffect, useRef, useState } from "react"

export interface PointerState {
  /** Viewport coordinates. */
  x: number
  y: number
  /** Normalised device coordinates in the range [-1, 1]. */
  nx: number
  ny: number
  /** True while the pointer is inside the document. */
  active: boolean
}

/**
 * Global pointer tracker. Written to a ref-backed state object so that the
 * WebGL layers can read it every frame without triggering React renders.
 */
export function usePointer(): React.RefObject<PointerState> {
  const state = useRef<PointerState>({
    x: 0,
    y: 0,
    nx: 0,
    ny: 0,
    active: false,
  })

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      state.current.x = event.clientX
      state.current.y = event.clientY
      state.current.nx = (event.clientX / window.innerWidth) * 2 - 1
      state.current.ny = -((event.clientY / window.innerHeight) * 2 - 1)
      state.current.active = true
    }
    const onLeave = () => {
      state.current.active = false
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerleave", onLeave)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return state
}

/** Pointer position as React state — for DOM-only consumers. */
export function usePointerState(): PointerState {
  const [state, setState] = useState<PointerState>({
    x: 0,
    y: 0,
    nx: 0,
    ny: 0,
    active: false,
  })

  useEffect(() => {
    let frame = 0
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setState({
          x: event.clientX,
          y: event.clientY,
          nx: (event.clientX / window.innerWidth) * 2 - 1,
          ny: -((event.clientY / window.innerHeight) * 2 - 1),
          active: true,
        })
      })
    }
    const onLeave = () => setState((prev) => ({ ...prev, active: false }))

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return state
}
