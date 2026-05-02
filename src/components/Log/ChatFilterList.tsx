import type { Chat } from '../../types'
import { getAvatarColor } from '../../utils/avatarColor'

interface Props {
  chats: Chat[]
  selectedId?: string
  onSelect: (id: string) => void
}

export default function ChatFilterList({ chats, selectedId, onSelect }: Props) {
  return (
    <div
      className="w-[260px] flex flex-col shrink-0"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
    >
      <div className="drag-region h-8 shrink-0" />

      {/* Header */}
      <div className="px-4 pb-3 shrink-0">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          联系人筛选
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* All */}
        <button
          onClick={() => onSelect('')}
          className="no-drag w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer"
          style={{
            background: !selectedId ? 'var(--bg-elevated)' : 'transparent',
            borderLeft: !selectedId ? '2px solid var(--accent)' : '2px solid transparent',
            color: !selectedId ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => { if (selectedId) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          onMouseLeave={(e) => { if (selectedId) e.currentTarget.style.background = 'transparent' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ color: 'var(--text-muted)' }}>
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </div>
          <span className="text-sm font-medium">全部</span>
        </button>

        {chats.map((chat) => {
          const color = getAvatarColor(chat.name)
          const isSelected = selectedId === chat.id
          return (
            <button
              key={chat.id}
              onClick={() => onSelect(chat.id)}
              className="no-drag w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer"
              style={{
                background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{ backgroundColor: color }}
              >
                {chat.type === 'group' ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                ) : chat.name.charAt(0)}
              </div>
              <span className="text-sm truncate">{chat.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
