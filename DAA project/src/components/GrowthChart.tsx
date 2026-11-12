import { useEffect, useRef, useState } from "react"

interface Point {
  n: number
  values: number[]
}

interface Series {
  name: string
  color: string
  dash?: string
}

const PADDING = { top: 14, right: 14, bottom: 26, left: 44 }
const HEIGHT = 250
const Y_MIN = 10
const Y_MAX = 2_000_000

function growthData(): Point[] {
  const sizes = [10, 25, 50, 100, 200, 400, 800, 1200]
  return sizes.map((n) => ({
    n,
    values: [
      Math.round(n * Math.log2(n)),
      n * n,
      Math.round(Math.pow(n, 1.585)),
    ],
  }))
}

const SERIES: Series[] = [
  { name: "Closest Pair · n log n", color: "#7ea9f5" },
  { name: "Brute force · n²", color: "#e5646e", dash: "5 5" },
  { name: "Karatsuba · n¹·⁵⁸⁵", color: "#56d3c5" },
]

function logScale(value: number): number {
  const t =
    (Math.log10(Math.max(value, 1)) - Math.log10(Y_MIN)) /
    (Math.log10(Y_MAX) - Math.log10(Y_MIN))
  return Math.min(1, Math.max(0, t))
}

export function GrowthChart() {
  const data = growthData()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const element = wrapRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width
      if (next && next > 0) setWidth(next)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const innerWidth = Math.max(width - PADDING.left - PADDING.right, 10)
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom
  const step = innerWidth / Math.max(data.length - 1, 1)

  const xAt = (index: number) => PADDING.left + index * step
  const yAt = (value: number) => PADDING.top + innerHeight * (1 - logScale(value))

  const ticks = [10, 100, 1000, 10000, 100000, 1000000]

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const index = Math.round((x - PADDING.left) / step)
    setHover(index >= 0 && index < data.length ? index : null)
  }

  const active = hover !== null ? data[hover] : null
  const tooltipLeft = hover !== null ? xAt(hover) : 0

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        width={width}
        height={HEIGHT}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Operation count versus input size, logarithmic scale"
      >
        <defs>
          {SERIES.map((series, index) => (
            <linearGradient
              key={series.name}
              id={`growth-fill-${index}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={series.color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={series.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={PADDING.left + innerWidth}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke="#1e2026"
              strokeDasharray="3 4"
            />
            <text
              x={PADDING.left - 8}
              y={yAt(tick) + 3}
              textAnchor="end"
              fill="#5d626d"
              fontSize="9.5"
              fontFamily="JetBrains Mono, monospace"
            >
              {tick >= 1000 ? `${tick / 1000}k` : tick}
            </text>
          </g>
        ))}

        {data.map((point, index) => (
          <text
            key={point.n}
            x={xAt(index)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fill="#5d626d"
            fontSize="9.5"
            fontFamily="JetBrains Mono, monospace"
          >
            {point.n}
          </text>
        ))}

        <line
          x1={PADDING.left}
          x2={PADDING.left + innerWidth}
          y1={PADDING.top + innerHeight}
          y2={PADDING.top + innerHeight}
          stroke="#2a2d35"
        />

        {SERIES.map((series, seriesIndex) => {
          const path = data
            .map((point, index) => {
              const command = index === 0 ? "M" : "L"
              return `${command} ${xAt(index)} ${yAt(point.values[seriesIndex])}`
            })
            .join(" ")
          const area = `${path} L ${xAt(data.length - 1)} ${
            PADDING.top + innerHeight
          } L ${xAt(0)} ${PADDING.top + innerHeight} Z`

          return (
            <g key={series.name}>
              <path d={area} fill={`url(#growth-fill-${seriesIndex})`} />
              <path
                d={path}
                fill="none"
                stroke={series.color}
                strokeWidth={1.75}
                strokeDasharray={series.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )
        })}

        {hover !== null ? (
          <g>
            <line
              x1={xAt(hover)}
              x2={xAt(hover)}
              y1={PADDING.top}
              y2={PADDING.top + innerHeight}
              stroke="#3a3e49"
              strokeDasharray="3 3"
            />
            {SERIES.map((series, seriesIndex) => (
              <circle
                key={series.name}
                cx={xAt(hover)}
                cy={yAt(data[hover].values[seriesIndex])}
                r={3.5}
                fill={series.color}
                stroke="#0d0e11"
                strokeWidth={1.5}
              />
            ))}
          </g>
        ) : null}
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute z-10 w-44 rounded-lg border border-border-strong bg-[#0d0e11]/95 px-2.5 py-2 shadow-pop backdrop-blur"
          style={{
            left: Math.min(Math.max(tooltipLeft - 88, 0), Math.max(width - 176, 0)),
            top: 6,
          }}
        >
          <p className="mb-1.5 font-mono text-[10px] text-muted">n = {active.n}</p>
          {SERIES.map((series, index) => (
            <div
              key={series.name}
              className="flex items-center justify-between gap-3 text-[10.5px]"
            >
              <span className="flex items-center gap-1.5 text-muted-strong">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: series.color }}
                />
                {series.name.split(" · ")[0]}
              </span>
              <span className="font-mono tabular-nums text-foreground">
                {active.values[index].toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {SERIES.map((series) => (
          <span
            key={series.name}
            className="flex items-center gap-1.5 font-mono text-[10px] text-muted"
          >
            <span
              className="h-0.5 w-3.5 rounded-full"
              style={{
                background: series.color,
                opacity: series.dash ? 0.7 : 1,
              }}
            />
            {series.name}
          </span>
        ))}
      </div>
    </div>
  )
}
