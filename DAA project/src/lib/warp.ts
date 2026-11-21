/**
 * A tiny publish/subscribe channel used to synchronise the global WebGL
 * stage with navigation events. The void field listens for "warp" pulses and
 * briefly accelerates its starfield, while the transition curtain plays a
 * matching wipe.
 */

type WarpListener = () => void

const listeners = new Set<WarpListener>()

export function onWarp(listener: WarpListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function triggerWarp(): void {
  for (const listener of listeners) listener()
}
