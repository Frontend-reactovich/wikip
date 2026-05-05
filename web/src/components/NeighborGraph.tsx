import '@xyflow/react/dist/style.css'

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'
import { useEffect } from 'react'

type Props = {
  centerSlug: string
  centerTitle: string
  neighbors: { slug: string; title: string }[]
  onSelectSlug: (slug: string) => void
}

function buildFlow(
  centerSlug: string,
  centerTitle: string,
  neighbors: { slug: string; title: string }[],
): { nodes: Node[]; edges: Edge[] } {
  const cx = 200
  const cy = 180
  const r = 150
  const nodes: Node[] = [
    {
      id: centerSlug,
      position: { x: cx, y: cy },
      data: { label: centerTitle },
      style: {
        fontWeight: 700,
        padding: 8,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--accent-bg)',
        maxWidth: 160,
        fontSize: 13,
      },
    },
  ]
  const edges: Edge[] = []
  const n = neighbors.length
  neighbors.forEach((nb, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    nodes.push({
      id: nb.slug,
      position: { x, y },
      data: { label: nb.title },
      style: {
        padding: 6,
        borderRadius: 8,
        border: '1px solid var(--border)',
        maxWidth: 140,
        fontSize: 12,
      },
    })
    edges.push({
      id: `${centerSlug}-${nb.slug}`,
      source: centerSlug,
      target: nb.slug,
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    })
  })
  return { nodes, edges }
}

export function NeighborGraph({
  centerSlug,
  centerTitle,
  neighbors,
  onSelectSlug,
}: Props) {
  const built = buildFlow(centerSlug, centerTitle, neighbors)
  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges)

  useEffect(() => {
    const b = buildFlow(centerSlug, centerTitle, neighbors)
    setNodes(b.nodes)
    setEdges(b.edges)
  }, [centerSlug, centerTitle, neighbors, setNodes, setEdges])

  return (
    <div className="neighbor-graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.2 }}
        onNodeClick={(_, node) => {
          if (node.id !== centerSlug) onSelectSlug(node.id)
        }}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
