import { useState, useRef, useEffect, useMemo } from 'react'
import type { AIMessage, ChatAnalysis, ChatAnalysisJSON, Chat } from '../../types'
import { MODEL_PRESETS } from '../../utils/modelPresets'
import { getAvatarColor, AVATAR_COLORS } from '../../utils/avatarColor'

interface DisplayMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface AnalyzedChat {
  chatId: string
  chatName: string
  count: number
  latestAt: number
}

function buildRAGContext(analyses: ChatAnalysis[], chatId?: string): string {
  const filtered = chatId ? analyses.filter(a => a.chat_id === chatId) : analyses
  if (filtered.length === 0) return ''
  const entries = filtered
    .slice(0, 50)
    .map(a => {
      try {
        const j = JSON.parse(a.analysis_json.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()) as ChatAnalysisJSON
        return `【${a.chat_name}】${j.time_range}\n摘要：${j.summary}\n话题：${j.topics.join('、')}\n要点：${j.key_points.slice(0, 3).join('；')}`
      } catch {
        return `【${a.chat_name}】${a.analysis_json.slice(0, 100)}`
      }
    })
    .join('\n\n---\n\n')
  return `你是一个智能助手，拥有以下用户的微信聊天记录分析日志（共 ${filtered.length} 条）作为知识库：\n\n${entries}\n\n请根据以上知识库回答用户的问题，可以引用具体的聊天记录分析内容。`
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <p key={i} className="text-xs font-bold mt-2 mb-1" style={{ color: 'var(--text-primary)' }}>{line.slice(4)}</p>
        if (line.startsWith('## ')) return <p key={i} className="text-sm font-bold mt-2 mb-1" style={{ color: 'var(--text-primary)' }}>{line.slice(3)}</p>
        if (line.startsWith('- ') || line.startsWith('• ')) return (
          <p key={i} className="flex items-start gap-1.5 text-sm leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
            <span>{line.slice(2)}</span>
          </p>
        )
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{line}</p>
      })}
    </div>
  )
}

function ChatAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const color = getAvatarColor(name)
  // Group avatar: 2×2 grid pattern
  const isGroup = name.includes('群') || name.includes('交流') || name.includes('社区')
  if (isGroup) {
    const colors = [0, 1, 2, 3].map(i => AVATAR_COLORS[(Math.abs(name.charCodeAt(0) + i * 7)) % AVATAR_COLORS.length])
    return (
      <div
        className="rounded-xl grid grid-cols-2 gap-0.5 p-1 shrink-0 overflow-hidden"
        style={{ width: size, height: size, background: 'var(--bg-elevated)' }}
      >
        {colors.map((c, i) => (
          <div key={i} className="rounded-sm flex items-center justify-center" style={{ backgroundColor: c }}>
            <span className="text-white font-bold" style={{ fontSize: Math.max(4, size * 0.12) }}>{name.charAt(i) || '·'}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: Math.max(10, size * 0.38) }}
    >
      {name.charAt(0)}
    </div>
  )
}

// ── Left panel: list of all chats (with analysis badge) ─────────────────────

function AnalyzedChatList({
  allChats,
  analyzedChats,
  selectedId,
  analyses,
  search,
  onSearch,
  onSelect,
  onRefresh,
}: {
  allChats: Chat[]
  analyzedChats: AnalyzedChat[]
  selectedId: string | null
  analyses: ChatAnalysis[]
  search: string
  onSearch: (v: string) => void
  onSelect: (chatId: string | null) => void
  onRefresh: () => void
}) {
  const analyzedMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of analyzedChats) m[c.chatId] = c.count
    return m
  }, [analyzedChats])

  const filtered = search
    ? allChats.filter(c => c.name.includes(search))
    : allChats

  return (
    <div
      className="w-[260px] flex flex-col shrink-0 h-full"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
    >
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
          最近消息
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {/* All chats entry */}
        <button
          onClick={() => onSelect(null)}
          className="no-drag w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer"
          style={{
            background: selectedId === null ? 'var(--bg-elevated)' : 'transparent',
            borderLeft: selectedId === null ? '2px solid var(--accent)' : '2px solid transparent',
          }}
          onMouseEnter={(e) => { if (selectedId !== null) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          onMouseLeave={(e) => { if (selectedId !== null) e.currentTarget.style.background = 'transparent' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: 'var(--accent)' }}>
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>AI 助手</span>
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {analyses.length} 条聊天分析日志
            </div>
          </div>
        </button>

        {filtered.length === 0 && search ? (
          <div className="text-center text-sm py-8 px-4" style={{ color: 'var(--text-muted)' }}>
            没有找到匹配的聊天
          </div>
        ) : (
          filtered.map((chat) => {
            const analysisCount = analyzedMap[chat.id] ?? 0
            return (
              <button
                key={chat.id}
                onClick={() => onSelect(chat.id)}
                className="no-drag w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer"
                style={{
                  background: selectedId === chat.id ? 'var(--bg-elevated)' : 'transparent',
                  borderLeft: selectedId === chat.id ? '2px solid var(--accent)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (selectedId !== chat.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={(e) => { if (selectedId !== chat.id) e.currentTarget.style.background = 'transparent' }}
              >
                <div className="relative shrink-0">
                  <ChatAvatar name={chat.name} size={40} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{chat.name}</span>
                    {analysisCount > 0 && (
                      <span className="text-[10px] shrink-0 ml-2 rounded-full px-1.5 py-0.5" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                        {analysisCount}
                      </span>
                    )}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {chat.last_message || (analysisCount > 0 ? `${analysisCount} 条分析记录` : '暂无消息')}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Main AI page ─────────────────────────────────────────────────────────────

export default function AIPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [analyses, setAnalyses] = useState<ChatAnalysis[]>([])
  const [loadingAnalyses, setLoadingAnalyses] = useState(true)
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedModel, setSelectedModel] = useState(MODEL_PRESETS[3])
  const [customBaseUrl, setCustomBaseUrl] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [hasAI, setHasAI] = useState(false)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [sidebarSearch, setSidebarSearch] = useState('')

  // Per-model API key management
  const [modelApiKey, setModelApiKey] = useState('')
  const [modelBaseUrl, setModelBaseUrl] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [modelKeyStatus, setModelKeyStatus] = useState<Record<string, boolean>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const api = window.api
    if (!api) return
    api.checkAIConfig().then(r => setHasAI(r.data ?? false)).catch(() => {})
    api.getChats().then(r => { if (r.success && r.data) setChats(r.data as Chat[]) }).catch(() => {})
    setLoadingAnalyses(true)
    if (typeof api.getAllAnalyses === 'function') {
      api.getAllAnalyses().then(r => {
        if (r.success && r.data) setAnalyses(r.data)
        setLoadingAnalyses(false)
      }).catch(() => setLoadingAnalyses(false))
    } else {
      setLoadingAnalyses(false)
    }
    // Pre-load key status for all presets
    if (typeof api.getModelConfig === 'function') {
      MODEL_PRESETS.filter(p => p.value !== 'custom').forEach(p => {
        api.getModelConfig(p.value).then(r => {
          if (r.success && r.data) {
            setModelKeyStatus(prev => ({ ...prev, [p.value]: r.data!.api_key.length > 0 }))
          }
        }).catch(() => {})
      })
    }
  }, [])

  // Load per-model key when model changes
  useEffect(() => {
    if (selectedModel.value === 'custom') {
      setModelApiKey('')
      setModelBaseUrl(customBaseUrl)
      setShowKeyInput(false)
      return
    }
    if (typeof window.api.getModelConfig !== 'function') return
    window.api.getModelConfig(selectedModel.value).then(r => {
      if (r.success && r.data) {
        setModelApiKey(r.data.api_key)
        setModelBaseUrl(r.data.base_url || selectedModel.baseUrl)
        setShowKeyInput(r.data.api_key.length === 0)
      }
    }).catch(() => {})
  }, [selectedModel, customBaseUrl])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const unsub = window.api.onAIChunk((chunk: string) => {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
        }
        return [...prev, { role: 'assistant', content: chunk }]
      })
    })
    return () => { unsub() }
  }, [])

  // Derive unique analyzed chats from analyses data
  const analyzedChats = useMemo((): AnalyzedChat[] => {
    const map = new Map<string, AnalyzedChat>()
    for (const a of analyses) {
      const existing = map.get(a.chat_id)
      if (existing) {
        existing.count++
        existing.latestAt = Math.max(existing.latestAt, a.created_at)
      } else {
        map.set(a.chat_id, { chatId: a.chat_id, chatName: a.chat_name, count: 1, latestAt: a.created_at })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.latestAt - a.latestAt)
  }, [analyses])

  const currentChatName = selectedChatId
    ? (chats.find(c => c.id === selectedChatId)?.name ?? analyzedChats.find(c => c.chatId === selectedChatId)?.chatName)
    : null

  const getActiveModelConfig = () => {
    if (selectedModel.value === 'custom') {
      return customBaseUrl && customModel ? { base_url: customBaseUrl, api_key: modelApiKey, model: customModel } : undefined
    }
    if (modelApiKey) {
      return { base_url: modelBaseUrl || selectedModel.baseUrl, api_key: modelApiKey, model: selectedModel.value }
    }
    return undefined
  }

  const handleSaveModelKey = async () => {
    if (typeof window.api.saveModelConfig !== 'function') return
    setSavingKey(true)
    try {
      await window.api.saveModelConfig(selectedModel.value, modelApiKey, modelBaseUrl || selectedModel.baseUrl)
      setModelKeyStatus(prev => ({ ...prev, [selectedModel.value]: modelApiKey.length > 0 }))
      setShowKeyInput(false)
    } finally {
      setSavingKey(false)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || streaming) return
    const modelConfig = getActiveModelConfig()
    if (!modelConfig && !hasAI) return
    setInput('')

    const userMsg: DisplayMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setStreaming(true)

    const ragContext = buildRAGContext(analyses, selectedChatId ?? undefined)
    const apiMessages: AIMessage[] = [
      ...(ragContext ? [{ role: 'system' as const, content: ragContext }] : []),
      ...newMessages.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    ]

    try {
      await window.api.aiChat(apiMessages, modelConfig)
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => setMessages([])

  const refreshAnalyses = async () => {
    setLoadingAnalyses(true)
    const r = await window.api.getAllAnalyses()
    if (r.success && r.data) setAnalyses(r.data)
    setLoadingAnalyses(false)
  }

  const handleSelectChat = (chatId: string | null) => {
    setSelectedChatId(chatId)
    setMessages([])
  }

  const ragCount = selectedChatId
    ? analyses.filter(a => a.chat_id === selectedChatId).length
    : analyses.length

  const suggestionPrompts = currentChatName
    ? [
        `${currentChatName} 最近聊的什么？`,
        `总结一下 ${currentChatName} 的聊天记录`,
        `${currentChatName} 有哪些待办事项？`,
        `帮我分析 ${currentChatName} 的讨论主题`,
      ]
    : [
        '最近和谁聊天最多？',
        '有哪些重要的待办事项？',
        '最近的对话主要在讨论什么？',
        '帮我总结最近的工作相关讨论',
      ]

  return (
    <div className="flex h-full" style={{ background: 'var(--bg-base)' }}>
      {/* Left: all chats list */}
      <AnalyzedChatList
        allChats={chats}
        analyzedChats={analyzedChats}
        selectedId={selectedChatId}
        analyses={analyses}
        search={sidebarSearch}
        onSearch={setSidebarSearch}
        onSelect={handleSelectChat}
        onRefresh={refreshAnalyses}
      />

      {/* Right: chat area */}
      <div className="flex flex-col flex-1 min-w-0" style={{ background: 'var(--bg-base)' }}>
        {/* Header */}
        <div className="drag-region h-8 shrink-0" />
        <div
          className="flex items-center justify-between px-5 pb-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {currentChatName ? currentChatName : 'AI 助手'}
              </h2>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {loadingAnalyses ? '加载知识库...' : `${ragCount} 条聊天分析日志`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* RAG indicator */}
            {ragCount > 0 && (
              <div
                className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 cursor-pointer"
                style={{ background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)' }}
                onClick={refreshAnalyses}
                title="点击刷新知识库"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                  <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                RAG 已启用
              </div>
            )}

            {/* Model selector */}
            <div className="relative">
              <button
                onClick={() => setShowModelMenu(v => !v)}
                className="no-drag flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 cursor-pointer"
                style={{
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${modelKeyStatus[selectedModel.value] || selectedModel.value === 'custom' ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                  color: 'var(--text-secondary)'
                }}
              >
                {modelKeyStatus[selectedModel.value] && selectedModel.value !== 'custom' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                )}
                <span className="truncate max-w-[100px]">{selectedModel.label}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {showModelMenu && (
                <div
                  className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20 shadow-xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', minWidth: '200px' }}
                >
                  {MODEL_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => { setSelectedModel(p); setShowModelMenu(false) }}
                      className="no-drag w-full text-left px-3 py-2.5 text-xs cursor-pointer flex items-center gap-2"
                      style={{
                        color: selectedModel.value === p.value ? 'var(--accent)' : 'var(--text-secondary)',
                        background: selectedModel.value === p.value ? 'var(--accent-glow)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (selectedModel.value !== p.value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={(e) => { if (selectedModel.value !== p.value) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${modelKeyStatus[p.value] ? 'bg-green-400' : 'bg-gray-500'}`} />
                      {p.label}
                      {!modelKeyStatus[p.value] && p.value !== 'custom' && (
                        <span className="ml-auto text-[9px]" style={{ color: 'var(--text-muted)' }}>需配置</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Key config toggle button */}
            {selectedModel.value !== 'custom' && (
              <button
                onClick={() => setShowKeyInput(v => !v)}
                className="no-drag text-xs rounded-lg px-2.5 py-1.5 cursor-pointer"
                style={{
                  background: showKeyInput ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                  border: `1px solid ${showKeyInput ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
                  color: showKeyInput ? 'var(--accent)' : 'var(--text-muted)'
                }}
                title="配置 API Key"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
              </button>
            )}

            {/* Clear chat */}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="no-drag text-xs rounded-lg px-2.5 py-1.5 cursor-pointer"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                title="清除对话"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Inline API key config panel */}
        {showKeyInput && selectedModel.value !== 'custom' && (
          <div
            className="shrink-0 px-5 py-3 flex flex-col gap-2"
            style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              配置 {selectedModel.label} API Key
            </div>
            <div className="flex gap-2">
              <input
                className="no-drag w-36 text-xs rounded-lg px-3 py-2 outline-none shrink-0"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="Base URL"
                value={modelBaseUrl}
                onChange={(e) => setModelBaseUrl(e.target.value)}
              />
              <input
                className="no-drag flex-1 text-xs rounded-lg px-3 py-2 outline-none"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                type="password"
                placeholder="API Key (sk-...)"
                value={modelApiKey}
                onChange={(e) => setModelApiKey(e.target.value)}
              />
              <button
                onClick={handleSaveModelKey}
                disabled={savingKey || !modelApiKey.trim()}
                className="no-drag text-xs rounded-lg px-3 py-2 cursor-pointer disabled:opacity-40 shrink-0"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {savingKey ? '保存...' : '保存'}
              </button>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)', boxShadow: '0 8px 32px rgba(59,130,246,0.25)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {currentChatName ? `与 ${currentChatName} 的 AI 分析` : '和 AI 开始对话'}
                </h3>
                <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
                  {ragCount > 0
                    ? `已加载 ${ragCount} 条聊天记录分析，AI 可以基于这些内容回答问题`
                    : '先在微信页面打开聊天，AI 会自动分析聊天记录并建立知识库'}
                </p>
              </div>

              {ragCount > 0 && (
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {suggestionPrompts.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(q); inputRef.current?.focus() }}
                      className="no-drag text-xs rounded-xl px-3 py-2 cursor-pointer"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {!hasAI && !modelKeyStatus[selectedModel.value] && selectedModel.value !== 'custom' && (
                <div
                  className="flex items-center gap-2 text-xs rounded-xl px-4 py-2.5 cursor-pointer"
                  style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.2)' }}
                  onClick={() => setShowKeyInput(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  点击右上角 🔑 按钮配置 {selectedModel.label} API Key
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.filter(m => m.role !== 'system').map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 self-start mt-1 text-[10px] font-bold text-white"
                    style={msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }
                      : { background: 'linear-gradient(135deg, #10B981, #059669)' }
                    }
                  >
                    {msg.role === 'user' ? '我' : 'AI'}
                  </div>

                  <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
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
                      {msg.role === 'user' ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <MarkdownText text={msg.content} />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {streaming && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                  >
                    AI
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                  >
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Custom model settings */}
        {selectedModel.value === 'custom' && (
          <div className="shrink-0 px-5 pb-2 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
            <input
              className="no-drag flex-1 text-xs rounded-lg px-3 py-2 outline-none mt-2"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="Base URL (e.g. https://api.example.com)"
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
            />
            <input
              className="no-drag text-xs rounded-lg px-3 py-2 outline-none mt-2 w-40"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="Model name"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
            />
          </div>
        )}

        {/* Input area */}
        <div className="shrink-0 px-5 pb-5 pt-2">
          <div
            className="flex items-end gap-2 rounded-2xl p-2"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <textarea
              ref={inputRef}
              className="no-drag flex-1 text-sm resize-none outline-none bg-transparent py-1.5 px-2 max-h-32"
              style={{ color: 'var(--text-primary)' }}
              placeholder={
                modelKeyStatus[selectedModel.value] || hasAI || selectedModel.value === 'custom'
                  ? '输入消息，Shift+Enter 换行，Enter 发送...'
                  : `请先配置 ${selectedModel.label} API Key`
              }
              value={input}
              disabled={streaming}
              rows={1}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="no-drag shrink-0 w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
              style={{ background: input.trim() ? 'var(--accent)' : 'var(--bg-panel)', color: input.trim() ? '#fff' : 'var(--text-muted)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Click outside to close model menu */}
      {showModelMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowModelMenu(false)} />
      )}
    </div>
  )
}
