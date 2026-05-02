import { useEffect, useRef } from 'react'
import * as d3 from 'd3-force'
import { GraphNode, GraphEdge } from '../../types'
import { getAvatarColor } from '../../utils/avatarColor'

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedId: string | null
  onSelect: (node: GraphNode | null) => void
  onDoubleClick: (node: GraphNode) => void
}

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}
type SimEdge = d3.SimulationLinkDatum<SimNode>

function nodeRadius(score: number): number {
  return Math.min(40, 12 + Math.sqrt(score) * 2)
}

export default function GraphCanvas({ nodes, edges, selectedId, onSelect, onDoubleClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const simRef = useRef<d3.Simulation<SimNode, SimEdge> | null>(null)
  const selectedIdRef = useRef(selectedId)

  useEffect(() => {
    selectedIdRef.current = selectedId
    if (!svgRef.current) return
    const svg = svgRef.current
    svg.querySelectorAll<SVGCircleElement>('circle[data-node-id]').forEach(el => {
      const id = el.getAttribute('data-node-id')
      el.setAttribute('stroke', id === selectedId ? 'var(--accent)' : 'transparent')
      el.setAttribute('stroke-width', id === selectedId ? '2' : '0')
    })
  }, [selectedId])

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Clear previous
    if (simRef.current) simRef.current.stop()
    container.innerHTML = ''

    // Build SVG
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgEl.setAttribute('width', String(width))
    svgEl.setAttribute('height', String(height))
    svgEl.style.width = '100%'
    svgEl.style.height = '100%'
    container.appendChild(svgEl)
    svgRef.current = svgEl

    const root = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svgEl.appendChild(root)

    let transform = { x: 0, y: 0, k: 1 }
    let isPanning = false
    let panStart = { x: 0, y: 0 }
    let panOrigin = { x: 0, y: 0 }

    svgEl.addEventListener('wheel', (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      transform.k = Math.max(0.3, Math.min(3, transform.k * delta))
      root.setAttribute('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`)
    }, { passive: false })

    svgEl.addEventListener('mousedown', (e) => {
      if ((e.target as Element).closest('[data-node-id]')) return
      isPanning = true
      panStart = { x: e.clientX, y: e.clientY }
      panOrigin = { x: transform.x, y: transform.y }
      svgEl.style.cursor = 'grabbing'
    })
    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return
      transform.x = panOrigin.x + (e.clientX - panStart.x)
      transform.y = panOrigin.y + (e.clientY - panStart.y)
      root.setAttribute('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`)
    })
    window.addEventListener('mouseup', () => {
      isPanning = false
      svgEl.style.cursor = 'default'
    })

    // Simulation data
    const simNodes: SimNode[] = nodes.map(n => ({ ...n, x: width / 2 + (Math.random() - 0.5) * 100, y: height / 2 + (Math.random() - 0.5) * 100 }))

    // Draw edges (lines from center "self" node to each contact)
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    root.appendChild(edgeGroup)

    const edgeEls: SVGLineElement[] = simNodes.map(n => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      const edge = edges.find(e => e.target === n.id)
      const s = edge?.strength ?? 0
      line.setAttribute('stroke', `rgba(59,130,246,${(0.15 + s * 0.5).toFixed(2)})`)
      line.setAttribute('stroke-width', String((1 + s * 4).toFixed(1)))
      line.setAttribute('data-edge-target', n.id)
      edgeGroup.appendChild(line)
      return line
    })
    const edgeMap = new Map(edgeEls.map(el => [el.getAttribute('data-edge-target')!, el]))

    // Center node (self)
    const selfG = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const selfCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    selfCircle.setAttribute('r', '14')
    selfCircle.setAttribute('fill', '#3B82F6')
    selfCircle.setAttribute('stroke', 'rgba(59,130,246,0.4)')
    selfCircle.setAttribute('stroke-width', '2')
    selfG.appendChild(selfCircle)
    const selfLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    selfLabel.setAttribute('text-anchor', 'middle')
    selfLabel.setAttribute('dominant-baseline', 'central')
    selfLabel.setAttribute('font-size', '8')
    selfLabel.setAttribute('fill', 'white')
    selfLabel.setAttribute('font-weight', '600')
    selfLabel.textContent = '我'
    selfG.appendChild(selfLabel)
    root.appendChild(selfG)

    // Draw nodes
    const nodeEls = new Map<string, SVGGElement>()
    let dragNode: SimNode | null = null
    let dragStart = { x: 0, y: 0 }
    let isDraggingNode = false

    for (const n of simNodes) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.style.cursor = 'pointer'
      g.setAttribute('data-node-g', n.id)

      const r = nodeRadius(n.score)
      const color = getAvatarColor(n.name)

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('r', String(r))
      circle.setAttribute('fill', color)
      circle.setAttribute('fill-opacity', n.type === 'group' ? '0.7' : '0.9')
      circle.setAttribute('stroke', 'transparent')
      circle.setAttribute('stroke-width', '2')
      circle.setAttribute('data-node-id', n.id)

      // Tooltip label (hidden by default)
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('text-anchor', 'middle')
      label.setAttribute('y', String(r + 12))
      label.setAttribute('font-size', '10')
      label.setAttribute('fill', 'var(--text-secondary)')
      label.setAttribute('pointer-events', 'none')
      label.setAttribute('opacity', '0')
      label.textContent = n.name.length > 8 ? n.name.slice(0, 8) + '…' : n.name

      // Group pattern for group chats
      if (n.type === 'group') {
        const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        inner.setAttribute('r', String(r * 0.5))
        inner.setAttribute('fill', 'rgba(255,255,255,0.2)')
        inner.setAttribute('pointer-events', 'none')
        g.appendChild(inner)
      }

      g.appendChild(circle)
      g.appendChild(label)

      // Hover
      g.addEventListener('mouseenter', () => {
        circle.setAttribute('stroke', 'var(--text-secondary)')
        circle.setAttribute('stroke-width', '1')
        label.setAttribute('opacity', '1')
      })
      g.addEventListener('mouseleave', () => {
        const isSel = selectedIdRef.current === n.id
        circle.setAttribute('stroke', isSel ? 'var(--accent)' : 'transparent')
        circle.setAttribute('stroke-width', isSel ? '2' : '0')
        label.setAttribute('opacity', '0')
      })

      // Drag
      g.addEventListener('mousedown', (e) => {
        e.stopPropagation()
        isDraggingNode = false
        dragNode = n
        dragStart = { x: e.clientX, y: e.clientY }
        if (simRef.current) simRef.current.alphaTarget(0.3).restart()
      })

      // Click / double-click
      let clickTimer: ReturnType<typeof setTimeout> | null = null
      g.addEventListener('click', (e) => {
        e.stopPropagation()
        if (isDraggingNode) return
        if (clickTimer) {
          clearTimeout(clickTimer)
          clickTimer = null
          onDoubleClick(n)
        } else {
          clickTimer = setTimeout(() => {
            clickTimer = null
            onSelect(n)
          }, 220)
        }
      })

      root.appendChild(g)
      nodeEls.set(n.id, g)
    }

    // Global drag handlers
    window.addEventListener('mousemove', (e) => {
      if (!dragNode) return
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDraggingNode = true
      dragNode.fx = (dragNode.x ?? 0) + dx / transform.k
      dragNode.fy = (dragNode.y ?? 0) + dy / transform.k
      dragStart = { x: e.clientX, y: e.clientY }
    })
    window.addEventListener('mouseup', () => {
      if (dragNode) {
        if (simRef.current) simRef.current.alphaTarget(0)
        dragNode.fx = null
        dragNode.fy = null
        dragNode = null
      }
    })

    // Click on SVG background to deselect
    svgEl.addEventListener('click', (e) => {
      if (e.target === svgEl || e.target === root) onSelect(null)
    })

    // Simulation
    const sim = d3.forceSimulation<SimNode>(simNodes)
      .force('charge', d3.forceManyBody<SimNode>().strength(-300))
      .force('center', d3.forceCenter<SimNode>(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius(n => nodeRadius(n.score) + 8))
      .alphaDecay(0.03)

    simRef.current = sim

    sim.on('tick', () => {
      // Center node stays at center
      selfG.setAttribute('transform', `translate(${width / 2},${height / 2})`)

      for (const n of simNodes) {
        const g = nodeEls.get(n.id)
        if (!g) continue
        const x = n.x ?? 0
        const y = n.y ?? 0
        g.setAttribute('transform', `translate(${x},${y})`)

        // Update edge from center to this node
        const line = edgeMap.get(n.id)
        if (line) {
          line.setAttribute('x1', String(width / 2))
          line.setAttribute('y1', String(height / 2))
          line.setAttribute('x2', String(x))
          line.setAttribute('y2', String(y))
        }
      }
    })

    // Entrance animation: fade in edges
    edgeEls.forEach(el => {
      el.style.opacity = '0'
      el.style.transition = 'opacity 500ms ease-in'
      requestAnimationFrame(() => { el.style.opacity = '1' })
    })

    // Reset view button handler
    const resetBtn = document.getElementById('graph-reset-btn')
    if (resetBtn) {
      resetBtn.onclick = () => {
        transform = { x: 0, y: 0, k: 1 }
        root.setAttribute('transform', `translate(0,0) scale(1)`)
      }
    }

    return () => {
      sim.stop()
      container.innerHTML = ''
      svgRef.current = null
    }
  }, [nodes, edges])

  return (
    <div ref={containerRef} className="w-full h-full" />
  )
}
