import { useState, useEffect, useCallback } from 'react'
import { MODEL_PRESETS } from '../utils/modelPresets'

interface StartupStatus {
  wechatInstalled: boolean
  wechatConnected: boolean
  wechatError: string
  aiConfigured: boolean
  onboardingDone: boolean
}

interface Props {
  onComplete: () => void
}

// ---- Step indicator ----
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? '20px' : '6px',
            height: '6px',
            background: i <= current ? 'var(--accent)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}

// ---- Status badge ----
function StatusBadge({ ok, loading, label }: { ok?: boolean; loading?: boolean; label: string }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}
      >
        {ok ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3" style={{ color: 'var(--green)' }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3" style={{ color: 'var(--red)' }}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        )}
      </div>
      <span className="text-sm" style={{ color: ok ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

// ---- Code block ----
function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 mt-3 mb-1 font-mono text-sm"
      style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--accent)' }}
    >
      <span>{children}</span>
      <button
        onClick={copy}
        className="no-drag ml-3 shrink-0 cursor-pointer"
        style={{ color: copied ? 'var(--green)' : 'var(--text-muted)' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = copied ? 'var(--green)' : 'var(--text-muted)'}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        )}
      </button>
    </div>
  )
}

// ============ Step components ============

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Logo */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)', boxShadow: '0 8px 32px rgba(59,130,246,0.35)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>

      <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>欢迎使用 WeLife</h1>
      <p className="text-sm leading-relaxed mb-2 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
        WeLife 是一款基于本地数据的个人关系与聊天记录管理工具
      </p>
      <p className="text-xs leading-relaxed mb-10 max-w-sm" style={{ color: 'var(--text-muted)' }}>
        所有数据仅存储在你的设备上，永不上传至任何服务器
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <div className="flex items-center gap-3 text-left rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-glow)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4" style={{ color: 'var(--accent)' }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>微信聊天记录</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>基于 wechat-cli 读取本地数据</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-left rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4" style={{ color: 'var(--green)' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>AI 辅助分析</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>接入自定义大模型 API（可选）</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-left rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4" style={{ color: 'var(--amber)' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>完全本地</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>数据不离开你的电脑</div>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="no-drag mt-8 w-full max-w-xs py-3 rounded-xl text-sm font-semibold text-white cursor-pointer"
        style={{ background: 'var(--accent)' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
      >
        开始配置
      </button>
    </div>
  )
}

function StepWechat({
  status,
  onNext,
  onRecheck,
}: {
  status: StartupStatus | null
  onNext: () => void
  onRecheck: () => void
}) {
  const loading = status === null
  const installed = status?.wechatInstalled ?? false
  const connected = status?.wechatConnected ?? false

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-glow)', border: '1px solid rgba(59,130,246,0.25)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: 'var(--accent)' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>配置微信数据</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>WeLife 通过 wechat-cli 读取本地聊天记录</p>
        </div>
      </div>

      <div className="my-5 space-y-3 rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <StatusBadge loading={loading} ok={installed} label="wechat-cli 已安装" />
        <StatusBadge loading={loading} ok={connected} label="微信数据可读取" />
      </div>

      {!loading && !installed && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>安装 wechat-cli</p>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>在终端中运行以下命令：</p>
          <Code>npm install -g wechat-cli</Code>
          <p className="text-xs mt-3 mb-1" style={{ color: 'var(--text-muted)' }}>安装后，登录你的微信账号：</p>
          <Code>wechat-cli login</Code>
          <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            完成后点击「重新检测」验证安装结果
          </p>
        </div>
      )}

      {!loading && installed && !connected && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--amber)' }}>需要登录微信</p>
          <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            wechat-cli 已安装，但无法读取数据。可能原因：
          </p>
          <ul className="text-xs space-y-1 mb-3" style={{ color: 'var(--text-muted)' }}>
            <li>• 未登录微信：运行 <code className="font-mono px-1 rounded" style={{ background: 'var(--bg-base)', color: 'var(--accent)' }}>wechat-cli login</code></li>
            <li>• 微信未在后台运行：请打开电脑微信</li>
            <li>• 权限问题：需要授权磁盘访问</li>
          </ul>
          {status?.wechatError && (
            <div className="text-xs font-mono rounded-lg p-2 mt-1" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              {status.wechatError}
            </div>
          )}
        </div>
      )}

      {!loading && installed && connected && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--green)' }}>数据连接正常</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>WeLife 可以读取你的微信聊天记录</p>
        </div>
      )}

      <div className="flex gap-2 mt-2">
        {(!loading && !(installed && connected)) && (
          <button
            onClick={onRecheck}
            className="no-drag flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            重新检测
          </button>
        )}
        <button
          onClick={onNext}
          className="no-drag flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
          style={{
            background: connected ? 'var(--accent)' : 'var(--bg-elevated)',
            color: connected ? '#fff' : 'var(--text-secondary)',
            border: connected ? 'none' : '1px solid var(--border)',
          }}
          onMouseEnter={(e) => { if (connected) e.currentTarget.style.background = 'var(--accent-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = connected ? 'var(--accent)' : 'var(--bg-elevated)' }}
        >
          {connected ? '下一步' : '跳过，稍后配置'}
        </button>
      </div>
    </div>
  )
}

function StepAI({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [preset, setPreset] = useState('claude-sonnet-4-6')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.anthropic.com')
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const handlePreset = (v: string) => {
    setPreset(v)
    const p = MODEL_PRESETS.find(x => x.value === v)
    if (p && v !== 'custom') setBaseUrl(p.baseUrl)
  }

  const model = preset === 'custom' ? '' : preset

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    await window.api.saveSettings({ ai_api_key: apiKey.trim(), ai_model: model, ai_base_url: baseUrl })
    setSaving(false)
    onNext()
  }

  const inputCls = "no-drag w-full text-sm rounded-xl px-3 py-2.5 outline-none"
  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: 'var(--green)' }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>配置 AI（可选）</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>用于聊天总结与智能问答，也可跳过</p>
        </div>
      </div>

      <div className="my-5 space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>选择模型</label>
          <select
            value={preset}
            onChange={(e) => handlePreset(e.target.value)}
            className={`${inputCls} cursor-pointer`}
            style={{ ...inputStyle, appearance: 'none' as const }}
          >
            {MODEL_PRESETS.map(p => (
              <option key={p.value} value={p.value} style={{ background: '#1E293B' }}>{p.label}</option>
            ))}
          </select>
        </div>

        {preset === 'custom' && (
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>API Base URL</label>
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="https://api.openai.com"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>API Key</label>
          <div className="relative">
            <input
              className={inputCls}
              style={{ ...inputStyle, paddingRight: '40px' }}
              type={showKey ? 'text' : 'password'}
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => setShowKey(v => !v)}
              className="no-drag absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                {showKey
                  ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                  : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        <div
          className="text-xs rounded-xl p-3 flex gap-2 items-start"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          API Key 仅保存在本地数据库，不会上传至任何服务器
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSkip}
          className="no-drag flex-1 py-2.5 rounded-xl text-sm cursor-pointer"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          跳过
        </button>
        <button
          onClick={handleSave}
          disabled={!apiKey.trim() || saving}
          className="no-drag flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)', color: '#fff' }}
          onMouseEnter={(e) => { if (apiKey.trim()) e.currentTarget.style.background = 'var(--accent-hover)' }}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
        >
          {saving ? '保存中...' : '保存并继续'}
        </button>
      </div>
    </div>
  )
}

function StepDone({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10" style={{ color: 'var(--green)' }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>

      <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>配置完成！</h2>
      <p className="text-sm leading-relaxed mb-8 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
        WeLife 已准备就绪。你可以随时在设置中修改这些配置。
      </p>

      <div className="w-full max-w-xs space-y-2 mb-8 text-left">
        {[
          { text: '通过微信页面查看聊天记录', icon: '💬' },
          { text: '在日志页查看事件时间线', icon: '📋' },
          { text: '使用 AI 总结对话内容', icon: '✨' },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-4 py-2.5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <span className="text-base shrink-0">{item.icon}</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="no-drag w-full max-w-xs py-3 rounded-xl text-sm font-semibold text-white cursor-pointer"
        style={{ background: 'var(--green)' }}
        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
      >
        进入 WeLife
      </button>
    </div>
  )
}

// ============ Main wizard ============
const TOTAL_STEPS = 4

export default function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState<StartupStatus | null>(null)

  const runCheck = useCallback(async () => {
    setStatus(null)
    const res = await window.api.checkStartup()
    if (res.success && res.data) setStatus(res.data)
  }, [])

  useEffect(() => {
    if (step === 1) runCheck()
  }, [step, runCheck])

  const handleComplete = async () => {
    await window.api.completeOnboarding()
    onComplete()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', zIndex: 200 }}
    >
      {/* Traffic light zone */}
      <div className="drag-region fixed top-0 left-0 right-0 h-8 pointer-events-none" style={{ zIndex: 201 }} />

      <div
        className="w-[460px] max-h-[90vh] overflow-y-auto rounded-3xl p-8"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}
      >
        <StepDots total={TOTAL_STEPS} current={step} />

        {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
        {step === 1 && (
          <StepWechat
            status={status}
            onNext={() => setStep(2)}
            onRecheck={runCheck}
          />
        )}
        {step === 2 && (
          <StepAI
            onNext={() => setStep(3)}
            onSkip={() => setStep(3)}
          />
        )}
        {step === 3 && <StepDone onComplete={handleComplete} />}
      </div>
    </div>
  )
}
