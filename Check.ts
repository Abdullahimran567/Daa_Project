import * as fs from "fs";
import * as path from "path";
import { closestPair, closestPairBrute, parsePoints } from "../src/closestPair";
import { karatsuba, parseNumbers } from "../src/karatsuba";

const cpDir = path.join("data", "closest_pair");
for (const f of fs.readdirSync(cpDir).sort()) {
  const pts = parsePoints(fs.readFileSync(path.join(cpDir, f), "utf8"));
  const r = closestPair(pts);
  const ok = Math.abs(r.distance - closestPairBrute(pts)) < 1e-9;
  console.log(f, "n =", pts.length, "d =", r.distance.toFixed(4), ok ? "OK" : "WRONG");
}

const imDir = path.join("data", "integer_mult");
for (const f of fs.readdirSync(imDir).sort()) {
  const [a, b] = parseNumbers(fs.readFileSync(path.join(imDir, f), "utf8"));
  const r = karatsuba(a, b);
  const ok = r.product === a * b;
  console.log(f, "digits =", a.toString().length, "product digits =", r.product.toString().length, ok ? "OK" : "WRONG");
}