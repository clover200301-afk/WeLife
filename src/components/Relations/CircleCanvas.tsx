import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import type { GraphNode } from '../../types'
import type { Circle } from '../../utils/circles'
import { nodeColor } from '../../utils/sentimentColor'

type ExpandState = 'collapsed' | 'active' | 'all'

interface Props {
  circles: Circle[]
  nodes: GraphNode[]
  sentimentMap: Record<string, string>
  selectedId: string | null
  onSelectNode: (node: GraphNode | null) => void
}

const CX = 400
const CY = 300

function groupRadius(order: number): number {
  return 120 + (order - 1) * 50
}

function getGroupPositions(circles: Circle[]): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>()
  const n = circles.length
  circles.forEach((c, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    const r = groupRadius(c.order)
    map.set(c.id, { x: CX + Math.cos(angle) * r, y: CY + Math.sin(angle) * r })
  })
  return map
}

function getContactPositions(
  gx: number, gy: number, contacts: GraphNode[]
): { node: GraphNode; x: number; y: number }[] {
  const n = contacts.length
  if (n === 0) return []
  const baseR = Math.min(70, 30 + n * 8)
  return contacts.map((node, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    return { node, x: gx + Math.cos(angle) * baseR, y: gy + Math.sin(angle) * baseR }
  })
}

export default function CircleCanvas({ circles, nodes, sentimentMap, selectedId, onSelectNode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [expandStates, setExpandStates] = useState<Record<string, ExpandState>>({})
  const [hovered, setHovered] = useState<string | null>(null)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [scale, setScale] = useState(1)

  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: width, h: height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const offsetX = size.w / 2 - CX
  const offsetY = size.h / 2 - CY

  // Pan
  const panRef = useRef<{ active: boolean; startX: number; startY: number; ox: number; oy: number }>({
    active: false, startX: 0, startY: 0, ox: 0, oy: 0,
  })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-interactive]')) return
    panRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: tx, oy: ty }
  }, [tx, ty])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panRef.current.active) return
      setTx(panRef.current.ox + e.clientX - panRef.current.startX)
      setTy(panRef.current.oy + e.clientY - panRef.current.startY)
    }
    const onUp = () => { panRef.current.active = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => Math.max(0.3, Math.min(3, s * delta)))
  }, [])

  const groupPositions = useMemo(() => getGroupPositions(circles), [circles])

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  const handleCircleClick = useCallback((circleId: string) => {
    setExpandStates(prev => {
      const cur = prev[circleId] ?? 'collapsed'
      const next: ExpandState = cur === 'collapsed' ? 'active' : cur === 'active' ? 'all' : 'collapsed'
      return { ...prev, [circleId]: next }
    })
  }, [])

  const handleReset = useCallback(() => {
    setTx(0); setTy(0); setScale(1)
  }, [])

  // Build expanded contacts per circle
  const expandedContacts = useMemo(() => {
    const result = new Map<string, { node: GraphNode; x: number; y: number }[]>()
    for (const circle of circles) {
      const state = expandStates[circle.id] ?? 'collapsed'
      if (state === 'collapsed') continue
      const gpos = groupPositions.get(circle.id)!
      const contactNodes = circle.contactIds
        .map(id => nodeMap.get(id))
        .filter((n): n is GraphNode => n !== undefined)
      const filtered = state === 'active'
        ? contactNodes.filter(n => n.score >= 20)
        : contactNodes
      result.set(circle.id, getContactPositions(gpos.x, gpos.y, filtered))
    }
    return result
  }, [circles, expandStates, groupPositions, nodeMap])

  if (circles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 opacity-30">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
        </svg>
        <span className="text-sm">请在左侧创建圈子并添加联系人</span>
      </div>
    )
  }

  const transform = `translate(${offsetX + tx}, ${offsetY + ty}) scale(${scale})`

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden" onMouseDown={onMouseDown} onWheel={onWheel} style={{ cursor: 'grab' }}>
      {/* Reset button */}
      <button
        onClick={handleReset}
        className="no-drag absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs z-10"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
        </svg>
        重置
      </button>

      {/* Legend */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full text-[10px] pointer-events-none z-10"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#22C55E' }} />亲近</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#94A3B8' }} />一般</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#CBD5E1' }} />较少</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#EF4444' }} />疏远</span>
        <span className="mx-1 opacity-40">·</span>
        <span>点击圈子展开联系人</span>
      </div>

      <svg width={size.w} height={size.h} style={{ userSelect: 'none' }} onClick={(e) => { if (e.target === e.currentTarget) onSelectNode(null) }}>
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15"/>
          </filter>
        </defs>

        <g transform={transform}>
          {/* Lines: center → groups */}
          {circles.map(circle => {
            const gpos = groupPositions.get(circle.id)!
            const contacts = circle.contactIds.map(id => nodeMap.get(id)).filter(Boolean) as GraphNode[]
            const avgScore = contacts.length > 0 ? contacts.reduce((s, n) => s + n.score, 0) / contacts.length : 0
            const lineWidth = Math.max(0.5, Math.min(3, 0.5 + avgScore / 20))
            return (
              <line
                key={circle.id}
                x1={CX} y1={CY} x2={gpos.x} y2={gpos.y}
                stroke={circle.color}
                strokeWidth={lineWidth}
                opacity={0.4}
                strokeDasharray={contacts.length === 0 ? '4 4' : undefined}
              />
            )
          })}

          {/* Lines: groups → contacts (expanded) */}
          {circles.map(circle => {
            const contacts = expandedContacts.get(circle.id) ?? []
            return contacts.map(({ node, x, y }) => {
              const gpos = groupPositions.get(circle.id)!
              if (node.score === 0) return null
              const color = nodeColor(node.score, sentimentMap[node.id])
              return (
                <line
                  key={`edge-${node.id}`}
                  x1={gpos.x} y1={gpos.y} x2={x} y2={y}
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              )
            })
          })}

          {/* Contact nodes (expanded) */}
          {circles.map(circle => {
            const contacts = expandedContacts.get(circle.id) ?? []
            return contacts.map(({ node, x, y }) => {
              const color = nodeColor(node.score, sentimentMap[node.id])
              const isSelected = node.id === selectedId
              const isHovered = node.id === hovered
              return (
                <g
                  key={`contact-${node.id}`}
                  transform={`translate(${x}, ${y})`}
                  data-interactive="1"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => { e.stopPropagation(); onSelectNode(isSelected ? null : node) }}
                >
                  <circle
                    r={isSelected ? 14 : 12}
                    fill={color}
                    stroke={isSelected ? 'var(--accent)' : isHovered ? '#fff' : 'transparent'}
                    strokeWidth={isSelected || isHovered ? 2 : 0}
                    opacity={node.score === 0 ? 0.3 : 0.85}
                    filter={isSelected ? 'url(#shadow)' : undefined}
                  />
                  {(isHovered || isSelected) && (
                    <text
                      textAnchor="middle"
                      y={20}
                      fontSize={10}
                      fill="var(--text-secondary)"
                      pointerEvents="none"
                    >
                      {node.name.length > 7 ? node.name.slice(0, 7) + '…' : node.name}
                    </text>
                  )}
                </g>
              )
            })
          })}

          {/* Group circle nodes */}
          {circles.map(circle => {
            const gpos = groupPositions.get(circle.id)!
            const state = expandStates[circle.id] ?? 'collapsed'
            const contacts = circle.contactIds.map(id => nodeMap.get(id)).filter(Boolean) as GraphNode[]
            const isHov = hovered === `group-${circle.id}`
            const r = 28

            return (
              <g
                key={circle.id}
                transform={`translate(${gpos.x}, ${gpos.y})`}
                data-interactive="1"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(`group-${circle.id}`)}
                onMouseLeave={() => setHovered(null)}
                onClick={(e) => { e.stopPropagation(); handleCircleClick(circle.id) }}
              >
                {/* Outer ring when expanded */}
                {state !== 'collapsed' && (
                  <circle r={r + 5} fill="none" stroke={circle.color} strokeWidth={1.5} opacity={0.3}
                    strokeDasharray={state === 'active' ? '3 3' : undefined} />
                )}
                <circle
                  r={r}
                  fill={circle.color}
                  fillOpacity={contacts.length === 0 ? 0.3 : 0.85}
                  stroke={isHov ? '#fff' : 'transparent'}
                  strokeWidth={isHov ? 2 : 0}
                  filter="url(#shadow)"
                />
                {/* Group name */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight="600"
                  fill="white"
                  pointerEvents="none"
                >
                  {circle.name}
                </text>
                {/* Contact count badge */}
                {contacts.length > 0 && (
                  <>
                    <circle cx={r - 4} cy={-r + 4} r={9} fill="white" />
                    <text
                      x={r - 4} y={-r + 4}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={9}
                      fontWeight="700"
                      fill={circle.color}
                      pointerEvents="none"
                    >
                      {contacts.length}
                    </text>
                  </>
                )}
                {/* State indicator label */}
                <text
                  textAnchor="middle"
                  y={r + 14}
                  fontSize={10}
                  fill="var(--text-muted)"
                  pointerEvents="none"
                >
                  {state === 'active' ? '▼ 主要' : state === 'all' ? '▼ 全部' : ''}
                </text>
              </g>
            )
          })}

          {/* Center "我" node */}
          <g transform={`translate(${CX}, ${CY})`}>
            <circle r={20} fill="#3B82F6" filter="url(#shadow)" />
            <circle r={26} fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth={2} />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fontWeight="700"
              fill="white"
              pointerEvents="none"
            >
              我
            </text>
          </g>
        </g>
      </svg>
    </div>
  )
}
