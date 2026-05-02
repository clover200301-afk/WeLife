import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useTheme } from '../../store/theme'
import { MODEL_PRESETS } from '../../utils/modelPresets'

type Section = 'general' | 'appearance' | 'ai' | 'data'

interface SettingsData {
  ai_base_url: string
  ai_api_key: string
  ai_model: string
}

// ── Base card & row components ────────────────────────────────────────────────

function Card({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="space-y-0">
      {title && (
        <div className="px-1 pb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {title}
          </span>
        </div>
      )}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({
  label,
  description,
  last = false,
  children,
}: {
  label: string
  description?: string
  last?: boolean
  children?: ReactNode
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 gap-4"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {description && (
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {description}
          </div>
        )}
      </div>
      {children && <div className="shrink-0 flex items-center">{children}</div>}
    </div>
  )
}

function SectionHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center mb-7 pt-1">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {icon}
      </div>
      <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h1>
      <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="no-drag relative w-11 h-6 rounded-full cursor-pointer shrink-0"
      style={{ background: checked ? 'var(--accent)' : 'var(--bg-elevated)', border: '1px solid var(--border)', transition: 'background 200ms' }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 rounded-full"
        style={{
          background: '#fff',
          left: checked ? 'calc(100% - 22px)' : '2px',
          transition: 'left 200ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  )
}

function InlineInput({
  type = 'text',
  placeholder,
  value,
  onChange,
}: {
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      className="no-drag text-sm rounded-lg px-3 py-1.5 outline-none"
      style={{
        width: '220px',
        background: 'var(--bg-elevated)',
        border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
        color: 'var(--text-primary)',
        transition: 'border-color 150ms',
      }}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

// ── Nav sidebar icons ─────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Section; label: string; color: string; icon: ReactNode }[] = [
  {
    id: 'general',
    label: '通用',
    color: '#6B7280',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5" style={{ width: 18, height: 18 }}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
  {
    id: 'appearance',
    label: '外观',
    color: '#7C3AED',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
  },
  {
    id: 'ai',
    label: 'AI 模型',
    color: '#2563EB',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
      </svg>
    ),
  },
  {
    id: 'data',
    label: '数据管理',
    color: '#059669',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
]

// ── Section content renderers ─────────────────────────────────────────────────

function GeneralSection() {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, color: 'var(--text-secondary)' }}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        }
        title="通用"
        description="WeLife 的基本信息与应用状态"
      />
      <Card title="关于">
        <Row label="应用版本">
          <span className="text-xs rounded-full px-2.5 py-0.5 font-medium" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            v1.0.0
          </span>
        </Row>
        <Row label="数据来源" description="只读访问，不修改任何原始微信数据" last>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>wechat-cli</span>
        </Row>
      </Card>
      <Card title="隐私">
        <Row label="本地存储" description="所有聊天记录和 AI 分析结果仅存储在本机，不上传至任何服务器" last>
          <div
            className="flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 font-medium"
            style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            安全
          </div>
        </Row>
      </Card>
    </div>
  )
}

function AppearanceSection({
  mode,
  toggleMode,
  bgImage,
  setBgImage,
  bgOpacity,
  setBgOpacity,
  fileInputRef,
  onUpload,
}: {
  mode: 'dark' | 'light'
  toggleMode: () => void
  bgImage: string | null
  setBgImage: (v: string | null) => void
  bgOpacity: number
  setBgOpacity: (v: number) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, color: 'var(--text-secondary)' }}>
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        }
        title="外观"
        description="自定义应用的视觉样式和背景图片"
      />
      <Card title="主题">
        <Row label="主题模式" description={mode === 'dark' ? '当前：深色模式' : '当前：浅色模式'} last>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{mode === 'light' ? '浅色' : '深色'}</span>
            <Toggle checked={mode === 'dark'} onChange={toggleMode} />
          </div>
        </Row>
      </Card>
      <Card title="背景">
        <Row
          label="背景图片"
          description={bgImage ? '已设置自定义背景' : '选择一张图片作为应用背景'}
          last={!bgImage}
        >
          {bgImage ? (
            <div className="flex items-center gap-2">
              <div
                className="w-14 h-9 rounded-lg bg-cover bg-center shrink-0"
                style={{ backgroundImage: `url(${bgImage})`, border: '1px solid var(--border)' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="no-drag text-xs px-2.5 py-1.5 rounded-lg cursor-pointer"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                更换
              </button>
              <button
                onClick={() => setBgImage(null)}
                className="no-drag text-xs px-2.5 py-1.5 rounded-lg cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)' }}
              >
                移除
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="no-drag text-xs px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              选择图片
            </button>
          )}
        </Row>
        {bgImage && (
          <Row label="遮罩透明度" description={`${Math.round(bgOpacity * 100)}%（值越高背景越淡）`} last>
            <input
              type="range"
              min="0.3"
              max="0.98"
              step="0.01"
              value={bgOpacity}
              onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
              className="no-drag rounded-full appearance-none cursor-pointer"
              style={{ width: '120px', height: '6px', accentColor: 'var(--accent)' }}
            />
          </Row>
        )}
      </Card>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
    </div>
  )
}

function AISection({
  settings,
  setSettings,
  modelPreset,
  onPresetChange,
  onSave,
  saved,
  selectFocused,
  setSelectFocused,
}: {
  settings: SettingsData
  setSettings: React.Dispatch<React.SetStateAction<SettingsData>>
  modelPreset: string
  onPresetChange: (v: string) => void
  onSave: () => void
  saved: boolean
  selectFocused: boolean
  setSelectFocused: (v: boolean) => void
}) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, color: 'var(--text-secondary)' }}>
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          </svg>
        }
        title="AI 模型"
        description="配置用于聊天分析的 AI 模型和 API 接入信息"
      />
      <Card title="模型配置">
        <Row label="模型预设" description="选择内置预设会自动填写 Base URL">
          <select
            className="no-drag text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            style={{
              width: '220px',
              background: 'var(--bg-elevated)',
              border: `1px solid ${selectFocused ? 'var(--accent)' : 'var(--border)'}`,
              color: 'var(--text-primary)',
              appearance: 'none',
              transition: 'border-color 150ms',
            }}
            value={modelPreset}
            onChange={(e) => onPresetChange(e.target.value)}
            onFocus={() => setSelectFocused(true)}
            onBlur={() => setSelectFocused(false)}
          >
            {MODEL_PRESETS.map(p => (
              <option key={p.value} value={p.value} style={{ background: 'var(--bg-elevated)' }}>{p.label}</option>
            ))}
          </select>
        </Row>
        <Row label="API Base URL" description="OpenAI 兼容接口地址">
          <InlineInput
            placeholder="https://api.deepseek.com"
            value={settings.ai_base_url}
            onChange={(v) => setSettings(s => ({ ...s, ai_base_url: v }))}
          />
        </Row>
        <Row label="API Key" description="以 sk- 开头的密钥，安全存储在本地">
          <InlineInput
            type="password"
            placeholder="sk-..."
            value={settings.ai_api_key}
            onChange={(v) => setSettings(s => ({ ...s, ai_api_key: v }))}
          />
        </Row>
        <Row label="模型名称" description="如：deepseek-chat、gpt-4o" last>
          <InlineInput
            placeholder="deepseek-chat"
            value={settings.ai_model}
            onChange={(v) => setSettings(s => ({ ...s, ai_model: v }))}
          />
        </Row>
      </Card>
      <button
        onClick={onSave}
        className="no-drag w-full text-sm font-medium rounded-xl py-2.5 cursor-pointer flex items-center justify-center gap-2 transition-colors"
        style={{
          background: saved ? 'rgba(34,197,94,0.12)' : 'var(--accent)',
          color: saved ? 'var(--green)' : '#fff',
          border: saved ? '1px solid rgba(34,197,94,0.25)' : 'none',
        }}
      >
        {saved ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            已保存
          </>
        ) : '保存配置'}
      </button>
    </div>
  )
}

function DataSection({ onClear, clearing }: { onClear: () => void; clearing: boolean }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, color: 'var(--text-secondary)' }}>
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
        }
        title="数据管理"
        description="管理本地存储的聊天记录和 AI 分析缓存"
      />
      <Card title="本地数据">
        <Row label="存储位置" last>
          <span className="text-xs rounded-lg px-2.5 py-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            本机 SQLite
          </span>
        </Row>
      </Card>
      <Card title="危险操作">
        <Row
          label="清空所有本地数据"
          description="将删除所有已同步的聊天记录、事件和 AI 分析，操作不可撤销"
          last
        >
          <button
            onClick={onClear}
            disabled={clearing}
            className="no-drag text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: 'var(--red)',
            }}
          >
            {clearing ? '清空中...' : '清空数据'}
          </button>
        </Row>
      </Card>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('general')
  const [settings, setSettings] = useState<SettingsData>({ ai_base_url: '', ai_api_key: '', ai_model: '' })
  const [saved, setSaved] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [modelPreset, setModelPreset] = useState('custom')
  const [selectFocused, setSelectFocused] = useState(false)
  const { mode, toggleMode, bgImage, setBgImage, bgOpacity, setBgOpacity } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.getSettings().then((r) => {
      if (r.success && r.data) {
        const s = r.data as SettingsData
        setSettings(s)
        const preset = MODEL_PRESETS.find(p => p.value === s.ai_model)
        setModelPreset(preset ? preset.value : 'custom')
      }
    })
  }, [])

  const handlePresetChange = (value: string) => {
    setModelPreset(value)
    const preset = MODEL_PRESETS.find(p => p.value === value)
    if (preset && value !== 'custom') {
      setSettings(s => ({ ...s, ai_model: preset.value, ai_base_url: preset.baseUrl }))
    }
  }

  const handleSave = async () => {
    await window.api.saveSettings({
      ai_base_url: settings.ai_base_url,
      ai_api_key: settings.ai_api_key,
      ai_model: settings.ai_model,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClearData = async () => {
    if (!confirm('确定要清空所有本地数据吗？此操作不可撤销。')) return
    setClearing(true)
    await window.api.clearData()
    setClearing(false)
    alert('数据已清空')
  }

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setBgImage(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="flex h-full" style={{ background: 'var(--bg-base)' }}>
      {/* Left sidebar */}
      <div
        className="w-[220px] shrink-0 flex flex-col h-full"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
      >
        <div className="drag-region h-8 shrink-0" />

        {/* App title */}
        <div className="px-4 pb-4 shrink-0">
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
            WeLife 设置
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = section === item.id
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className="no-drag w-full flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-left"
                style={{
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-primary)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: active ? 'rgba(255,255,255,0.2)' : item.color }}
                >
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Right content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="drag-region h-8 shrink-0" />
        <div className="max-w-[520px] mx-auto px-8 pb-10">
          {section === 'general' && <GeneralSection />}
          {section === 'appearance' && (
            <AppearanceSection
              mode={mode}
              toggleMode={toggleMode}
              bgImage={bgImage}
              setBgImage={setBgImage}
              bgOpacity={bgOpacity}
              setBgOpacity={setBgOpacity}
              fileInputRef={fileInputRef}
              onUpload={handleBgUpload}
            />
          )}
          {section === 'ai' && (
            <AISection
              settings={settings}
              setSettings={setSettings}
              modelPreset={modelPreset}
              onPresetChange={handlePresetChange}
              onSave={handleSave}
              saved={saved}
              selectFocused={selectFocused}
              setSelectFocused={setSelectFocused}
            />
          )}
          {section === 'data' && (
            <DataSection onClear={handleClearData} clearing={clearing} />
          )}
        </div>
      </div>
    </div>
  )
}
