import { useState, useMemo } from 'react'
import type { GraphNode } from '../../types'
import type { Circle } from '../../utils/circles'
import { getAvatarColor } from '../../utils/avatarColor'
import {
  addToCircle, removeFromCircle, createCircle, deleteCircle,
  saveCircles, suggestForCircle, CIRCLE_COLORS,
} from '../../utils/circles'

interface Props {
  nodes: GraphNode[]
  circles: Circle[]
  selectedId: string | null
  onSelect: (node: GraphNode) => void
  onCirclesChange: (circles: Circle[]) => void
}

function formatRelativeTime(ts: number): string {
  if (!ts) return '从未'
  const diff = Date.now() / 1000 - ts
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}天前`
  return `${Math.floor(diff / (86400 * 30))}个月前`
}

export default function ContactList({ nodes, circles, selectedId, onSelect, onCirclesChange }: Props) {
  const [query, setQuery] = useState('')
  const [expandedCircles, setExpandedCircles] = useState<Set<string>>(new Set())
  const [addingToCircle, setAddingToCircle] = useState<string | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerSuggest, setPickerSuggest] = useState(true)
  const [circlesSectionOpen, setCirclesSectionOpen] = useState(true)
  const [newCircleOpen, setNewCircleOpen] = useState(false)
  const [newCircleName, setNewCircleName] = useState('')
  const [newCircleColor, setNewCircleColor] = useState(CIRCLE_COLORS[4])

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  const filteredNodes = useMemo(() => {
    if (!query) return nodes
    const q = query.toLowerCase()
    return nodes.filter(n => {
      if (n.name.toLowerCase().includes(q)) return true
      return circles.some(c => c.name.toLowerCase().includes(q) && c.contactIds.includes(n.id))
    })
  }, [nodes, query, circles])

  function toggleCircle(id: string) {
    setExpandedCircles(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAdd(node: GraphNode, circleId: string) {
    const next = addToCircle(circles, circleId, node.id)
    saveCircles(next)
    onCirclesChange(next)
    setAddingToCircle(null)
    setPickerSearch('')
  }

  function handleRemove(circleId: string, contactId: string) {
    const next = removeFromCircle(circles, circleId, contactId)
    saveCircles(next)
    onCirclesChange(next)
  }

  function handleDeleteCircle(circleId: string) {
    const next = deleteCircle(circles, circleId)
    saveCircles(next)
    onCirclesChange(next)
  }

  function handleCreateCircle() {
    if (!newCircleName.trim()) return
    const next = createCircle(circles, newCircleName.trim(), newCircleColor)
    saveCircles(next)
    onCirclesChange(next)
    setNewCircleName('')
    setNewCircleColor(CIRCLE_COLORS[4])
    setNewCircleOpen(false)
  }

  function getPickerNodes(circleId: string): GraphNode[] {
    const circle = circles.find(c => c.id === circleId)
    if (!circle) return []
    const privateNodes = nodes.filter(n => n.type === 'private')
    if (pickerSuggest) {
      const suggestions = suggestForCircle(circle, privateNodes, circles)
      if (pickerSearch) return suggestions.filter(n => n.name.includes(pickerSearch))
      return suggestions
    }
    const inCircle = new Set(circle.contactIds)
    return privateNodes
      .filter(n => !inCircle.has(n.id) && (!pickerSearch || n.name.includes(pickerSearch)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
  }

  const ChevronRight = ({ open }: { open: boolean }) => (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className="w-3 h-3 shrink-0 transition-transform"
      style={{ transform: open ? 'rotate(90deg)' : 'none' }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )

  return (
    <div className="flex flex-col h-full" style={{ borderRight: '1px solid var(--border)' }}>
      {/* Fixed header */}
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          联系人
          <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            {nodes.length}
          </span>
        </h2>
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="搜索联系人或圈子…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Circles section ── */}
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setCirclesSectionOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>圈子</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                {circles.length}
              </span>
              <ChevronRight open={circlesSectionOpen} />
            </div>
          </button>

          {circlesSectionOpen && (
            <div className="pb-1">
              {circles.map(circle => {
                const isExpanded = expandedCircles.has(circle.id)
                const isAdding = addingToCircle === circle.id
                const contacts = circle.contactIds
                  .map(id => nodeMap.get(id))
                  .filter((n): n is GraphNode => n !== undefined)

                return (
                  <div key={circle.id}>
                    {/* Circle row */}
                    <div className="flex items-center gap-1 px-3 py-1.5 group">
                      <button
                        onClick={() => toggleCircle(circle.id)}
                        className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                      >
                        <ChevronRight open={isExpanded} />
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: circle.color }} />
                        <span className="text-xs truncate flex-1" style={{ color: 'var(--text-primary)' }}>{circle.name}</span>
                        <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>{contacts.length}</span>
                      </button>
                      {/* Add contact button */}
                      <button
                        onClick={() => {
                          if (isAdding) { setAddingToCircle(null); setPickerSearch('') }
                          else { setAddingToCircle(circle.id); setPickerSearch(''); setPickerSuggest(true) }
                        }}
                        className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: isAdding ? 'var(--accent)' : 'var(--text-muted)', background: isAdding ? 'var(--accent-glow)' : 'transparent' }}
                        title="添加联系人"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      {/* Delete circle button */}
                      <button
                        onClick={() => handleDeleteCircle(circle.id)}
                        className="shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                        title="删除圈子"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    {/* Expanded contact list */}
                    {isExpanded && (
                      <div className="pl-9 pr-3 pb-1">
                        {contacts.length === 0 ? (
                          <div className="text-[10px] py-1" style={{ color: 'var(--text-muted)' }}>暂无联系人</div>
                        ) : (
                          contacts.map(node => (
                            <div key={node.id} className="flex items-center gap-2 py-1 group/contact">
                              <div
                                className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                                style={{ background: getAvatarColor(node.name) }}
                              >
                                {node.name.charAt(0)}
                              </div>
                              <button
                                onClick={() => onSelect(node)}
                                className="flex-1 min-w-0 text-left text-xs truncate"
                                style={{ color: node.id === selectedId ? 'var(--accent)' : 'var(--text-primary)' }}
                              >
                                {node.name}
                              </button>
                              <button
                                onClick={() => handleRemove(circle.id, node.id)}
                                className="shrink-0 w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover/contact:opacity-100 transition-opacity"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                title="移除"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5">
                                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Add picker */}
                    {isAdding && (
                      <div className="mx-3 mb-2 rounded-lg overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        {/* Tabs */}
                        <div className="flex gap-1 p-1.5 pb-1">
                          {[{ key: true, label: 'AI推荐' }, { key: false, label: '全部' }].map(t => (
                            <button
                              key={String(t.key)}
                              onClick={() => setPickerSuggest(t.key)}
                              className="px-2 py-0.5 rounded text-[10px] font-medium"
                              style={{
                                background: pickerSuggest === t.key ? 'var(--accent)' : 'transparent',
                                color: pickerSuggest === t.key ? '#fff' : 'var(--text-muted)',
                              }}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                        {/* Search */}
                        <div className="px-1.5 pb-1">
                          <input
                            type="text"
                            placeholder="搜索…"
                            value={pickerSearch}
                            onChange={e => setPickerSearch(e.target.value)}
                            className="w-full px-2 py-1 rounded text-[10px] outline-none"
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        {/* Candidates */}
                        <div className="max-h-28 overflow-y-auto">
                          {getPickerNodes(circle.id).length === 0 ? (
                            <div className="px-2 py-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>没有更多联系人</div>
                          ) : (
                            getPickerNodes(circle.id).map(node => (
                              <button
                                key={node.id}
                                onClick={() => handleAdd(node, circle.id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <div
                                  className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                                  style={{ background: getAvatarColor(node.name) }}
                                >
                                  {node.name.charAt(0)}
                                </div>
                                <span className="flex-1 min-w-0 text-[10px] truncate" style={{ color: 'var(--text-primary)' }}>{node.name}</span>
                                <span className="text-[9px] shrink-0" style={{ color: 'var(--accent)' }}>{node.score}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* New circle */}
              {!newCircleOpen ? (
                <button
                  onClick={() => setNewCircleOpen(true)}
                  className="w-full flex items-center gap-1.5 px-4 py-1.5 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  新建圈子
                </button>
              ) : (
                <div className="mx-3 mb-2 p-2.5 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    placeholder="圈子名称"
                    value={newCircleName}
                    onChange={e => setNewCircleName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateCircle() }}
                    className="w-full px-2 py-1 rounded text-xs outline-none mb-2"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    autoFocus
                  />
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {CIRCLE_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewCircleColor(c)}
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{
                          background: c,
                          outline: newCircleColor === c ? `2px solid ${c}` : 'none',
                          outlineOffset: '1px',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleCreateCircle}
                      className="flex-1 px-2 py-1 rounded text-[10px] font-medium"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      创建
                    </button>
                    <button
                      onClick={() => { setNewCircleOpen(false); setNewCircleName('') }}
                      className="flex-1 px-2 py-1 rounded text-[10px]"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── All contacts ── */}
        <div>
          <div className="px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            所有联系人
            {query && (
              <span className="ml-1.5 font-normal" style={{ color: 'var(--text-muted)' }}>
                ({filteredNodes.length})
              </span>
            )}
          </div>
          {filteredNodes.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-xs" style={{ color: 'var(--text-muted)' }}>
              暂无联系人
            </div>
          ) : (
            filteredNodes.map(node => {
              const isSelected = node.id === selectedId
              return (
                <button
                  key={node.id}
                  onClick={() => onSelect(node)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
                  style={{
                    background: isSelected ? 'var(--accent-glow)' : 'transparent',
                    borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: getAvatarColor(node.name) }}
                  >
                    {node.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {node.name}
                      </span>
                      <span className="text-[10px] shrink-0 font-medium" style={{ color: 'var(--accent)' }}>
                        {node.score}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: node.type === 'group' ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.12)',
                          color: node.type === 'group' ? '#8B5CF6' : 'var(--accent)',
                        }}
                      >
                        {node.type === 'group' ? '群聊' : '私聊'}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {formatRelativeTime(node.lastActive)}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
