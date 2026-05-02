import { useState, useEffect, useCallback } from 'react'
import EventList from './EventList'
import AIPanel from './AIPanel'
import ChatFilterList from './ChatFilterList'
import type { Event, Chat, Message, AIMessage, ChatAnalysis, ChatAnalysisJSON } from '../../types'

interface Props {
  initialChatId?: string
}

export default function LogPage({ initialChatId }: Props) {
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [eventMessages, setEventMessages] = useState<Message[]>([])
  const [aiHistory, setAiHistory] = useState<AIMessage[]>([])
  const [aiStreaming, setAiStreaming] = useState(false)
  const [hasAI, setHasAI] = useState(false)
  const [analysisMap, setAnalysisMap] = useState<Record<string, ChatAnalysisJSON>>({})

  useEffect(() => {
    window.api.getChats().then((r) => {
      if (r.success && r.data) setChats(r.data)
    })
    window.api.checkAIConfig().then((r) => {
      if (r.success) setHasAI(r.data as boolean)
    })
    if (typeof window.api.getAllAnalyses === 'function') {
      window.api.getAllAnalyses().then((r) => {
        if (r.success && r.data) {
          const map: Record<string, ChatAnalysisJSON> = {}
          for (const a of r.data as ChatAnalysis[]) {
            if (a.event_id) {
              try {
                const j = JSON.parse(a.analysis_json.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()) as ChatAnalysisJSON
                map[a.event_id] = j
              } catch { /* skip invalid */ }
            }
          }
          setAnalysisMap(map)
        }
      }).catch(() => {})
    }
  }, [])

  const loadEvents = useCallback(async (chatId?: string) => {
    const res = await window.api.getEvents(chatId, 50)
    if (res.success && res.data) setEvents(res.data)
    setSelectedEvent(null)
    setEventMessages([])
    setAiHistory([])
  }, [])

  useEffect(() => {
    loadEvents(selectedChatId)
  }, [selectedChatId, loadEvents])

  // Auto-filter by chat when navigated from another page
  useEffect(() => {
    if (initialChatId) setSelectedChatId(initialChatId)
  }, [initialChatId])

  const selectEvent = useCallback(async (event: Event) => {
    setSelectedEvent(event)
    setAiHistory([])
    const res = await window.api.getEventMessages(event.id)
    if (res.success && res.data) setEventMessages(res.data)
  }, [])

  const summarizeEvent = useCallback(async () => {
    if (!selectedEvent) return
    setAiStreaming(true)
    const userMsg: AIMessage = {
      role: 'user',
      content: `请总结这段聊天记录的重点内容`
    }
    setAiHistory((prev) => [...prev, userMsg])

    try {
      let accumulated = ''
      const unsub = window.api.onAIChunk((chunk) => {
        accumulated += chunk
        setAiHistory((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { role: 'assistant', content: accumulated }]
          }
          return [...prev, { role: 'assistant', content: accumulated }]
        })
      })

      await window.api.summarizeEvent(selectedEvent.id)
      unsub()
    } finally {
      setAiStreaming(false)
    }
  }, [selectedEvent])

  const sendAIMessage = useCallback(async (text: string) => {
    if (!text.trim() || aiStreaming) return

    const userMsg: AIMessage = { role: 'user', content: text }
    const contextMsgs: AIMessage[] = [
      {
        role: 'system',
        content: `你是一个聊天记录分析助手。以下是当前聊天记录：\n${eventMessages.map(m => `${m.is_self ? 'me' : m.sender}: ${m.content}`).join('\n')}`
      },
      ...aiHistory,
      userMsg
    ]

    setAiHistory((prev) => [...prev, userMsg])
    setAiStreaming(true)

    try {
      let accumulated = ''
      const unsub = window.api.onAIChunk((chunk) => {
        accumulated += chunk
        setAiHistory((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { role: 'assistant', content: accumulated }]
          }
          return [...prev, { role: 'assistant', content: accumulated }]
        })
      })
      await window.api.aiChat(contextMsgs)
      unsub()
    } finally {
      setAiStreaming(false)
    }
  }, [aiStreaming, aiHistory, eventMessages])

  return (
    <div className="flex h-full">
      {/* Chat filter */}
      <ChatFilterList
        chats={chats}
        selectedId={selectedChatId}
        onSelect={(id) => setSelectedChatId(id === selectedChatId ? undefined : id)}
      />

      {/* Events */}
      <EventList
        events={events}
        selectedId={selectedEvent?.id}
        analysisMap={analysisMap}
        onSelect={selectEvent}
        onRefresh={() => loadEvents(selectedChatId)}
      />

      {/* AI Panel */}
      <AIPanel
        event={selectedEvent}
        messages={eventMessages}
        aiHistory={aiHistory}
        aiStreaming={aiStreaming}
        hasAI={hasAI}
        onSummarize={summarizeEvent}
        onSendMessage={sendAIMessage}
        onUpdateNote={async (note) => {
          if (!selectedEvent) return
          await window.api.updateEvent(selectedEvent.id, { note })
          setSelectedEvent((e) => e ? { ...e, note } : e)
        }}
      />
    </div>
  )
}
