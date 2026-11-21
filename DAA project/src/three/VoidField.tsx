import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { usePointer, type PointerState } from "../hooks/usePointer"
import { useReducedMotion } from "../hooks/useReducedMotion"
import { seededRandom } from "../lib/scene"
import { onWarp } from "../lib/warp"

/* ------------------------------------------------------------------ *
 * Shared GLSL: hash, value noise, fbm, ridged fbm.
 * ------------------------------------------------------------------ */

const NOISE_CHUNK = /* glsl */ `
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
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p = rot * p * 2.03;
    amp *= 0.5;
  }
  return v;
}

float ridged(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    float n = 1.0 - abs(noise(p) * 2.0 - 1.0);
    v += amp * n * n;
    p = rot * p * 2.11;
    amp *= 0.5;
  }
  return v;
}
`

/* ------------------------------------------------------------------ *
 * Nebula — a screen-filling, domain-warped gas cloud.
 * ------------------------------------------------------------------ */

const NEBULA_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const NEBULA_FRAGMENT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uPointer;
uniform vec2 uResolution;
uniform float uScroll;
uniform float uWarp;

varying vec2 vUv;

${NOISE_CHUNK}

void main() {
  vec2 p = vUv - 0.5;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  float t = uTime * 0.035;

  // Parallax: the cloud drifts with the pointer and the page scroll.
  vec2 flow = p * 1.15 + uPointer * 0.09 + vec2(0.0, uScroll * 0.28);

  // Two rounds of domain warping turn flat noise into filaments.
  vec2 q = vec2(fbm(flow + vec2(0.0, t)), fbm(flow + vec2(5.2, 1.3) - t * 0.7));
  vec2 r = vec2(
    fbm(flow + 2.4 * q + vec2(1.7, 9.2) + t * 0.4),
    fbm(flow + 2.4 * q + vec2(8.3, 2.8) - t * 0.32)
  );
  float body = fbm(flow + 3.0 * r);
  float veins = ridged(flow * 1.6 + 2.0 * r);

  // Colour fields.
  vec3 indigo = vec3(0.055, 0.075, 0.240);
  vec3 violet = vec3(0.290, 0.110, 0.520);
  vec3 teal   = vec3(0.020, 0.330, 0.360);
  vec3 rose   = vec3(0.420, 0.090, 0.240);
  vec3 ice    = vec3(0.520, 0.720, 1.000);

  float band = smoothstep(0.30, 0.86, body);
  float band2 = smoothstep(0.42, 1.00, r.x * 0.72 + body * 0.55);
  float band3 = smoothstep(0.46, 1.00, q.y * 0.78 + r.y * 0.52);
  float vein = smoothstep(0.58, 0.98, veins);

  vec3 col = indigo * 0.85;
  col += violet * band * 0.62;
  col += teal   * band2 * 0.34;
  col += rose   * band3 * 0.20;
  col += ice    * vein * 0.16;

  // A slow breathing core keeps the field alive.
  float core = exp(-3.1 * dot(p, p));
  col += mix(vec3(0.10, 0.22, 0.52), vec3(0.26, 0.10, 0.48), 0.5 + 0.5 * sin(uTime * 0.12))
         * core * 0.5;

  // Warp pushes a hot ring outward from the centre.
  float warpRing = smoothstep(0.30, 0.0, abs(length(p) - (1.0 - uWarp) * 1.25));
  col += mix(vec3(0.35, 0.62, 1.0), vec3(0.75, 0.45, 1.0), band3) * warpRing * uWarp * 1.6;

  float vig = smoothstep(1.55, 0.12, length(p));
  col *= vig;
  col *= 1.0 + uWarp * 0.85;

  // Fine dithering to avoid banding on the dark gradient.
  float g = hash21(gl_FragCoord.xy * 0.9 + uTime) - 0.5;
  col += g * 0.014;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`

function Nebula({
  pointer,
  reduced,
  warpRef,
}: {
  pointer: React.RefObject<PointerState>
  reduced: boolean
  warpRef: React.RefObject<number>
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { size, camera } = useThree()
  const scrollRef = useRef(0)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uScroll: { value: 0 },
      uWarp: { value: 0 },
    }),
    [],
  )

  useFrame((_, delta) => {
    const material = materialRef.current
    const mesh = meshRef.current
    if (!material || !mesh) return

    if (!reduced) material.uniforms.uTime.value += delta

    const distance = 46
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180
    const height = 2 * Math.tan(fov / 2) * distance
    const width = height * (size.width / Math.max(size.height, 1))
    mesh.scale.set(width, height, 1)

    const target = window.scrollY / Math.max(window.innerHeight, 1)
    scrollRef.current += (target - scrollRef.current) * 0.05
    material.uniforms.uScroll.value = scrollRef.current

    const state = pointer.current
    const current = material.uniforms.uPointer.value as THREE.Vector2
    current.x += (state.nx * 0.5 - current.x) * 0.04
    current.y += (state.ny * 0.5 - current.y) * 0.04

    material.uniforms.uResolution.value.set(size.width, size.height)
    material.uniforms.uWarp.value = warpRef.current
  })

  return (
    <mesh ref={meshRef} position={[0, 0, -46]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={NEBULA_VERTEX}
        fragmentShader={NEBULA_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ *
 * Starfield — three parallax layers that rush past during a warp.
 * ------------------------------------------------------------------ */

const STAR_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uWarp;

attribute float aScale;
attribute float aPhase;
attribute float aSpeed;
attribute vec3 aTint;

varying vec3 vTint;
varying float vGlow;

void main() {
  vec3 pos = position;

  // Slow drift toward the camera, accelerating during a warp.
  float travel = uTime * aSpeed * (1.0 + uWarp * 26.0);
  pos.z = mod(pos.z + travel + 42.0, 42.0) - 41.0;

  // A gentle breathing so the field never looks static.
  float breathe = 0.72 + 0.28 * sin(uTime * 0.9 + aPhase * 6.2831);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float depth = 30.0 / max(-mv.z, 0.001);
  vGlow = breathe * (0.35 + uWarp * 1.5);
  vTint = aTint;
  gl_PointSize = aScale * uPixelRatio * depth * (1.0 + uWarp * 2.6);
}
`

const STAR_FRAGMENT = /* glsl */ `
precision mediump float;
varying vec3 vTint;
varying float vGlow;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float halo = smoothstep(0.5, 0.0, d);
  float core = smoothstep(0.13, 0.0, d);
  vec3 col = vTint * halo * 0.9 + vec3(1.0) * core * 0.95;
  gl_FragColor = vec4(col * vGlow, halo);
}
`

function Starfield({
  reduced,
  warpRef,
}: {
  reduced: boolean
  warpRef: React.RefObject<number>
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const geometry = useMemo(() => {
    const random = seededRandom(31337)
    const count = 1500
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)
    const speeds = new Float32Array(count)
    const tints = new Float32Array(count * 3)

    const palette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#a9c8ff"),
      new THREE.Color("#5ff0d8"),
      new THREE.Color("#c89bff"),
      new THREE.Color("#ffd9a8"),
    ]

    for (let i = 0; i < count; i += 1) {
      // Three parallax shells.
      const layer = i % 3
      const spread = layer === 0 ? 26 : layer === 1 ? 44 : 68
      positions[i * 3] = (random() - 0.5) * spread
      positions[i * 3 + 1] = (random() - 0.5) * spread * 0.72
      positions[i * 3 + 2] = -random() * 42
      scales[i] =
        (layer === 0 ? 1.6 : layer === 1 ? 1.05 : 0.7) * (0.45 + random() * 0.9)
      phases[i] = random()
      speeds[i] = (layer === 0 ? 0.9 : layer === 1 ? 0.55 : 0.3) * (0.6 + random() * 0.8)

      const tint = palette[Math.floor(random() * palette.length)]
      tints[i * 3] = tint.r
      tints[i * 3 + 1] = tint.g
      tints[i * 3 + 2] = tint.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1))
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1))
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute("aTint", new THREE.BufferAttribute(tints, 3))
    return geo
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uWarp: { value: 0 },
    }),
    [],
  )

  useFrame((_, delta) => {
    const material = materialRef.current
    if (!material) return
    if (!reduced) material.uniforms.uTime.value += delta
    material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
    material.uniforms.uWarp.value = warpRef.current
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={STAR_VERTEX}
        fragmentShader={STAR_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ *
 * Speed lines — radial streaks that flash during a warp.
 * ------------------------------------------------------------------ */

function SpeedLines({ warpRef }: { warpRef: React.RefObject<number> }) {
  const materialRef = useRef<THREE.LineBasicMaterial>(null)
  const groupRef = useRef<THREE.Group>(null)

  // `visible` is set from the frame loop. It is not a JSX prop because R3F
  // re-applies props on every render, which would reset it each time.
  useLayoutEffect(() => {
    if (groupRef.current) groupRef.current.visible = false
  }, [])

  const geometry = useMemo(() => {
    const random = seededRandom(777)
    const count = 220
    const positions = new Float32Array(count * 2 * 3)
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2
      const inner = 3 + random() * 4
      const outer = inner + 6 + random() * 22
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      positions[i * 6] = cos * inner
      positions[i * 6 + 1] = sin * inner * 0.75
      positions[i * 6 + 2] = -14
      positions[i * 6 + 3] = cos * outer
      positions[i * 6 + 4] = sin * outer * 0.75
      positions[i * 6 + 5] = -14
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame((state) => {
    const group = groupRef.current
    const material = materialRef.current
    if (!group || !material) return
    const t = state.clock.elapsedTime
    group.rotation.z = t * 0.06
    material.opacity = warpRef.current * 0.55
    group.visible = warpRef.current > 0.002
  })

  return (
    <group ref={groupRef}>
      <lineSegments geometry={geometry} frustumCulled={false}>
        <lineBasicMaterial
          ref={materialRef}
          color="#9dc4ff"
          transparent
          opacity={0}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Horizon grid — a faint perspective floor far below the content.
 * ------------------------------------------------------------------ */

const HORIZON_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const HORIZON_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uWarp;
varying vec3 vWorld;

${NOISE_CHUNK}

void main() {
  vec2 g = vWorld.xz;
  float line = min(
    abs(fract(g.x * 0.5) - 0.5),
    abs(fract(g.y * 0.5) - 0.5)
  );
  float grid = 1.0 - smoothstep(0.0, 0.03, line);

  float dist = length(g - vec2(0.0, 0.0));
  float fade = smoothstep(46.0, 2.0, dist);

  vec3 col = vec3(0.10, 0.22, 0.52) * grid * fade * 0.16;
  col += vec3(0.20, 0.12, 0.44) * smoothstep(0.6, 1.0, fbm(g * 0.08 + uTime * 0.02)) * fade * 0.05;

  gl_FragColor = vec4(col * (1.0 + uWarp * 1.4), 1.0);
}
`

function Horizon({ warpRef }: { warpRef: React.RefObject<number> }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uWarp: { value: 0 } }),
    [],
  )

  useFrame((_, delta) => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uTime.value += delta
    material.uniforms.uWarp.value = warpRef.current
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -11, -26]} frustumCulled={false}>
      <planeGeometry args={[220, 220]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={HORIZON_VERTEX}
        fragmentShader={HORIZON_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ *
 * The stage.
 * ------------------------------------------------------------------ */

/** Decays the warp pulse. Mounted first so every consumer reads a fresh value. */
function WarpDriver({ warpRef }: { warpRef: React.RefObject<number> }) {
  useFrame((_, delta) => {
    if (warpRef.current > 0) {
      warpRef.current = Math.max(0, warpRef.current - delta * 1.35)
    }
  })
  return null
}

export function VoidField() {
  const pointer = usePointer()
  const reduced = useReducedMotion()
  const warpRef = useRef(0)

  useEffect(
    () =>
      onWarp(() => {
        warpRef.current = 1
      }),
    [],
  )

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(130% 100% at 50% -20%, #0a1030 0%, #05070e 48%, #02030a 100%)",
      }}
    >
      <Canvas
        dpr={[1, 1.35]}
        camera={{ position: [0, 0, 7], fov: 58, near: 0.1, far: 220 }}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: "high-performance",
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <WarpDriver warpRef={warpRef} />
        <Nebula pointer={pointer} reduced={reduced} warpRef={warpRef} />
        <Horizon warpRef={warpRef} />
        <Starfield reduced={reduced} warpRef={warpRef} />
        <SpeedLines warpRef={warpRef} />
      </Canvas>
    </div>
  )
}
