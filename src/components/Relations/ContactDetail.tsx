import { useEffect, useState } from 'react'
import { GraphNode } from '../../types'
import { getAvatarColor } from '../../utils/avatarColor'

interface Props {
  node: GraphNode
  onNavigateToChat: (node: GraphNode) => void
  onNavigateToLog: (node: GraphNode) => void
}

function formatDate(ts: number): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function MiniLineChart({ data }: { data: number[] }) {
  if (data.every(v => v === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-muted)' }}>
        暂无数据
      </div>
    )
  }

  const w = 200
  const h = 48
  const pad = 4
  const max = Math.max(...data, 1)

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - (v / max) * (h - pad * 2)
    return `${x},${y}`
  })

  const area = [
    `${pad},${h - pad}`,
    ...points,
    `${w - pad},${h - pad}`,
  ].join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 48 }}>
      <defs>
        <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#trend-grad)" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2)
        const y = h - pad - (v / max) * (h - pad * 2)
        return <circle key={i} cx={x} cy={y} r="2" fill="var(--accent)" />
      })}
    </svg>
  )
}

export default function ContactDetail({ node, onNavigateToChat, onNavigateToLog }: Props) {
  const [stats, setStats] = useState<{ weeklyTrend: number[]; avgMsgPerEvent: number } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setStats(null)
    setLoading(true)
    window.api.getContactStats(node.id).then((res: { success: boolean; data?: { weeklyTrend: number[]; avgMsgPerEvent: number } }) => {
      if (res.success && res.data) setStats(res.data)
    }).finally(() => setLoading(false))
  }, [node.id])

  const color = getAvatarColor(node.name)

  const statCards = [
    { label: '消息总数', value: node.messageCount.toLocaleString() },
    { label: '事件总数', value: node.eventCount.toLocaleString() },
    { label: '平均消息/事件', value: stats ? String(stats.avgMsgPerEvent) : '…' },
    { label: '最近活跃', value: formatDate(node.lastActive) },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ borderLeft: '1px solid var(--border)' }}>
      {/* Avatar & name */}
      <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-base font-bold text-white"
            style={{ background: color }}
          >
            {node.name.slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate mb-1" style={{ color: 'var(--text-primary)' }}>
              {node.name}
            </div>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: node.type === 'group' ? 'rgba(139,92,246,0.12)' : 'rgba(59,130,246,0.12)',
                color: node.type === 'group' ? '#8B5CF6' : 'var(--accent)',
              }}
            >
              {node.type === 'group' ? '群聊' : '私聊'}
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="mt-4 flex items-end gap-1">
          <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
            {node.score}
          </span>
          <span className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>互动分</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="p-4 grid grid-cols-2 gap-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        {statCards.map(card => (
          <div
            key={card.label}
            className="rounded-xl p-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="text-xs font-semibold tabular-nums mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {card.value}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly trend */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          最近 8 周互动趋势
        </div>
        <div style={{ height: 48 }}>
          {loading ? (
            <div className="flex items-center gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          ) : (
            <MiniLineChart data={stats?.weeklyTrend ?? []} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex flex-col gap-2">
        <button
          onClick={() => onNavigateToChat(node)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <span>查看聊天记录</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
        <button
          onClick={() => onNavigateToLog(node)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          <span>查看事件日志</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
