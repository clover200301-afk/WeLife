import { useState, useEffect } from 'react'
import type { GraphNode, ChatAnalysisJSON } from '../../types'
import type { Circle } from '../../utils/circles'
import { loadCircles, saveCircles } from '../../utils/circles'
import ContactList from './ContactList'
import CircleCanvas from './CircleCanvas'
import BestFriendsView from './BestFriendsView'
import ContactDetail from './ContactDetail'

type Tab = 'circles' | 'bestfriends'

interface Props {
  onNavigateToChat?: (chatId: string, chatName: string) => void
  onNavigateToLog?: (chatId: string) => void
}

export default function RelationsPage({ onNavigateToChat, onNavigateToLog }: Props) {
  const [tab, setTab] = useState<Tab>('circles')
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [circles, setCircles] = useState<Circle[]>(loadCircles)
  const [sentimentMap, setSentimentMap] = useState<Record<string, string>>({})
  const [streakContacts, setStreakContacts] = useState<{ chatId: string; streak: number }[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      window.api.getGraphData(),
      window.api.getAllAnalyses(),
      window.api.getStreakContacts(7),
    ]).then(([graphRes, analysisRes, streakRes]) => {
      if (graphRes.success && graphRes.data) {
        setNodes(graphRes.data.nodes)
      } else {
        setError((graphRes as { error?: string }).error ?? '加载失败')
      }
      if (analysisRes.success && analysisRes.data) {
        const map: Record<string, string> = {}
        for (const a of analysisRes.data) {
          try {
            const json = JSON.parse(a.analysis_json) as ChatAnalysisJSON
            if (json.sentiment) map[a.chat_id] = json.sentiment
          } catch { /* ignore */ }
        }
        setSentimentMap(map)
      }
      if (streakRes.success && streakRes.data) {
        setStreakContacts(streakRes.data)
      }
    }).catch((e: unknown) => setError(String(e))).finally(() => setLoading(false))
  }, [])

  function handleCirclesChange(next: Circle[]) {
    setCircles(next)
    saveCircles(next)
  }

  function handleNavigateToChat(node: GraphNode) {
    onNavigateToChat?.(node.id, node.name)
  }

  function handleNavigateToLog(node: GraphNode) {
    onNavigateToLog?.(node.id)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full" style={{ background: 'var(--bg-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>加载关系数据…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>加载失败</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full gap-4" style={{ background: 'var(--bg-base)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8" style={{ color: 'var(--accent)' }}>
            <circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" />
            <line x1="8" y1="11" x2="16" y2="6" /><line x1="8" y1="13" x2="16" y2="18" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>暂无关系数据</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>先同步微信数据后再查看关系图谱</p>
        </div>
      </div>
    )
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'circles', label: '圈子' },
    { key: 'bestfriends', label: '好朋友' },
  ]

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Left: contact list with circles */}
      <div className="shrink-0 overflow-hidden" style={{ width: 260 }}>
        <ContactList
          nodes={nodes}
          circles={circles}
          selectedId={selectedNode?.id ?? null}
          onSelect={setSelectedNode}
          onCirclesChange={handleCirclesChange}
        />
      </div>

      {/* Center: tabs + content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: tab === t.key ? 'var(--accent-glow)' : 'transparent',
                color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                border: tab === t.key ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {tab === 'circles' && (
            <CircleCanvas
              circles={circles}
              nodes={nodes}
              sentimentMap={sentimentMap}
              selectedId={selectedNode?.id ?? null}
              onSelectNode={setSelectedNode}
            />
          )}
          {tab === 'bestfriends' && (
            <BestFriendsView
              nodes={nodes}
              streakContacts={streakContacts}
            />
          )}
        </div>
      </div>

      {/* Right: contact detail panel */}
      <div
        className="shrink-0 overflow-hidden"
        style={{
          width: selectedNode ? 260 : 0,
          transition: 'width 200ms ease',
          borderLeft: selectedNode ? '1px solid var(--border)' : 'none',
        }}
      >
        {selectedNode && (
          <ContactDetail
            node={selectedNode}
            onNavigateToChat={handleNavigateToChat}
            onNavigateToLog={handleNavigateToLog}
          />
        )}
      </div>
    </div>
  )
}
