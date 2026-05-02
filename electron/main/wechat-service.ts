import { execSync } from 'child_process'
import { getDb } from './db'
import type { SessionItem, HistoryResult, Chat, Message } from '../../src/types'

const WECHAT_CLI = 'wechat-cli'
const EVENT_GAP_MS = 30 * 60 * 1000 // 30 minutes

function run(args: string): string {
  return execSync(`${WECHAT_CLI} ${args}`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024  // 10MB
  })
}

// Parse "[2026-05-02 11:21] sender: content" format
function parseMessageLine(line: string, chatId: string): Omit<Message, 'id'> | null {
  const match = line.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\] ([^:]+): (.*)$/)
  if (!match) return null
  const [, timeStr, sender, content] = match
  const timestamp = Math.floor(new Date(timeStr).getTime() / 1000)
  const is_self = sender === 'me'
  return { chat_id: chatId, sender: is_self ? 'me' : sender, content, type: 'text', timestamp, is_self }
}

function makeMessageId(chatId: string, timestamp: number, sender: string, content: string): string {
  return `${chatId}_${timestamp}_${Buffer.from(sender + content).toString('base64').slice(0, 8)}`
}

export function fetchAndStoreSessions(): Chat[] {
  const db = getDb()
  let sessions: SessionItem[] = []
  try {
    const raw = run('sessions --limit 100')
    sessions = JSON.parse(raw)
  } catch (e) {
    console.error('Failed to fetch sessions:', e)
    return []
  }

  const upsertChat = db.prepare(`
    INSERT OR REPLACE INTO chats (id, name, type, unread, last_message, last_msg_type, last_sender, last_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const upsertMany = db.transaction((list: SessionItem[]) => {
    for (const s of list) {
      upsertChat.run(
        s.username, s.chat,
        s.is_group ? 'group' : 'private',
        s.unread ?? 0,
        s.last_message ?? '',
        s.msg_type ?? 'text',
        s.sender ?? '',
        s.timestamp ?? 0
      )
    }
  })
  upsertMany(sessions)

  return db.prepare('SELECT * FROM chats ORDER BY last_timestamp DESC').all() as Chat[]
}

export function fetchAndStoreMessages(chatName: string, chatId: string, sinceTimestamp?: number): number {
  const db = getDb()
  let result: HistoryResult
  try {
    let args = `history "${chatName}" --limit 200`
    if (sinceTimestamp) {
      const dt = new Date(sinceTimestamp * 1000)
      const y = dt.getFullYear()
      const m = String(dt.getMonth() + 1).padStart(2, '0')
      const d = String(dt.getDate()).padStart(2, '0')
      args += ` --start-time "${y}-${m}-${d}"`
    }
    const raw = run(args)
    result = JSON.parse(raw)
  } catch (e) {
    console.error(`Failed to fetch history for ${chatName}:`, e)
    return 0
  }

  if (!result.messages?.length) return 0

  const insertMsg = db.prepare(`
    INSERT OR IGNORE INTO messages (id, chat_id, sender, content, type, timestamp, is_self)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const newMessages: Message[] = []
  const insertMany = db.transaction(() => {
    for (const line of result.messages) {
      const parsed = parseMessageLine(line, chatId)
      if (!parsed) continue
      const id = makeMessageId(chatId, parsed.timestamp, parsed.sender, parsed.content)
      const changes = insertMsg.run(id, chatId, parsed.sender, parsed.content, parsed.type, parsed.timestamp, parsed.is_self ? 1 : 0)
      if (changes.changes > 0) newMessages.push({ id, ...parsed })
    }
  })
  insertMany()

  if (newMessages.length > 0) {
    generateEvents(chatId, newMessages)
  }

  return newMessages.length
}

function generateEvents(chatId: string, newMessages: Message[]): void {
  const db = getDb()

  const chat = db.prepare('SELECT name FROM chats WHERE id = ?').get(chatId) as { name: string } | undefined
  const chatName = chat?.name ?? chatId

  const lastEvent = db.prepare(
    'SELECT * FROM events WHERE chat_id = ? AND manual_edited = 0 ORDER BY end_time DESC LIMIT 1'
  ).get(chatId) as { id: string; end_time: number; message_ids: string } | undefined

  const sorted = [...newMessages].sort((a, b) => a.timestamp - b.timestamp)

  let currentEventId: string | null = lastEvent?.id ?? null
  let currentEndTime: number = lastEvent?.end_time ?? 0
  let currentMsgIds: string[] = lastEvent ? JSON.parse(lastEvent.message_ids) : []

  const upsertEvent = db.prepare(`
    INSERT OR REPLACE INTO events (id, chat_id, chat_name, start_time, end_time, message_ids, note, manual_edited)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `)

  const doWork = db.transaction(() => {
    for (const msg of sorted) {
      const gap = (msg.timestamp - currentEndTime) * 1000
      if (!currentEventId || gap > EVENT_GAP_MS) {
        // Start a new event
        currentEventId = `evt_${chatId}_${msg.timestamp}`
        currentMsgIds = [msg.id]
        upsertEvent.run(currentEventId, chatId, chatName, msg.timestamp, msg.timestamp, JSON.stringify(currentMsgIds), null)
      } else {
        // Extend current event
        currentMsgIds.push(msg.id)
        db.prepare('UPDATE events SET end_time = ?, message_ids = ? WHERE id = ?')
          .run(msg.timestamp, JSON.stringify(currentMsgIds), currentEventId)
      }
      currentEndTime = msg.timestamp
    }
  })
  doWork()
}

export function getChats(): Chat[] {
  return getDb().prepare('SELECT * FROM chats ORDER BY last_timestamp DESC').all() as Chat[]
}

export function searchMessages(chatId: string, keyword: string, limit = 50): Message[] {
  return getDb().prepare(
    'SELECT * FROM messages WHERE chat_id = ? AND content LIKE ? ORDER BY timestamp DESC LIMIT ?'
  ).all(chatId, `%${keyword}%`, limit) as Message[]
}

export function getMessages(chatId: string, limit = 50, before?: number): Message[] {
  const db = getDb()
  if (before) {
    return db.prepare(
      'SELECT * FROM messages WHERE chat_id = ? AND timestamp < ? ORDER BY timestamp DESC LIMIT ?'
    ).all(chatId, before, limit) as Message[]
  }
  return db.prepare(
    'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(chatId, limit) as Message[]
}

export function getChatSenders(chatId: string): { sender: string; count: number }[] {
  return getDb().prepare(
    'SELECT sender, COUNT(*) as count FROM messages WHERE chat_id = ? GROUP BY sender ORDER BY count DESC'
  ).all(chatId) as { sender: string; count: number }[]
}

export function getMessageCount(chatId: string): number {
  const row = getDb().prepare('SELECT COUNT(*) as c FROM messages WHERE chat_id = ?').get(chatId) as { c: number }
  return row.c
}

export function fetchFullHistory(chatName: string, chatId: string): number {
  const db = getDb()
  let result: HistoryResult
  try {
    const raw = run(`history "${chatName}" --limit 9999`)
    result = JSON.parse(raw)
  } catch (e) {
    console.error(`Failed to fetch full history for ${chatName}:`, e)
    return 0
  }
  if (!result.messages?.length) return 0

  const insertMsg = db.prepare(`
    INSERT OR IGNORE INTO messages (id, chat_id, sender, content, type, timestamp, is_self)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const newMessages: Message[] = []
  const insertMany = db.transaction(() => {
    for (const line of result.messages) {
      const parsed = parseMessageLine(line, chatId)
      if (!parsed) continue
      const id = makeMessageId(chatId, parsed.timestamp, parsed.sender, parsed.content)
      const changes = insertMsg.run(id, chatId, parsed.sender, parsed.content, parsed.type, parsed.timestamp, parsed.is_self ? 1 : 0)
      if (changes.changes > 0) newMessages.push({ id, ...parsed })
    }
  })
  insertMany()

  if (newMessages.length > 0) generateEvents(chatId, newMessages)
  return newMessages.length
}

export function getEvents(chatId?: string, limit = 50, offset = 0): (import('../../src/types').Event)[] {
  const db = getDb()
  type RawEvent = { id: string; chat_id: string; chat_name: string; start_time: number; end_time: number; message_ids: string; note: string | null; manual_edited: number }
  let rows: RawEvent[]
  if (chatId) {
    rows = db.prepare('SELECT * FROM events WHERE chat_id = ? ORDER BY start_time DESC LIMIT ? OFFSET ?').all(chatId, limit, offset) as RawEvent[]
  } else {
    rows = db.prepare('SELECT * FROM events ORDER BY start_time DESC LIMIT ? OFFSET ?').all(limit, offset) as RawEvent[]
  }
  return rows.map(r => ({
    ...r,
    message_ids: JSON.parse(r.message_ids),
    message_count: (JSON.parse(r.message_ids) as string[]).length,
    manual_edited: r.manual_edited === 1
  }))
}

export function updateEvent(id: string, patch: { note?: string; start_time?: number; end_time?: number }): void {
  const db = getDb()
  const parts: string[] = []
  const vals: unknown[] = []
  if (patch.note !== undefined) { parts.push('note = ?'); vals.push(patch.note) }
  if (patch.start_time !== undefined) { parts.push('start_time = ?'); vals.push(patch.start_time) }
  if (patch.end_time !== undefined) { parts.push('end_time = ?'); vals.push(patch.end_time) }
  if (!parts.length) return
  parts.push('manual_edited = 1')
  vals.push(id)
  db.prepare(`UPDATE events SET ${parts.join(', ')} WHERE id = ?`).run(...vals)
}

export function getEventMessages(eventId: string): Message[] {
  const db = getDb()
  const event = db.prepare('SELECT message_ids FROM events WHERE id = ?').get(eventId) as { message_ids: string } | undefined
  if (!event) return []
  const ids = JSON.parse(event.message_ids) as string[]
  if (!ids.length) return []
  const placeholders = ids.map(() => '?').join(',')
  return db.prepare(`SELECT * FROM messages WHERE id IN (${placeholders}) ORDER BY timestamp ASC`).all(...ids) as Message[]
}
