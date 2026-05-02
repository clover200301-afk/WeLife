import type { GraphNode } from '../types'

export interface Circle {
  id: string
  name: string
  color: string
  order: number       // 1 = closest to center "我"
  contactIds: string[]
}

const STORAGE_KEY = 'welife_circles'

const DEFAULT_CIRCLES: Circle[] = [
  { id: 'family',        name: '亲人',   color: '#EF4444', order: 1, contactIds: [] },
  { id: 'close_friends', name: '好朋友', color: '#3B82F6', order: 2, contactIds: [] },
  { id: 'work',          name: '同事',   color: '#10B981', order: 3, contactIds: [] },
  { id: 'school',        name: '同学',   color: '#F59E0B', order: 4, contactIds: [] },
  { id: 'interests',     name: '兴趣圈', color: '#8B5CF6', order: 5, contactIds: [] },
  { id: 'other',         name: '其他',   color: '#6B7280', order: 6, contactIds: [] },
]

export const CIRCLE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280',
]

export function loadCircles(): Circle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Circle[]
  } catch { /* ignore */ }
  return DEFAULT_CIRCLES.map(c => ({ ...c }))
}

export function saveCircles(circles: Circle[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(circles))
}

export function addToCircle(circles: Circle[], circleId: string, contactId: string): Circle[] {
  return circles.map(c => {
    if (c.id !== circleId) return c
    if (c.contactIds.includes(contactId)) return c
    return { ...c, contactIds: [...c.contactIds, contactId] }
  })
}

export function removeFromCircle(circles: Circle[], circleId: string, contactId: string): Circle[] {
  return circles.map(c => ({
    ...c,
    contactIds: c.id === circleId ? c.contactIds.filter(id => id !== contactId) : c.contactIds,
  }))
}

export function createCircle(circles: Circle[], name: string, color: string): Circle[] {
  const maxOrder = circles.reduce((m, c) => Math.max(m, c.order), 0)
  return [...circles, {
    id: `circle_${Date.now()}`,
    name,
    color,
    order: maxOrder + 1,
    contactIds: [],
  }]
}

export function deleteCircle(circles: Circle[], circleId: string): Circle[] {
  return circles.filter(c => c.id !== circleId)
}

export function suggestForCircle(circle: Circle, nodes: GraphNode[], allCircles: Circle[]): GraphNode[] {
  const alreadyInThisCircle = new Set(circle.contactIds)
  const assignedElsewhere = new Set(
    allCircles.filter(c => c.id !== circle.id).flatMap(c => c.contactIds)
  )
  const candidates = nodes
    .filter(n => !alreadyInThisCircle.has(n.id) && !assignedElsewhere.has(n.id))
    .sort((a, b) => b.score - a.score)
  return candidates.slice(0, 8)
}
