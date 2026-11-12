export interface Point {
  x: number;
  y: number;
}

export interface Step {
  depth: number;
  text: string;
}

export interface ClosestPairResult {
  a: Point;
  b: Point;
  distance: number;
  steps: Step[];
}

function dist(p: Point, q: Point): number {
  const dx = p.x - q.x;
  const dy = p.y - q.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function bruteForce(pts: Point[]): { a: Point; b: Point; d: number } {
  let best = { a: pts[0], b: pts[1], d: dist(pts[0], pts[1]) };
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = dist(pts[i], pts[j]);
      if (d < best.d) best = { a: pts[i], b: pts[j], d };
    }
  }
  return best;
}

export function closestPair(points: Point[]): ClosestPairResult {
  const steps: Step[] = [];
  const px = [...points].sort((p, q) => p.x - q.x || p.y - q.y);

  function solve(arr: Point[], depth: number): { a: Point; b: Point; d: number } {
    const n = arr.length;

    if (n <= 3) {
      const r = bruteForce(arr);
      steps.push({ depth, text: `base case: ${n} points, brute force, best d = ${r.d.toFixed(4)}` });
      return r;
    }

    const mid = Math.floor(n / 2);
    const midX = arr[mid].x;
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);
    steps.push({ depth, text: `split ${n} points at x = ${midX} (left ${left.length}, right ${right.length})` });

    const rl = solve(left, depth + 1);
    const rr = solve(right, depth + 1);
    let best = rl.d <= rr.d ? rl : rr;
    steps.push({ depth, text: `left d = ${rl.d.toFixed(4)}, right d = ${rr.d.toFixed(4)}, d = ${best.d.toFixed(4)}` });

    const strip = arr.filter((p) => Math.abs(p.x - midX) < best.d).sort((p, q) => p.y - q.y);
    steps.push({ depth, text: `strip has ${strip.length} points within d of x = ${midX}` });

    for (let i = 0; i < strip.length; i++) {
      for (let j = i + 1; j < strip.length && strip[j].y - strip[i].y < best.d; j++) {
        const d = dist(strip[i], strip[j]);
        if (d < best.d) {
          best = { a: strip[i], b: strip[j], d };
          steps.push({
            depth,
            text: `strip gave closer pair (${strip[i].x},${strip[i].y}) and (${strip[j].x},${strip[j].y}), d = ${d.toFixed(4)}`,
          });
        }
      }
    }
    return best;
  }

  const r = solve(px, 0);
  return { a: r.a, b: r.b, distance: r.d, steps };
}

export function closestPairBrute(points: Point[]): number {
  return bruteForce(points).d;
}

export type ClosestPairTraceType =
  | "sort"
  | "base"
  | "split"
  | "merge"
  | "strip"
  | "check"
  | "done";

export interface TracePair {
  a: Point;
  b: Point;
  d: number;
}

export interface ClosestPairTraceStep {
  type: ClosestPairTraceType;
  depth: number;
  message: string;
  subset?: Point[];
  midX?: number;
  left?: Point[];
  right?: Point[];
  strip?: Point[];
  best?: TracePair;
  check?: { p: Point; q: Point; d: number; improved: boolean };
}

export interface ClosestPairTraceResult {
  a: Point;
  b: Point;
  distance: number;
  trace: ClosestPairTraceStep[];
}

/**
 * Same divide-and-conquer closest-pair algorithm, but records a structured
 * event stream that the UI can replay step by step.
 */
export function closestPairTraced(points: Point[]): ClosestPairTraceResult {
  const trace: ClosestPairTraceStep[] = [];
  const px = [...points].sort((p, q) => p.x - q.x || p.y - q.y);

  trace.push({
    type: "sort",
    depth: 0,
    message: `Sort ${points.length} points by x-coordinate.`,
    subset: px,
  });

  function solve(arr: Point[], depth: number): TracePair {
    const n = arr.length;

    if (n <= 3) {
      const r =
        n < 2
          ? { a: arr[0], b: arr[0], d: Infinity }
          : bruteForce(arr);
      trace.push({
        type: "base",
        depth,
        message: `Base case · ${n} point${n === 1 ? "" : "s"} → brute force gives d = ${r.d.toFixed(4)}.`,
        subset: arr,
        best: r,
      });
      return r;
    }

    const mid = Math.floor(n / 2);
    const midX = arr[mid].x;
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);

    trace.push({
      type: "split",
      depth,
      message: `Split ${n} points at x = ${midX} → ${left.length} left, ${right.length} right.`,
      subset: arr,
      midX,
      left,
      right,
    });

    const rl = solve(left, depth + 1);
    const rr = solve(right, depth + 1);
    let best = rl.d <= rr.d ? rl : rr;

    trace.push({
      type: "merge",
      depth,
      message: `Merge · left d = ${rl.d.toFixed(4)}, right d = ${rr.d.toFixed(4)} → d = ${best.d.toFixed(4)}.`,
      subset: arr,
      midX,
      best,
    });

    const strip = arr
      .filter((p) => Math.abs(p.x - midX) < best.d)
      .sort((p, q) => p.y - q.y);

    trace.push({
      type: "strip",
      depth,
      message: `Strip · ${strip.length} point${strip.length === 1 ? "" : "s"} within d of x = ${midX}.`,
      subset: arr,
      midX,
      strip,
      best,
    });

    for (let i = 0; i < strip.length; i++) {
      for (let j = i + 1; j < strip.length && strip[j].y - strip[i].y < best.d; j++) {
        const d = dist(strip[i], strip[j]);
        const improved = d < best.d;
        if (improved) best = { a: strip[i], b: strip[j], d };
        trace.push({
          type: "check",
          depth,
          message: `Compare (${strip[i].x}, ${strip[i].y}) ↔ (${strip[j].x}, ${strip[j].y}) · d = ${d.toFixed(4)}${improved ? " → new best" : ""}.`,
          subset: arr,
          midX,
          strip,
          best,
          check: { p: strip[i], q: strip[j], d, improved },
        });
      }
    }

    return best;
  }

  const r = solve(px, 0);

  trace.push({
    type: "done",
    depth: 0,
    message: `Complete · closest pair is (${r.a.x}, ${r.a.y}) ↔ (${r.b.x}, ${r.b.y}) with d = ${r.d.toFixed(4)}.`,
    subset: px,
    best: r,
  });

  return { a: r.a, b: r.b, distance: r.d, trace };
}

export function parsePoints(text: string): Point[] {
  const lines = text.trim().split(/\r?\n/);
  const n = parseInt(lines[0]);
  const pts: Point[] = [];
  for (let i = 1; i <= n; i++) {
    const [x, y] = lines[i].trim().split(/\s+/).map(Number);
    pts.push({ x, y });
  }
  return pts;
}