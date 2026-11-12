import { motion } from "motion/react"
import type { ReactNode } from "react"
import type { PlayerState } from "../hooks/usePlayer"
import { PlayerControls } from "./PlayerControls"
import { cn } from "../lib/utils"

export interface DryRunStep {
  type: string
  depth: number
  message: string
}

interface DryRunPanelProps {
  player: PlayerState
  step: DryRunStep | null
  accent?: "primary" | "accent"
  meta?: ReactNode
  children?: ReactNode
  emptyIcon?: ReactNode
  emptyHint?: string
  action?: ReactNode
}

const accentRing: Record<string, string> = {
  primary: "border-primary/25 bg-primary/[0.06]",
  accent: "border-accent/25 bg-accent/[0.06]",
}

const accentText: Record<string, string> = {
  primary: "text-primary-soft",
  accent: "text-accent-soft",
}

export function DryRunPanel({
  player,
  step,
  accent = "primary",
  meta,
  children,
  emptyIcon,
  emptyHint,
  action,
}: DryRunPanelProps) {
  return (
    <div className="space-y-4">
      {step ? (
        <>
          <div
            className={cn(
              "rounded-xl border px-3 py-2.5",
              accentRing[accent],
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "font-mono text-[9.5px] uppercase tracking-[0.14em]",
                  accentText[accent],
                )}
              >
                depth {step.depth}
              </span>
              {meta ? (
                <span className="font-mono text-[10px] tabular-nums text-muted">
                  {meta}
                </span>
              ) : null}
            </div>

            <div className="relative mt-1.5 min-h-[2.6rem]">
              <motion.p
                key={step.message}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="text-[12px] leading-relaxed text-muted-strong"
              >
                {step.message}
              </motion.p>
            </div>
          </div>

          <PlayerControls player={player} />

          {children}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong/70 bg-surface/40 px-4 py-8 text-center">
          {emptyIcon}
          <p className="max-w-56 text-[11.5px] leading-relaxed text-muted">
            {emptyHint}
          </p>
          {action}
        </div>
      )}
    </div>
  )
}
