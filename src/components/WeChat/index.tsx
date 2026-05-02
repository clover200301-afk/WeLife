import { useState, useEffect, useCallback, useRef } from 'react'
import ChatList from './ChatList'
import ChatWindow from './ChatWindow'
import ContactPanel from './ContactPanel'
import type { Chat, Message, Event } from '../../types'

interface Props {
  initialChatId?: string
}

export default function WeChatPage({ initialChatId }: Props) {
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [panelVisible, setPanelVisible] = useState(false)
  const [panelWidth, setPanelWidth] = useState(280)
  const selectedChatRef = useRef<Chat | null>(null)
  const viewedChats = useRef<Map<string, number>>(new Map())

  const loadChats = useCallback(async () => {
    const res = await window.api.getChats()
    if (res.success && res.data) setChats(res.data)
  }, [])

  useEffect(() => {
    loadChats()
    const unsubChats = window.api.onChatsUpdated((updated: Chat[]) => {
      const processed = updated.map(c => {
        const viewedTs = viewedChats.current.get(c.id)
        if (viewedTs !== undefined) {
          if (c.last_timestamp > viewedTs) {
            viewedChats.current.delete(c.id)
            return c
          }
          return { ...c, unread: 0 }
        }
        return c
      })
      setChats(processed)
    })
    return () => { unsubChats() }
  }, [loadChats])

  const selectChat = useCallback(async (chat: Chat) => {
    viewedChats.current.set(chat.id, chat.last_timestamp)
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c))
    setSelectedChat(chat)
    selectedChatRef.current = chat
    setMessages([])
    setEvents([])

    // Step 1: Instantly load from local DB (no wechat-cli delay)
    const res = await window.api.getMessages(chat.id, chat.name, 50)
    if (res.success && res.data) setMessages(res.data)

    const eventsRes = await window.api.getEvents(chat.id, 10)
    if (eventsRes.success && eventsRes.data) setEvents(eventsRes.data)

    // Step 2: Background sync — only updates if there are new messages
    setSyncing(true)
    window.api.syncChat(chat.id, chat.name).then((syncRes) => {
      // Only update if this chat is still selected
      if (selectedChatRef.current?.id !== chat.id) return
      if (syncRes.success && syncRes.data?.newCount && syncRes.data.messages) {
        setMessages(syncRes.data.messages)
      }
      setSyncing(false)
    }).catch(() => setSyncing(false))
  }, [])

  const loadMoreMessages = useCallback(async () => {
    if (!selectedChat || !messages.length) return
    const oldest = messages[0].timestamp
    const res = await window.api.getMessages(selectedChat.id, selectedChat.name, 30, oldest)
    if (res.success && res.data) {
      setMessages((prev) => [...(res.data ?? []), ...prev])
    }
  }, [selectedChat, messages])

  // Auto-select chat when navigated from another page
  useEffect(() => {
    if (!initialChatId || chats.length === 0) return
    const target = chats.find(c => c.id === initialChatId)
    if (target) selectChat(target)
  }, [initialChatId, chats, selectChat])

  const filtered = search
    ? chats.filter((c) => c.name.includes(search) || c.last_message.includes(search))
    : chats

  return (
    <div className="flex h-full">
      <ChatList
        chats={filtered}
        selectedId={selectedChat?.id}
        search={search}
        onSearch={setSearch}
        onSelect={selectChat}
        onRefresh={loadChats}
      />

      {selectedChat ? (
        <ChatWindow
          chat={selectedChat}
          messages={messages}
          syncing={syncing}
          onLoadMore={loadMoreMessages}
          panelVisible={panelVisible}
          onTogglePanel={() => setPanelVisible(v => !v)}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-base)' }}>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7" style={{ color: 'var(--text-muted)' }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>选择一个聊天</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>从左侧列表选择开始查看</div>
          </div>
        </div>
      )}

      {selectedChat && (
        <ContactPanel
          chat={selectedChat}
          events={events}
          messages={messages}
          visible={panelVisible}
          width={panelWidth}
          onWidthChange={setPanelWidth}
        />
      )}
    </div>
  )
}
