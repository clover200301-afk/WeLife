# WeLife PRD.md（V1 已发布 · V2 开发规范）

---

## 1. 产品概述

### 1.1 产品定位

WeLife 是一个基于本地聊天数据的**个人关系与交流记录管理工具**。

核心能力：
- 聊天数据采集（基于 WeChat CLI）
- 聊天 → 事件结构化
- 日志化展示
- AI 辅助理解（非主导）

### 1.2 产品原则

- 🧑 **人优先**：所有 AI 结果可编辑
- 🔒 **本地优先**：无云同步，数据不离开用户设备
- 🤖 **AI 辅助**：不自动决策，用户确认后才保存

---

## 2. 系统架构

### 2.1 数据流

```
WeChat CLI → 原始消息 → 本地 SQLite DB → 事件生成 → UI 展示 → AI 调用（按需）
```

### 2.2 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | Electron 34 + electron-vite |
| 前端 | React 19 + TypeScript + Tailwind CSS |
| 本地 DB | SQLite（better-sqlite3） |
| AI 调用 | HTTP API（用户自配，支持 OpenAI / Anthropic / DeepSeek 等） |
| 数据来源 | wechat-cli（github.com/yangzhao917/wechat-cli） |

---

## 3. 核心模块（V1 已实现）

### 3.1 首次引导（Onboarding）

**每次启动时检查以下状态，任一未满足则进入引导流程：**

| 检查项 | IPC | 判定 |
|--------|-----|------|
| wechat-cli 已安装 | `check-startup` | `wechatInstalled` |
| 微信数据可读取 | `check-startup` | `wechatConnected` |
| AI 已配置 | `check-startup` | `aiConfigured` |
| 首次引导已完成 | `check-startup` | `onboardingDone` |

**引导步骤（4步）：**
1. **欢迎页** — 产品介绍 + 3 个核心价值
2. **微信数据** — 检测 wechat-cli，提供安装/登录指引
3. **AI 配置** — 可选，支持跳过
4. **完成** — 写入 `onboarding_complete=1`，进入主应用

### 3.2 微信数据接入

**数据来源：** `wechat-cli sessions` / `wechat-cli history`

**采集机制：**
- 每 60 秒 smart poll：仅同步 `last_timestamp` 有变化的会话
- 切换 chat / 手动刷新时立即触发

**DB 表结构：**

```sql
chats(id, name, type, unread, last_message, last_msg_type, last_sender, last_timestamp)
messages(id, chat_id, sender, content, type, timestamp, is_self)
events(id, chat_id, chat_name, start_time, end_time, message_ids, note, manual_edited)
settings(key, value)
```

### 3.3 事件系统

**事件生成规则：**
- 两条消息间隔 > 30 分钟 → 创建新事件
- 会话切换 → 创建新事件

**事件编辑（用户操作）：**
- ✏️ 修改时间范围
- ➕ 合并事件
- ✂️ 拆分事件
- 🏷 添加备注
- 一旦编辑：`manual_edited = true`，后续自动逻辑不再修改

### 3.4 聊天展示

- 会话列表：最近聊天排序，支持搜索
- 消息窗口：按天分组，支持文本 / 文件卡片
- 右侧联系人面板：显示最近事件列表
- ❗ V1 只读，不支持发送消息

### 3.5 日志系统

- 按天分组的事件时间线
- 左侧联系人筛选面板
- 右侧 AI 面板（按需总结 + 问答）

### 3.6 AI 模块

**支持模型：** Claude / GPT-4o / DeepSeek / 自定义

**功能（V1）：**
1. 事件聊天总结（点击触发，流式输出）
2. 基于当前事件的问答

**约束：** AI 输出不自动写入 DB，需用户确认

### 3.7 设置

- AI API Key / 模型 / Base URL 配置
- 外观：深色/浅色主题切换
- 背景图自定义（本地图片 + 遮罩透明度）
- 数据管理：手动刷新 / 清空所有本地数据

---

## 4. V1 不包含内容

❌ 关系图谱  
❌ 情绪分析  
❌ 自动关系判断  
❌ 多账号  
❌ 云同步  

---

## 5. V2 开发规范 — 关系图谱模块

### 5.1 模块概述

**目标：** 将用户微信数据（聊天频率、消息量、事件密度）可视化为一张可交互的关系力导图，帮助用户直观了解自己的社交网络结构。

**数据来源：** 全部来自本地 DB，不新增采集。  
**计算时机：** 进入关系页时懒计算，结果缓存至内存，不持久化（保持 DB 简洁）。

---

### 5.2 页面布局（4 列，参考 relations.png）

```
┌────────┬──────────────────┬──────────────────────────────────┬──────────────┐
│ Sidebar│  联系人列表       │  关系图谱（主视图）               │  详情面板    │
│  76px  │  220px           │  flex-1                          │  260px       │
└────────┴──────────────────┴──────────────────────────────────┴──────────────┘
```

**顶部 Tab 栏（主视图区域内）：**
- 关系网络（默认）
- 互动频率（柱状图）
- 共同好友（暂不实现，占位）

---

### 5.3 联系人列表（第二列）

| 字段 | 来源 | 说明 |
|------|------|------|
| 联系人名 | `chats.name` | |
| 类型标签 | `chats.type` | 私聊 / 群聊 |
| 互动分数 | 计算公式 | 消息总数 × 0.4 + 事件数 × 0.6 |
| 最后互动 | `chats.last_timestamp` | |

功能：
- 点击联系人 → 在图谱中高亮该节点 + 打开详情面板
- 支持搜索过滤
- 按互动分数排序（默认）

---

### 5.4 关系图谱（力导向图）

**库选型：** `d3-force`（轻量，可定制，约 50KB）

**节点：**
```ts
interface GraphNode {
  id: string          // chat_id
  name: string
  type: 'private' | 'group'
  score: number       // 互动分数，决定节点大小
  messageCount: number
  eventCount: number
  lastActive: number
}
```

**边：**
```ts
interface GraphEdge {
  source: string    // 中心节点（用户自己）
  target: string    // 联系人 id
  weight: number    // 最近 30 天消息数
  strength: number  // 归一化 0-1，决定边粗细
}
```

**力模型参数：**
```ts
{
  charge: -300,            // 节点互斥力
  linkDistance: 120,       // 边默认长度
  collide: nodeRadius + 8, // 防重叠
  center: true             // 向中心聚合
}
```

**节点视觉规则：**

| 属性 | 规则 |
|------|------|
| 半径 | `12 + Math.sqrt(score) * 2`，最大 40px |
| 颜色 | 按 hash 取 10 色 palette，群聊用特殊图案 |
| 边框 | 选中：2px accent，hover：1px secondary |
| 标签 | 悬停显示名字 + score |

**边视觉规则：**

| 属性 | 规则 |
|------|------|
| 粗细 | `1 + strength * 4`（1-5px） |
| 颜色 | `rgba(59,130,246, 0.2 + strength * 0.5)` |
| 动画 | 首次加载时 500ms ease-in |

**交互：**
- 拖拽节点
- 滚轮缩放（min: 0.3x，max: 3x）
- 点击节点 → 选中 + 打开详情面板
- 双击节点 → 跳转到微信聊天页并选中该联系人
- 右上角：重置视图按钮 / 搜索按钮

---

### 5.5 详情面板（第四列）

选中联系人后显示：

**基本信息区：**
- 头像（色块）+ 名字 + 类型标签
- 互动分数（大数字展示）

**统计卡片（2×2 grid）：**
- 消息总数
- 事件总数
- 平均每次事件消息数
- 最近活跃时间

**互动趋势（迷你折线图）：**
- 最近 8 周每周消息数
- 用 SVG 手绘折线（不依赖图表库）

**快捷操作：**
- 查看聊天记录 → 跳转微信页
- 查看事件日志 → 跳转日志页（带联系人筛选）

---

### 5.6 互动分数计算

```ts
function calcScore(chatId: string): number {
  const db = getDb()
  const msgCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE chat_id = ?').get(chatId).c
  const evtCount = db.prepare('SELECT COUNT(*) as c FROM events WHERE chat_id = ?').get(chatId).c
  // 最近 7 天活跃加成
  const recentCount = db.prepare(
    'SELECT COUNT(*) as c FROM messages WHERE chat_id = ? AND timestamp > ?'
  ).get(chatId, Math.floor(Date.now()/1000) - 7*86400).c
  return Math.round(msgCount * 0.4 + evtCount * 1.5 + recentCount * 0.6)
}
```

---

### 5.7 新增 IPC（V2）

| 通道 | 参数 | 返回 |
|------|------|------|
| `get-graph-data` | — | `{ nodes: GraphNode[], edges: GraphEdge[] }` |
| `get-contact-stats` | `chatId: string` | `{ weeklyTrend: number[], avgMsgPerEvent: number }` |

---

### 5.8 技术实现步骤

1. **安装依赖：**
   ```bash
   npm install d3-force
   npm install --save-dev @types/d3-force
   ```

2. **新建文件：**
   - `electron/main/graph-service.ts` — 计算 nodes/edges + stats
   - `src/components/Relations/index.tsx` — 主页面（4列布局）
   - `src/components/Relations/ContactList.tsx` — 联系人列表
   - `src/components/Relations/GraphCanvas.tsx` — D3 力导图画布
   - `src/components/Relations/ContactDetail.tsx` — 详情面板

3. **渲染 D3 in React：**
   - 用 `useRef<SVGSVGElement>` 持有 DOM
   - 在 `useEffect` 中初始化 d3-force 模拟
   - 用 `useState` 管理选中节点，React 负责 UI 层
   - D3 只负责物理模拟 + 位置计算，不操作 DOM（避免冲突）

---

## 6. 非功能需求

| 需求 | 指标 |
|------|------|
| 性能 | 支持 ≥ 10 万条消息，查询 < 200ms |
| 图谱渲染 | ≤ 500 节点时 60fps，> 500 节点降采样或分页 |
| 安全 | 数据仅存本地，不自动上传 |
| 稳定性 | wechat-cli 失败时 UI 提示，不崩溃 |

---

## 7. 版本路线图

| 版本 | 状态 | 主要内容 |
|------|------|----------|
| V1 | ✅ 已完成 | 聊天展示、事件日志、AI 总结、引导页、主题切换 |
| V2 | 🚧 开发中 | 关系图谱、互动频率、联系人详情 |
| V3 | 📋 规划中 | 情绪趋势、周/月报告、AI 关系分析 |
