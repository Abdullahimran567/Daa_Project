import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

export function formatMs(ms: number): string {
  if (ms === 0) return "0 ms"
  if (ms < 0.01) return `${ms.toFixed(4)} ms`
  if (ms < 1) return `${ms.toFixed(3)} ms`
  if (ms < 100) return `${ms.toFixed(2)} ms`
  return `${formatNumber(Math.round(ms))} ms`
}

export function formatDistance(value: number): string {
  return value.toFixed(4)
}

export function shorten(
  value: bigint | string,
  head = 10,
  tail = 6,
): string {
  const text = value.toString()
  if (text.length <= head + tail + 1) return text
  return `${text.slice(0, head)}…${text.slice(-tail)}`
}
