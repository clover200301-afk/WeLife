import type { Event, ChatAnalysisJSON } from '../../types'

function formatRange(start: number, end: number): string {
  const s = new Date(start * 1000)
  const e = new Date(end * 1000)
  const date = s.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  const timeS = s.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const timeE = e.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return `${date}  ${timeS} – ${timeE}`
}

function groupByDate(events: Event[]): { dateLabel: string; events: Event[] }[] {
  const map = new Map<string, Event[]>()
  for (const evt of events) {
    const d = new Date(evt.start_time * 1000)
    const key = d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(evt)
  }
  return Array.from(map.entries()).map(([dateLabel, evts]) => ({ dateLabel, events: evts }))
}

interface Props {
  events: Event[]
  selectedId?: string
  analysisMap?: Record<string, ChatAnalysisJSON>
  onSelect: (event: Event) => void
  onRefresh: () => void
}

export default function EventList({ events, selectedId, analysisMap, onSelect, onRefresh }: Props) {
  const grouped = groupByDate(events)

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="drag-region h-8 shrink-0" />
      <div
        className="flex items-center justify-between px-5 pb-3.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>事件日志</h2>
        <button
          onClick={onRefresh}
          className="no-drag flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-5.15"/>
          </svg>
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 opacity-30">
              <path d="M9 12h6M9 16h6M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/>
            </svg>
            <span className="text-sm">暂无事件记录</span>
            <span className="text-xs opacity-60">先在微信页面加载一些聊天记录</span>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.dateLabel} className="mb-8">
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{group.dateLabel}</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              {/* Event cards */}
              <div className="space-y-2 ml-4">
                {group.events.map((evt) => {
                  const isSelected = selectedId === evt.id
                  return (
                    <button
                      key={evt.id}
                      onClick={() => onSelect(evt)}
                      className="no-drag w-full text-left rounded-xl p-4 cursor-pointer"
                      style={{
                        background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                        border: isSelected
                          ? '1px solid rgba(59,130,246,0.4)'
                          : '1px solid var(--border)',
                        boxShadow: isSelected ? '0 0 0 1px rgba(59,130,246,0.1)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-hover)'
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      {/* Top row: [AI Title]  [Group Name] */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {analysisMap?.[evt.id]?.title ?? '—'}
                        </span>
                        <span
                          className="text-[10px] shrink-0 rounded-full px-2 py-0.5 ml-1"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}
                        >
                          {evt.chat_name}
                        </span>
                      </div>

                      {/* Summary */}
                      <div className="text-xs mb-2.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)', minHeight: '2.5em' }}>
                        {analysisMap?.[evt.id]?.summary ?? ''}
                      </div>

                      {/* Bottom row: [edited badge]  →  [timestamp  💬 N条] */}
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          {evt.manual_edited && (
                            <span
                              className="text-[10px] rounded-full px-2 py-0.5"
                              style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.2)' }}
                            >
                              已编辑
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                            {formatRange(evt.start_time, evt.end_time)}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            {evt.message_count} 条
                          </span>
                        </div>
                      </div>

                      {/* Note */}
                      {evt.note && (
                        <div
                          className="mt-2.5 text-xs rounded-lg px-3 py-2 italic"
                          style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.15)' }}
                        >
                          "{evt.note}"
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
