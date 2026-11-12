import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react"
import type { PlayerState } from "../hooks/usePlayer"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"

const SPEEDS = [
  { label: "0.5×", value: 1200 },
  { label: "1×", value: 600 },
  { label: "2×", value: 300 },
  { label: "4×", value: 100 },
]

interface PlayerControlsProps {
  player: PlayerState
  className?: string
}

export function PlayerControls({ player, className }: PlayerControlsProps) {
  const disabled = player.total === 0
  const atStart = player.index <= 0
  const atEnd = player.index >= player.total - 1

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={player.reset}
            disabled={disabled}
            title="Reset to first step"
            aria-label="Reset to first step"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={player.prev}
            disabled={disabled || atStart}
            title="Previous step"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={player.toggle}
            disabled={disabled}
            title={player.isPlaying ? "Pause" : "Play"}
            aria-label={player.isPlaying ? "Pause" : "Play"}
            className="relative"
          >
            {player.isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={player.next}
            disabled={disabled || atEnd}
            title="Next step"
            aria-label="Next step"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={player.end}
            disabled={disabled || atEnd}
            title="Skip to end"
            aria-label="Skip to end"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {player.isPlaying && player.stride > 1 ? (
            <span className="rounded-md bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] text-accent-soft">
              auto ×{player.stride}
            </span>
          ) : null}
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              player.isPlaying
                ? "animate-pulse bg-success shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                : "bg-muted/40",
            )}
          />
          <span className="font-mono text-[11px] text-muted">
            Step{" "}
            <span className="text-foreground">
              {Math.max(player.index + 1, 0)}
            </span>{" "}
            / {player.total}
          </span>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(player.total - 1, 0)}
        value={Math.max(player.index, 0)}
        onChange={(event) => player.seek(Number(event.target.value))}
        disabled={disabled}
        aria-label="Dry-run progress"
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border-strong accent-[#8b5cf6] disabled:cursor-not-allowed disabled:opacity-40"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
          Playback speed
        </span>
        <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-surface/60 p-0.5">
          {SPEEDS.map((speed) => (
            <button
              key={speed.value}
              type="button"
              onClick={() => player.setSpeed(speed.value)}
              className={cn(
                "rounded-md px-2 py-1 font-mono text-[10px] transition-colors",
                player.speed === speed.value
                  ? "bg-primary/20 text-primary-soft"
                  : "text-muted hover:text-foreground",
              )}
            >
              {speed.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
