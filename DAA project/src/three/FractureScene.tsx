import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { usePointer } from "../hooks/usePointer"
import { useReducedMotion } from "../hooks/useReducedMotion"
import { seededRandom } from "../lib/scene"

/* ------------------------------------------------------------------ *
 * A point cloud is recursively halved. Every half flies backwards
 * into the depth of the screen, shrinking as it goes, and leaves a
 * glowing blade behind where it was cut. The result is a tunnel made
 * of the algorithm's own recursion — divide, conquer, recurse.
 * ------------------------------------------------------------------ */

interface FractureNode {
  id: number
  depth: number
  parent: number | null
  children: string[]
  /** World position of the cloud centre. */
  x: number
  y: number
  z: number
  /** Local x of the split blade. */
  bladeX: number
  bladeY0: number
  bladeY1: number
  hasBlade: boolean
  /** Order in which the algorithm visits this node. */
  visit: number
}

interface Fracture {
  nodes: FractureNode[]
  /** Flat point buffer: xyz per point. */
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  /** Ribbon geometry for the beams and the blades. */
  ribbon: {
    start: Float32Array
    end: Float32Array
    t: Float32Array
    side: Float32Array
    width: Float32Array
    depth: Float32Array
    seed: Float32Array
    kind: Float32Array
  }
  visits: number
  /** An Euler tour of the tree: consecutive entries are always connected. */
  tour: number[]
}

const DEPTH_COLORS = [
  new THREE.Color("#9fcbff"),
  new THREE.Color("#5b96ff"),
  new THREE.Color("#9a78f5"),
  new THREE.Color("#3fe0c8"),
  new THREE.Color("#d3aeff"),
]

function buildFracture(
  count: number,
  seed: number,
  maxDepth: number,
  minPoints: number,
): Fracture {
  const random = seededRandom(seed)
  const cloud: Array<{ x: number; y: number }> = []
  for (let i = 0; i < count; i += 1) {
    cloud.push({
      x: (random() * 2 - 1) * 1.0,
      y: (random() * 2 - 1) * 0.7,
    })
  }

  const K = 1.72
  const scaleAt = (depth: number) => 1 / Math.pow(1.78, depth)

  const nodes: FractureNode[] = []
  const positions: number[] = []
  const colors: number[] = []
  const sizes: number[] = []

  const rStart: number[] = []
  const rEnd: number[] = []
  const rT: number[] = []
  const rSide: number[] = []
  const rWidth: number[] = []
  const rDepth: number[] = []
  const rSeed: number[] = []
  const rKind: number[] = []

  let visitCounter = 0

  const centroid = (pts: Array<{ x: number; y: number }>) => {
    let cx = 0
    let cy = 0
    for (const p of pts) {
      cx += p.x
      cy += p.y
    }
    return { x: cx / pts.length, y: cy / pts.length }
  }

  const recurse = (
    pts: Array<{ x: number; y: number }>,
    depth: number,
    parent: number | null,
    parentPos: { x: number; y: number; z: number },
    parentCentre: { x: number; y: number },
    parentScale: number,
  ): number => {
    const id = nodes.length
    const c = centroid(pts)
    const scale = scaleAt(depth)

    const node: FractureNode = {
      id,
      depth,
      parent,
      children: [],
      x: parentPos.x,
      y: parentPos.y,
      z: -2.35 * depth,
      bladeX: 0,
      bladeY0: 0,
      bladeY1: 0,
      hasBlade: false,
      visit: visitCounter++,
    }
    nodes.push(node)

    // Points.
    for (const p of pts) {
      positions.push(
        node.x + (p.x - c.x) * scale * K,
        node.y + (p.y - c.y) * scale * K,
        node.z,
      )
      const tint = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)]
      const shade = 1.0 + random() * 0.5
      colors.push(tint.r * shade, tint.g * shade, tint.b * shade)
      sizes.push((0.52 + random() * 0.58) * (1.05 - depth * 0.1))
    }

    if (depth >= maxDepth || pts.length <= minPoints) {
      return id
    }

    // Split by the median x.
    const sorted = [...pts].sort((a, b) => a.x - b.x)
    const mid = Math.floor(sorted.length / 2)
    const left = sorted.slice(0, mid)
    const right = sorted.slice(mid)
    const median = sorted[mid].x

    // The blade sits at the cut, in the node's local frame.
    node.hasBlade = true
    node.bladeX = (median - c.x) * scale * K
    let minY = Infinity
    let maxY = -Infinity
    for (const p of pts) {
      const ly = (p.y - c.y) * scale * K
      if (ly < minY) minY = ly
      if (ly > maxY) maxY = ly
    }
    node.bladeY0 = node.y + minY
    node.bladeY1 = node.y + maxY

    const bx = node.x + node.bladeX
    const bladeSeed = random()
    rStart.push(bx, node.bladeY0, node.z)
    rStart.push(bx, node.bladeY0, node.z)
    rEnd.push(bx, node.bladeY1, node.z)
    rEnd.push(bx, node.bladeY1, node.z)
      rT.push(0, 1)
      rSide.push(-1, 1)
      rWidth.push(0.04, 0.04)
      rDepth.push(depth, depth)
      rSeed.push(bladeSeed, bladeSeed)
      rKind.push(1, 1)

    // Children fly apart sideways and backwards.
    const halves: Array<Array<{ x: number; y: number }>> = [left, right]
    for (let h = 0; h < 2; h += 1) {
      const half = halves[h]
      const hc = centroid(half)
      const sign = h === 0 ? -1 : 1
      const push = 0.46 * parentScale * K * sign
      const childPos = {
        x: parentPos.x + (hc.x - parentCentre.x) * parentScale * K + push,
        y: parentPos.y + (hc.y - parentCentre.y) * parentScale * K,
        z: -2.35 * (depth + 1),
      }

      const childId = recurse(
        half,
        depth + 1,
        id,
        childPos,
        hc,
        scaleAt(depth + 1),
      )
      nodes[id].children.push(String(childId))

      // Beam from the parent centre to the child centre.
      const beamSeed = random()
      rStart.push(nodes[id].x, nodes[id].y, nodes[id].z)
      rStart.push(nodes[id].x, nodes[id].y, nodes[id].z)
      rEnd.push(nodes[childId].x, nodes[childId].y, nodes[childId].z)
      rEnd.push(nodes[childId].x, nodes[childId].y, nodes[childId].z)
      rT.push(0, 1)
      rSide.push(-1, 1)
      rWidth.push(0.055, 0.055)
      rDepth.push(depth, depth + 1)
      rSeed.push(beamSeed, beamSeed)
      rKind.push(0, 0)
    }

    return id
  }

  const rootCentre = centroid(cloud)
  recurse(cloud, 0, null, { x: 0, y: 0, z: 0 }, rootCentre, scaleAt(0))

  // Euler tour so the focus marker always travels along an edge.
  const tour: number[] = []
  const walk = (id: number) => {
    tour.push(id)
    for (const child of nodes[id].children) {
      walk(Number(child))
      tour.push(id)
    }
  }
  if (nodes.length > 0) walk(0)

  return {
    nodes,
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    sizes: new Float32Array(sizes),
    ribbon: {
      start: new Float32Array(rStart),
      end: new Float32Array(rEnd),
      t: new Float32Array(rT),
      side: new Float32Array(rSide),
      width: new Float32Array(rWidth),
      depth: new Float32Array(rDepth),
      seed: new Float32Array(rSeed),
      kind: new Float32Array(rKind),
    },
    visits: visitCounter,
    tour,
  }
}

/* ------------------------------------------------------------------ *
 * Shaders
 * ------------------------------------------------------------------ */

const CLOUD_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aScale;
attribute float aPhase;
attribute vec3 aTint;
varying vec3 vTint;
varying float vGlow;

void main() {
  vec3 pos = position;
  pos.y += sin(uTime * 0.8 + aPhase * 6.2831) * 0.03;
  pos.x += cos(uTime * 0.62 + aPhase * 4.7) * 0.024;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aScale * uPixelRatio * (30.0 / max(-mv.z, 0.001));
  vTint = aTint;
  vGlow = 0.85 + 0.15 * sin(uTime * 1.3 + aPhase * 9.0);
}
`

const CLOUD_FRAGMENT = /* glsl */ `
precision mediump float;
varying vec3 vTint;
varying float vGlow;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float halo = smoothstep(0.5, 0.10, d);
  float core = smoothstep(0.20, 0.0, d);
  vec3 col = vTint * halo * 0.7 + mix(vTint, vec3(1.0), 0.65) * core * 1.15;
  gl_FragColor = vec4(col * vGlow, halo * 0.9);
}
`

const RIBBON_VERTEX = /* glsl */ `
attribute vec3 aEnd;
attribute float aT;
attribute float aSide;
attribute float aWidth;
attribute float aDepth;
attribute float aSeed;
attribute float aKind;

uniform float uTime;

varying float vT;
varying float vSide;
varying float vPulse;
varying float vDepth;
varying float vKind;

void main() {
  vec3 base = mix(position, aEnd, aT);
  vec4 mv = modelViewMatrix * vec4(base, 1.0);

  // Widen the ribbon in screen space so it always faces the camera.
  vec3 viewDir = normalize(-mv.xyz);
  vec3 axis = normalize((modelViewMatrix * vec4(aEnd - position, 0.0)).xyz);
  vec3 right = cross(axis, viewDir);
  float len = length(right);
  right = len > 0.0001 ? right / len : vec3(1.0, 0.0, 0.0);

  mv.xyz += right * aSide * aWidth;

  vT = aT;
  vSide = aSide;
  vKind = aKind;
  vDepth = aDepth;

  float f = fract(aT - uTime * 0.3 + aSeed);
  vPulse = pow(1.0 - f, 8.0);

  gl_Position = projectionMatrix * mv;
}
`

const RIBBON_FRAGMENT = /* glsl */ `
precision mediump float;
uniform float uActiveDepth;
varying float vT;
varying float vSide;
varying float vPulse;
varying float vDepth;
varying float vKind;

void main() {
  vec3 shallow = vec3(0.36, 0.62, 1.00);
  vec3 deep = vec3(0.66, 0.36, 1.00);
  vec3 teal = vec3(0.20, 0.92, 0.82);

  vec3 col = mix(shallow, deep, clamp(vDepth / 3.0, 0.0, 1.0));
  col = mix(col, teal, smoothstep(2.0, 3.0, vDepth));

  // Soft edges across the ribbon.
  float edge = 1.0 - smoothstep(0.35, 1.0, abs(vSide));

  // A bright core runs down the middle of every blade.
  float core = 1.0 - smoothstep(0.0, 0.42, abs(vSide));

  float base = mix(0.55, 0.95, vKind);
  float lead = smoothstep(0.0, 0.45, vT) * smoothstep(1.0, 0.6, vT);
  float pulse = vPulse * 2.0;

  float near = 1.0 - smoothstep(0.0, 1.6, abs(vDepth - uActiveDepth));

  vec3 final = col * (base + lead * 0.45) * edge;
  final += vec3(0.95, 0.98, 1.0) * core * (0.9 + vKind * 1.2);
  final += vec3(0.85, 0.94, 1.0) * pulse * 1.2;
  final += vec3(0.6, 0.85, 1.0) * near * 0.85 * edge;

  float alpha = clamp(
    (base * 0.95 + lead * 0.4 + core * 0.9 + pulse * 1.0 + near * 0.5) * edge,
    0.0,
    1.0
  );
  gl_FragColor = vec4(final, alpha);
}
`

/* ------------------------------------------------------------------ *
 * Components
 * ------------------------------------------------------------------ */

function CloudPoints({
  fracture,
  reduced,
}: {
  fracture: Fracture
  reduced: boolean
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const geometry = useMemo(() => {
    const random = seededRandom(4242)
    const count = fracture.positions.length / 3
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i += 1) phases[i] = random()
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(fracture.positions, 3))
    geo.setAttribute("aTint", new THREE.BufferAttribute(fracture.colors, 3))
    geo.setAttribute("aScale", new THREE.BufferAttribute(fracture.sizes, 1))
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1))
    return geo
  }, [fracture])

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
    if (!reduced) material.uniforms.uTime.value += delta
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

function FractureRibbons({
  fracture,
  activeDepthRef,
  reduced,
}: {
  fracture: Fracture
  activeDepthRef: React.RefObject<number>
  reduced: boolean
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const geometry = useMemo(() => {
    const { start, end, t, side, width, depth, seed, kind } = fracture.ribbon
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(start, 3))
    geo.setAttribute("aEnd", new THREE.BufferAttribute(end, 3))
    geo.setAttribute("aT", new THREE.BufferAttribute(t, 1))
    geo.setAttribute("aSide", new THREE.BufferAttribute(side, 1))
    geo.setAttribute("aWidth", new THREE.BufferAttribute(width, 1))
    geo.setAttribute("aDepth", new THREE.BufferAttribute(depth, 1))
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1))
    geo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1))
    geo.computeBoundingSphere()
    return geo
  }, [fracture])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uActiveDepth: { value: 0 },
    }),
    [],
  )

  useFrame((_, delta) => {
    const material = materialRef.current
    if (!material) return
    if (!reduced) material.uniforms.uTime.value += delta
    material.uniforms.uActiveDepth.value = activeDepthRef.current
  })

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={RIBBON_VERTEX}
        fragmentShader={RIBBON_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/** A marker that travels the recursion tree the way the algorithm would. */
function FocusMarker({
  fracture,
  activeDepthRef,
  reduced,
}: {
  fracture: Fracture
  activeDepthRef: React.RefObject<number>
  reduced: boolean
}) {
  const markerRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const timer = useRef(0)
  const target = useRef(new THREE.Vector3())
  const initialised = useRef(false)

  useFrame((state, delta) => {
    const marker = markerRef.current
    const halo = haloRef.current
    const ring = ringRef.current
    if (!marker || !halo || !ring || fracture.tour.length === 0) return

    if (!reduced) timer.current += delta
    const dwell = 0.34
    const index = Math.floor(timer.current / dwell) % fracture.tour.length
    const node = fracture.nodes[fracture.tour[index]]
    if (!node) return

    activeDepthRef.current = node.depth
    target.current.set(node.x, node.y, node.z)

    if (!initialised.current) {
      marker.position.copy(target.current)
      initialised.current = true
    } else {
      marker.position.lerp(target.current, 1 - Math.pow(0.004, delta))
    }

    const t = state.clock.elapsedTime
    const scale = 0.085 + node.depth * 0.012

    marker.scale.setScalar(scale * (1 + Math.sin(t * 5.4) * 0.14))
    halo.position.copy(marker.position)
    ring.position.copy(marker.position)
    halo.scale.setScalar(scale * (5.6 + Math.sin(t * 2.2) * 0.6))
    ring.scale.setScalar(scale * (3.4 + Math.cos(t * 1.6) * 0.45))
    ;(ring.material as THREE.MeshBasicMaterial).opacity =
      0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.4))
  })

  return (
    <>
      <mesh ref={markerRef}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.95}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#7fc0ff"
          transparent
          opacity={0.12}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.8, 1, 40]} />
        <meshBasicMaterial
          color="#bfe4ff"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

function CameraRig() {
  const pointer = usePointer()
  const { camera } = useThree()

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const nx = pointer.current.nx
    const ny = pointer.current.ny

    const radius = 5.0 + ny * 0.5
    const angle = t * 0.055 + nx * 0.3

    const desired = new THREE.Vector3(
      Math.sin(angle) * radius * 0.55,
      0.55 + ny * 0.75 + Math.sin(t * 0.23) * 0.12,
      Math.cos(angle) * radius * 0.4 + 2.5,
    )

    camera.position.lerp(desired, 1 - Math.pow(0.0015, delta))
    camera.lookAt(0.1, -0.1, -1.9)
  })

  return null
}

interface FractureSceneProps {
  className?: string
  /** Point count of the root cloud. */
  count?: number
  seed?: number
  maxDepth?: number
  /** Shifts the whole dendrite sideways so it can sit beside copy. */
  offsetX?: number
}

export function FractureScene({
  className,
  count = 420,
  seed = 90210,
  maxDepth = 3,
  offsetX = 0,
}: FractureSceneProps) {
  const reduced = useReducedMotion()
  const fracture = useMemo(
    () => buildFracture(count, seed, maxDepth, 9),
    [count, seed, maxDepth],
  )
  const activeDepthRef = useRef(0)

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 0.55, 2.5], fov: 46, near: 0.1, far: 120 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <group position={[offsetX, 0, 0]}>
          <CloudPoints fracture={fracture} reduced={reduced} />
          <FractureRibbons
            fracture={fracture}
            activeDepthRef={activeDepthRef}
            reduced={reduced}
          />
          <FocusMarker
            fracture={fracture}
            activeDepthRef={activeDepthRef}
            reduced={reduced}
          />
        </group>
        <CameraRig />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            intensity={1.35}
            luminanceThreshold={0.05}
            luminanceSmoothing={0.3}
            mipmapBlur
            radius={0.78}
          />
          <Vignette offset={0.26} darkness={0.74} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
