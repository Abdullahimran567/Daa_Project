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