# AlgoLab — DAA Workbench

An interactive workbench for two classic **divide-and-conquer** algorithms, built as a
course project for *Design & Analysis of Algorithms*.

| Algorithm | Complexity | Reference check |
| --- | --- | --- |
| Closest Pair of Points | Θ(n log n) | brute-force O(n²) |
| Karatsuba Multiplication | Θ(n<sup>1.585</sup>) | schoolbook O(n²) |

Every result produced by the UI is cross-checked against a brute-force / schoolbook
reference before it is reported as verified.

---

## Features

- **Structured dry runs.** Both algorithms emit a typed event stream (`split`, `merge`,
  `strip`, `check`, `z₂`, `z₀`, `z₁`, `combine`, …). The player replays that stream on a
  `requestAnimationFrame` clock so the pace never drifts and pauses with the browser tab.
- **Smooth geometry.** The split line, the strip corridor, the winning pair and the
  distance readout are eased towards their new values instead of snapping, so the
  visualisation reads as continuous motion rather than a slideshow.
- **Condensed or exhaustive.** A run is condensed to ~72 discrete steps by default so a
  full playthrough takes about a minute. Switch *Detail → every step* to walk the
  complete trace instead.
- **Verification.** Closest pair is compared against a brute-force scan; Karatsuba is
  compared against a schoolbook multiplication, with operation counts and wall-clock
  timings reported side by side.
- **Self-contained.** The growth chart is hand-rolled SVG — no charting dependency.

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · `motion` (animation) · lucide-react

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run preview  # serve the production build
npm run lint     # eslint
```

## Project layout

```
src/
  App.tsx                 application shell, routing (hash based), navigation
  ClosetPair.ts           closest-pair algorithm + traced event stream
  Karatsuba.ts            karatsuba algorithm + traced event stream
  Generate.ts             CLI harness: writes deterministic test inputs
  Check.ts                CLI harness: re-runs every generated input and verifies it
  components/
    PointCanvas.tsx       point-cloud visualisation (eased geometry, magnifier inset)
    KaratsubaBoard.tsx    operand ribbon and z₀/z₁/z₂ tiles
    DryRunPanel.tsx       step readout + transport controls
    PlayerControls.tsx    transport, scrubber, speed and detail controls
    GrowthChart.tsx       SVG complexity chart
    StepLog.tsx           clickable recursion trace
    Stat.tsx, ui/*        shared primitives
  hooks/
    usePlayer.ts          rAF playback clock, stride/detail handling
    useTween.ts           eased numeric transitions and text reveal
  pages/                  Overview, ClosestPair, Karatsuba
```

### CLI harness

`Generate.ts` writes ten increasing test cases per algorithm into `data/`; `Check.ts`
replays them and prints `OK` / `WRONG` for each file. Both run against the same
algorithm modules the UI uses.

## Notes

- The visible pair in the closest-pair canvas is the *best pair so far*: split events
  do not carry a pair of their own, so the previous best is carried forward and eased
  into place.
- Wall-clock numbers favour the native `BigInt` backend for small operands — the
  operation-count reduction is the meaningful comparison at these sizes.
