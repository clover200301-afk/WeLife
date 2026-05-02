import https from 'https'
import http from 'http'
import { getSetting, getSecureSetting } from './db'
import type { AIConfig, AIMessage } from '../../src/types'

export function getAIConfig(): AIConfig | null {
  const base_url = getSetting('ai_base_url')
  const api_key = getSecureSetting('ai_api_key')
  const model = getSetting('ai_model')
  if (!base_url || !api_key || !model) return null
  return { base_url, api_key, model }
}

export async function chatCompletion(
  messages: AIMessage[],
  onChunk: (text: string) => void,
  configOverride?: Partial<AIConfig>
): Promise<string> {
  const base = getAIConfig()
  if (!base && !configOverride) throw new Error('AI config not set')
  const config: AIConfig = {
    base_url: configOverride?.base_url || base?.base_url || '',
    api_key: configOverride?.api_key || base?.api_key || '',
    model: configOverride?.model || base?.model || '',
  }
  if (!config.base_url || !config.api_key || !config.model) throw new Error('AI config incomplete')

  const url = new URL('/v1/chat/completions', config.base_url)
  const body = JSON.stringify({
    model: config.model,
    messages,
    stream: true,
    max_tokens: 2000
  })

  return new Promise((resolve, reject) => {
    const protocol = url.protocol === 'https:' ? https : http
    const req = protocol.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.api_key}`,
          Accept: 'text/event-stream'
        }
      },
      (res) => {
        let full = ''
        res.setEncoding('utf8')
        res.on('data', (chunk: string) => {
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const json = JSON.parse(data)
              const text = json.choices?.[0]?.delta?.content ?? ''
              if (text) { full += text; onChunk(text) }
            } catch {}
          }
        })
        res.on('end', () => resolve(full))
        res.on('error', reject)
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

export async function summarizeMessages(messageTexts: string[]): Promise<string> {
  const config = getAIConfig()
  if (!config) throw new Error('AI config not set')

  const content = messageTexts.join('\n')
  const messages: AIMessage[] = [
    { role: 'system', content: '你是一个聊天记录分析助手。请简洁地总结以下聊天记录的重点内容，不超过100字。' },
    { role: 'user', content: `以下是聊天记录：\n${content}\n\n请总结重点内容` }
  ]

  let result = ''
  await chatCompletion(messages, (text) => { result += text })
  return result
}

export async function analyzeEventMessages(
  messageTexts: string[],
  chatName: string,
  timeRange: string
): Promise<string> {
  const config = getAIConfig()
  if (!config) throw new Error('AI config not set')

  const content = messageTexts.join('\n')
  const systemPrompt = `你是一个专业的聊天记录分析系统。请分析以下聊天记录并以严格的JSON格式返回分析结果。

JSON格式要求：
{
  "title": "事件标题（简短概括，10字以内）",
  "summary": "一句话概括本次对话的主要内容",
  "topics": ["话题1", "话题2"],
  "sentiment": "positive|neutral|negative|mixed",
  "key_points": ["要点1", "要点2", "要点3"],
  "participants": ["参与者1", "参与者2"],
  "action_items": ["待办事项1（如有）"],
  "time_range": "${timeRange}",
  "message_count": ${messageTexts.length}
}

只返回JSON，不要有任何其他文字或代码块标记。`

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `聊天群组/联系人：${chatName}\n\n聊天记录：\n${content}` }
  ]

  let result = ''
  await chatCompletion(messages, (text) => { result += text })
  return result.trim()
}

export async function generateChatEventLog(
  messageTexts: string[],
  chatName: string,
  selfName: string,
  onChunk: (text: string) => void,
  configOverride?: Partial<AIConfig>
): Promise<string> {
  const systemPrompt = `你是一个专业的聊天记录事件分析系统。请分析以下所有聊天记录，将其整理成结构化的事件日志。

要求：
1. 将聊天记录按话题/事件分组，每个事件代表一个独立的讨论或事情
2. 每个事件必须包含以下字段：
   - time: 事件发生的时间范围，格式如"2024-01-15 14:20 – 15:30"
   - title: 事件标题（简短概括，10字以内）
   - people: 参与此事件的人名数组
   - content: 事件内容摘要（详细描述发生了什么）
   - mentions: 被@提及的人名数组（如果有人被@）
   - media: 涉及的媒体内容数组，每项格式为 { type: "image"|"video"|"link"|"sticker", description: "描述" }
   - related_to_me: 布尔值，此事件是否与"${selfName}"直接相关（被@、被提及、或我参与讨论）
3. 按时间顺序输出，最早的事件在前

以严格的JSON格式返回，格式如下：
{
  "chat_name": "${chatName}",
  "total_events": 数字,
  "time_range": "开始时间 – 结束时间",
  "events": [
    {
      "time": "时间范围",
      "title": "事件标题",
      "people": ["人名1", "人名2"],
      "content": "详细内容描述",
      "mentions": ["被@的人名"],
      "media": [{"type": "image", "description": "图片描述"}],
      "related_to_me": true
    }
  ]
}

只返回JSON，不要有任何其他文字或代码块标记。`

  const batchSize = 300
  if (messageTexts.length <= batchSize) {
    const msgs: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `聊天记录（共${messageTexts.length}条）：\n\n${messageTexts.join('\n')}` }
    ]
    return chatCompletion(msgs, onChunk, configOverride)
  }

  // For large histories, analyze in batches then merge
  const batches: string[][] = []
  for (let i = 0; i < messageTexts.length; i += batchSize) {
    batches.push(messageTexts.slice(i, i + batchSize))
  }

  const results: string[] = []
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const msgs: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `聊天记录（第${i+1}/${batches.length}段，共${batch.length}条）：\n\n${batch.join('\n')}` }
    ]
    const res = await chatCompletion(msgs, onChunk, configOverride)
    results.push(res)
  }
  return results[results.length - 1]
}
