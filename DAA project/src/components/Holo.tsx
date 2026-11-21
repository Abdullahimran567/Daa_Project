import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { cn } from "../lib/utils"
import { useReducedMotion } from "../hooks/useReducedMotion"

/* ------------------------------------------------------------------ *
 * HoloPanel — the instrument surface used across the app. Layered
 * translucency, a conic light rim, corner brackets and a scanning
 * hairline that keeps the panel feeling alive.
 * ------------------------------------------------------------------ */

interface HoloPanelProps {
  children: ReactNode
  className?: string
  /** Tailwind arbitrary value for the bracket colour. */
  bracket?: string
  /** Removes the scanning hairline. */
  still?: boolean
  /** Adds a soft breathing bloom behind the content. */
  halo?: boolean
  style?: CSSProperties
}

export function HoloPanel({
  children,
  className,
  bracket,
  still = false,
  halo = false,
  style,
}: HoloPanelProps) {
  return (
    <div
      className={cn(
        "glass holo-rim brackets relative overflow-hidden rounded-2xl",
        halo ? "halo" : "",
        className,
      )}
      style={
        bracket
          ? ({ ...style, "--bracket": bracket } as CSSProperties)
          : style
      }
    >
      <span aria-hidden className="holo-rim-before" />
      <span aria-hidden className="brackets-before" />
      {still ? null : <span aria-hidden className="scanline-after" />}
      {halo ? <span aria-hidden className="halo-before" /> : null}
      <div className="relative z-[2]">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * TiltCard — a panel that leans towards the pointer with a specular
 * glare that follows it.
 * ------------------------------------------------------------------ */

interface TiltCardProps {
  children: ReactNode
  className?: string
  /** Maximum rotation in degrees. */
  strength?: number
  style?: CSSProperties
}

export function TiltCard({
  children,
  className,
  strength = 6,
  style,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || reduced) return
    if (window.matchMedia("(pointer: coarse)").matches) return

    let frame = 0
    let rx = 0
    let ry = 0
    let tx = 0
    let ty = 0
    let gx = 50
    let gy = 50
    let gtx = 50
    let gty = 50
    let running = false

    const tick = () => {
      rx += (tx - rx) * 0.12
      ry += (ty - ry) * 0.12
      gx += (gtx - gx) * 0.18
      gy += (gty - gy) * 0.18
      element.style.transform = `perspective(1000px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`
      if (glareRef.current) {
        glareRef.current.style.background = `radial-gradient(420px circle at ${gx.toFixed(1)}% ${gy.toFixed(1)}%, rgba(255,255,255,0.10), transparent 62%)`
      }
      frame = requestAnimationFrame(tick)
    }

    const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = element.getBoundingClientRect()
      const px = (event.clientX - rect.left) / rect.width
      const py = (event.clientY - rect.top) / rect.height
      ty = (px - 0.5) * strength * 2
      tx = -(py - 0.5) * strength * 2
      gtx = px * 100
      gty = py * 100
      if (!running) {
        running = true
        frame = requestAnimationFrame(tick)
      }
    }

    const onLeave = () => {
      tx = 0
      ty = 0
      gtx = 50
      gty = 50
    }

    element.addEventListener("pointermove", onMove as never)
    element.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("pointermove", onMove as never)
      element.removeEventListener("pointerleave", onLeave)
    }
  }, [strength, reduced])

  return (
    <div ref={ref} className={cn("relative will-change-transform", className)} style={style}>
      <div
        ref={glareRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Spotlight — a pool of light that follows the pointer across a
 * surface, with a matching rim so the edge of the panel catches it.
 * ------------------------------------------------------------------ */

interface SpotlightProps {
  /** Optional — the component can be used as a pure overlay. */
  children?: ReactNode
  className?: string
  /** CSS colour of the light. */
  color?: string
  /** Diameter of the light pool in pixels. */
  size?: number
  /** Peak opacity of the pool. */
  strength?: number
  /** Lights the one-pixel rim around the surface. */
  rim?: boolean
  /** Paints the pool over the content instead of underneath it. */
  overlay?: boolean
}

export function Spotlight({
  children,
  className,
  color = "#4d8dff",
  size = 340,
  strength = 1,
  rim = true,
  overlay = false,
}: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || reduced) return
    if (window.matchMedia("(pointer: coarse)").matches) return

    let frame = 0
    let targetX = 50
    let targetY = 50
    let x = 50
    let y = 50
    let running = false

    const tick = () => {
      x += (targetX - x) * 0.14
      y += (targetY - y) * 0.14
      element.style.setProperty("--mx", `${x.toFixed(2)}%`)
      element.style.setProperty("--my", `${y.toFixed(2)}%`)
      frame = requestAnimationFrame(tick)
    }

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      targetX = ((event.clientX - rect.left) / rect.width) * 100
      targetY = ((event.clientY - rect.top) / rect.height) * 100
      element.style.setProperty("--spot-opacity", String(strength))
      if (!running) {
        running = true
        frame = requestAnimationFrame(tick)
      }
    }

    const onLeave = () => {
      element.style.setProperty("--spot-opacity", "0")
      targetX = 50
      targetY = 50
    }

    element.addEventListener("pointermove", onMove, { passive: true })
    element.addEventListener("pointerenter", onMove, { passive: true })
    element.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("pointermove", onMove)
      element.removeEventListener("pointerenter", onMove)
      element.removeEventListener("pointerleave", onLeave)
    }
  }, [strength, reduced])

  const gradient = `radial-gradient(${size}px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, ${color} 26%, transparent) 0%, color-mix(in srgb, ${color} 8%, transparent) 42%, transparent 72%)`

  return (
    <div
      ref={ref}
      className={cn("spotlight", className)}
      style={
        {
          "--spot-color": color,
          "--spot-size": `${size}px`,
          "--spot-gradient": gradient,
          "--spot-opacity": 0,
        } as CSSProperties
      }
    >
      <span aria-hidden className={overlay ? "spotlight-layer-top" : "spotlight-layer"} />
      {rim ? <span aria-hidden className="spotlight-rim" /> : null}
      <div className="relative z-[2]">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * HudChip — a small monospace readout with a status dot.
 * ------------------------------------------------------------------ */

interface HudChipProps {
  children: ReactNode
  tone?: "primary" | "accent" | "violet" | "muted" | "success" | "warning"
  className?: string
  dot?: boolean
}

const TONE_DOT: Record<NonNullable<HudChipProps["tone"]>, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  violet: "bg-violet",
  muted: "bg-muted/70",
  success: "bg-success",
  warning: "bg-warning",
}

export function HudChip({
  children,
  tone = "muted",
  className,
  dot = false,
}: HudChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-strong backdrop-blur-md",
        className,
      )}
    >
      {dot ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-70",
              TONE_DOT[tone],
            )}
          />
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", TONE_DOT[tone])} />
        </span>
      ) : null}
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ *
 * SectionHeading — an eyebrow, a title and a rule that draws itself.
 * ------------------------------------------------------------------ */

interface SectionHeadingProps {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  align?: "left" | "center"
  className?: string
  tone?: "primary" | "accent" | "violet"
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  tone = "primary",
}: SectionHeadingProps) {
  const toneClass =
    tone === "accent"
      ? "text-accent-soft/85"
      : tone === "violet"
        ? "text-violet-soft/85"
        : "text-primary-soft/85"

  return (
    <div
      className={cn(
        "relative",
        align === "center" ? "mx-auto max-w-2xl text-center" : "",
        className,
      )}
    >
      <p className={cn("eyebrow", toneClass)}>{eyebrow}</p>
      <h2 className="font-display mt-2 text-[1.55rem] font-semibold tracking-tight text-foreground md:text-[1.85rem]">
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-3 text-[13px] leading-relaxed text-muted",
            align === "center" ? "mx-auto max-w-xl" : "max-w-2xl",
          )}
        >
          {description}
        </p>
      ) : null}
      <div
        aria-hidden
        className={cn(
          "mt-5 h-px w-full overflow-hidden bg-white/[0.07]",
          align === "center" ? "mx-auto max-w-md" : "max-w-md",
        )}
      >
        <div className="h-full w-1/3 bg-[linear-gradient(90deg,transparent,rgba(143,182,255,0.9),transparent)] animate-sweep" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Marquee — an endless ticker for live algorithm output.
 * ------------------------------------------------------------------ */

interface MarqueeProps {
  items: string[]
  className?: string
  tone?: "primary" | "accent"
}

export function Marquee({ items, className, tone = "primary" }: MarqueeProps) {
  if (items.length === 0) return null
  const doubled = [...items, ...items]

  return (
    <div
      className={cn(
        "relative overflow-hidden border-y border-white/[0.06] bg-white/[0.015]",
        className,
      )}
    >
      <div
        className="marquee-track mask-fade-x py-2"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        }}
      >
        {doubled.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className={cn(
              "flex shrink-0 items-center gap-3 whitespace-nowrap px-6 font-mono text-[10.5px]",
              tone === "accent" ? "text-accent-soft/85" : "text-primary-soft/85",
            )}
          >
            <span className="h-1 w-1 rounded-full bg-current opacity-60" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Grain — the film-grain layer that unifies the whole interface.
 * ------------------------------------------------------------------ */

export function Grain() {
  return (
    <div
      aria-hidden
      className="grain-layer pointer-events-none fixed inset-0 z-[80] opacity-[0.035]"
    />
  )
}
