import { useState, useEffect, Component, type ReactNode, type ErrorInfo } from 'react'
import Sidebar from './components/Sidebar'
import WeChatPage from './components/WeChat'
import LogPage from './components/Log'
import RelationsPage from './components/Relations'
import SettingsPage from './components/Settings'
import AIPage from './components/AI'
import OnboardingWizard from './components/OnboardingWizard'
import { useTheme } from './store/theme'

export type Page = 'wechat' | 'log' | 'relations' | 'ai' | 'settings'

type AppState = 'loading' | 'onboarding' | 'ready'

class PageErrorBoundary extends Component<{ children: ReactNode; pageName: string }, { error: Error | null }> {
  constructor(props: { children: ReactNode; pageName: string }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Page error [${this.props.pageName}]:`, error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8" style={{ background: 'var(--bg-base)' }}>
          <div className="text-sm font-medium" style={{ color: 'var(--red)' }}>页面加载失败</div>
          <div className="text-xs max-w-sm text-center opacity-60" style={{ color: 'var(--text-muted)' }}>
            {this.state.error.message}
          </div>
          <button
            className="no-drag text-xs rounded-lg px-3 py-1.5 cursor-pointer mt-2"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onClick={() => this.setState({ error: null })}
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [page, setPage] = useState<Page>('wechat')
  const [appState, setAppState] = useState<AppState>('loading')
  const { bgImage, bgOpacity } = useTheme()
  const [wechatNavChatId, setWechatNavChatId] = useState<string | undefined>()
  const [logNavChatId, setLogNavChatId] = useState<string | undefined>()

  function navigateToChat(chatId: string) {
    setWechatNavChatId(chatId)
    setPage('wechat')
  }

  function navigateToLog(chatId: string) {
    setLogNavChatId(chatId)
    setPage('log')
  }

  useEffect(() => {
    window.api.checkStartup().then((res) => {
      if (!res.success || !res.data) {
        setAppState('onboarding')
        return
      }
      const { onboardingDone, wechatConnected } = res.data
      // Show onboarding on first launch, or if wechat isn't working yet
      const needsSetup = !onboardingDone || !wechatConnected
      setAppState(needsSetup ? 'onboarding' : 'ready')
    }).catch(() => {
      // If check fails, proceed to app (don't block user)
      setAppState('ready')
    })
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
      {/* Custom background image layer */}
      {bgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url(${bgImage})`, zIndex: 0 }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'var(--bg-base)', opacity: bgOpacity, zIndex: 1 }}
          />
        </>
      )}

      <div className="drag-region fixed top-0 left-0 right-0 h-8 pointer-events-none" style={{ zIndex: 100 }} />

      {/* Loading splash */}
      {appState === 'loading' && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'var(--bg-base)', zIndex: 50 }}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)', boxShadow: '0 8px 24px rgba(59,130,246,0.3)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Main app */}
      {appState !== 'loading' && (
        <div className="flex flex-1 overflow-hidden relative" style={{ zIndex: 2 }}>
          <Sidebar currentPage={page} onNavigate={setPage} />
          <main className="flex-1 overflow-hidden min-w-0">
            {page === 'wechat' && <PageErrorBoundary pageName="wechat"><WeChatPage initialChatId={wechatNavChatId} /></PageErrorBoundary>}
            {page === 'log' && <PageErrorBoundary pageName="log"><LogPage initialChatId={logNavChatId} /></PageErrorBoundary>}
            {page === 'relations' && <PageErrorBoundary pageName="relations"><RelationsPage onNavigateToChat={navigateToChat} onNavigateToLog={navigateToLog} /></PageErrorBoundary>}
            {page === 'ai' && <PageErrorBoundary pageName="ai"><AIPage /></PageErrorBoundary>}
            {page === 'settings' && <PageErrorBoundary pageName="settings"><SettingsPage /></PageErrorBoundary>}
          </main>
        </div>
      )}

      {/* Onboarding overlay */}
      {appState === 'onboarding' && (
        <OnboardingWizard onComplete={() => setAppState('ready')} />
      )}
    </div>
  )
}
