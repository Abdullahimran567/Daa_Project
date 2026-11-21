import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { ClosestPairTraceStep, Point, TracePair } from "../ClosetPair"

/* ------------------------------------------------------------------ *
 * The plane of the problem, rendered as a real surface in space.
 * The algorithm's split becomes a blade that cuts the floor, the strip
 * becomes a corridor of light, and the winning pair is beaconed.
 * ------------------------------------------------------------------ */

/** World size of the square problem domain. */
const FIELD = 6.4

const ROLE = {
  idle: new THREE.Color("#a6b8e8"),
  left: new THREE.Color("#8fbaff"),
  right: new THREE.Color("#5fe0cf"),
  strip: new THREE.Color("#ffc05c"),
  pairA: new THREE.Color("#ff86d5"),
  pairB: new THREE.Color("#6ff5de"),
  good: new THREE.Color("#4ce39a"),
  bad: new THREE.Color("#ff6b7f"),
}

export interface CloudSceneProps {
  points: Point[]
  step: ClosestPairTraceStep | null
  best: TracePair | null
  /** Size of the coordinate space the points live in. */
  space?: number
  /** When true the user can click the floor to add points. */
  editable?: boolean
  onAddPoint?: (point: Point) => void
  className?: string
}

function toWorld(point: Point, space: number): [number, number, number] {
  const u = point.x / space
  const v = point.y / space
  return [(u - 0.5) * FIELD, 0, (0.5 - v) * FIELD]
}

/* ------------------------------------------------------------------ *
 * Ground — an instrument floor with range rings and a light corridor.
 * ------------------------------------------------------------------ */

const GROUND_VERTEX = /* glsl */ `
varying vec2 vXZ;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vXZ = world.xz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const GROUND_FRAGMENT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uSplit;      // x = split position, y = strip half width
uniform float uStrip;     // 0..1 strip visibility
uniform float uBlade;     // 0..1 blade visibility
uniform float uPulse;     // 0..1 when a pair is found

varying vec2 vXZ;

void main() {
  vec2 p = vXZ;
  float r = length(p);

  // Fine measurement grid.
  vec2 cell = abs(fract(p * 4.0) - 0.5);
  float grid = 1.0 - smoothstep(0.0, 0.035, min(cell.x, cell.y));

  // Range rings.
  float ring = 1.0 - smoothstep(0.0, 0.02, abs(fract(r * 1.6 - uTime * 0.05) - 0.5));

  // The split blade's glow bleeding across the floor.
  float blade = exp(-abs(p.x - uSplit.x) * 7.0) * uBlade;

  // The strip corridor.
  float corridor = step(abs(p.x - uSplit.x), uSplit.y) * uStrip;

  float fade = smoothstep(9.0, 1.0, r);
  float box = 1.0 - smoothstep(3.0, 3.4, max(abs(p.x), abs(p.y)));

  vec3 col = vec3(0.12, 0.26, 0.55) * grid * fade * 0.16;
  col += vec3(0.18, 0.38, 0.70) * ring * fade * 0.09;
  col += vec3(0.35, 0.62, 1.0) * blade * 0.55;
  col += vec3(0.95, 0.66, 0.22) * corridor * 0.14;

  // A rim around the problem domain.
  float rim = smoothstep(3.30, 3.20, max(abs(p.x), abs(p.y))) *
              smoothstep(3.08, 3.20, max(abs(p.x), abs(p.y)));
  col += vec3(0.45, 0.70, 1.0) * rim * 0.16;

  // A soft pool of light where the winning pair sits.
  col += vec3(0.20, 0.80, 0.70) * uPulse * fade * 0.05;

  col *= 0.10 + 0.90 * box;

  gl_FragColor = vec4(col, 1.0);
}
`

function Ground({
  splitRef,
  stripWidthRef,
  stripVisibleRef,
  bladeRef,
  pulseRef,
}: {
  splitRef: React.RefObject<number>
  stripWidthRef: React.RefObject<number>
  stripVisibleRef: React.RefObject<number>
  bladeRef: React.RefObject<number>
  pulseRef: React.RefObject<number>
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSplit: { value: new THREE.Vector2(0, 0.001) },
      uStrip: { value: 0 },
      uBlade: { value: 0 },
      uPulse: { value: 0 },
    }),
    [],
  )

  useFrame((_, delta) => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uTime.value += delta
    const split = material.uniforms.uSplit.value as THREE.Vector2
    split.x = splitRef.current
    split.y = Math.max(stripWidthRef.current, 0.001)
    material.uniforms.uStrip.value = stripVisibleRef.current
    material.uniforms.uBlade.value = bladeRef.current
    material.uniforms.uPulse.value = pulseRef.current
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} frustumCulled={false}>
      <planeGeometry args={[24, 24]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={GROUND_VERTEX}
        fragmentShader={GROUND_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ *
 * The strip slab — the narrow corridor of points the combine phase
 * has to sweep, lifted off the floor as a translucent slab.
 * ------------------------------------------------------------------ */

const SLAB_VERTEX = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormalW;

void main() {
  vLocal = position;
  vNormalW = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const SLAB_FRAGMENT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;

varying vec3 vLocal;
varying vec3 vNormalW;

void main() {
  // 1 = top face, 0 = the long side walls.
  float top = smoothstep(0.6, 0.95, abs(vNormalW.y));
  float wall = 1.0 - top;

  // Measurement cells etched along the strip.
  float cells = smoothstep(0.80, 1.0, sin(vLocal.z * 7.0) * 0.5 + 0.5);

  // The two rails that bound the strip.
  float rail = smoothstep(0.38, 0.50, abs(vLocal.x));

  // Walls fade out as they rise.
  float wallFade = 1.0 - smoothstep(-0.27, 0.27, vLocal.y);

  // A slow pulse travelling down the corridor.
  float pulse = smoothstep(0.45, 1.0, sin(vLocal.z * 0.55 - uTime * 1.4) * 0.5 + 0.5);

  vec3 col = uColor * (0.38 + cells * 0.75 * top + pulse * 0.45 * top);
  col += uColor * rail * (top * 1.2 + wall * wallFade * 1.5);
  col += vec3(1.0, 0.95, 0.86) * rail * top * 1.1;

  float alpha =
    (0.10 + cells * 0.22 * top + rail * (top * 0.8 + wall * wallFade * 0.85)) * uOpacity;

  gl_FragColor = vec4(col * uOpacity, alpha);
}
`

function StripSlab({
  splitRef,
  stripWidthRef,
  visibleRef,
}: {
  splitRef: React.RefObject<number>
  stripWidthRef: React.RefObject<number>
  visibleRef: React.RefObject<number>
}) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const opacityRef = useRef(0)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color("#ffb347") },
    }),
    [],
  )

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const half = Math.max(stripWidthRef.current, 0.0002)
    group.position.x += (splitRef.current - group.position.x) * 0.12
    group.scale.x += (half * 2 - group.scale.x) * 0.12

    const target = visibleRef.current
    opacityRef.current += (target - opacityRef.current) * 0.09
    group.visible = opacityRef.current > 0.004

    const material = materialRef.current
    if (!material) return
    material.uniforms.uTime.value += delta
    material.uniforms.uOpacity.value = opacityRef.current
  })

  // `visible` is deliberately not a JSX prop: R3F re-applies props on every
  // render, which would undo the frame-driven visibility below.
  useLayoutEffect(() => {
    if (groupRef.current) groupRef.current.visible = false
  }, [])

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.27, 0]}>
        <boxGeometry args={[1, 0.54, FIELD * 1.02]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={SLAB_VERTEX}
          fragmentShader={SLAB_FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * The cloud itself.
 * ------------------------------------------------------------------ */

const CLOUD_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aScale;
attribute float aHot;
attribute float aPhase;
attribute vec3 aTint;
varying vec3 vTint;
varying float vGlow;
varying float vHot;

void main() {
  vec3 pos = position;

  // A gentle lift so the cloud reads as a volume, not a decal.
  pos.y += aHot * (0.10 + 0.05 * sin(uTime * 2.6 + aPhase * 6.2831));

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aScale * uPixelRatio * (92.0 / max(-mv.z, 0.001));
  vTint = aTint;
  vHot = aHot;
  vGlow = 0.72 + 0.28 * sin(uTime * 1.5 + aPhase * 9.0);
}
`

const CLOUD_FRAGMENT = /* glsl */ `
precision mediump float;
varying vec3 vTint;
varying float vGlow;
varying float vHot;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float halo = smoothstep(0.5, 0.05, d);
  float core = smoothstep(0.20, 0.0, d);
  vec3 col = vTint * halo * 1.35 + mix(vTint, vec3(1.0), 0.6) * core * 1.5;
  gl_FragColor = vec4(col * vGlow * (1.0 + vHot * 0.8), halo);
}
`

interface Roles {
  tint: Float32Array
  scale: Float32Array
  hot: Float32Array
}

function computeRoles(
  points: Point[],
  step: ClosestPairTraceStep | null,
  best: TracePair | null,
): Roles {
  const count = points.length
  const tint = new Float32Array(count * 3)
  const scale = new Float32Array(count)
  const hot = new Float32Array(count)

  // Integer coordinates, so a numeric key is enough.
  const key = (p: Point) => p.x * 4096 + p.y

  const leftSet = new Set<number>()
  const rightSet = new Set<number>()
  const stripSet = new Set<number>()
  const pairSet = new Set<number>()
  const hotSet = new Set<number>()
  const checkGood = new Set<number>()
  const checkBad = new Set<number>()

  if (step?.left) for (const p of step.left) leftSet.add(key(p))
  if (step?.right) for (const p of step.right) rightSet.add(key(p))
  if (step?.strip) for (const p of step.strip) stripSet.add(key(p))
  if (step?.check) {
    const bucket = step.check.improved ? checkGood : checkBad
    bucket.add(key(step.check.p))
    bucket.add(key(step.check.q))
  }
  if (best) {
    pairSet.add(key(best.a))
    pairSet.add(key(best.b))
    hotSet.add(key(best.a))
    hotSet.add(key(best.b))
  }

  for (let i = 0; i < count; i += 1) {
    const k = key(points[i])
    let colour = ROLE.idle
    let size = 0.85
    let heat = 0

    if (leftSet.has(k)) {
      colour = ROLE.left
      size = 1.05
    }
    if (rightSet.has(k)) {
      colour = ROLE.right
      size = 1.05
    }
    if (stripSet.has(k)) {
      colour = ROLE.strip
      size = 1.3
      heat = 0.35
    }
    if (pairSet.has(k)) {
      colour = ROLE.pairB
      size = 2.1
      heat = 1
    }
    if (checkGood.has(k)) {
      colour = ROLE.good
      size = 1.75
      heat = 1
    }
    if (checkBad.has(k)) {
      colour = ROLE.bad
      size = 1.55
      heat = 0.7
    }

    tint[i * 3] = colour.r
    tint[i * 3 + 1] = colour.g
    tint[i * 3 + 2] = colour.b
    scale[i] = size
    hot[i] = heat
  }

  return { tint, scale, hot }
}

function PointCloud({
  points,
  roles,
  space,
}: {
  points: Point[]
  roles: Roles
  space: number
}) {
  const geometry = useMemo(() => new THREE.BufferGeometry(), [])
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const tintAttr = useRef<THREE.BufferAttribute>(null)
  const scaleAttr = useRef<THREE.BufferAttribute>(null)
  const hotAttr = useRef<THREE.BufferAttribute>(null)

  useLayoutEffect(() => {
    const count = points.length
    const position = new Float32Array(count * 3)
    const phase = new Float32Array(count)

    for (let i = 0; i < count; i += 1) {
      const [x, , z] = toWorld(points[i], space)
      position[i * 3] = x
      position[i * 3 + 1] = 0
      position[i * 3 + 2] = z
      phase[i] = ((i * 37) % 100) / 100
    }

    const tint = new THREE.BufferAttribute(new Float32Array(count * 3), 3)
    const scale = new THREE.BufferAttribute(new Float32Array(count), 1)
    const hot = new THREE.BufferAttribute(new Float32Array(count), 1)
    tintAttr.current = tint
    scaleAttr.current = scale
    hotAttr.current = hot

    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3))
    geometry.setAttribute("aTint", tint)
    geometry.setAttribute("aScale", scale)
    geometry.setAttribute("aHot", hot)
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1))
    geometry.setDrawRange(0, count)
    geometry.computeBoundingSphere()
  }, [points, space, geometry])

  // Roles are refreshed in place so the GPU buffers are never re-created.
  useLayoutEffect(() => {
    const tint = tintAttr.current
    const scale = scaleAttr.current
    const hot = hotAttr.current
    if (!tint || !scale || !hot) return
    ;(tint.array as Float32Array).set(roles.tint)
    ;(scale.array as Float32Array).set(roles.scale)
    ;(hot.array as Float32Array).set(roles.hot)
    tint.needsUpdate = true
    scale.needsUpdate = true
    hot.needsUpdate = true
  }, [roles])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    }),
    [],
  )

  useFrame((_, delta) => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uTime.value += delta
    material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={CLOUD_VERTEX}
        fragmentShader={CLOUD_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ *
 * The split blade — a luminous wall that cuts the floor.
 * ------------------------------------------------------------------ */

const BLADE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const BLADE_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uStrength;
varying vec2 vUv;

void main() {
  // A tight luminous core with a quick falloff — the blade is a wall, not a
  // wash, so the strip slab underneath stays readable.
  float edge = max(1.0 - abs(vUv.x - 0.5) * 2.0, 0.0);
  float core = smoothstep(0.90, 1.0, edge);
  float glow = pow(edge, 7.0);
  float scan = smoothstep(0.45, 1.0, sin(vUv.y * 30.0 - uTime * 3.0) * 0.5 + 0.5);

  vec3 col = mix(vec3(0.30, 0.58, 1.0), vec3(0.88, 0.96, 1.0), core);
  gl_FragColor = vec4(
    col * (glow * 0.85 + core * 2.0 + scan * 0.12) * uStrength,
    (glow * 0.85 + core) * uStrength
  );
}
`

function SplitBlade({
  splitRef,
  activeRef,
}: {
  splitRef: React.RefObject<number>
  activeRef: React.RefObject<number>
}) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uStrength: { value: 0 } }),
    [],
  )

  useFrame((_, delta) => {
    const group = groupRef.current
    const material = materialRef.current
    if (!group || !material) return
    group.position.x += (splitRef.current - group.position.x) * 0.1
    material.uniforms.uTime.value += delta
    material.uniforms.uStrength.value +=
      (activeRef.current - material.uniforms.uStrength.value) * 0.08
    group.visible = material.uniforms.uStrength.value > 0.01
  })

  return (
    <group ref={groupRef}>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[FIELD * 1.02, 1.45]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={BLADE_VERTEX}
          fragmentShader={BLADE_FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * The winning pair — two beacons joined by a beam.
 * ------------------------------------------------------------------ */

function Beacon({
  from,
  to,
  improved,
}: {
  from: THREE.Vector3
  to: THREE.Vector3
  improved: boolean
}) {
  const beamRef = useRef<THREE.Mesh>(null)
  const pulseRef = useRef<THREE.Mesh>(null)
  const pillarA = useRef<THREE.Mesh>(null)
  const pillarB = useRef<THREE.Mesh>(null)
  const ringA = useRef<THREE.Mesh>(null)
  const ringB = useRef<THREE.Mesh>(null)

  const mid = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    const beam = beamRef.current
    const pulse = pulseRef.current
    if (!beam || !pulse) return

    mid.copy(from).add(to).multiplyScalar(0.5)
    beam.position.copy(mid)
    const length = from.distanceTo(to)
    beam.scale.set(1, Math.max(length, 0.001), 1)
    beam.lookAt(to)
    beam.rotateX(Math.PI / 2)

    const t = (state.clock.elapsedTime * 0.5) % 1
    pulse.position.lerpVectors(from, to, t)
    const fade = Math.sin(t * Math.PI)
    pulse.scale.setScalar(0.04 + fade * 0.06)
    ;(pulse.material as THREE.MeshBasicMaterial).opacity = fade * 0.9

    const ringT = (state.clock.elapsedTime * 0.7) % 1
    for (const ring of [ringA.current, ringB.current]) {
      if (!ring) continue
      ring.scale.setScalar(0.07 + ringT * 0.13)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = (1 - ringT) * 0.55
    }
    const pillarScale = 0.5 + Math.sin(state.clock.elapsedTime * 3.2) * 0.12
    if (pillarA.current) pillarA.current.scale.set(1, pillarScale, 1)
    if (pillarB.current) pillarB.current.scale.set(1, pillarScale, 1)
  })

  const colour = improved ? "#4ce39a" : "#5ff0d8"

  return (
    <group>
      <mesh ref={beamRef}>
        <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={0.9}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[1, 14, 14]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={pillarA} position={[from.x, 0.45, from.z]}>
        <cylinderGeometry args={[0.012, 0.05, 0.9, 10, 1, true]} />
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={0.65}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={pillarB} position={[to.x, 0.45, to.z]}>
        <cylinderGeometry args={[0.012, 0.05, 0.9, 10, 1, true]} />
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={0.65}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={ringA} position={[from.x, 0.02, from.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.75, 1, 36]} />
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ringB} position={[to.x, 0.02, to.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.75, 1, 36]} />
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/** A link drawn between the two points currently being compared. */
function CheckLink({
  from,
  to,
  improved,
}: {
  from: THREE.Vector3
  to: THREE.Vector3
  improved: boolean
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const mid = from.clone().add(to).multiplyScalar(0.5)
    mesh.position.copy(mid)
    const length = from.distanceTo(to)
    mesh.scale.set(1, Math.max(length, 0.001), 1)
    mesh.lookAt(to)
    mesh.rotateX(Math.PI / 2)
    ;(mesh.material as THREE.MeshBasicMaterial).opacity =
      0.55 + 0.45 * Math.sin(state.clock.elapsedTime * 9)
  })

  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[0.016, 0.016, 1, 8]} />
      <meshBasicMaterial
        color={improved ? "#4ce39a" : "#ff6b7f"}
        transparent
        opacity={0.8}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

/* ------------------------------------------------------------------ *
 * Scene assembly
 * ------------------------------------------------------------------ */

function SceneContents({
  points,
  roles,
  step,
  best,
  space,
  editable,
  onAddPoint,
}: {
  points: Point[]
  roles: Roles
  step: ClosestPairTraceStep | null
  best: TracePair | null
  space: number
  editable: boolean
  onAddPoint?: (point: Point) => void
}) {
  const splitRef = useRef(0)
  const stripWidthRef = useRef(0.0001)
  const stripVisibleRef = useRef(0)
  const bladeActiveRef = useRef(0)
  const pulseRef = useRef(0)
  const downRef = useRef<{ x: number; y: number } | null>(null)

  const midX = step?.midX ?? null
  const stripPoints = step?.strip ?? null
  const check = step?.check ?? null

  const splitTarget = useMemo(() => {
    if (midX === null) return null
    return (midX / space - 0.5) * FIELD
  }, [midX, space])

  const stripTarget = useMemo(() => {
    if (!stripPoints || midX === null || !best) return 0
    // The algorithm sweeps every point within d of the split line, so the
    // half-width of the corridor is exactly d.
    const half = (best.d / space) * FIELD
    return Math.max(half, 0.0001)
  }, [stripPoints, midX, best, space])

  const pairVectors = useMemo(() => {
    if (!best) return null
    const [ax, , az] = toWorld(best.a, space)
    const [bx, , bz] = toWorld(best.b, space)
    return {
      from: new THREE.Vector3(ax, 0.05, az),
      to: new THREE.Vector3(bx, 0.05, bz),
    }
  }, [best, space])

  const checkVectors = useMemo(() => {
    if (!check) return null
    const [ax, , az] = toWorld(check.p, space)
    const [bx, , bz] = toWorld(check.q, space)
    return {
      from: new THREE.Vector3(ax, 0.05, az),
      to: new THREE.Vector3(bx, 0.05, bz),
      improved: check.improved,
    }
  }, [check, space])

  useFrame(() => {
    if (splitTarget !== null) {
      splitRef.current += (splitTarget - splitRef.current) * 0.12
      bladeActiveRef.current += (1 - bladeActiveRef.current) * 0.1
    } else {
      bladeActiveRef.current += (0 - bladeActiveRef.current) * 0.06
    }

    const visible = stripTarget > 0.0002 && stripPoints ? 1 : 0
    stripVisibleRef.current += (visible - stripVisibleRef.current) * 0.08
    stripWidthRef.current += (stripTarget - stripWidthRef.current) * 0.08
    if (stripWidthRef.current < 0.0002) stripWidthRef.current = 0.0002

    pulseRef.current += ((best ? 1 : 0) - pulseRef.current) * 0.05
  })

  return (
    <>
      <Ground
        splitRef={splitRef}
        stripWidthRef={stripWidthRef}
        stripVisibleRef={stripVisibleRef}
        bladeRef={bladeActiveRef}
        pulseRef={pulseRef}
      />
      <StripSlab
        splitRef={splitRef}
        stripWidthRef={stripWidthRef}
        visibleRef={stripVisibleRef}
      />
      <PointCloud points={points} roles={roles} space={space} />
      <SplitBlade splitRef={splitRef} activeRef={bladeActiveRef} />

      {pairVectors ? (
        <Beacon from={pairVectors.from} to={pairVectors.to} improved />
      ) : null}
      {checkVectors ? (
        <CheckLink
          from={checkVectors.from}
          to={checkVectors.to}
          improved={checkVectors.improved}
        />
      ) : null}

      {/* Invisible pick plane used when the user is placing points. */}
      {editable && onAddPoint ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          onPointerDown={(event) => {
            downRef.current = { x: event.clientX, y: event.clientY }
          }}
          onPointerUp={(event) => {
            const down = downRef.current
            downRef.current = null
            if (!down) return
            if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return
            event.stopPropagation()
            const world = event.point
            const u = world.x / FIELD + 0.5
            const v = 0.5 - world.z / FIELD
            if (u < 0 || u > 1 || v < 0 || v > 1) return
            onAddPoint({
              x: Math.round(u * space),
              y: Math.round(v * space),
            })
          }}
        >
          <planeGeometry args={[FIELD, FIELD]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      ) : null}

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2.12}
        minDistance={6}
        maxDistance={18}
        target={[0, 0, 0]}
        makeDefault
      />
    </>
  )
}

export function CloudScene({
  points,
  step,
  best,
  space = 1000,
  editable = false,
  onAddPoint,
  className,
}: CloudSceneProps) {
  const roles = useMemo(
    () => computeRoles(points, step, best),
    [points, step, best],
  )

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [1.6, 6.6, 8.6], fov: 40, near: 0.1, far: 120 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <SceneContents
          points={points}
          roles={roles}
          step={step}
          best={best}
          space={space}
          editable={editable}
          onAddPoint={onAddPoint}
        />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            intensity={1.05}
            luminanceThreshold={0.14}
            luminanceSmoothing={0.3}
            mipmapBlur
            radius={0.7}
          />
          <Vignette offset={0.3} darkness={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
