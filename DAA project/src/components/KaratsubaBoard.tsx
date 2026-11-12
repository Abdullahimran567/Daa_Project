import { AnimatePresence, motion } from "motion/react"
import type { KaratsubaTraceStep } from "../Karatsuba"
import { useRevealText } from "../hooks/useTween"
import { cn, shorten } from "../lib/utils"

type TileTone = "primary" | "accent" | "warning" | "success"

const toneClass: Record<TileTone, string> = {
  primary: "border-primary/30 bg-primary/[0.07] text-primary-soft",
  accent: "border-accent/30 bg-accent/[0.07] text-accent-soft",
  warning: "border-warning/30 bg-warning/[0.07] text-warning",
  success: "border-success/30 bg-success/[0.07] text-success",
}

interface KaratsubaBoardProps {
  step: KaratsubaTraceStep
}

export function KaratsubaBoard({ step }: KaratsubaBoardProps) {
  if (step.type === "done") {
    return <FinalProduct step={step} />
  }

  if (step.type === "base") {
    return <BaseCase step={step} />
  }

  if (step.a === undefined || step.m === undefined) return null

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-3">
      <div className="grid gap-2.5">
        <DigitRibbon label="X" high={step.a} low={step.b ?? 0n} m={step.m} />
        <DigitRibbon label="Y" high={step.c ?? 0n} low={step.d ?? 0n} m={step.m} />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <ValueTile label="z₂ = ac" value={step.z2} tone="primary" />
        <ValueTile label="z₀ = bd" value={step.z0} tone="accent" />
        <ValueTile label="z₁" value={step.z1} tone="warning" />
      </div>

      <AnimatePresence initial={false}>
        {step.result !== undefined ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <ValueTile label="combined" value={step.result} tone="success" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function DigitRibbon({
  label,
  high,
  low,
  m,
}: {
  label: string
  high: bigint
  low: bigint
  m: number
}) {
  const highText = high.toString()
  const lowText = low.toString()

  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
        <span>{label}</span>
        <span className="normal-case">m = {m}</span>
      </div>
      <div className="mt-1 flex items-stretch overflow-hidden rounded-md border border-border-strong">
        <span className="flex-1 truncate bg-primary/[0.07] px-2 py-1 font-mono text-[10px] text-primary-soft">
          {highText}
        </span>
        <span className="flex w-px items-center justify-center bg-border-strong px-0.5 font-mono text-[9px] text-muted">
          │
        </span>
        <span className="flex-1 truncate bg-accent/[0.07] px-2 py-1 font-mono text-[10px] text-accent-soft">
          {lowText}
        </span>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[8.5px] text-muted/70">
        <span>a · {highText.length}d</span>
        <span>b · {lowText.length}d</span>
      </div>
    </div>
  )
}

function ValueTile({
  label,
  value,
  tone,
}: {
  label: string
  value?: bigint
  tone: TileTone
}) {
  const text = value === undefined ? "" : shorten(value, 9, 5)
  const revealed = useRevealText(text, 420)

  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border px-2 py-1.5 transition-colors",
        value === undefined
          ? "border-border/70 bg-surface/30 opacity-50"
          : toneClass[tone],
      )}
    >
      <p className="font-mono text-[9.5px] tracking-tight opacity-75">
        {label}
      </p>
      <p
        className="mt-0.5 truncate font-mono text-[10px] text-foreground"
        title={value?.toString()}
      >
        {value === undefined ? "—" : revealed || "…"}
      </p>
    </div>
  )
}

function BaseCase({ step }: { step: KaratsubaTraceStep }) {
  const result = step.result?.toString() ?? ""
  const revealed = useRevealText(result, 380)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-warning/25 bg-warning/[0.05] p-3"
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-warning">
        Base case
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted-strong">
        <span className="text-foreground">{shorten(step.x ?? 0n, 10, 6)}</span>
        <span className="text-muted">×</span>
        <span className="text-foreground">{shorten(step.y ?? 0n, 10, 6)}</span>
        <span className="text-muted">=</span>
        <span className="text-success">{revealed || "…"}</span>
      </div>
    </motion.div>
  )
}

function FinalProduct({ step }: { step: KaratsubaTraceStep }) {
  const product = step.result?.toString() ?? ""
  const revealed = useRevealText(product, 900)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-success/25 bg-success/[0.05] p-3"
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-success">
        Final product
      </p>
      <p className="mt-1 max-h-32 overflow-auto break-all font-mono text-[11px] leading-relaxed text-foreground">
        {revealed}
      </p>
    </motion.div>
  )
}
