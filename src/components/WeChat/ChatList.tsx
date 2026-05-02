import type { Chat } from '../../types'
import { getAvatarColor, AVATAR_COLORS } from '../../utils/avatarColor'

function formatTime(timestamp: number): string {
  if (!timestamp) return ''
  const now = new Date()
  const d = new Date(timestamp * 1000)
  const diff = now.getTime() - d.getTime()
  const oneDay = 86400_000

  if (diff < oneDay && now.getDate() === d.getDate()) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 7 * oneDay) {
    return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  }
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function Avatar({ name, isGroup }: { name: string; isGroup: boolean }) {
  const color = getAvatarColor(name)
  if (isGroup) {
    const memberColors = [0, 1, 2, 3].map(i => AVATAR_COLORS[(Math.abs(name.charCodeAt(0) + i * 7)) % AVATAR_COLORS.length])
    return (
      <div className="w-10 h-10 rounded-xl grid grid-cols-2 gap-0.5 p-1 shrink-0 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        {memberColors.map((c, i) => (
          <div key={i} className="rounded-sm flex items-center justify-center" style={{ backgroundColor: c }}>
            <span className="text-white font-bold" style={{ fontSize: '5px' }}>{name.charAt(i) || '·'}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-semibold shrink-0"
      style={{ backgroundColor: color }}
    >
      {name.charAt(0)}
    </div>
  )
}

interface Props {
  chats: Chat[]
  selectedId?: string
  search: string
  onSearch: (v: string) => void
  onSelect: (chat: Chat) => void
  onRefresh: () => void
}

export default function ChatList({ chats, selectedId, search, onSearch, onSelect, onRefresh }: Props) {
  return (
    <div className="w-[260px] flex flex-col shrink-0" style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
      <div className="drag-region h-8 shrink-0" />

      {/* Search bar */}
      <div className="px-3 pb-3 shrink-0">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="no-drag flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="搜索"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          <button
            onClick={onRefresh}
            className="no-drag shrink-0 cursor-pointer"
            title="刷新"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-5.15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pb-2 shrink-0">
        <span className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
          最近聊天
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="text-center text-sm py-12 px-4" style={{ color: 'var(--text-muted)' }}>
            <div className="mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 mx-auto opacity-40">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            {search ? '没有找到匹配的聊天' : '暂无聊天记录'}
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelect(chat)}
              className="no-drag w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer"
              style={{
                background: selectedId === chat.id ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: selectedId === chat.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (selectedId !== chat.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              }}
              onMouseLeave={(e) => {
                if (selectedId !== chat.id) e.currentTarget.style.background = 'transparent'
              }}
            >
              <div className="relative shrink-0">
                <Avatar name={chat.name} isGroup={chat.type === 'group'} />
                {chat.unread > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                    style={{ background: 'var(--red)' }}
                  >
                    {chat.unread > 99 ? '99+' : chat.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{chat.name}</span>
                  <span className="text-[10px] shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(chat.last_timestamp)}
                  </span>
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {chat.last_sender && chat.type === 'group' ? `${chat.last_sender}: ` : ''}{chat.last_message || '暂无消息'}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
