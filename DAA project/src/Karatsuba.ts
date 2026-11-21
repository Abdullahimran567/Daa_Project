export interface Step {
  depth: number;
  text: string;
}

export interface KaratsubaResult {
  product: bigint;
  steps: Step[];
  multiplications: number;
}

export function karatsuba(x: bigint, y: bigint): KaratsubaResult {
  const steps: Step[] = [];
  let baseCount = 0;

  function mul(x: bigint, y: bigint, depth: number): bigint {
    if (x < 10n || y < 10n) {
      baseCount++;
      return x * y;
    }

    const n = Math.max(x.toString().length, y.toString().length);
    const m = Math.floor(n / 2);
    const p = 10n ** BigInt(m);

    const a = x / p;
    const b = x % p;
    const c = y / p;
    const d = y % p;

    const z2 = mul(a, c, depth + 1);
    const z0 = mul(b, d, depth + 1);
    const z1 = mul(a + b, c + d, depth + 1) - z2 - z0;

    const result = z2 * p * p + z1 * p + z0;
    steps.push({
      depth,
      text: `n = ${n}, m = ${m}: split into a,b,c,d, did 3 multiplications (ac, bd, (a+b)(c+d)) and combined`,
    });
    return result;
  }

  const product = mul(x, y, 0);
  return { product, steps, multiplications: baseCount };
}

export function parseNumbers(text: string): [bigint, bigint] {
  const lines = text.trim().split(/\r?\n/);
  return [BigInt(lines[0].trim()), BigInt(lines[1].trim())];
}

export type KaratsubaTraceType =
  | "split"
  | "base"
  | "z2"
  | "z0"
  | "z1"
  | "combine"
  | "done";

export interface KaratsubaFrame {
  x: string;
  y: string;
  depth: number;
}

export interface KaratsubaTraceStep {
  type: KaratsubaTraceType;
  depth: number;
  message: string;
  x?: bigint;
  y?: bigint;
  n?: number;
  m?: number;
  p?: bigint;
  a?: bigint;
  b?: bigint;
  c?: bigint;
  d?: bigint;
  z0?: bigint;
  z1?: bigint;
  z2?: bigint;
  result?: bigint;
  stack?: KaratsubaFrame[];
}

export interface KaratsubaTraceResult {
  product: bigint;
  multiplications: number;
  trace: KaratsubaTraceStep[];
}

function brief(value: bigint, head = 18, tail = 8): string {
  const text = value.toString();
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}…${text.slice(-tail)} (${text.length} digits)`;
}

/**
 * Karatsuba with a structured event stream: every split, recursive
 * sub-product, and recombination is recorded for the visual dry run.
 */
export function karatsubaTraced(x: bigint, y: bigint): KaratsubaTraceResult {
  const trace: KaratsubaTraceStep[] = [];
  const stack: KaratsubaFrame[] = [];
  let baseCount = 0;

  const snapshot = (): KaratsubaFrame[] =>
    stack.map((frame) => ({ ...frame }));

  function mul(left: bigint, right: bigint, depth: number): bigint {
    stack.push({ x: left.toString(), y: right.toString(), depth });

    if (left < 10n || right < 10n) {
      baseCount++;
      const result = left * right;
      trace.push({
        type: "base",
        depth,
        message: `Base case · ${brief(left)} × ${brief(right)} = ${brief(result)}.`,
        x: left,
        y: right,
        result,
        stack: snapshot(),
      });
      stack.pop();
      return result;
    }

    const n = Math.max(left.toString().length, right.toString().length);
    const m = Math.floor(n / 2);
    const p = 10n ** BigInt(m);

    const a = left / p;
    const b = left % p;
    const c = right / p;
    const d = right % p;

    trace.push({
      type: "split",
      depth,
      message: `Split at m = ${m} · left = a·10^${m} + b, right = c·10^${m} + d.`,
      x: left,
      y: right,
      n,
      m,
      p,
      a,
      b,
      c,
      d,
      stack: snapshot(),
    });

    const z2 = mul(a, c, depth + 1);
    trace.push({
      type: "z2",
      depth,
      message: `z₂ = a · c = ${brief(z2)}.`,
      x: left,
      y: right,
      n,
      m,
      p,
      a,
      b,
      c,
      d,
      z2,
      stack: snapshot(),
    });

    const z0 = mul(b, d, depth + 1);
    trace.push({
      type: "z0",
      depth,
      message: `z₀ = b · d = ${brief(z0)}.`,
      x: left,
      y: right,
      n,
      m,
      p,
      a,
      b,
      c,
      d,
      z2,
      z0,
      stack: snapshot(),
    });

    const z1 = mul(a + b, c + d, depth + 1) - z2 - z0;
    trace.push({
      type: "z1",
      depth,
      message: `z₁ = (a+b)(c+d) − z₂ − z₀ = ${brief(z1)}.`,
      x: left,
      y: right,
      n,
      m,
      p,
      a,
      b,
      c,
      d,
      z2,
      z0,
      z1,
      stack: snapshot(),
    });

    const result = z2 * p * p + z1 * p + z0;
    trace.push({
      type: "combine",
      depth,
      message: `Combine · z₂·10^${2 * m} + z₁·10^${m} + z₀ = ${brief(result)}.`,
      x: left,
      y: right,
      n,
      m,
      p,
      a,
      b,
      c,
      d,
      z2,
      z0,
      z1,
      result,
      stack: snapshot(),
    });

    stack.pop();
    return result;
  }

  const product = mul(x, y, 0);

  trace.push({
    type: "done",
    depth: 0,
    message: `Complete · ${product.toString().length}-digit product with ${baseCount} base multiplications.`,
    x,
    y,
    result: product,
    stack: [],
  });

  return { product, multiplications: baseCount, trace };
}