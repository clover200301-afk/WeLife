import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light'

interface ThemeState {
  mode: ThemeMode
  bgImage: string | null  // base64 or null
  bgOpacity: number       // 0-1, overlay opacity
}

interface ThemeContextValue extends ThemeState {
  toggleMode: () => void
  setBgImage: (img: string | null) => void
  setBgOpacity: (v: number) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'welife_theme'

function loadState(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ThemeState
  } catch { /* ignore */ }
  return { mode: 'light', bgImage: null, bgOpacity: 0.85 }
}

function saveState(s: ThemeState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(loadState)

  const update = useCallback((next: Partial<ThemeState>) => {
    setState((prev) => {
      const merged = { ...prev, ...next }
      saveState(merged)
      return merged
    })
  }, [])

  const toggleMode = useCallback(() => {
    update({ mode: state.mode === 'dark' ? 'light' : 'dark' })
  }, [state.mode, update])

  const setBgImage = useCallback((img: string | null) => update({ bgImage: img }), [update])
  const setBgOpacity = useCallback((v: number) => update({ bgOpacity: v }), [update])

  // Apply CSS vars to :root whenever theme changes
  useEffect(() => {
    const root = document.documentElement
    const dark = state.mode === 'dark'
    root.style.setProperty('--bg-base', dark ? '#0A0F1E' : '#F0F2F5')
    root.style.setProperty('--bg-surface', dark ? '#111827' : '#FFFFFF')
    root.style.setProperty('--bg-elevated', dark ? '#1E2A3A' : '#F7F8FA')
    root.style.setProperty('--bg-panel', dark ? '#162032' : '#FAFBFC')
    root.style.setProperty('--border', dark ? 'rgba(99,120,150,0.18)' : 'rgba(0,0,0,0.08)')
    root.style.setProperty('--border-hover', dark ? 'rgba(99,120,150,0.35)' : 'rgba(0,0,0,0.18)')
    root.style.setProperty('--text-primary', dark ? '#F1F5F9' : '#0F172A')
    root.style.setProperty('--text-secondary', dark ? '#94A3B8' : '#475569')
    root.style.setProperty('--text-muted', dark ? '#475569' : '#94A3B8')
    root.style.setProperty('--accent', '#3B82F6')
    root.style.setProperty('--accent-hover', '#2563EB')
    root.style.setProperty('--accent-glow', dark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.10)')
    root.style.setProperty('--green', '#22C55E')
    root.style.setProperty('--green-dim', dark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.10)')
    root.style.setProperty('--red', '#EF4444')
    root.style.setProperty('--amber', '#F59E0B')
  }, [state.mode])

  return (
    <ThemeContext.Provider value={{ ...state, toggleMode, setBgImage, setBgOpacity }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}
