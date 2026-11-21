const WIDTH = 320
const HEIGHT = 200
const ROOT = { x: 160, y: 30 }

interface Node {
  x: number
  y: number
  level: number
  order: number
}

/**
 * Builds a three-way recursion tree laid out as a pyramid: the root at the
 * top, then three children, then nine, and so on.
 */
function buildTree(): { nodes: Node[]; edges: [number, number][] } {
  const nodes: Node[] = []
  const edges: [number, number][] = []

  const levelWidths = [1, 3, 9]
  const levelY = [ROOT.y, ROOT.y + 48, ROOT.y + 96]
  const spread = [0, 76, 142]

  let previousStart = 0
  let previousWidth = 1

  for (let level = 0; level < levelWidths.length; level += 1) {
    const count = levelWidths[level]
    const start = nodes.length

    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0.5 : i / (count - 1)
      nodes.push({
        x: ROOT.x + (t - 0.5) * 2 * spread[level],
        y: levelY[level],
        level,
        order: i,
      })
    }

    if (level > 0) {
      for (let i = 0; i < count; i += 1) {
        const parent = previousStart + Math.floor((i * previousWidth) / count)
        edges.push([parent, start + i])
      }
    }

    previousStart = start
    previousWidth = count
  }

  return { nodes, edges }
}

const TREE = buildTree()

/**
 * A looping miniature of the Karatsuba split: one multiplication becomes
 * three, and each of those becomes three again.
 */
export function KaratsubaPreview() {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="ks-prev-edge" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8fb6ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5ff0d8" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {TREE.edges.map(([from, to], i) => (
        <line
          key={`e-${i}`}
          x1={TREE.nodes[from].x}
          y1={TREE.nodes[from].y}
          x2={TREE.nodes[to].x}
          y2={TREE.nodes[to].y}
          stroke="url(#ks-prev-edge)"
          strokeWidth={1}
          className="animate-grow-edge"
          style={{ animationDelay: `${0.2 + i * 0.045}s` }}
        />
      ))}

      {TREE.nodes.map((node, i) => {
        const isRoot = node.level === 0
        const isLeaf = node.level === 2
        const fill = isRoot ? "#8fb6ff" : isLeaf ? "#5ff0d8" : "#6f8fd8"
        const size = isRoot ? 7 : isLeaf ? 3 : 4.6

        return (
          <g
            key={`n-${i}`}
            className="animate-grow-node"
            style={{ animationDelay: `${0.15 + node.level * 0.42 + node.order * 0.06}s` }}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={size}
              fill={fill}
              opacity={isRoot ? 1 : isLeaf ? 0.85 : 0.75}
            />
            {isRoot ? (
              <circle
                cx={node.x}
                cy={node.y}
                r={size + 7}
                fill="none"
                stroke="#8fb6ff"
                strokeWidth={1}
                opacity={0.35}
                className="animate-pulse-ring"
                style={{ transformOrigin: `${node.x}px ${node.y}px` }}
              />
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
