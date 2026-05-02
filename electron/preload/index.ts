import { contextBridge, ipcRenderer } from 'electron'
import type { Chat, Message, Event, AIMessage, GraphNode, GraphEdge, ChatAnalysis } from '../../src/types'

const api = {
  getChats: (): Promise<{ success: boolean; data?: Chat[]; error?: string }> =>
    ipcRenderer.invoke('get-chats'),

  // Instant DB read — no wechat-cli delay
  getMessages: (chatId: string, chatName: string, limit?: number, before?: number) =>
    ipcRenderer.invoke('get-messages', chatId, chatName, limit, before),

  // Background sync after messages already shown
  syncChat: (chatId: string, chatName: string): Promise<{ success: boolean; data?: { newCount: number; messages: Message[] | null } }> =>
    ipcRenderer.invoke('sync-chat', chatId, chatName),

  searchMessages: (chatId: string, keyword: string): Promise<{ success: boolean; data?: Message[] }> =>
    ipcRenderer.invoke('search-messages', chatId, keyword),

  getEvents: (chatId?: string, limit?: number, offset?: number) =>
    ipcRenderer.invoke('get-events', chatId, limit, offset),

  getEventMessages: (eventId: string) =>
    ipcRenderer.invoke('get-event-messages', eventId),

  updateEvent: (id: string, patch: { note?: string; start_time?: number; end_time?: number }) =>
    ipcRenderer.invoke('update-event', id, patch),

  getSettings: () => ipcRenderer.invoke('get-settings'),

  saveSettings: (settings: Record<string, string>) =>
    ipcRenderer.invoke('save-settings', settings),

  clearData: () => ipcRenderer.invoke('clear-data'),

  checkAIConfig: (): Promise<{ success: boolean; data?: boolean }> =>
    ipcRenderer.invoke('check-ai-config'),

  summarizeEvent: (eventId: string) => ipcRenderer.invoke('summarize-event', eventId),

  aiChat: (messages: AIMessage[], modelOverride?: { base_url?: string; api_key?: string; model?: string }) =>
    ipcRenderer.invoke('ai-chat', messages, modelOverride),

  onChatsUpdated: (callback: (chats: Chat[]) => void) => {
    const handler = (_: Electron.IpcRendererEvent, chats: Chat[]) => callback(chats)
    ipcRenderer.on('chats-updated', handler)
    return () => ipcRenderer.off('chats-updated', handler)
  },

  onMessagesSynced: (callback: (payload: { count: number }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: { count: number }) => callback(payload)
    ipcRenderer.on('messages-synced', handler)
    return () => ipcRenderer.off('messages-synced', handler)
  },

  onAIChunk: (callback: (chunk: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, chunk: string) => callback(chunk)
    ipcRenderer.on('ai-chunk', handler)
    return () => ipcRenderer.off('ai-chunk', handler)
  },

  onEventLogChunk: (callback: (chunk: string) => void) => {
    const handler = (_: Electron.IpcRendererEvent, chunk: string) => callback(chunk)
    ipcRenderer.on('event-log-chunk', handler)
    return () => ipcRenderer.off('event-log-chunk', handler)
  },

  checkStartup: (): Promise<{
    success: boolean
    data?: {
      wechatInstalled: boolean
      wechatConnected: boolean
      wechatInstallHint: string
      wechatError: string
      aiConfigured: boolean
      onboardingDone: boolean
    }
  }> => ipcRenderer.invoke('check-startup'),

  completeOnboarding: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('complete-onboarding'),

  getGraphData: (): Promise<{ success: boolean; data?: { nodes: GraphNode[]; edges: GraphEdge[] } }> =>
    ipcRenderer.invoke('get-graph-data'),

  getContactStats: (chatId: string): Promise<{ success: boolean; data?: { weeklyTrend: number[]; avgMsgPerEvent: number } }> =>
    ipcRenderer.invoke('get-contact-stats', chatId),

  analyzeEvent: (eventId: string): Promise<{ success: boolean; data?: { id: string; analysis_json: string; cached: boolean }; error?: string }> =>
    ipcRenderer.invoke('analyze-event', eventId),

  getEventAnalysis: (eventId: string): Promise<{ success: boolean; data?: ChatAnalysis | null }> =>
    ipcRenderer.invoke('get-event-analysis', eventId),

  getAllAnalyses: (): Promise<{ success: boolean; data?: ChatAnalysis[] }> =>
    ipcRenderer.invoke('get-all-analyses'),

  getChatSenders: (chatId: string): Promise<{ success: boolean; data?: { sender: string; count: number }[] }> =>
    ipcRenderer.invoke('get-chat-senders', chatId),

  getMessageCount: (chatId: string): Promise<{ success: boolean; data?: number }> =>
    ipcRenderer.invoke('get-message-count', chatId),

  getRagMessages: (chatId?: string, limit?: number): Promise<{ success: boolean; data?: Message[] }> =>
    ipcRenderer.invoke('get-rag-messages', chatId, limit),

  fetchFullHistory: (chatId: string, chatName: string): Promise<{ success: boolean; data?: { newCount: number }; error?: string }> =>
    ipcRenderer.invoke('fetch-full-history', chatId, chatName),

  getModelConfig: (modelId: string): Promise<{ success: boolean; data?: { api_key: string; base_url: string } }> =>
    ipcRenderer.invoke('get-model-config', modelId),

  saveModelConfig: (modelId: string, api_key: string, base_url: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('save-model-config', modelId, api_key, base_url),

  getStreakContacts: (minDays?: number): Promise<{ success: boolean; data?: { chatId: string; streak: number }[] }> =>
    ipcRenderer.invoke('get-streak-contacts', minDays),

  generateChatEventLog: (chatId: string, chatName: string, modelOverride?: { base_url?: string; api_key?: string; model?: string }): Promise<{ success: boolean; data?: { id: string; analysis_json: string }; error?: string }> =>
    ipcRenderer.invoke('generate-chat-event-log', chatId, chatName, modelOverride),
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
