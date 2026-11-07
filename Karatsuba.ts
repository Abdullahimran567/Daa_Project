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