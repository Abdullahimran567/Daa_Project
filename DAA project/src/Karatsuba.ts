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
  tree: KaratsubaNode[];
  roots: string[];
}

/**
 * A node of the recursion tree. Every node records the span of trace events
 * it owns, which is what lets the UI light up the exact sub-problem that is
 * being solved at any point in the dry run.
 */
export interface KaratsubaNode {
  id: string;
  depth: number;
  x: string;
  y: string;
  n: number;
  kind: "root" | "internal" | "base";
  children: string[];
  /** First trace index belonging to this node. */
  start: number;
  /** Last trace index belonging to this node. */
  end: number;
  z0?: bigint;
  z1?: bigint;
  z2?: bigint;
  result?: bigint;
  /**
   * The arithmetic this node performed, e.g. "2×2=4". Base cases show the
   * single-digit multiplication; internal nodes show the half-size product
   * they recombined into.
   */
  label?: string;
}

function brief(value: bigint, head = 18, tail = 8): string {
  const text = value.toString();
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}…${text.slice(-tail)} (${text.length} digits)`;
}

/**
 * Collapses the middle of a long integer so it can sit under a node in the
 * 3D lattice without swamping it.
 */
function compact(value: bigint, head = 6, tail = 4): string {
  const text = value.toString();
  if (text.length <= head + tail + 1) return text;
  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

/**
 * Karatsuba with a structured event stream: every split, recursive
 * sub-product, and recombination is recorded for the visual dry run.
 */
export function karatsubaTraced(x: bigint, y: bigint): KaratsubaTraceResult {
  const trace: KaratsubaTraceStep[] = [];
  const stack: KaratsubaFrame[] = [];
  const tree: KaratsubaNode[] = [];
  const roots: string[] = [];
  const byId = new Map<string, KaratsubaNode>();
  let baseCount = 0;
  let nodeCounter = 0;

  const snapshot = (): KaratsubaFrame[] =>
    stack.map((frame) => ({ ...frame }));

  function mul(
    left: bigint,
    right: bigint,
    depth: number,
    parentId: string | null,
  ): bigint {
    stack.push({ x: left.toString(), y: right.toString(), depth });

    const id = `k${nodeCounter++}`;
    const n = Math.max(left.toString().length, right.toString().length);
    const node: KaratsubaNode = {
      id,
      depth,
      x: left.toString(),
      y: right.toString(),
      n,
      kind: "internal",
      children: [],
      start: trace.length,
      end: trace.length,
    };
    tree.push(node);
    byId.set(id, node);

    if (parentId) {
      byId.get(parentId)?.children.push(id);
    } else {
      roots.push(id);
    }

    if (left < 10n || right < 10n) {
      baseCount++;
      const result = left * right;
      node.kind = "base";
      node.result = result;
      node.label = `${left}×${right}=${result}`;
      trace.push({
        type: "base",
        depth,
        message: `Base case · ${brief(left)} × ${brief(right)} = ${brief(result)}.`,
        x: left,
        y: right,
        result,
        stack: snapshot(),
      });
      node.end = trace.length - 1;
      stack.pop();
      return result;
    }

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

    const z2 = mul(a, c, depth + 1, id);
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

    const z0 = mul(b, d, depth + 1, id);
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

    const z1 = mul(a + b, c + d, depth + 1, id) - z2 - z0;
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

    node.z2 = z2;
    node.z0 = z0;
    node.z1 = z1;
    node.result = result;
    node.end = trace.length - 1;
    node.label = `${compact(left, 5, 3)}×${compact(right, 5, 3)}=${compact(result, 7, 3)}`;

    stack.pop();
    return result;
  }

  const product = mul(x, y, 0, null);

  trace.push({
    type: "done",
    depth: 0,
    message: `Complete · ${product.toString().length}-digit product with ${baseCount} base multiplications.`,
    x,
    y,
    result: product,
    stack: [],
  });

  if (roots[0]) {
    const root = byId.get(roots[0]);
    if (root) root.end = trace.length - 1;
  }

  return { product, multiplications: baseCount, trace, tree, roots };
}

/**
 * Returns the deepest node whose event span contains the given trace index,
 * i.e. the sub-problem currently being solved.
 */
export function activeNodeAt(
  tree: KaratsubaNode[],
  stepIndex: number,
): KaratsubaNode | null {
  let best: KaratsubaNode | null = null
  for (const node of tree) {
    if (stepIndex >= node.start && stepIndex <= node.end) {
      if (!best || node.depth > best.depth) best = node
    }
  }
  return best
}