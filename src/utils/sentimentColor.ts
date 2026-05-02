export function nodeColor(score: number, sentiment?: string): string {
  if (sentiment === 'positive') return '#22C55E'
  if (sentiment === 'negative') return '#EF4444'
  if (score >= 50) return '#22C55E'
  if (score >= 20) return '#94A3B8'
  if (score >= 5)  return '#CBD5E1'
  return '#E2E8F0'
}

export function nodeOpacity(score: number): number {
  if (score >= 20) return 0.9
  if (score >= 5)  return 0.7
  return 0.5
}
