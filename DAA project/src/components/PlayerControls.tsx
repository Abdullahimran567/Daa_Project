import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react"
import { SPEEDS, type PlayerState } from "../hooks/usePlayer"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"

interface PlayerControlsProps {
  player: PlayerState
  className?: string
}

export function PlayerControls({ player, className }: PlayerControlsProps) {
  const disabled = player.total === 0
  const atStart = player.index <= 0
  const atEnd = player.index >= player.total - 1
  const progress = player.total > 0 ? (player.index + 1) / player.total : 0

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
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={player.prev}
            disabled={disabled || atStart}
            title="Previous step"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            onClick={player.toggle}
            disabled={disabled}
            title={player.isPlaying ? "Pause" : "Play"}
            aria-label={player.isPlaying ? "Pause" : "Play"}
            className="mx-0.5"
          >
            {player.isPlaying ? (
              <Pause className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={player.next}
            disabled={disabled || atEnd}
            title="Next step"
            aria-label="Next step"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={player.end}
            disabled={disabled || atEnd}
            title="Skip to end"
            aria-label="Skip to end"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-muted">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              player.isPlaying
                ? "bg-success shadow-[0_0_8px_rgba(53,192,127,0.8)]"
                : "bg-border-strong",
            )}
          />
          <span className="tabular-nums text-foreground">
            {String(Math.max(player.index + 1, 0)).padStart(
              String(Math.max(player.total, 1)).length,
              "0",
            )}
          </span>
          <span>/ {player.total || 0}</span>
          <span className="tabular-nums text-muted/70">
            {(progress * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <Scrubber player={player} progress={progress} disabled={disabled} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Gauge className="h-3 w-3 text-muted/70" />
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted">
            Speed
          </span>
          <div className="ml-1 flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
            {SPEEDS.map((speed) => (
              <button
                key={speed.value}
                type="button"
                onClick={() => player.setSpeed(speed.value)}
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                  player.speed === speed.value
                    ? "bg-primary/15 text-primary-soft"
                    : "text-muted hover:text-foreground",
                )}
              >
                {speed.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted">
            Detail
          </span>
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() => player.setDetail("condensed")}
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                player.detail === "condensed"
                  ? "bg-primary/15 text-primary-soft"
                  : "text-muted hover:text-foreground",
              )}
            >
              condensed
            </button>
            <button
              type="button"
              onClick={() => player.setDetail("full")}
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                player.detail === "full"
                  ? "bg-primary/15 text-primary-soft"
                  : "text-muted hover:text-foreground",
              )}
            >
              every step
            </button>
          </div>
        </div>
      </div>

      {player.detail === "condensed" && player.stride > 1 ? (
        <p className="font-mono text-[10px] leading-relaxed text-muted/70">
          Surfacing 1 of every {player.stride} recorded events — switch to
          “every step” for the full trace.
        </p>
      ) : null}
    </div>
  )
}

function Scrubber({
  player,
  progress,
  disabled,
}: {
  player: PlayerState
  progress: number
  disabled: boolean
}) {
  return (
    <div className="relative h-5">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full rounded-full bg-primary/70 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(progress * 100, 0)}%` }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(player.total - 1, 0)}
        value={Math.max(player.index, 0)}
        onChange={(event) => player.seek(Number(event.target.value))}
        disabled={disabled}
        aria-label="Dry-run progress"
        className="absolute inset-0 h-5 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed
          [&::-webkit-slider-runnable-track]:h-5 [&::-webkit-slider-runnable-track]:bg-transparent
          [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background
          [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-[0_1px_6px_rgba(0,0,0,0.6)]
          [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-foreground"
      />
    </div>
  )
}
