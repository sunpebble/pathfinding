# LangGraph Agent 集成设计

> 日期：2026-01-20
> 状态：已批准

## 概述

为 AI Service 添加基于 LangGraph.js + LangChain 的 Agent 系统，实现：

1. **智能旅行规划** - Agent 自动组合多个工具生成完整旅行计划
2. **增强对话能力** - 支持多轮对话、记忆、工具调用
3. **内容处理管道** - 标准化内容丰富流程（抓取→提取→丰富）

## 技术选型

| 方面       | 选择                     | 说明                           |
| ---------- | ------------------------ | ------------------------------ |
| 核心框架   | LangGraph.js + LangChain | 细粒度流程控制，支持交互式中断 |
| LLM 后端   | Ollama/OpenAI/Claude     | 可通过配置切换                 |
| 状态持久化 | Convex 数据库            | 与现有架构一致                 |
| 流式输出   | SSE                      | 实时展示 Agent 思考过程        |
| 交互模式   | 流式 + 交互式            | 支持用户在规划过程中介入       |
| 事件驱动   | 轮询 + 状态标记          | 新 guide 创建时自动触发丰富    |

## 目录结构

```
apps/ai-service/src/
├── index.ts                    # 入口（已存在）
├── lib/
│   ├── convex.ts              # Convex 客户端（已存在）
│   ├── llm/
│   │   ├── index.ts           # LLM 工厂，统一接口
│   │   ├── ollama.ts          # Ollama 适配器
│   │   ├── openai.ts          # OpenAI 适配器
│   │   └── claude.ts          # Claude 适配器
│   └── memory/
│       └── convex-memory.ts   # Convex 持久化 Memory 实现
├── tools/                      # LangChain Tools
│   ├── index.ts               # 工具注册中心
│   ├── weather.ts             # 天气查询工具
│   ├── transport.ts           # 交通路线工具
│   ├── poi.ts                 # POI 提取/搜索工具
│   ├── translate.ts           # 翻译工具
│   └── pdf.ts                 # PDF 导出工具
├── graphs/                     # LangGraph 图定义
│   ├── travel-planner.ts      # 旅行规划 Agent 图
│   ├── content-enricher.ts    # 内容丰富管道图
│   └── chat-agent.ts          # 增强对话 Agent 图
└── routes/
    ├── ai.ts                  # 现有路由（保留兼容）
    ├── agent.ts               # 新增：Agent 交互端点
    └── ...
```

## LLM 抽象层

### 接口定义

```typescript
// lib/llm/index.ts
type LLMProvider = "ollama" | "openai" | "claude";

interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  streaming?: boolean;
}

function createLLM(config?: Partial<LLMConfig>): BaseChatModel;
```

### 设计要点

- 工厂模式，通过环境变量 `LLM_PROVIDER` 控制默认后端
- 每个请求可通过参数覆盖默认配置
- 所有适配器返回统一的 `BaseChatModel` 接口（LangChain 标准）
- 依赖包：
  - `@langchain/ollama`
  - `@langchain/openai`
  - `@langchain/anthropic`

## Convex Memory 实现

### Schema 新增

```typescript
// packages/convex/schema.ts
chatSessions: defineTable({
  sessionId: v.string(),
  userId: v.optional(v.string()),
  messages: v.array(v.object({
    role: v.string(),        // 'human' | 'ai' | 'system' | 'tool'
    content: v.string(),
    toolCalls: v.optional(v.array(v.any())),
    timestamp: v.number(),
  })),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index('by_session', ['sessionId'])
  .index('by_user', ['userId']),
```

### Memory 实现要点

- 继承 LangGraph 的 `BaseCheckpointSaver` 接口
- 读写操作通过 Convex HTTP Actions
- 支持会话恢复和历史查询

## Tools 定义

| 工具名             | 描述           | 输入参数                        |
| ------------------ | -------------- | ------------------------------- |
| `weather_query`    | 查询目的地天气 | `location`, `date`              |
| `route_planner`    | 规划交通路线   | `origin`, `destination`, `mode` |
| `poi_search`       | 搜索/提取 POI  | `query` 或 `content`            |
| `translate_text`   | 翻译文本       | `text`, `targetLang`            |
| `export_pdf`       | 导出行程 PDF   | `guideId`                       |
| `get_guide_detail` | 获取攻略详情   | `guideId`                       |

使用 LangChain 的 `DynamicStructuredTool`，支持 Zod schema 验证输入。

## LangGraph 图设计

### 旅行规划 Agent（travel-planner）

```
┌─────────────────────────────────────────────────────┐
│                    START                             │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│              parse_user_intent                       │
│      解析用户意图：目的地、日期、偏好等              │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│              gather_information                      │
│    并行调用：天气、POI搜索、相关攻略                 │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│              generate_draft_plan                     │
│           生成初步行程草案                           │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│          human_review (interrupt)                    │
│    ⏸️ 暂停等待用户确认/修改                          │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│              refine_plan                             │
│         根据用户反馈优化行程                         │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│              add_transport                           │
│         添加交通路线规划                             │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│                    END                               │
│              返回完整行程                            │
└─────────────────────────────────────────────────────┘
```

**关键点：**

- `human_review` 节点使用 LangGraph 的 `interrupt()` 实现交互式暂停
- 状态通过 Convex Memory 持久化，支持跨请求恢复
- 支持流式输出每个节点的执行进度

### 内容丰富管道（content-enricher）

```
START → extract_metadata → extract_pois → geocode_pois → generate_summary → save_to_db → END
```

- 线性管道，无需人工介入
- 由 Convex 的新 guide 事件触发
- 失败时记录错误，不阻塞流程

### 增强对话 Agent（chat-agent）

```
START → route_query → [tool_executor | direct_response] → format_response → END
                ↑______________________________________|
                          (循环直到完成)
```

- ReAct 模式：Reasoning + Acting
- 根据用户问题决定是否需要调用工具
- 支持多轮对话，记忆存储在 Convex

## API 端点设计

```typescript
// routes/agent.ts 新增端点

// 1. 创建/恢复规划会话
POST /api/agent/plan/start
Body: { destination, dates, preferences, sessionId? }
Response: { sessionId, streamUrl }

// 2. 流式接收 Agent 输出 (SSE)
GET /api/agent/plan/:sessionId/stream
Response: Server-Sent Events

// 3. 用户反馈（交互式节点）
POST /api/agent/plan/:sessionId/feedback
Body: { action: 'approve' | 'modify', modifications? }

// 4. 获取会话状态
GET /api/agent/plan/:sessionId/status
Response: { status, currentNode, result? }

// 5. 增强对话
POST /api/agent/chat
Body: { sessionId, message }
Response: SSE stream

// 6. 手动触发内容丰富（备用）
POST /api/agent/enrich/:guideId
Response: { jobId, status }
```

## 事件驱动集成

由于 Convex 不直接支持 webhook，采用 **轮询 + 标记** 方案：

### Schema 更新

```typescript
// packages/convex/schema.ts
travelGuides: defineTable({
  // ... 现有字段
  enrichmentStatus: v.optional(v.string()), // 'pending' | 'processing' | 'completed' | 'failed'
  enrichmentError: v.optional(v.string()),
});
```

### 流程

1. 新 guide 创建时，`enrichmentStatus` 默认为 `'pending'`
2. AI Service 定时（每 30s）查询 `status === 'pending'` 的 guides
3. 拉取后标记为 `'processing'`，执行丰富管道
4. 完成后更新为 `'completed'` 或 `'failed'`

## 依赖包

```json
{
  "dependencies": {
    "@langchain/core": "^0.3.x",
    "@langchain/langgraph": "^0.2.x",
    "@langchain/ollama": "^0.1.x",
    "@langchain/openai": "^0.3.x",
    "@langchain/anthropic": "^0.3.x",
    "zod": "^3.23.x"
  }
}
```

## 环境变量

```bash
# .env 新增
LLM_PROVIDER=ollama          # ollama | openai | claude
LLM_MODEL=gemma3:12b         # 默认模型

# OpenAI (可选)
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o

# Claude (可选)
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# 轮询间隔
ENRICHMENT_POLL_INTERVAL=30000
```

## 实现优先级

1. **Phase 1: 基础设施**
   - LLM 抽象层
   - Convex Memory schema
   - 工具定义

2. **Phase 2: 内容丰富管道**
   - content-enricher 图
   - 轮询机制
   - 与现有 enrich 逻辑集成

3. **Phase 3: 增强对话**
   - chat-agent 图
   - SSE 流式输出
   - 对话记忆

4. **Phase 4: 旅行规划**
   - travel-planner 图
   - 交互式中断/恢复
   - 完整工作流

## 风险与缓解

| 风险               | 缓解措施                                   |
| ------------------ | ------------------------------------------ |
| LangGraph 相对较新 | 保留现有 ai.ts 路由作为降级方案            |
| Ollama 不稳定      | 支持多后端切换                             |
| 轮询效率低         | 可后续迁移到 Convex 的 scheduled functions |
| 状态同步复杂       | 使用 LangGraph 的 checkpoint 机制统一管理  |
