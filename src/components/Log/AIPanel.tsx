import { useState, useRef, useEffect } from 'react'
import type { Event, Message, AIMessage } from '../../types'

interface Props {
  event: Event | null
  messages: Message[]
  aiHistory: AIMessage[]
  aiStreaming: boolean
  hasAI: boolean
  onSummarize: () => void
  onSendMessage: (text: string) => void
  onUpdateNote: (note: string) => void
}

export default function AIPanel({
  event,
  messages: _messages,
  aiHistory,
  aiStreaming,
  hasAI,
  onSummarize,
  onSendMessage,
  onUpdateNote,
}: Props) {
  const [input, setInput] = useState('')
  const [editingNote, setEditingNote] = useState(false)
  const [noteVal, setNoteVal] = useState(event?.note ?? '')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiHistory])

  useEffect(() => {
    setNoteVal(event?.note ?? '')
    setEditingNote(false)
  }, [event?.id])

  const handleSend = () => {
    if (!input.trim()) return
    onSendMessage(input.trim())
    setInput('')
  }

  const handleSaveNote = () => {
    onUpdateNote(noteVal)
    setEditingNote(false)
  }

  return (
    <div
      className="w-[280px] flex flex-col shrink-0"
      style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}
    >
      <div className="drag-region h-8 shrink-0" />

      {!event ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ color: 'var(--text-muted)' }}>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" style={{ color: 'var(--text-muted)' }}>
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>AI 助手</div>
            <div className="text-xs leading-relaxed">选择一个事件<br/>开始 AI 分析</div>
          </div>
        </div>
      ) : (
        <>
          {/* Event info */}
          <div className="px-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              当前事件
            </div>
            <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{event.chat_name}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{event.message_count} 条消息</div>

            {/* Note */}
            <div className="mt-3">
              {editingNote ? (
                <div className="flex gap-1.5">
                  <input
                    className="no-drag flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--accent)',
                      color: 'var(--text-primary)',
                    }}
                    value={noteVal}
                    onChange={(e) => setNoteVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNote() }}
                    autoFocus
                    placeholder="添加备注..."
                  />
                  <button
                    onClick={handleSaveNote}
                    className="no-drag text-xs text-white rounded-lg px-2.5 py-1.5 cursor-pointer"
                    style={{ background: 'var(--accent)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
                  >
                    保存
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingNote(true)}
                  className="no-drag flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 w-full cursor-pointer"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: event.note ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span className="truncate">{event.note || '添加备注...'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Chat history */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {aiHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center" style={{ color: 'var(--text-muted)' }}>
                {!hasAI ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 opacity-30">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <div className="text-xs">请在设置中配置 AI Key</div>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 opacity-30">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div className="text-xs">点击下方按钮，让 AI 总结这段聊天</div>
                  </>
                )}
              </div>
            )}

            {aiHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed break-words"
                  style={msg.role === 'user' ? {
                    background: 'var(--accent)',
                    color: '#fff',
                    borderBottomRightRadius: '4px',
                  } : {
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderBottomLeftRadius: '4px',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {aiStreaming && aiHistory[aiHistory.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-bl-sm px-3 py-2 text-xs flex items-center gap-1.5"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Actions */}
          <div className="shrink-0 px-3 pb-3 pt-2 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
            {hasAI && (
              <button
                onClick={onSummarize}
                disabled={aiStreaming}
                className="no-drag w-full text-xs font-medium rounded-xl py-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)', color: '#fff' }}
                onMouseEnter={(e) => { if (!aiStreaming) e.currentTarget.style.background = 'var(--accent-hover)' }}
                onMouseLeave={(e) => { if (!aiStreaming) e.currentTarget.style.background = 'var(--accent)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                AI 总结这段聊天
              </button>
            )}

            <div className="flex gap-1.5">
              <input
                className="no-drag flex-1 text-xs rounded-xl px-3 py-2 outline-none"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                placeholder={hasAI ? '问 AI 关于这段对话...' : '请先配置 AI'}
                value={input}
                disabled={!hasAI || aiStreaming}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
              <button
                onClick={handleSend}
                disabled={!hasAI || !input.trim() || aiStreaming}
                className="no-drag text-xs rounded-xl px-3 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)', color: '#fff' }}
                onMouseEnter={(e) => { if (hasAI && input.trim()) e.currentTarget.style.background = 'var(--accent-hover)' }}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)' }
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
