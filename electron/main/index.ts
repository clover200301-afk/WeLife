import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { execSync } from 'child_process'
import { is } from '@electron-toolkit/utils'
import { getDb, getSetting, setSetting, getSecureSetting, setSecureSetting } from './db'
import {
  fetchAndStoreSessions,
  fetchAndStoreMessages,
  fetchFullHistory,
  getMessages,
  getRecentMessages,
  searchMessages,
  getEvents,
  updateEvent,
  getEventMessages,
  getChatSenders,
  getMessageCount
} from './wechat-service'
import { getAIConfig, chatCompletion, summarizeMessages, analyzeEventMessages, generateChatEventLog } from './ai-service'
import { getGraphData, getContactStats } from './graph-service'
import type { Chat } from '../../src/types'

let mainWindow: BrowserWindow | null = null
let pollTimer: NodeJS.Timeout | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#EDEDED',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// Smart poll: fetch sessions, only sync chats where last_timestamp changed
function smartPoll(): void {
  try {
    const db = getDb()
    // 1. Get latest session list (fast - just reads session table)
    const raw = execSync('wechat-cli sessions --limit 100', {
      encoding: 'utf8', maxBuffer: 2 * 1024 * 1024
    })
    const sessions: Array<{ chat: string; username: string; is_group: boolean; unread: number; last_message: string; msg_type: string; sender: string; timestamp: number; time: string }> = JSON.parse(raw)

    // 2. Upsert session metadata
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO chats (id, name, type, unread, last_message, last_msg_type, last_sender, last_timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const stored = db.prepare('SELECT last_timestamp FROM chats WHERE id = ?')

    const chatsToSync: Array<{ name: string; id: string; storedTs: number }> = []

    db.transaction(() => {
      for (const s of sessions) {
        const existing = stored.get(s.username) as { last_timestamp: number } | undefined
        if (!existing || existing.last_timestamp < s.timestamp) {
          chatsToSync.push({ name: s.chat, id: s.username, storedTs: existing?.last_timestamp ?? 0 })
        }
        upsert.run(s.username, s.chat, s.is_group ? 'group' : 'private', s.unread ?? 0, s.last_message ?? '', s.msg_type ?? 'text', s.sender ?? '', s.timestamp ?? 0)
      }
    })()

    // 3. Sync only chats with new messages (cap to 5 at a time to avoid blocking)
    const toSync = chatsToSync.slice(0, 5)
    let newCount = 0
    for (const c of toSync) {
      try {
        newCount += fetchAndStoreMessages(c.name, c.id, c.storedTs || undefined)
      } catch { /* skip failing chats */ }
    }

    // 4. Notify renderer with updated chat list (only when something changed)
    if (toSync.length > 0) {
      const updatedChats = db.prepare('SELECT * FROM chats ORDER BY last_timestamp DESC').all() as Chat[]
      mainWindow?.webContents.send('chats-updated', updatedChats)
    }

    if (newCount > 0) {
      mainWindow?.webContents.send('messages-synced', { count: newCount })
    }
  } catch (e) {
    console.error('Smart poll error:', e)
  }
}

function startPolling(): void {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(smartPoll, 60_000)
}

app.whenReady().then(() => {
  createWindow()
  startPolling()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (pollTimer) clearInterval(pollTimer)
  if (process.platform !== 'darwin') app.quit()
})

// ============ IPC Handlers ============

// Instant: loads sessions from wechat-cli & returns DB result
ipcMain.handle('get-chats', async () => {
  try {
    const chats = fetchAndStoreSessions()
    return { success: true, data: chats }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

// Instant: reads from local DB only — no wechat-cli call
ipcMain.handle('get-messages', async (_, chatId: string, _chatName: string, limit?: number, before?: number) => {
  try {
    const messages = getMessages(chatId, limit ?? 50, before)
    return { success: true, data: messages.reverse() }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('search-messages', async (_, chatId: string, keyword: string) => {
  try {
    const messages = searchMessages(chatId, keyword)
    return { success: true, data: messages }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

// Background sync for a single chat — called after messages are shown
ipcMain.handle('sync-chat', async (_, chatId: string, chatName: string) => {
  try {
    const db = getDb()
    const stored = db.prepare('SELECT last_timestamp FROM chats WHERE id = ?').get(chatId) as { last_timestamp: number } | undefined
    const newCount = fetchAndStoreMessages(chatName, chatId, stored?.last_timestamp ?? undefined)
    if (newCount > 0) {
      const fresh = getMessages(chatId, 50)
      return { success: true, data: { newCount, messages: fresh.reverse() } }
    }
    return { success: true, data: { newCount: 0, messages: null } }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-events', async (_, chatId?: string, limit?: number, offset?: number) => {
  try {
    const events = getEvents(chatId, limit ?? 50, offset ?? 0)
    return { success: true, data: events }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-event-messages', async (_, eventId: string) => {
  try {
    const messages = getEventMessages(eventId)
    return { success: true, data: messages }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('update-event', async (_, id: string, patch: { note?: string; start_time?: number; end_time?: number }) => {
  try {
    updateEvent(id, patch)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-settings', async () => {
  try {
    return {
      success: true,
      data: {
        ai_base_url: getSetting('ai_base_url') ?? '',
        ai_api_key: getSecureSetting('ai_api_key') ?? '',
        ai_model: getSetting('ai_model') ?? '',
        rag_source: getSetting('rag_source') ?? 'messages',
        rag_retrieval_prompt: getSetting('rag_retrieval_prompt') ?? '',
        rag_events_prompt: getSetting('rag_events_prompt') ?? '',
        rag_events_prompt_enabled: getSetting('rag_events_prompt_enabled') ?? '0',
        rag_both_prompt: getSetting('rag_both_prompt') ?? '',
        rag_both_prompt_enabled: getSetting('rag_both_prompt_enabled') ?? '0',
      }
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('save-settings', async (_, settings: Record<string, string>) => {
  try {
    for (const [k, v] of Object.entries(settings)) {
      if (k === 'ai_api_key') setSecureSetting(k, v)
      else setSetting(k, v)
    }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('clear-data', async () => {
  try {
    const db = getDb()
    db.exec('DELETE FROM messages; DELETE FROM events; DELETE FROM chats;')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('check-ai-config', async () => {
  const config = getAIConfig()
  return { success: true, data: config !== null }
})

ipcMain.handle('summarize-event', async (_, eventId: string) => {
  try {
    const messages = getEventMessages(eventId)
    const texts = messages.map(m => `${m.is_self ? 'me' : m.sender}: ${m.content}`)
    const summary = await summarizeMessages(texts)
    return { success: true, data: summary }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('ai-chat', async (_, messages: { role: string; content: string }[], modelOverride?: { base_url?: string; api_key?: string; model?: string }) => {
  try {
    const result = await chatCompletion(
      messages as Parameters<typeof chatCompletion>[0],
      (chunk) => mainWindow?.webContents.send('ai-chunk', chunk),
      modelOverride
    )
    return { success: true, data: result }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

// ---- Startup check ----
ipcMain.handle('check-startup', async () => {
  // 1. wechat-cli installed?
  let wechatInstalled = false
  try {
    execSync('wechat-cli --version', { encoding: 'utf8', timeout: 5000 })
    wechatInstalled = true
  } catch {
    try {
      execSync('npx wechat-cli --version', { encoding: 'utf8', timeout: 8000 })
      wechatInstalled = true
    } catch { /* not installed */ }
  }

  // 2. wechat-cli connected (can load sessions)?
  let wechatConnected = false
  let wechatError = ''
  if (wechatInstalled) {
    try {
      const raw = execSync('wechat-cli sessions --limit 1', {
        encoding: 'utf8', timeout: 10000, maxBuffer: 1 * 1024 * 1024
      })
      const data = JSON.parse(raw)
      wechatConnected = Array.isArray(data) && data.length >= 0
    } catch (e) {
      wechatError = String(e).slice(0, 200)
    }
  }

  // 3. AI configured?
  const aiKey = getSetting('ai_api_key') ?? ''
  const aiModel = getSetting('ai_model') ?? ''
  const aiConfigured = aiKey.length > 0 && aiModel.length > 0

  // 4. First launch flag
  const onboardingDone = (getSetting('onboarding_complete') ?? '') === '1'

  return {
    success: true,
    data: {
      wechatInstalled,
      wechatConnected,
      wechatError,
      aiConfigured,
      onboardingDone,
    }
  }
})

ipcMain.handle('complete-onboarding', async () => {
  try {
    setSetting('onboarding_complete', '1')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-graph-data', async () => {
  try {
    return { success: true, data: getGraphData() }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-contact-stats', async (_, chatId: string) => {
  try {
    return { success: true, data: getContactStats(chatId) }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('analyze-event', async (_, eventId: string) => {
  try {
    const db = getDb()
    // Check if analysis already exists
    const existing = db.prepare('SELECT * FROM chat_analyses WHERE event_id = ?').get(eventId) as { id: string; analysis_json: string } | undefined
    if (existing) {
      return { success: true, data: { id: existing.id, analysis_json: existing.analysis_json, cached: true } }
    }

    const messages = getEventMessages(eventId)
    if (messages.length === 0) return { success: false, error: 'No messages in event' }

    const eventRow = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as { chat_id: string; chat_name: string; start_time: number; end_time: number } | undefined
    if (!eventRow) return { success: false, error: 'Event not found' }

    const texts = messages.map(m => `${m.is_self ? '我' : m.sender}: ${m.content}`)
    const startStr = new Date(eventRow.start_time * 1000).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const endStr = new Date(eventRow.end_time * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    const timeRange = `${startStr} – ${endStr}`

    const analysisJson = await analyzeEventMessages(texts, eventRow.chat_name, timeRange)

    const id = `analysis_${eventId}_${Date.now()}`
    db.prepare('INSERT INTO chat_analyses (id, event_id, chat_id, chat_name, analysis_json, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, eventId, eventRow.chat_id, eventRow.chat_name, analysisJson, Math.floor(Date.now() / 1000)
    )

    return { success: true, data: { id, analysis_json: analysisJson, cached: false } }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-event-analysis', async (_, eventId: string) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM chat_analyses WHERE event_id = ? ORDER BY created_at DESC LIMIT 1').get(eventId) as { id: string; event_id: string; chat_id: string; chat_name: string; analysis_json: string; created_at: number } | undefined
    return { success: true, data: row ?? null }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-all-analyses', async () => {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT id, event_id, chat_id, chat_name, analysis_json, created_at FROM chat_analyses ORDER BY created_at DESC LIMIT 200').all() as Array<{ id: string; event_id: string | null; chat_id: string; chat_name: string; analysis_json: string; created_at: number }>
    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-chat-senders', async (_, chatId: string) => {
  try {
    return { success: true, data: getChatSenders(chatId) }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-streak-contacts', async (_, minDays: number = 7) => {
  try {
    const db = getDb()
    const cutoff = Math.floor(Date.now() / 1000) - 30 * 86400
    const rows = db.prepare(`
      SELECT chat_id, date(timestamp, 'unixepoch', 'localtime') as day
      FROM messages
      WHERE timestamp > ? AND is_self = 0
      GROUP BY chat_id, day
      ORDER BY chat_id, day
    `).all(cutoff) as { chat_id: string; day: string }[]

    const byChat = new Map<string, string[]>()
    for (const r of rows) {
      if (!byChat.has(r.chat_id)) byChat.set(r.chat_id, [])
      byChat.get(r.chat_id)!.push(r.day)
    }

    const results: { chatId: string; streak: number }[] = []
    for (const [chatId, days] of byChat) {
      let maxStreak = 1, cur = 1
      for (let i = 1; i < days.length; i++) {
        const prev = new Date(days[i - 1])
        const curr = new Date(days[i])
        const diff = (curr.getTime() - prev.getTime()) / 86400000
        cur = diff === 1 ? cur + 1 : 1
        maxStreak = Math.max(maxStreak, cur)
      }
      if (maxStreak >= minDays) results.push({ chatId, streak: maxStreak })
    }
    results.sort((a, b) => b.streak - a.streak)
    return { success: true, data: results }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-message-count', async (_, chatId: string) => {
  try {
    return { success: true, data: getMessageCount(chatId) }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-rag-messages', async (_, chatId?: string, limit?: number) => {
  try {
    return { success: true, data: getRecentMessages(chatId, limit ?? 200) }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('fetch-full-history', async (_, chatId: string, chatName: string) => {
  try {
    const newCount = fetchFullHistory(chatName, chatId)
    return { success: true, data: { newCount } }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('get-model-config', async (_, modelId: string) => {
  try {
    return {
      success: true,
      data: {
        api_key: getSecureSetting(`model_api_key_${modelId}`) ?? '',
        base_url: getSetting(`model_base_url_${modelId}`) ?? '',
      }
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('save-model-config', async (_, modelId: string, api_key: string, base_url: string) => {
  try {
    setSecureSetting(`model_api_key_${modelId}`, api_key)
    setSetting(`model_base_url_${modelId}`, base_url)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('generate-chat-event-log', async (_, chatId: string, chatName: string, modelOverride?: { base_url?: string; api_key?: string; model?: string }) => {
  try {
    const db = getDb()
    const allMsgs = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC').all(chatId) as import('../../src/types').Message[]
    if (allMsgs.length === 0) return { success: false, error: 'No messages found' }

    const texts = allMsgs.map(m => {
      const time = new Date(m.timestamp * 1000).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })
      return `[${time}] ${m.is_self ? '我' : m.sender}: ${m.content}`
    })

    let result = ''
    const json = await generateChatEventLog(
      texts,
      chatName,
      '我',
      (chunk) => {
        result += chunk
        mainWindow?.webContents.send('event-log-chunk', chunk)
      },
      modelOverride
    )

    const id = `eventlog_${chatId}_${Date.now()}`
    db.prepare('INSERT INTO chat_analyses (id, event_id, chat_id, chat_name, analysis_json, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, null, chatId, chatName, json, Math.floor(Date.now() / 1000)
    )

    return { success: true, data: { id, analysis_json: json } }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})
