'use client'

import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export type WorkflowStepKey =
  | 'demanda'
  | 'artes'
  | 'copywriting'
  | 'aprovacao_interna'
  | 'aprovacao_externa'
  | 'programacao'
  | 'publicada'

const STEP_LABELS: Record<WorkflowStepKey, string> = {
  demanda: 'Demanda criada',
  artes: 'Artes',
  copywriting: 'Copywriting',
  aprovacao_interna: 'Aprovação interna',
  aprovacao_externa: 'Aprovação externa',
  programacao: 'Programação',
  publicada: 'Publicada',
}

const STEP_ORDER: WorkflowStepKey[] = [
  'demanda',
  'artes',
  'copywriting',
  'aprovacao_interna',
  'aprovacao_externa',
  'programacao',
  'publicada',
]

function buildFlowElements(activeStep: WorkflowStepKey | null): { nodes: Node[]; edges: Edge[] } {
  const gap = 180
  const nodes: Node[] = STEP_ORDER.map((step, i) => {
    const isActive = activeStep === step
    const isFirst = i === 0
    const isLast = i === STEP_ORDER.length - 1
    return {
      id: step,
      type: isFirst ? 'input' : isLast ? 'output' : 'default',
      position: { x: i * gap, y: 80 },
      data: { label: STEP_LABELS[step] },
      style: {
        background: isActive ? '#c62737' : '#f1f5f9',
        color: isActive ? '#fff' : '#334155',
        border: `2px solid ${isActive ? '#a01f2e' : '#e2e8f0'}`,
        borderRadius: 8,
        padding: '10px 16px',
        fontWeight: isActive ? 600 : 500,
      },
    }
  })

  const edges: Edge[] = STEP_ORDER.slice(0, -1).map((step, i) => ({
    id: `e-${step}-${STEP_ORDER[i + 1]}`,
    source: step,
    target: STEP_ORDER[i + 1],
  }))

  return { nodes, edges }
}

type WorkflowStepsFlowProps = {
  /** Etapa atual a destacar (opcional). */
  activeStep?: WorkflowStepKey | null
  className?: string
}

export function WorkflowStepsFlow({ activeStep = null, className = '' }: WorkflowStepsFlowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFlowElements(activeStep),
    [activeStep]
  )

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className={className} style={{ height: 280 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
      >
        <Background gap={12} size={1} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <MiniMap nodeColor="#cbd5e1" maskColor="rgba(0,0,0,0.05)" />
      </ReactFlow>
    </div>
  )
}

export { STEP_LABELS, STEP_ORDER }
