import { useMemo, type MouseEvent, type RefObject } from "react"
import type { ClosestPairTraceStep, Point } from "../ClosetPair"
import { useTween } from "../hooks/useTween"
import { cn } from "../lib/utils"

export const CANVAS_SPACE = 1000
const ZOOM_SIZE = 200
const ZOOM_X = CANVAS_SPACE - ZOOM_SIZE - 20
const ZOOM_Y = CANVAS_SPACE - ZOOM_SIZE - 20

const C_POINT = "#545a68"
const C_LEFT = "#7ea9f5"
const C_RIGHT = "#56d3c5"
const C_STRIP = "#e0a33a"
const C_A = "#7ea9f5"
const C_B = "#56d3c5"
const C_IMPROVED = "#35c07f"
const C_REJECT = "#e5646e"

const pointKey = (p: Point) => `${p.x},${p.y}`

export interface TracePairView {
  a: Point
  b: Point
  d: number
}

interface PointCanvasProps {
  points: Point[]
  step: ClosestPairTraceStep | null
  best: TracePairView | null
  transitionMs: number
  interactive: boolean
  svgRef?: RefObject<SVGSVGElement | null>
  onAddPoint?: (event: MouseEvent<SVGSVGElement>) => void
}

export function PointCanvas({
  points,
  step,
  best,
  transitionMs,
  interactive,
  svgRef,
  onAddPoint,
}: PointCanvasProps) {
  const subsetSet = useMemo(() => {
    if (!step?.subset) return null
    return new Set(step.subset.map(pointKey))
  }, [step])

  const roleMap = useMemo(() => {
    const map = new Map<string, "left" | "right" | "strip">()
    step?.left?.forEach((p) => map.set(pointKey(p), "left"))
    step?.right?.forEach((p) => map.set(pointKey(p), "right"))
    step?.strip?.forEach((p) => map.set(pointKey(p), "strip"))
    return map
  }, [step])

  const bestPair = best

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS_SPACE} ${CANVAS_SPACE}`}
      className={cn(
        "h-full w-full select-none",
        interactive ? "cursor-crosshair" : "cursor-default",
      )}
      onClick={onAddPoint}
      role="img"
      aria-label="Point cloud with the closest-pair dry run highlighted"
    >
      <defs>
        <pattern
          id="cp-grid"
          width="100"
          height="100"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 100 0 L 0 0 0 100"
            fill="none"
            stroke="rgba(255,255,255,0.035)"
            strokeWidth="1"
          />
        </pattern>
        <linearGradient id="cp-pair" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={C_A} />
          <stop offset="100%" stopColor={C_B} />
        </linearGradient>
        <radialGradient id="cp-glow">
          <stop offset="0%" stopColor="rgba(126,169,245,0.28)" />
          <stop offset="100%" stopColor="rgba(126,169,245,0)" />
        </radialGradient>
        <clipPath id="cp-zoom-clip">
          <rect x={ZOOM_X} y={ZOOM_Y} width={ZOOM_SIZE} height={ZOOM_SIZE} rx={10} />
        </clipPath>
      </defs>

      <rect width={CANVAS_SPACE} height={CANVAS_SPACE} fill="url(#cp-grid)" />

      {points.map((p, index) => {
        const key = pointKey(p)
        const inSubset = !subsetSet || subsetSet.has(key)
        const role = roleMap.get(key)
        const isA = bestPair !== null && p.x === bestPair.a.x && p.y === bestPair.a.y
        const isB = bestPair !== null && p.x === bestPair.b.x && p.y === bestPair.b.y
        const fill = isA
          ? C_A
          : isB
            ? C_B
            : role === "left"
              ? C_LEFT
              : role === "right"
                ? C_RIGHT
                : role === "strip"
                  ? C_STRIP
                  : C_POINT
        return (
          <circle
            key={index}
            cx={p.x}
            cy={p.y}
            r={isA || isB ? 5 : role ? 3.6 : 2.8}
            fill={fill}
            opacity={inSubset ? (role || isA || isB ? 0.95 : 0.72) : 0.3}
            style={{
              transition:
                "opacity 520ms cubic-bezier(0.16,1,0.3,1), fill 520ms cubic-bezier(0.16,1,0.3,1), r 380ms cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        )
      })}

      <Overlay
        points={points}
        best={bestPair}
        midX={step?.midX}
        strip={step?.strip}
        check={step?.check}
        transitionMs={transitionMs}
      />
    </svg>
  )
}

interface OverlayProps {
  points: Point[]
  best: { a: Point; b: Point; d: number } | null
  midX: number | undefined
  strip: Point[] | undefined
  check: ClosestPairTraceStep["check"]
  transitionMs: number
}

function Overlay({
  points,
  best,
  midX,
  strip,
  check,
  transitionMs,
}: OverlayProps) {
  const ax = useTween(best?.a.x, transitionMs)
  const ay = useTween(best?.a.y, transitionMs)
  const bx = useTween(best?.b.x, transitionMs)
  const by = useTween(best?.b.y, transitionMs)
  const d = useTween(best?.d, transitionMs)
  const splitX = useTween(midX, transitionMs)

  // The inset always frames the winning pair, so the magnification adapts to
  // the current distance instead of a fixed factor.
  const zoom = useMemo(() => {
    if (!best || !Number.isFinite(best.d)) return null
    const cx = (best.a.x + best.b.x) / 2
    const cy = (best.a.y + best.b.y) / 2
    const windowUnits = Math.max(45, best.d * 1.9)
    const scale = ZOOM_SIZE / windowUnits
    const half = windowUnits / 2
    const visible = points.filter(
      (p) => Math.abs(p.x - cx) <= half && Math.abs(p.y - cy) <= half,
    )
    return { cx, cy, scale, visible }
  }, [points, best])

  const hasPair =
    typeof ax === "number" &&
    typeof ay === "number" &&
    typeof bx === "number" &&
    typeof by === "number" &&
    typeof d === "number"
  const hasSplit = typeof splitX === "number"

  const labelX = hasPair
    ? Math.min(Math.max((ax! + bx!) / 2, 52), CANVAS_SPACE - 52)
    : 0
  const labelY = hasPair ? Math.min(Math.max((ay! + by!) / 2, 30), CANVAS_SPACE - 30) : 0

  return (
    <g>
      {/* Split line — marching dashes make the partition read as a scanner. */}
      {hasSplit ? (
        <g style={{ transform: `translateX(${splitX}px)`, transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)" }}>
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={CANVAS_SPACE}
            stroke="rgba(126,169,245,0.65)"
            strokeWidth="1.5"
            strokeDasharray="9 7"
            className="animate-march"
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={CANVAS_SPACE}
            stroke="rgba(126,169,245,0.14)"
            strokeWidth="6"
          />
        </g>
      ) : null}

      {/* Strip band — the 2d corridor scanned after the merge. */}
      {hasSplit && typeof d === "number" && Number.isFinite(d) && strip?.length ? (
        <rect
          x={splitX! - d}
          y={0}
          width={d * 2}
          height={CANVAS_SPACE}
          fill="rgba(224,163,58,0.045)"
          stroke="rgba(224,163,58,0.28)"
          strokeWidth="1"
          strokeDasharray="5 7"
          style={{ transition: "all 600ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      ) : null}

      {/* Active comparison between two strip candidates. */}
      {check ? (
        <g style={{ transition: "opacity 300ms ease" }}>
          <line
            x1={check.p.x}
            y1={check.p.y}
            x2={check.q.x}
            y2={check.q.y}
            stroke={check.improved ? C_IMPROVED : C_REJECT}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.9"
          />
          <circle
            cx={check.p.x}
            cy={check.p.y}
            r={9}
            fill="none"
            stroke={check.improved ? C_IMPROVED : C_REJECT}
            strokeWidth="1.5"
            opacity="0.85"
          />
          <circle
            cx={check.q.x}
            cy={check.q.y}
            r={9}
            fill="none"
            stroke={check.improved ? C_IMPROVED : C_REJECT}
            strokeWidth="1.5"
            opacity="0.85"
          />
        </g>
      ) : null}

      {/* The winning pair — connector glides, discs show the packing radius. */}
      {hasPair ? (
        <g>
          <circle cx={ax!} cy={ay!} r={34} fill="url(#cp-glow)" />
          <circle cx={bx!} cy={by!} r={34} fill="url(#cp-glow)" />

          {Number.isFinite(d!) && d! > 0 ? (
            <>
              <circle
                cx={ax!}
                cy={ay!}
                r={d! / 2}
                fill="none"
                stroke="rgba(126,169,245,0.32)"
                strokeWidth="1"
                strokeDasharray="3 6"
              />
              <circle
                cx={bx!}
                cy={by!}
                r={d! / 2}
                fill="none"
                stroke="rgba(86,211,197,0.32)"
                strokeWidth="1"
                strokeDasharray="3 6"
              />
            </>
          ) : null}

          <line
            x1={ax!}
            y1={ay!}
            x2={bx!}
            y2={by!}
            stroke="url(#cp-pair)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1={ax!}
            y1={ay!}
            x2={bx!}
            y2={by!}
            stroke="#ffffff"
            strokeWidth="1"
            strokeDasharray="6 10"
            opacity="0.5"
            className="animate-march"
          />

          <circle
            cx={ax!}
            cy={ay!}
            r={10}
            fill="none"
            stroke={C_A}
            strokeWidth="1.5"
            className="animate-pulse-ring"
            style={{ transformOrigin: `${ax}px ${ay}px` }}
          />
          <circle
            cx={bx!}
            cy={by!}
            r={10}
            fill="none"
            stroke={C_B}
            strokeWidth="1.5"
            className="animate-pulse-ring"
            style={{ transformOrigin: `${bx}px ${by}px` }}
          />

          <circle cx={ax!} cy={ay!} r={4.5} fill={C_A} />
          <circle cx={bx!} cy={by!} r={4.5} fill={C_B} />

          <g transform={`translate(${labelX} ${labelY})`}>
            <rect
              x={-40}
              y={-26}
              width={80}
              height={19}
              rx={5}
              fill="rgba(9,10,12,0.88)"
              stroke="rgba(42,45,53,0.9)"
            />
            <text
              x={0}
              y={-13}
              textAnchor="middle"
              fill="#e7e9ee"
              fontSize="12"
              fontFamily="JetBrains Mono, monospace"
            >
              d = {d!.toFixed(4)}
            </text>
          </g>
        </g>
      ) : null}

      {/* Magnified inset of the winning pair. */}
      {hasPair && zoom ? (
        <g>
          <rect
            x={ZOOM_X}
            y={ZOOM_Y}
            width={ZOOM_SIZE}
            height={ZOOM_SIZE}
            rx={10}
            fill="#0b0c0f"
            stroke="rgba(126,169,245,0.3)"
            strokeWidth="1"
          />
          <g clipPath="url(#cp-zoom-clip)">
            <g
              transform={`translate(${ZOOM_X + ZOOM_SIZE / 2}, ${
                ZOOM_Y + ZOOM_SIZE / 2
              }) scale(${zoom.scale}) translate(${-zoom.cx}, ${-zoom.cy})`}
            >
              {zoom.visible.map((p, index) => {
                const isA = p.x === best!.a.x && p.y === best!.a.y
                const isB = p.x === best!.b.x && p.y === best!.b.y
                return (
                  <circle
                    key={index}
                    cx={p.x}
                    cy={p.y}
                    r={2.6 / zoom.scale}
                    fill={isA ? C_A : isB ? C_B : C_POINT}
                    opacity={isA || isB ? 1 : 0.6}
                  />
                )
              })}
              {Number.isFinite(d!) && d! > 0 ? (
                <>
                  <circle
                    cx={ax!}
                    cy={ay!}
                    r={d! / 2}
                    fill="none"
                    stroke="rgba(126,169,245,0.45)"
                    strokeWidth={1 / zoom.scale}
                    strokeDasharray={`${3 / zoom.scale} ${5 / zoom.scale}`}
                  />
                  <circle
                    cx={bx!}
                    cy={by!}
                    r={d! / 2}
                    fill="none"
                    stroke="rgba(86,211,197,0.45)"
                    strokeWidth={1 / zoom.scale}
                    strokeDasharray={`${3 / zoom.scale} ${5 / zoom.scale}`}
                  />
                </>
              ) : null}
              <line
                x1={ax!}
                y1={ay!}
                x2={bx!}
                y2={by!}
                stroke="url(#cp-pair)"
                strokeWidth={2 / zoom.scale}
                strokeLinecap="round"
              />
              <circle cx={ax!} cy={ay!} r={4.5 / zoom.scale} fill={C_A} />
              <circle cx={bx!} cy={by!} r={4.5 / zoom.scale} fill={C_B} />
            </g>
          </g>
          <rect
            x={ZOOM_X}
            y={ZOOM_Y}
            width={ZOOM_SIZE}
            height={ZOOM_SIZE}
            rx={10}
            fill="none"
            stroke="rgba(126,169,245,0.3)"
            strokeWidth="1"
          />
          <text
            x={ZOOM_X + 10}
            y={ZOOM_Y + 18}
            fill="#868b96"
            fontSize="11"
            fontFamily="JetBrains Mono, monospace"
          >
            ×{zoom.scale.toFixed(1)}
          </text>
        </g>
      ) : null}
    </g>
  )
}
