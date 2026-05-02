import { getDb } from './db'

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

function calcScore(chatId: string, msgCount: number, evtCount: number): number {
  const db = getDb()
  const recentCount = (db.prepare(
    'SELECT COUNT(*) as c FROM messages WHERE chat_id = ? AND timestamp > ?'
  ).get(chatId, Math.floor(Date.now() / 1000) - 7 * 86400) as { c: number }).c
  return Math.round(msgCount * 0.4 + evtCount * 1.5 + recentCount * 0.6)
}

export function getGraphData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const db = getDb()
  const chats = db.prepare('SELECT * FROM chats').all() as Array<{
    id: string; name: string; type: string; last_timestamp: number
  }>

  const getMsgCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE chat_id = ?')
  const getEvtCount = db.prepare('SELECT COUNT(*) as c FROM events WHERE chat_id = ?')
  const getRecentCount = db.prepare(
    'SELECT COUNT(*) as c FROM messages WHERE chat_id = ? AND timestamp > ?'
  )
  const recent30Cutoff = Math.floor(Date.now() / 1000) - 30 * 86400

  const nodes: GraphNode[] = []
  const weightMap: Record<string, number> = {}

  for (const chat of chats) {
    const msgCount = (getMsgCount.get(chat.id) as { c: number }).c
    if (msgCount === 0) continue

    const evtCount = (getEvtCount.get(chat.id) as { c: number }).c
    const score = calcScore(chat.id, msgCount, evtCount)
    const recent30 = (getRecentCount.get(chat.id, recent30Cutoff) as { c: number }).c

    nodes.push({
      id: chat.id,
      name: chat.name,
      type: chat.type as 'private' | 'group',
      score,
      messageCount: msgCount,
      eventCount: evtCount,
      lastActive: chat.last_timestamp,
    })
    weightMap[chat.id] = recent30
  }

  nodes.sort((a, b) => b.score - a.score)
  const capped = nodes.slice(0, 500)

  const maxWeight = Math.max(1, ...capped.map(n => weightMap[n.id] ?? 0))
  const edges: GraphEdge[] = capped.map(n => ({
    source: 'self',
    target: n.id,
    weight: weightMap[n.id] ?? 0,
    strength: (weightMap[n.id] ?? 0) / maxWeight,
  }))

  return { nodes: capped, edges }
}

export function getContactStats(chatId: string): { weeklyTrend: number[]; avgMsgPerEvent: number } {
  const db = getDb()
  const now = Math.floor(Date.now() / 1000)

  const weekQuery = db.prepare(
    'SELECT COUNT(*) as c FROM messages WHERE chat_id = ? AND timestamp >= ? AND timestamp < ?'
  )
  const weeklyTrend: number[] = []
  for (let i = 7; i >= 0; i--) {
    const start = now - (i + 1) * 7 * 86400
    const end = now - i * 7 * 86400
    weeklyTrend.push((weekQuery.get(chatId, start, end) as { c: number }).c)
  }

  const eventRows = db.prepare('SELECT message_ids FROM events WHERE chat_id = ?').all(chatId) as { message_ids: string }[]
  let totalMsgs = 0
  for (const e of eventRows) {
    try { totalMsgs += (JSON.parse(e.message_ids) as string[]).length } catch { /* skip */ }
  }
  const avgMsgPerEvent = eventRows.length > 0 ? Math.round(totalMsgs / eventRows.length) : 0

  return { weeklyTrend, avgMsgPerEvent }
}
