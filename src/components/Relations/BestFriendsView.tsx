import { useState, useEffect, useCallback } from 'react'
import type { GraphNode } from '../../types'
import { getAvatarColor } from '../../utils/avatarColor'

const STORAGE_KEY = 'welife_best_friends'

interface BestFriend {
  id: string
  name: string
  type: 'auto' | 'manual'
  streak: number
  addedAt: number
}

function loadBestFriends(): BestFriend[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as BestFriend[]
  } catch { /* ignore */ }
  return []
}

function saveBestFriends(friends: BestFriend[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(friends))
}

interface Props {
  nodes: GraphNode[]
  streakContacts: { chatId: string; streak: number }[]
}

export default function BestFriendsView({ nodes, streakContacts }: Props) {
  const [friends, setFriends] = useState<BestFriend[]>(loadBestFriends)
  const [search, setSearch] = useState('')
  const [addManualOpen, setAddManualOpen] = useState(false)
  const [manualSearch, setManualSearch] = useState('')

  const friendIds = new Set(friends.map(f => f.id))
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  const autoDetected = streakContacts
    .map(sc => {
      const node = nodeMap.get(sc.chatId)
      if (!node || node.type !== 'private') return null
      return { node, streak: sc.streak }
    })
    .filter((x): x is { node: GraphNode; streak: number } => x !== null)

  const addFriend = useCallback((node: GraphNode, streak: number, type: 'auto' | 'manual') => {
    setFriends(prev => {
      if (prev.some(f => f.id === node.id)) return prev
      const next = [...prev, { id: node.id, name: node.name, type, streak, addedAt: Date.now() }]
      saveBestFriends(next)
      return next
    })
  }, [])

  const removeFriend = useCallback((id: string) => {
    setFriends(prev => {
      const next = prev.filter(f => f.id !== id)
      saveBestFriends(next)
      return next
    })
  }, [])

  const filteredFriends = search
    ? friends.filter(f => f.name.includes(search))
    : friends

  const manualCandidates = nodes
    .filter(n => n.type === 'private' && !friendIds.has(n.id))
    .filter(n => !manualSearch || n.name.includes(manualSearch))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: auto detected */}
      <div className="w-[280px] shrink-0 flex flex-col h-full" style={{ borderRight: '1px solid var(--border)' }}>
        <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ color: '#F59E0B' }}>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>自动检测</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>近30天内连续联系 ≥7天的联系人</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {autoDetected.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--text-muted)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 opacity-30">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span className="text-xs">暂无检测结果</span>
            </div>
          ) : (
            autoDetected.map(({ node, streak }) => (
              <div
                key={node.id}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: getAvatarColor(node.name) }}
                >
                  {node.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{node.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] rounded-full px-1.5 py-0.5" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
                      连续{streak}天
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => friendIds.has(node.id) ? removeFriend(node.id) : addFriend(node, streak, 'auto')}
                  className="no-drag shrink-0 text-[10px] px-2 py-1 rounded-lg cursor-pointer"
                  style={friendIds.has(node.id) ? {
                    background: 'rgba(34,197,94,0.1)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)'
                  } : {
                    background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.2)'
                  }}
                >
                  {friendIds.has(node.id) ? '已加入' : '加入'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: my best friends list */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="px-4 pt-4 pb-3 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ color: 'var(--accent)' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              我的好朋友
              <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                {friends.length}
              </span>
            </span>
          </div>
          <button
            onClick={() => setAddManualOpen(v => !v)}
            className="no-drag flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
            style={{
              background: addManualOpen ? 'var(--accent)' : 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: addManualOpen ? '#fff' : 'var(--text-secondary)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            手动添加
          </button>
        </div>

        {/* Manual add picker */}
        {addManualOpen && (
          <div className="px-4 py-3 shrink-0" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            <div className="relative mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="搜索联系人..."
                value={manualSearch}
                onChange={e => setManualSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="max-h-36 overflow-y-auto space-y-0.5">
              {manualCandidates.slice(0, 20).map(node => (
                <button
                  key={node.id}
                  onClick={() => { addFriend(node, 0, 'manual'); setAddManualOpen(false); setManualSearch('') }}
                  className="no-drag w-full flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-left"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: getAvatarColor(node.name) }}>
                    {node.name.charAt(0)}
                  </div>
                  <span className="text-xs truncate">{node.name}</span>
                  <span className="ml-auto text-[10px] shrink-0" style={{ color: 'var(--accent)' }}>{node.score}分</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-2 shrink-0">
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="搜索好朋友..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Friends grid */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 opacity-30">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span className="text-sm">
                {search ? '没有找到匹配的好朋友' : '还没有好朋友，从左侧选择或手动添加'}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-4">
              {filteredFriends.map(friend => (
                <div
                  key={friend.id}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold"
                    style={{ background: getAvatarColor(friend.name) }}
                  >
                    {friend.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-center truncate w-full" style={{ color: 'var(--text-primary)' }}>
                    {friend.name}
                  </span>
                  <span
                    className="text-[10px] rounded-full px-2 py-0.5"
                    style={friend.type === 'auto' ? {
                      background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)'
                    } : {
                      background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.2)'
                    }}
                  >
                    {friend.type === 'auto' ? `连续${friend.streak}天` : '手动添加'}
                  </span>
                  {/* Remove button */}
                  <button
                    onClick={() => removeFriend(friend.id)}
                    className="no-drag absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--red)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    title="移除"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-2.5 h-2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
