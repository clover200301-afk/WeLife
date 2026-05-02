import { useRef, useEffect } from 'react'
import type { Chat, Message } from '../../types'
import { getAvatarColor } from '../../utils/avatarColor'

function formatMsgTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function Avatar({ sender, isSelf }: { sender: string; isSelf: boolean }) {
  if (isSelf) {
    return (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0 self-start"
        style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
      >
        我
      </div>
    )
  }
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0 self-start"
      style={{ backgroundColor: getAvatarColor(sender) }}
    >
      {sender.charAt(0)}
    </div>
  )
}

// ── Content parsing ──────────────────────────────────────────────────────────

type ParsedContent =
  | { kind: 'text'; text: string }
  | { kind: 'image'; localId: string }
  | { kind: 'link'; title: string }
  | { kind: 'video' }
  | { kind: 'sticker' }
  | { kind: 'voice' }
  | { kind: 'location'; text: string }
  | { kind: 'file'; name: string }
  | { kind: 'unsupported'; text: string }

function parseContent(content: string, type: string): ParsedContent {
  if (type === 'image' || content.startsWith('[图片]')) {
    const m = content.match(/local_id=(\d+)/)
    return { kind: 'image', localId: m?.[1] ?? '' }
  }
  if (type === 'video' || content.startsWith('[视频]')) return { kind: 'video' }
  if (content.startsWith('[表情]')) return { kind: 'sticker' }
  if (content.startsWith('[语音]')) return { kind: 'voice' }
  if (content.startsWith('[位置]')) {
    return { kind: 'location', text: content.replace(/^\[位置\]\s*/, '').trim() }
  }
  if (content.startsWith('[文件]')) {
    return { kind: 'file', name: content.replace(/^\[文件\]\s*/, '').trim() }
  }
  if (content.startsWith('[链接/文件]') || content.startsWith('[链接与文件]')) {
    return { kind: 'unsupported', text: content.replace(/^\[链接[/与]文件\]\s*/, '').trim() }
  }
  if (content.startsWith('[链接]')) {
    return { kind: 'link', title: content.replace(/^\[链接\]\s*/, '').trim() }
  }
  // Fallback for other bracketed unsupported types
  if (/^\[[^\]]+\]\s/.test(content) && !content.startsWith('[图') && !content.startsWith('[链')) {
    const inner = content.replace(/^\[[^\]]+\]\s*/, '').trim()
    if (inner) return { kind: 'unsupported', text: inner }
  }
  return { kind: 'text', text: content }
}

// ── Markdown-like inline renderer ────────────────────────────────────────────

function renderMarkdown(text: string, isSelf: boolean): React.ReactNode {
  const lines = text.split('\n')
  return lines.map((line, i) => (
    <span key={i}>
      {renderInline(line, isSelf)}
      {i < lines.length - 1 && <br />}
    </span>
  ))
}

function renderInline(text: string, isSelf: boolean): React.ReactNode {
  const parts: React.ReactNode[] = []
  const re = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|https?:\/\/\S+)/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const m = match[0]
    if (m.startsWith('**')) {
      parts.push(<strong key={match.index}>{m.slice(2, -2)}</strong>)
    } else if (m.startsWith('*')) {
      parts.push(<em key={match.index}>{m.slice(1, -1)}</em>)
    } else if (m.startsWith('`')) {
      parts.push(
        <code
          key={match.index}
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            background: isSelf ? 'rgba(255,255,255,0.2)' : 'var(--bg-base)',
            padding: '1px 5px',
            borderRadius: '4px',
          }}
        >
          {m.slice(1, -1)}
        </code>
      )
    } else {
      parts.push(
        <a
          key={match.index}
          href={m}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: isSelf ? 'rgba(255,255,255,0.85)' : 'var(--accent)', textDecoration: 'underline' }}
        >
          {m}
        </a>
      )
    }
    last = match.index + m.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// ── Rich content renderers ────────────────────────────────────────────────────

function ImageCard() {
  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center gap-2 py-5 px-8"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', minWidth: '120px' }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8" style={{ color: 'var(--text-muted)' }}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>图片</span>
    </div>
  )
}

function VideoCard() {
  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center gap-2 py-5 px-8"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', minWidth: '120px' }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8" style={{ color: 'var(--text-muted)' }}>
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>视频</span>
    </div>
  )
}

function StickerCard() {
  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center gap-2 py-4 px-6"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7" style={{ color: 'var(--text-muted)' }}>
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
        <line x1="9" y1="9" x2="9.01" y2="9"/>
        <line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>表情</span>
    </div>
  )
}

function VoiceCard() {
  return (
    <div
      className="rounded-xl flex items-center gap-2.5 px-4 py-2.5"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ color: 'var(--accent)' }}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>语音消息</span>
    </div>
  )
}

function LinkCard({ title }: { title: string }) {
  return (
    <div
      className="rounded-xl px-3.5 py-3"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', maxWidth: '260px' }}
    >
      <div className="flex items-start gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span className="text-xs leading-snug" style={{ color: 'var(--text-primary)' }}>{title || '链接'}</span>
      </div>
      <div className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>链接</div>
    </div>
  )
}

function LocationCard({ text }: { text: string }) {
  return (
    <div
      className="rounded-xl flex items-center gap-2.5 px-3.5 py-2.5"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', maxWidth: '220px' }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span className="text-xs leading-snug" style={{ color: 'var(--text-primary)' }}>{text || '位置'}</span>
    </div>
  )
}

function FileCard({ name }: { name: string }) {
  return (
    <div
      className="rounded-xl flex items-center gap-2.5 px-3.5 py-2.5"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', maxWidth: '240px' }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{name || '文件'}</span>
    </div>
  )
}

function UnsupportedCard({ text }: { text: string }) {
  return (
    <div
      className="rounded-xl px-3.5 py-2.5"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', maxWidth: '260px' }}
    >
      <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{text || '不支持的消息类型'}</span>
    </div>
  )
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isSelf = msg.is_self
  const parsed = parseContent(msg.content, msg.type)

  // These content types render as standalone cards without the standard bubble
  const isCard = parsed.kind !== 'text'

  return (
    <div className={`flex items-start gap-2.5 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar sender={msg.sender} isSelf={isSelf} />
      <div className={`flex flex-col max-w-[62%] ${isSelf ? 'items-end' : 'items-start'}`}>
        {!isSelf && (
          <span className="text-[10px] mb-1 px-1 font-medium" style={{ color: 'var(--text-muted)' }}>{msg.sender}</span>
        )}

        {isCard ? (
          (() => {
            switch (parsed.kind) {
              case 'image': return <ImageCard />
              case 'video': return <VideoCard />
              case 'sticker': return <StickerCard />
              case 'voice': return <VoiceCard />
              case 'link': return <LinkCard title={parsed.title} />
              case 'location': return <LocationCard text={parsed.text} />
              case 'file': return <FileCard name={parsed.name} />
              case 'unsupported': return <UnsupportedCard text={parsed.text} />
            }
          })()
        ) : (
          <div
            className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words"
            style={isSelf ? {
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
            {renderMarkdown(parsed.text, isSelf)}
          </div>
        )}
      </div>
    </div>
  )
}

function DateDivider({ timestamp }: { timestamp: number }) {
  const d = new Date(timestamp * 1000)
  const text = d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      <span
        className="text-[10px] rounded-full px-3 py-1 shrink-0 font-medium"
        style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        {text}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

interface Props {
  chat: Chat
  messages: Message[]
  syncing: boolean
  onLoadMore: () => void
  panelVisible: boolean
  onTogglePanel: () => void
}

export default function ChatWindow({ chat, messages, syncing, onLoadMore, panelVisible, onTogglePanel }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const grouped: { date: number; msgs: Message[] }[] = []
  let lastDate = 0
  for (const msg of messages) {
    const d = new Date(msg.timestamp * 1000)
    const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000
    if (dayKey !== lastDate) {
      grouped.push({ date: dayKey, msgs: [] })
      lastDate = dayKey
    }
    grouped[grouped.length - 1].msgs.push(msg)
  }

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="drag-region h-8 shrink-0" />
      <div
        className="flex items-center justify-between px-5 pb-3.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {chat.name}
          </h2>
          {chat.type === 'group' && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>群聊</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {syncing && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--green)' }} />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>同步中</span>
            </div>
          )}
          <button
            onClick={onTogglePanel}
            title={panelVisible ? '隐藏侧边栏' : '显示侧边栏'}
            className="no-drag flex flex-col gap-0.5 items-center justify-center w-7 h-7 rounded-lg cursor-pointer"
            style={{ background: panelVisible ? 'var(--accent-glow)' : 'transparent', color: panelVisible ? 'var(--accent)' : 'var(--text-muted)' }}
            onMouseEnter={(e) => { if (!panelVisible) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
            onMouseLeave={(e) => { if (!panelVisible) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
          >
            <span className="block w-3.5 h-0.5 rounded-full" style={{ background: 'currentColor' }} />
            <span className="block w-3.5 h-0.5 rounded-full" style={{ background: 'currentColor' }} />
            <span className="block w-3.5 h-0.5 rounded-full" style={{ background: 'currentColor' }} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        onScroll={(e) => { if (e.currentTarget.scrollTop === 0) onLoadMore() }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 opacity-30">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-sm">暂无消息记录</span>
            <span className="text-xs opacity-60">后台正在同步，稍后自动更新</span>
          </div>
        ) : (
          <div className="space-y-0">
            {grouped.map((group) => (
              <div key={group.date}>
                <DateDivider timestamp={group.date} />
                <div className="space-y-3">
                  {group.msgs.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Read-only bar */}
      <div
        className="shrink-0 px-5 py-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div
          className="rounded-xl text-center text-xs py-2.5 font-medium"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          只读模式 — WeLife 不支持发送消息
        </div>
      </div>
    </div>
  )
}
