import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type Detail = "condensed" | "full"

export interface PlayerOptions {
  autoplay?: boolean
  speed?: number
}

export interface PlayerState {
  index: number
  total: number
  isPlaying: boolean
  speed: number
  stride: number
  detail: Detail
  /** Duration of the eased transition between two steps, in ms. */
  transitionMs: number
  load: (total: number, options?: PlayerOptions) => void
  clear: () => void
  play: () => void
  pause: () => void
  toggle: () => void
  next: () => void
  prev: () => void
  reset: () => void
  end: () => void
  seek: (index: number) => void
  setSpeed: (speed: number) => void
  setDetail: (detail: Detail) => void
}

export const SPEEDS = [
  { label: "0.5×", value: 2200 },
  { label: "1×", value: 1100 },
  { label: "2×", value: 550 },
  { label: "4×", value: 275 },
]

export const DEFAULT_SPEED = 1100

/** Roughly how many discrete steps a full playthrough should surface. */
export const TARGET_STEPS = 72

export function usePlayer(initialSpeed = DEFAULT_SPEED): PlayerState {
  const [index, setIndex] = useState(-1)
  const [total, setTotal] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(initialSpeed)
  const [detail, setDetail] = useState<Detail>("condensed")

  const indexRef = useRef(-1)
  const totalRef = useRef(0)

  const commitIndex = useCallback((value: number) => {
    indexRef.current = value
    setIndex(value)
  }, [])

  const load = useCallback(
    (nextTotal: number, options?: PlayerOptions) => {
      totalRef.current = nextTotal
      setTotal(nextTotal)
      commitIndex(nextTotal > 0 ? 0 : -1)
      setIsPlaying(Boolean(options?.autoplay) && nextTotal > 1)
      if (options?.speed) setSpeed(options.speed)
    },
    [commitIndex],
  )

  const clear = useCallback(() => {
    totalRef.current = 0
    setTotal(0)
    commitIndex(-1)
    setIsPlaying(false)
  }, [commitIndex])

  const play = useCallback(() => {
    if (totalRef.current === 0) return
    if (indexRef.current >= totalRef.current - 1) commitIndex(0)
    setIsPlaying(true)
  }, [commitIndex])

  const pause = useCallback(() => setIsPlaying(false), [])

  const toggle = useCallback(() => {
    if (totalRef.current === 0) return
    if (isPlaying) {
      setIsPlaying(false)
      return
    }
    if (indexRef.current >= totalRef.current - 1) commitIndex(0)
    setIsPlaying(true)
  }, [commitIndex, isPlaying])

  const next = useCallback(() => {
    setIsPlaying(false)
    commitIndex(Math.min(indexRef.current + 1, totalRef.current - 1))
  }, [commitIndex])

  const prev = useCallback(() => {
    setIsPlaying(false)
    commitIndex(Math.max(indexRef.current - 1, 0))
  }, [commitIndex])

  const reset = useCallback(() => {
    setIsPlaying(false)
    commitIndex(totalRef.current > 0 ? 0 : -1)
  }, [commitIndex])

  const end = useCallback(() => {
    setIsPlaying(false)
    commitIndex(totalRef.current > 0 ? totalRef.current - 1 : -1)
  }, [commitIndex])

  const seek = useCallback(
    (value: number) => {
      setIsPlaying(false)
      commitIndex(Math.max(0, Math.min(value, totalRef.current - 1)))
    },
    [commitIndex],
  )

  const stride = useMemo(() => {
    if (total <= 1) return 1
    if (detail === "full") return 1
    return Math.max(1, Math.ceil(total / TARGET_STEPS))
  }, [total, detail])

  // requestAnimationFrame keeps the cadence steady and pauses with the tab.
  useEffect(() => {
    if (!isPlaying || total === 0) return

    let frame = 0
    let last = performance.now()
    let elapsed = 0
    const interval = Math.max(40, speed)

    const tick = (now: number) => {
      elapsed += now - last
      last = now

      if (elapsed >= interval) {
        elapsed = 0
        const next = Math.min(indexRef.current + stride, total - 1)
        commitIndex(next)
        if (next >= total - 1) {
          setIsPlaying(false)
          return
        }
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, total, speed, stride, commitIndex])

  const transitionMs = Math.min(700, Math.max(180, speed * 0.75))

  return {
    index,
    total,
    isPlaying,
    speed,
    stride,
    detail,
    transitionMs,
    load,
    clear,
    play,
    pause,
    toggle,
    next,
    prev,
    reset,
    end,
    seek,
    setSpeed,
    setDetail,
  }
}
