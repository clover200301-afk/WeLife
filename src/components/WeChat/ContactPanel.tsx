import { useState, useRef, useEffect, useCallback } from 'react'
import type { Chat, Message } from '../../types'
import { getAvatarColor } from '../../utils/avatarColor'

const MEMBER_GRID_INITIAL = 8

function formatTime(ts: number): string {
  const d = new Date(ts * 1000)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function MemberAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const color = getAvatarColor(name)
  const display = name === 'me' ? '我' : name.slice(0, 1)
  return (
    <div
      className="rounded-lg flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: Math.max(10, size * 0.38) }}
    >
      {display}
    </div>
  )
}

interface Props {
  chat: Chat
  events: { id: string }[]
  messages: Message[]
  visible: boolean
  width: number
  onWidthChange: (w: number) => void
}

export default function ContactPanel({ chat, messages, visible, width, onWidthChange }: Props) {
  const [memberSearch, setMemberSearch] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [searching, setSearching] = useState(false)

  // DB-sourced member list and total count
  const [dbSenders, setDbSenders] = useState<{ sender: string; count: number }[]>([])
  const [totalMsgCount, setTotalMsgCount] = useState<number | null>(null)

  // Full history sync
  const [fetchingHistory, setFetchingHistory] = useState(false)
  const [historyMsg, setHistoryMsg] = useState<string | null>(null)

  // Event log generation
  const [generatingLog, setGeneratingLog] = useState(false)
  const [logResult, setLogResult] = useState<string | null>(null)
  const [logError, setLogError] = useState<string | null>(null)

  const widthDragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset on chat change
  useEffect(() => {
    setMemberSearch('')
    setExpanded(false)
    setSearchKeyword('')
    setSearchResults([])
    setDbSenders([])
    setTotalMsgCount(null)
    setHistoryMsg(null)
    setLogResult(null)
    setLogError(null)
  }, [chat.id])

  // Load DB member list and total count when chat changes
  useEffect(() => {
    if (typeof window.api.getChatSenders === 'function') {
      window.api.getChatSenders(chat.id).then(r => {
        if (r.success && r.data) setDbSenders(r.data)
      }).catch(() => {})
    }
    if (typeof window.api.getMessageCount === 'function') {
      window.api.getMessageCount(chat.id).then(r => {
        if (r.success && r.data !== undefined) setTotalMsgCount(r.data)
      }).catch(() => {})
    }
  }, [chat.id])

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!searchKeyword.trim()) {
      setSearchResults([])
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await window.api.searchMessages(chat.id, searchKeyword.trim())
        if (res.success && res.data) setSearchResults(res.data)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchKeyword, chat.id])

  // Left edge drag for panel width
  const onEdgeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    widthDragRef.current = { startX: e.clientX, startWidth: width }
    const onMove = (ev: MouseEvent) => {
      if (!widthDragRef.current) return
      const delta = widthDragRef.current.startX - ev.clientX
      onWidthChange(Math.max(220, Math.min(500, widthDragRef.current.startWidth + delta)))
    }
    const onUp = () => {
      widthDragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, onWidthChange])

  const handleFetchFullHistory = async () => {
    if (typeof window.api.fetchFullHistory !== 'function') return
    setFetchingHistory(true)
    setHistoryMsg(null)
    try {
      const res = await window.api.fetchFullHistory(chat.id, chat.name)
      if (res.success && res.data) {
        setHistoryMsg(`已同步 ${res.data.newCount} 条新消息`)
        // Refresh member list and count
        const [s, c] = await Promise.all([
          window.api.getChatSenders(chat.id),
          window.api.getMessageCount(chat.id)
        ])
        if (s.success && s.data) setDbSenders(s.data)
        if (c.success && c.data !== undefined) setTotalMsgCount(c.data)
      } else {
        setHistoryMsg(res.error ?? '同步失败')
      }
    } finally {
      setFetchingHistory(false)
    }
  }

  const handleGenerateEventLog = async () => {
    if (typeof window.api.generateChatEventLog !== 'function') {
      setLogError('请重启应用以使用此功能')
      return
    }
    setGeneratingLog(true)
    setLogResult(null)
    setLogError(null)
    try {
      const res = await window.api.generateChatEventLog(chat.id, chat.name)
      if (res.success && res.data) {
        setLogResult(res.data.analysis_json)
      } else {
        setLogError(res.error ?? '生成失败')
      }
    } finally {
      setGeneratingLog(false)
    }
  }

  if (!visible) return null

  const allMembers = dbSenders
  const filteredMembers = memberSearch
    ? allMembers.filter(m => (m.sender === 'me' ? '我' : m.sender).includes(memberSearch))
    : allMembers
  const visibleMembers = expanded ? filteredMembers : filteredMembers.slice(0, MEMBER_GRID_INITIAL)
  const hasMore = filteredMembers.length > MEMBER_GRID_INITIAL

  const isGroup = chat.type === 'group'
  const displayTotal = totalMsgCount ?? messages.length

  // Parse event log for display
  let parsedLog: { events?: Array<{ time: string; title: string; people: string[]; content: string; mentions: string[]; media: Array<{ type: string; description: string }>; related_to_me: boolean }> } | null = null
  if (logResult) {
    try {
      parsedLog = JSON.parse(logResult.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim())
    } catch { /* keep null */ }
  }

  return (
    <div className="flex shrink-0 relative" style={{ width: `${width}px` }}>
      {/* Left edge drag handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 z-10 cursor-ew-resize"
        style={{ background: 'transparent' }}
        onMouseDown={onEdgeMouseDown}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.4)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      />

      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}
      >
        {/* Drag region */}
        <div className="drag-region h-8 shrink-0" />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* =========================
              GROUP CHAT PANEL
          ========================= */}
          {isGroup ? (
            <div>
              {/* Section: Group Members */}
              <div className="px-4 pt-2 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    群成员 {allMembers.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({allMembers.length})</span>}
                  </span>
                </div>

                {/* Member search */}
                {allMembers.length > 4 && (
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }}>
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      className="no-drag flex-1 text-xs outline-none bg-transparent"
                      style={{ color: 'var(--text-primary)' }}
                      placeholder="搜索成员..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                    {memberSearch && (
                      <button className="no-drag" onClick={() => setMemberSearch('')} style={{ color: 'var(--text-muted)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {allMembers.length === 0 ? (
                  <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>暂无消息记录</div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-3">
                      {visibleMembers.map(m => (
                        <div key={m.sender} className="flex flex-col items-center gap-1.5" title={`${m.sender === 'me' ? '我' : m.sender}（${m.count}条）`}>
                          <MemberAvatar name={m.sender} size={40} />
                          <span
                            className="text-[10px] leading-tight text-center w-full truncate"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {m.sender === 'me' ? '我' : m.sender.length > 5 ? m.sender.slice(0, 4) + '…' : m.sender}
                          </span>
                        </div>
                      ))}
                    </div>

                    {hasMore && !memberSearch && (
                      <button
                        className="no-drag mt-3 w-full text-xs py-1.5 rounded-xl cursor-pointer"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        onClick={() => setExpanded(v => !v)}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        {expanded ? '收起' : `查看更多 (${filteredMembers.length - MEMBER_GRID_INITIAL} 人)`}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Section: Chat Name */}
              <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>群聊名称</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{chat.name}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>

              {/* Section: Group Notice */}
              <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>群公告</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>暂无公告</div>
              </div>

              {/* Section: Stats */}
              <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>聊天统计</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-2.5 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{displayTotal}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>条消息</div>
                  </div>
                  <div className="rounded-xl p-2.5 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{allMembers.length}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>位成员</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =========================
               PRIVATE CHAT PANEL
            ========================= */
            <div>
              {/* Contact info */}
              <div className="px-4 pt-2 pb-4 flex flex-col items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <MemberAvatar name={chat.name} size={56} />
                <div className="text-sm font-semibold text-center" style={{ color: 'var(--text-primary)' }}>{chat.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>联系人</div>
              </div>

              {/* Stats */}
              <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>聊天统计</div>
                <div className="rounded-xl p-2.5 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{displayTotal}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>条消息</div>
                </div>
              </div>
            </div>
          )}

          {/* =========================
              FULL HISTORY SYNC
          ========================= */}
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>历史记录</div>
            <button
              onClick={handleFetchFullHistory}
              disabled={fetchingHistory}
              className="no-drag w-full text-xs py-2 rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { if (!fetchingHistory) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {fetchingHistory ? (
                <>
                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  加载历史中...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-5.15"/>
                  </svg>
                  加载全部历史记录
                </>
              )}
            </button>
            {historyMsg && (
              <div className="mt-2 text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>{historyMsg}</div>
            )}
          </div>

          {/* =========================
              AI EVENT LOG
          ========================= */}
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>AI 事件日志</div>
            <button
              onClick={handleGenerateEventLog}
              disabled={generatingLog}
              className="no-drag w-full text-xs py-2 rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{
                background: generatingLog ? 'var(--bg-elevated)' : 'var(--accent-glow)',
                border: `1px solid ${generatingLog ? 'var(--border)' : 'rgba(59,130,246,0.3)'}`,
                color: generatingLog ? 'var(--text-muted)' : 'var(--accent)'
              }}
              onMouseEnter={(e) => { if (!generatingLog) e.currentTarget.style.background = 'rgba(59,130,246,0.15)' }}
              onMouseLeave={(e) => { if (!generatingLog) e.currentTarget.style.background = 'var(--accent-glow)' }}
            >
              {generatingLog ? (
                <>
                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  AI 分析中...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                  </svg>
                  生成 AI 事件日志
                </>
              )}
            </button>
            {logError && (
              <div className="mt-2 text-[10px]" style={{ color: 'var(--red)' }}>{logError}</div>
            )}
            {parsedLog?.events && parsedLog.events.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  共 {parsedLog.events.length} 个事件
                </div>
                {parsedLog.events.slice(0, 5).map((evt, i) => (
                  <EventLogItem key={i} event={evt} />
                ))}
                {parsedLog.events.length > 5 && (
                  <div className="text-[10px] text-center py-1" style={{ color: 'var(--text-muted)' }}>
                    还有 {parsedLog.events.length - 5} 个事件，前往日志页查看全部
                  </div>
                )}
              </div>
            )}
          </div>

          {/* =========================
              MESSAGE SEARCH (both types)
          ========================= */}
          <div className="px-4 py-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>搜索聊天记录</div>

            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="no-drag flex-1 text-xs outline-none bg-transparent"
                style={{ color: 'var(--text-primary)' }}
                placeholder="搜索关键词..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              {searching && (
                <div className="flex gap-0.5">
                  {[0, 75, 150].map(d => (
                    <span key={d} className="w-1 h-1 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${d}ms` }} />
                  ))}
                </div>
              )}
              {searchKeyword && !searching && (
                <button className="no-drag" onClick={() => { setSearchKeyword(''); setSearchResults([]) }} style={{ color: 'var(--text-muted)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Search results */}
            {searchKeyword.trim() && !searching && (
              <div className="space-y-1.5">
                {searchResults.length === 0 ? (
                  <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>未找到相关消息</div>
                ) : (
                  <>
                    <div className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>找到 {searchResults.length} 条结果</div>
                    {searchResults.map((msg) => (
                      <SearchResultItem key={msg.id} msg={msg} keyword={searchKeyword} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface EventLogItemProps {
  event: {
    time: string
    title: string
    people: string[]
    content: string
    mentions: string[]
    media: Array<{ type: string; description: string }>
    related_to_me: boolean
  }
}

function EventLogItem({ event }: EventLogItemProps) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className="rounded-xl p-2.5 cursor-pointer"
      style={{
        background: event.related_to_me ? 'rgba(59,130,246,0.06)' : 'var(--bg-elevated)',
        border: `1px solid ${event.related_to_me ? 'rgba(59,130,246,0.2)' : 'var(--border)'}`,
      }}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {event.related_to_me && (
              <span className="text-[9px] rounded px-1 py-0.5 shrink-0" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>@我</span>
            )}
            <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{event.title}</span>
          </div>
          <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>{event.time}</div>
          {expanded && (
            <>
              <div className="text-[11px] leading-relaxed mb-1.5" style={{ color: 'var(--text-secondary)' }}>{event.content}</div>
              {event.people.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {event.people.map(p => (
                    <span key={p} className="text-[9px] rounded px-1.5 py-0.5" style={{ background: 'var(--bg-panel)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{p}</span>
                  ))}
                </div>
              )}
              {event.mentions.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {event.mentions.map(m => (
                    <span key={m} className="text-[9px] rounded px-1.5 py-0.5" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.2)' }}>@{m}</span>
                  ))}
                </div>
              )}
              {event.media.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {event.media.map((med, j) => (
                    <span key={j} className="text-[9px] rounded px-1.5 py-0.5 flex items-center gap-0.5" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--green)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      {med.type === 'image' ? '🖼' : med.type === 'video' ? '🎬' : med.type === 'link' ? '🔗' : '🎭'}
                      {med.description}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="w-3 h-3 shrink-0 mt-0.5 transition-transform"
          style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(90deg)' : 'none' }}
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>
  )
}

function SearchResultItem({ msg, keyword }: { msg: Message; keyword: string }) {
  const parts = msg.content.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <div
      className="rounded-xl p-2.5"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <MemberAvatar name={msg.sender} size={18} />
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          {msg.sender === 'me' ? '我' : msg.sender}
        </span>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
          {formatTime(msg.timestamp)}
        </span>
      </div>
      <p className="text-xs leading-relaxed break-words" style={{ color: 'var(--text-secondary)' }}>
        {parts.map((part, i) =>
          part.toLowerCase() === keyword.toLowerCase()
            ? <mark key={i} className="rounded px-0.5" style={{ background: 'rgba(245,158,11,0.25)', color: 'var(--amber)' }}>{part}</mark>
            : <span key={i}>{part}</span>
        )}
      </p>
    </div>
  )
}
