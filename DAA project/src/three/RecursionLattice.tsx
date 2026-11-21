import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html, OrbitControls } from "@react-three/drei"
import { useLayoutEffect, useMemo, useRef, type ComponentRef } from "react"
import * as THREE from "three"
import { activeNodeAt, type KaratsubaNode } from "../Karatsuba"
import { usePointer } from "../hooks/usePointer"

interface LatticeProps {
  nodes: KaratsubaNode[]
  roots: string[]
  /** Index of the currently visible trace step. */
  stepIndex: number
  className?: string
  /** Accent used for the active node label. */
  accent?: "primary" | "accent"
}

interface Layout {
  /** Ordered node ids — the index in this array is the instance index. */
  order: string[]
  positions: Float32Array
  colors: Float32Array
  scales: Float32Array
  /** Flat [from, to, from, to, ...] edge list in instance-index space. */
  edges: Float32Array
  /** The child node id reached by each edge — one entry per edge. */
  edgeChildren: string[]
  indexOf: Map<string, number>
  /** First trace index owned by each node. */
  starts: Float32Array
  /** Deepest level in the tree. */
  maxDepth: number
  /** Radius of the widest ring. */
  totalRadius: number
}

const SHALLOW = new THREE.Color("#4d8dff")
const DEEP = new THREE.Color("#a855f7")
const BASE = new THREE.Color("#5ff0d8")

/** Vertical distance between two levels of the cone. */
const LEVEL_GAP = 0.82

/** How many recently computed nodes keep their arithmetic label on screen. */
const LABEL_WINDOW = 6

/**
 * Places every node on a cone: the root sits on the axis at the apex and
 * each level widens until the leaves form the base. Nodes are spread around
 * the circle by the leaf range they own, so a subtree always occupies one
 * contiguous arc.
 */
function layoutLattice(nodes: KaratsubaNode[], roots: string[]): Layout {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const order: string[] = []
  const positions: number[] = []
  const colors: number[] = []
  const scales: number[] = []
  const edges: number[] = []
  const edgeChildren: string[] = []
  const starts: number[] = []
  const indexOf = new Map<string, number>()

  const childrenOf = new Map<string, string[]>()
  for (const node of nodes) {
    childrenOf.set(node.id, node.children)
  }

  let leafCount = 0
  for (const node of nodes) {
    if (!node.children || node.children.length === 0) leafCount += 1
  }
  const safeLeaves = Math.max(leafCount, 1)

  const levelCount = new Map<number, number>()
  for (const node of nodes) {
    levelCount.set(node.depth, (levelCount.get(node.depth) ?? 0) + 1)
  }
  const maxDepth = nodes.reduce((acc, node) => Math.max(acc, node.depth), 0)
  const totalRadius = Math.min(7, Math.max(2.4, 0.85 + maxDepth * 0.46))

  let leafCursor = 0
  const leafStart = new Map<string, number>()
  const leafEnd = new Map<string, number>()

  const walk = (id: string): void => {
    const node = byId.get(id)
    if (!node) return
    leafStart.set(id, leafCursor)
    const kids = childrenOf.get(id) ?? []
    if (kids.length === 0) {
      leafCursor += 1
    } else {
      for (const kid of kids) walk(kid)
    }
    leafEnd.set(id, leafCursor - 1)
  }

  for (const root of roots) walk(root)

  for (const node of nodes) {
    const index = order.length
    order.push(node.id)
    indexOf.set(node.id, index)
    starts.push(node.start)

    const first = leafStart.get(node.id) ?? 0
    const last = leafEnd.get(node.id) ?? first
    const mid = (first + last + 1) / 2
    const angle = (mid / safeLeaves) * Math.PI * 2 - Math.PI / 2

    // A cone: the apex is on the axis, the base is the widest ring.
    const radius =
      maxDepth === 0 ? 0 : totalRadius * Math.pow(node.depth / maxDepth, 0.82)

    positions.push(
      Math.cos(angle) * radius,
      -node.depth * LEVEL_GAP,
      Math.sin(angle) * radius,
    )

    const levelNodes = levelCount.get(node.depth) ?? 1
    const spacing = (Math.PI * 2 * Math.max(radius, 0.4)) / Math.max(levelNodes, 1)
    const size = Math.min(0.2, Math.max(0.03, spacing * 0.4))
    scales.push(size)

    const t = maxDepth === 0 ? 0 : node.depth / maxDepth
    const color =
      node.kind === "base" ? BASE.clone() : SHALLOW.clone().lerp(DEEP, t)
    colors.push(color.r, color.g, color.b)

    for (const kid of node.children) {
      const childIndex = indexOf.get(kid)
      if (childIndex === undefined) continue
      edges.push(index, childIndex)
      edgeChildren.push(kid)
    }
  }

  return {
    order,
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    scales: new Float32Array(scales),
    edges: new Float32Array(edges),
    edgeChildren,
    indexOf,
    starts: new Float32Array(starts),
    maxDepth,
    totalRadius,
  }
}

/** The ancestor chain of the active node, root first. */
function ancestorChain(
  nodes: KaratsubaNode[],
  activeId: string | null,
): string[] {
  if (!activeId) return []
  const parentOf = new Map<string, string>()
  for (const node of nodes) {
    for (const kid of node.children) parentOf.set(kid, node.id)
  }

  const chain: string[] = []
  let cursor: string | null = activeId
  while (cursor) {
    chain.unshift(cursor)
    cursor = parentOf.get(cursor) ?? null
  }
  return chain
}

/* ------------------------------------------------------------------ *
 * Branch shader — every edge grows outward from its parent as the
 * child node is born.
 * ------------------------------------------------------------------ */

const BRANCH_VERTEX = /* glsl */ `
attribute vec3 aStart;
attribute vec3 aEnd;
attribute float aT;
attribute float aGrow;

varying float vT;
varying float vGrow;

void main() {
  float g = clamp(aGrow, 0.0, 1.0);
  vec3 p = mix(aStart, aEnd, aT * g);
  vT = aT;
  vGrow = g;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const BRANCH_FRAGMENT = /* glsl */ `
precision mediump float;

varying float vT;
varying float vGrow;

void main() {
  if (vGrow <= 0.002) discard;

  vec3 shallow = vec3(0.30, 0.52, 1.00);
  vec3 deep = vec3(0.66, 0.36, 1.00);
  vec3 col = mix(shallow, deep, vT);

  // The growing tip is the hot end of the branch.
  float tip = smoothstep(0.55, 1.0, vT) * smoothstep(0.15, 0.95, vGrow);
  col += vec3(0.85, 0.95, 1.0) * tip * 1.6;

  float alpha = 0.42 * vGrow + tip * 0.55;
  gl_FragColor = vec4(col * (0.6 + tip), alpha);
}
`

function LatticeContents({
  nodes,
  roots,
  stepIndex,
  accent,
}: {
  nodes: KaratsubaNode[]
  roots: string[]
  stepIndex: number
  accent: "primary" | "accent"
}) {
  const { camera } = useThree()
  const pointer = usePointer()

  const meshRef = useRef<THREE.InstancedMesh>(null)
  const edgeRef = useRef<THREE.LineSegments>(null)
  const activeRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const beamRef = useRef<THREE.LineSegments>(null)
  const orbitRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const growRef = useRef<THREE.BufferAttribute | null>(null)

  const activeNode = useMemo(
    () => activeNodeAt(nodes, stepIndex),
    [nodes, stepIndex],
  )
  const activeId = activeNode?.id ?? null

  // The layout only depends on the tree itself, so scrubbing the trace
  // never rebuilds the instance buffers.
  const layout = useMemo(() => layoutLattice(nodes, roots), [nodes, roots])
  const chain = useMemo(
    () => ancestorChain(nodes, activeId),
    [nodes, activeId],
  )
  const chainSet = useMemo(() => new Set(chain), [chain])

  // Nodes finish in depth-first order, so sorting by the end of their trace
  // span gives the order in which the arithmetic was performed.
  const sortedByEnd = useMemo(
    () => [...nodes].sort((a, b) => a.end - b.end),
    [nodes],
  )
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  )

  // The arithmetic that has just been performed. Labels for the current
  // recursion path are kept (they are spread out along the cone), while the
  // most recent results fade out so the tree never becomes a wall of text.
  const labelled = useMemo(() => {
    if (stepIndex < 0) return []
    const out: Array<{ node: KaratsubaNode; opacity: number }> = []

    for (const id of chain) {
      const node = nodeById.get(id)
      if (node?.label && node.end <= stepIndex) {
        out.push({ node, opacity: 0.92 })
      }
    }

    let index = 0
    for (
      let i = sortedByEnd.length - 1;
      i >= 0 && index < LABEL_WINDOW;
      i -= 1
    ) {
      const node = sortedByEnd[i]
      if (node.end > stepIndex || !node.label) continue
      if (chainSet.has(node.id)) continue
      out.push({ node, opacity: Math.max(0.14, 0.85 - index * 0.14) })
      index += 1
    }

    return out
  }, [nodeById, sortedByEnd, chain, chainSet, stepIndex])

  if (typeof window !== "undefined") {
    ;(window as unknown as Record<string, unknown>).__labelDebug = {
      stepIndex,
      total: sortedByEnd.length,
      chain: chain.length,
      labelled: labelled.length,
      sample: labelled.slice(0, 3).map((l) => l.node.label),
    }
  }

  const activeTarget = useRef(new THREE.Vector3())
  const hasActive = useRef(false)

  const maxDepth = layout.maxDepth
  const frameRadius = layout.totalRadius + 3.1
  const frameY = -maxDepth * LEVEL_GAP * 0.5

  /* -------------------------------------------------------------- *
   * Reveal state: nodes ignite as the algorithm reaches them.
   * -------------------------------------------------------------- */

  const revealMap = useRef(new Map<string, number>())
  const targetMap = useRef(new Map<string, number>())
  const animating = useRef(new Set<string>())

  // A fresh run starts from a dormant, dim lattice.
  useLayoutEffect(() => {
    revealMap.current = new Map()
    targetMap.current = new Map()
    animating.current = new Set()
  }, [nodes])

  useLayoutEffect(() => {
    const dormant = stepIndex < 0
    for (let i = 0; i < layout.order.length; i += 1) {
      const id = layout.order[i]
      const reached = layout.starts[i] <= stepIndex
      // Unreached nodes stay as a dim ghost so the shape of the cone is
      // always readable — they simply ignite as the algorithm reaches them.
      const goal = dormant ? 0.45 : reached ? 1 : 0.11
      if (targetMap.current.get(id) !== goal) {
        targetMap.current.set(id, goal)
        animating.current.add(id)
      }
      if (!revealMap.current.has(id)) {
        revealMap.current.set(id, 0)
        animating.current.add(id)
      }
    }
  }, [layout, stepIndex])

  // Branch geometry — one line segment per parent → child edge.
  const branchGeometry = useMemo(() => {
    const count = layout.edgeChildren.length
    const starts = new Float32Array(count * 2 * 3)
    const ends = new Float32Array(count * 2 * 3)
    const ts = new Float32Array(count * 2)
    const grow = new Float32Array(count * 2)
    const mid = new Float32Array(count * 2 * 3)

    for (let e = 0; e < count; e += 1) {
      const from = layout.edges[e * 2]
      const to = layout.edges[e * 2 + 1]
      const ax = layout.positions[from * 3]
      const ay = layout.positions[from * 3 + 1]
      const az = layout.positions[from * 3 + 2]
      const bx = layout.positions[to * 3]
      const by = layout.positions[to * 3 + 1]
      const bz = layout.positions[to * 3 + 2]

      for (let v = 0; v < 2; v += 1) {
        const i = e * 2 + v
        starts[i * 3] = ax
        starts[i * 3 + 1] = ay
        starts[i * 3 + 2] = az
        ends[i * 3] = bx
        ends[i * 3 + 1] = by
        ends[i * 3 + 2] = bz
        mid[i * 3] = (ax + bx) / 2
        mid[i * 3 + 1] = (ay + by) / 2
        mid[i * 3 + 2] = (az + bz) / 2
        ts[i] = v
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(mid, 3))
    geo.setAttribute("aStart", new THREE.BufferAttribute(starts, 3))
    geo.setAttribute("aEnd", new THREE.BufferAttribute(ends, 3))
    geo.setAttribute("aT", new THREE.BufferAttribute(ts, 1))
    const growAttribute = new THREE.BufferAttribute(grow, 1)
    growAttribute.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute("aGrow", growAttribute)
    geo.computeBoundingSphere()
    return geo
  }, [layout])

  useLayoutEffect(() => {
    growRef.current = branchGeometry.getAttribute("aGrow") as THREE.BufferAttribute
  }, [branchGeometry])

  // Rebuild the instance buffers whenever the tree changes.
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    // `vertexColors` needs a per-vertex colour attribute; the per-instance
    // colour multiplies it. Without it the whole mesh renders black.
    const geometry = mesh.geometry as THREE.BufferGeometry
    const vertexCount = geometry.getAttribute("position")?.count ?? 0
    if (vertexCount > 0 && !geometry.getAttribute("color")) {
      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(vertexCount * 3).fill(1), 3),
      )
    }

    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    const position = new THREE.Vector3()
    const color = new THREE.Color()

    for (let i = 0; i < layout.order.length; i += 1) {
      position.set(
        layout.positions[i * 3],
        layout.positions[i * 3 + 1],
        layout.positions[i * 3 + 2],
      )
      const amount = revealMap.current.get(layout.order[i]) ?? 0
      const s = layout.scales[i] * Math.max(amount, 0.0001)
      scale.set(s, s, s)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(i, matrix)

      const lit = 0.22 + 0.78 * Math.min(Math.max(amount, 0), 1)
      color.setRGB(
        layout.colors[i * 3] * lit,
        layout.colors[i * 3 + 1] * lit,
        layout.colors[i * 3 + 2] * lit,
      )
      mesh.setColorAt(i, color)
    }

    mesh.count = layout.order.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [layout])

  // The focus beam that traces the ancestor chain.
  useLayoutEffect(() => {
    const beam = beamRef.current
    if (!beam) return

    const points = chain
      .map((id) => {
        const index = layout.indexOf.get(id)
        if (index === undefined) return null
        return new THREE.Vector3(
          layout.positions[index * 3],
          layout.positions[index * 3 + 1],
          layout.positions[index * 3 + 2],
        )
      })
      .filter((value): value is THREE.Vector3 => value !== null)

    const geometry = beam.geometry as THREE.BufferGeometry
    const attribute = new THREE.BufferAttribute(
      new Float32Array(Math.max(points.length - 1, 0) * 6),
      3,
    )
    for (let i = 0; i < points.length - 1; i += 1) {
      attribute.setXYZ(i * 2, points[i].x, points[i].y, points[i].z)
      attribute.setXYZ(i * 2 + 1, points[i + 1].x, points[i + 1].y, points[i + 1].z)
    }
    geometry.setAttribute("position", attribute)
    geometry.computeBoundingSphere()
    beam.visible = points.length > 1
  }, [layout, chain])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime

    // Reveal animation.
    const mesh = meshRef.current
    if (mesh && animating.current.size > 0) {
      const matrix = new THREE.Matrix4()
      const quaternion = new THREE.Quaternion()
      const scale = new THREE.Vector3()
      const position = new THREE.Vector3()
      const color = new THREE.Color()
      const k = 1 - Math.pow(0.0009, delta)

      for (const id of Array.from(animating.current)) {
        const index = layout.indexOf.get(id)
        if (index === undefined) {
          animating.current.delete(id)
          continue
        }
        const goal = targetMap.current.get(id) ?? 0
        const current = revealMap.current.get(id) ?? 0
        const next = current + (goal - current) * k
        revealMap.current.set(id, next)

        position.set(
          layout.positions[index * 3],
          layout.positions[index * 3 + 1],
          layout.positions[index * 3 + 2],
        )
        // A small overshoot makes the node pop into existence.
        const eased = next + Math.sin(Math.min(next, 1) * Math.PI) * 0.22
        const s = layout.scales[index] * Math.max(eased, 0.0001)
        scale.set(s, s, s)
        matrix.compose(position, quaternion, scale)
        mesh.setMatrixAt(index, matrix)

        const lit = 0.22 + 0.78 * Math.min(Math.max(next, 0), 1)
        color.setRGB(
          layout.colors[index * 3] * lit,
          layout.colors[index * 3 + 1] * lit,
          layout.colors[index * 3 + 2] * lit,
        )
        mesh.setColorAt(index, color)

        if (Math.abs(next - goal) < 0.004) {
          revealMap.current.set(id, goal)
          animating.current.delete(id)
        }
      }

      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }

    // Branches grow with their child nodes.
    const growAttribute = growRef.current
    if (growAttribute) {
      const array = growAttribute.array as Float32Array
      let changed = false
      for (let e = 0; e < layout.edgeChildren.length; e += 1) {
        const value = revealMap.current.get(layout.edgeChildren[e]) ?? 0
        const i = e * 2
        if (array[i] !== value || array[i + 1] !== value) {
          array[i] = value
          array[i + 1] = value
          changed = true
        }
      }
      if (changed) growAttribute.needsUpdate = true
    }

    // Camera: slow drift unless the user is orbiting.
    const nx = pointer.current.nx
    const ny = pointer.current.ny
    const angle = t * 0.09 + nx * 0.35
    const radius = frameRadius - ny * 0.6
    const desired = new THREE.Vector3(
      Math.sin(angle) * radius,
      1.9 + frameY * -0.2 + ny * 1.1,
      Math.cos(angle) * radius,
    )

    const controls = orbitRef.current
    if (controls) {
      controls.target.lerp(new THREE.Vector3(0, frameY, 0), 0.05)
      controls.update()
    } else {
      camera.position.lerp(desired, 1 - Math.pow(0.0015, delta))
      camera.lookAt(0, frameY, 0)
    }

    // The focus node glides to the active sub-problem.
    const active = activeRef.current
    const halo = haloRef.current
    if (!active || !halo) return

    const index = activeId ? layout.indexOf.get(activeId) : undefined
    if (index === undefined) {
      active.visible = false
      halo.visible = false
      return
    }

    activeTarget.current.set(
      layout.positions[index * 3],
      layout.positions[index * 3 + 1],
      layout.positions[index * 3 + 2],
    )

    if (!hasActive.current) {
      active.position.copy(activeTarget.current)
      hasActive.current = true
    } else {
      active.position.lerp(activeTarget.current, 1 - Math.pow(0.0008, delta))
    }

    active.scale.setScalar(1 + Math.sin(t * 4.2) * 0.12)
    active.visible = true
    halo.position.copy(active.position)
    halo.scale.setScalar(0.44 + Math.sin(t * 2.4) * 0.05)
    halo.visible = true
  })

  const activeIndex = activeId ? layout.indexOf.get(activeId) : undefined
  const activePosition =
    activeIndex !== undefined
      ? ([
          layout.positions[activeIndex * 3],
          layout.positions[activeIndex * 3 + 1] + 0.42,
          layout.positions[activeIndex * 3 + 2],
        ] as [number, number, number])
      : null

  const accentClass =
    accent === "accent" ? "text-accent-soft" : "text-primary-soft"

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(layout.order.length, 1)]}
        frustumCulled={false}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.92}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>

      <lineSegments
        ref={edgeRef}
        geometry={branchGeometry}
        frustumCulled={false}
      >
        <shaderMaterial
          vertexShader={BRANCH_VERTEX}
          fragmentShader={BRANCH_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <lineSegments ref={beamRef} frustumCulled={false}>
        <bufferGeometry />
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.75}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      <mesh ref={activeRef} visible={false}>
        <octahedronGeometry args={[0.19, 0]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.95}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={haloRef} visible={false}>
        <ringGeometry args={[0.8, 1, 48]} />
        <meshBasicMaterial
          color="#8fb6ff"
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {activePosition && activeNode ? (
        <Html
          position={activePosition}
          center
          zIndexRange={[24, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="cut-corner-sm whitespace-nowrap border border-white/15 bg-[rgba(6,9,18,0.82)] px-2.5 py-1.5 font-mono text-[10px] leading-tight backdrop-blur-md">
            <span className={`${accentClass} text-[9px] uppercase tracking-[0.14em]`}>
              depth {activeNode.depth} · {activeNode.n}d
            </span>
            <div className="mt-0.5 max-w-[220px] truncate text-foreground">
              {activeNode.label ?? (
                <>
                  {activeNode.x.slice(0, 10)}… × {activeNode.y.slice(0, 10)}…
                </>
              )}
            </div>
          </div>
        </Html>
      ) : null}

      {/* The arithmetic performed by the nodes that just finished. */}
      {labelled.map(({ node, opacity }) => {
        const index3d = layout.indexOf.get(node.id)
        if (index3d === undefined || !node.label) return null
        return (
          <Html
            key={`calc-${node.id}`}
            position={[
              layout.positions[index3d * 3],
              layout.positions[index3d * 3 + 1] - 0.17,
              layout.positions[index3d * 3 + 2],
            ]}
            center
            zIndexRange={[18, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              className="cut-corner-sm whitespace-nowrap rounded-[3px] border border-white/10 bg-[rgba(5,8,16,0.78)] px-1.5 py-[3px] font-mono text-[9px] leading-none text-accent-soft/95 backdrop-blur-[2px]"
              style={{ opacity }}
            >
              {node.label}
            </div>
          </Html>
        )
      })}

      <OrbitControls
        ref={orbitRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.45}
        minDistance={3.2}
        maxDistance={24}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, frameY, 0]}
      />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={1.05}
          luminanceThreshold={0.05}
          luminanceSmoothing={0.4}
          mipmapBlur
          radius={0.75}
        />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  )
}

/**
 * A three-dimensional rendering of the Karatsuba recursion: the root splits
 * into three sub-products, each of which splits again. The cone of nodes
 * makes the 3^d explosion of base multiplications visible at a glance.
 */
export function RecursionLattice({
  nodes,
  roots,
  stepIndex,
  className,
  accent = "primary",
}: LatticeProps) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 1.9, 5.9], fov: 46, near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <LatticeContents
          nodes={nodes}
          roots={roots}
          stepIndex={stepIndex}
          accent={accent}
        />
      </Canvas>
    </div>
  )
}
