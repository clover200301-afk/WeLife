// ============ WeChat CLI types ============
export interface SessionItem {
  chat: string
  username: string
  is_group: boolean
  unread: number
  last_message: string
  msg_type: string
  sender: string
  timestamp: number
  time: string
}

export interface HistoryResult {
  chat: string
  username: string
  is_group: boolean
  count: number
  offset: number
  limit: number
  start_time: string | null
  end_time: string | null
  type: string | null
  messages: string[]
  failures: string | null
}

export interface ContactItem {
  username: string
  nick_name: string
  remark: string
}

// ============ Parsed / DB types ============
export interface Chat {
  id: string
  name: string
  type: 'private' | 'group'
  unread: number
  last_message: string
  last_msg_type: string
  last_sender: string
  last_timestamp: number
}

export interface Message {
  id: string
  chat_id: string
  sender: string
  content: string
  type: string
  timestamp: number
  is_self: boolean
}

export interface Event {
  id: string
  chat_id: string
  chat_name: string
  start_time: number
  end_time: number
  message_ids: string[]
  message_count: number
  note: string | null
  manual_edited: boolean
}

// ============ AI types ============
export interface AIConfig {
  base_url: string
  api_key: string
  model: string
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ============ IPC channel types ============
export interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ============ AI Analysis types ============
export interface ChatAnalysisJSON {
  title?: string
  summary: string
  topics: string[]
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  key_points: string[]
  participants: string[]
  action_items: string[]
  time_range: string
  message_count: number
}

export interface ChatAnalysis {
  id: string
  event_id: string | null
  chat_id: string
  chat_name: string
  analysis_json: string
  created_at: number
}
export interface GraphNode {
  id: string
  name: string
  type: 'private' | 'group'
  score: number
  messageCount: number
  eventCount: number
  lastActive: number
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
  strength: number
}
