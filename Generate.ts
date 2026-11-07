import * as fs from "fs";
import * as path from "path";

function makeRandom(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = makeRandom(302);

const cpDir = path.join("data", "closest_pair");
const imDir = path.join("data", "integer_mult");
fs.mkdirSync(cpDir, { recursive: true });
fs.mkdirSync(imDir, { recursive: true });

const cpSizes = [101, 150, 250, 400, 600, 800, 1000, 2000, 3500, 5000];
const imSizes = [101, 150, 250, 400, 600, 800, 1000, 1500, 2000, 3000];

cpSizes.forEach((n, i) => {
  const lines: string[] = [String(n)];
  for (let k = 0; k < n; k++) {
    const x = Math.floor(rand() * 100001);
    const y = Math.floor(rand() * 100001);
    lines.push(`${x} ${y}`);
  }
  const name = `cp_${String(i + 1).padStart(2, "0")}_n${n}.txt`;
  fs.writeFileSync(path.join(cpDir, name), lines.join("\n") + "\n");
});

function randomBigNumber(digits: number): string {
  let s = String(1 + Math.floor(rand() * 9));
  for (let k = 1; k < digits; k++) s += String(Math.floor(rand() * 10));
  return s;
}

imSizes.forEach((n, i) => {
  const name = `im_${String(i + 1).padStart(2, "0")}_d${n}.txt`;
  fs.writeFileSync(path.join(imDir, name), randomBigNumber(n) + "\n" + randomBigNumber(n) + "\n");
});

console.log("done: 10 closest pair files and 10 integer multiplication files in /data");