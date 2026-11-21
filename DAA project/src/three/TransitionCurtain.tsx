import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { useReducedMotion } from "../hooks/useReducedMotion"

/* ------------------------------------------------------------------ *
 * A shader curtain that wipes across the screen whenever the route
 * changes: a molten aurora edge sweeps in, holds for a beat, then
 * peels away in the opposite direction.
 * ------------------------------------------------------------------ */

const CURTAIN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const CURTAIN_FRAGMENT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uEdge;

varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p *= 2.05;
    amp *= 0.5;
  }
  return v;
}

void main() {
  // A noisy, slightly diagonal leading edge.
  float wobble = (fbm(vec2(vUv.y * 3.4, uTime * 0.8)) - 0.5) * 0.09;
  float skew = (vUv.y - 0.5) * 0.14;
  float d = vUv.x + wobble + skew - uEdge;

  // How far behind the front we are (1 = fully swept).
  float trail = smoothstep(0.0, -0.6, d);
  // The luminous front itself.
  float front = smoothstep(0.10, 0.0, abs(d));
  float halo = smoothstep(0.42, 0.0, abs(d));

  vec3 auroraA = vec3(0.26, 0.52, 1.00);
  vec3 auroraB = vec3(0.18, 0.94, 0.82);
  vec3 auroraC = vec3(0.68, 0.32, 1.00);

  float band = fbm(vec2(vUv.x * 2.2 - uTime * 0.7, vUv.y * 2.6));
  vec3 col = mix(auroraA, auroraB, smoothstep(0.18, 0.78, band));
  col = mix(col, auroraC, smoothstep(0.52, 1.0, vUv.y));

  // Energy streaks inside the veil.
  float streak = smoothstep(0.52, 1.0, fbm(vec2(vUv.x * 6.0 - uTime * 1.6, vUv.y * 1.4)));
  // Horizontal scan lines riding the front.
  float scan = smoothstep(0.55, 1.0, sin((vUv.y + uTime * 0.35) * 46.0) * 0.5 + 0.5);

  vec3 final = col * (0.14 + trail * 0.42 + streak * 0.30);
  final += col * halo * 1.5;
  final += vec3(0.95, 0.99, 1.0) * front * 2.1;
  final += vec3(1.0) * front * scan * 0.8;

  float alpha = clamp(trail * 0.92 + halo * 0.85 + front, 0.0, 1.0);
  if (alpha < 0.004) discard;

  gl_FragColor = vec4(final, alpha);
}
`

function Curtain({ edgeRef }: { edgeRef: React.RefObject<number> }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEdge: { value: -0.35 },
    }),
    [],
  )

  useFrame((_, delta) => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uTime.value += delta
    material.uniforms.uEdge.value = edgeRef.current
  })

  return (
    <mesh scale={[viewport.width, viewport.height, 1]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={CURTAIN_VERTEX}
        fragmentShader={CURTAIN_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  )
}

interface CurtainProps {
  /** Turns the wipe on. The curtain reports progress through onCover/onDone. */
  active: boolean
  /** Fired when the screen is fully covered — swap the page here. */
  onCover?: () => void
  onDone: () => void
}

export function TransitionCurtain({ active, onCover, onDone }: CurtainProps) {
  const reduced = useReducedMotion()
  const edgeRef = useRef(-0.35)
  const doneRef = useRef(onDone)
  const coverRef = useRef(onCover)

  useEffect(() => {
    doneRef.current = onDone
    coverRef.current = onCover
  }, [onDone, onCover])

  useEffect(() => {
    if (!active) return
    if (reduced) {
      coverRef.current?.()
      doneRef.current()
      return
    }

    let frame = 0
    let covered = false
    const start = performance.now()
    const duration = 960

    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)

      // The wave sweeps in from the left, holds, then peels back to the left.
      const sweep = t < 0.5 ? t * 2 : (1 - t) * 2
      const eased =
        t < 0.5 ? 1 - Math.pow(1 - sweep, 3) : Math.pow(sweep, 3)

      edgeRef.current = eased * 1.7 - 0.35

      if (!covered && t >= 0.5) {
        covered = true
        coverRef.current?.()
      }

      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        edgeRef.current = -0.35
        doneRef.current()
      }
    }

    edgeRef.current = -0.35
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, reduced])

  if (!active) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90]"
      style={{ perspective: "1000px" }}
    >
      <Canvas
        orthographic
        dpr={[1, 1.2]}
        camera={{ position: [0, 0, 1], zoom: 1 }}
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Curtain edgeRef={edgeRef} />
      </Canvas>
    </div>
  )
}
