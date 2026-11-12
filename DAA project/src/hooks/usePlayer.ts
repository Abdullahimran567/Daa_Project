import { useCallback, useEffect, useState } from "react"

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
}

export function usePlayer(initialSpeed = 300): PlayerState {
  const [index, setIndex] = useState(-1)
  const [total, setTotal] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(initialSpeed)

  const load = useCallback((nextTotal: number, options?: PlayerOptions) => {
    setTotal(nextTotal)
    setIndex(nextTotal > 0 ? 0 : -1)
    setIsPlaying(Boolean(options?.autoplay) && nextTotal > 1)
    if (options?.speed) setSpeed(options.speed)
  }, [])

  const clear = useCallback(() => {
    setTotal(0)
    setIndex(-1)
    setIsPlaying(false)
  }, [])

  const play = useCallback(() => {
    setIndex((value) => (value >= total - 1 ? 0 : value))
    setIsPlaying(true)
  }, [total])

  const pause = useCallback(() => setIsPlaying(false), [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
      return
    }
    setIndex((value) => (value >= total - 1 ? 0 : value))
    setIsPlaying(true)
  }, [isPlaying, total])

  const next = useCallback(() => {
    setIsPlaying(false)
    setIndex((value) => Math.min(value + 1, total - 1))
  }, [total])

  const prev = useCallback(() => {
    setIsPlaying(false)
    setIndex((value) => Math.max(value - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setIsPlaying(false)
    setIndex(total > 0 ? 0 : -1)
  }, [total])

  const end = useCallback(() => {
    setIsPlaying(false)
    setIndex(total > 0 ? total - 1 : -1)
  }, [total])

  const seek = useCallback(
    (value: number) => {
      setIsPlaying(false)
      setIndex(Math.max(0, Math.min(value, total - 1)))
    },
    [total],
  )

  const stride = total > 0 ? Math.max(1, Math.ceil(total / 60)) : 1

  useEffect(() => {
    if (!isPlaying || total === 0 || index >= total - 1) return
    const timer = window.setTimeout(() => {
      const next = Math.min(index + stride, total - 1)
      setIndex(next)
      if (next >= total - 1) setIsPlaying(false)
    }, speed)
    return () => window.clearTimeout(timer)
  }, [isPlaying, index, total, speed, stride])

  return {
    index,
    total,
    isPlaying,
    speed,
    stride,
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
  }
}
