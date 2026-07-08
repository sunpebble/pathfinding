# iOS 助手 tab + chat 契约对齐 设计：iOS 适配 API（持久会话）

日期：2026-07-08
状态：已与维护者确认方向与体验，待审阅
前置：后端 Cloudflare Workers 迁移已完成并上线（`https://api.trips.sunpebblelabs.com`），
chat 端点可达。本 spec 修复 iOS 客户端与 chat API 的契约分裂，并根治「助手 tab 永久转圈」的客户端侧成因。

## 0. 范围与背景

**根因回顾**（系统化调试结论）：
- 后端已上线，`GET /api/chat/sessions` 正常返回 `{"data":[]}`。
- 但 iOS 客户端说的是**旧（Convex/Mongo）契约**，与现 API 几乎全维度不一致 → 解码失败、调用 404。
- 且助手 tab **无登录门**：未登录用户直接打 doomed 请求；`fetchSessions(refresh:)` 先清空再拉，
  失败时无错误 UI → 在 Release 构建（waitsForConnectivity + 重试）下表现为「永久转圈」。

**目标**：iOS 客户端能正常列出/创建/查看/删除会话、发送消息并收到 AI 在会话内的上下文回复；
助手 tab 未登录时提示登录、出错时显示重试而非永久转圈。

**已确认决策**：
- 对齐方向：**iOS 适配 API**（API 保持全仓一致的 `{data}` + snake_case）。
- chat 体验：**持久会话对话**（会话内多轮、AI 带上下文回复、消息持久）。

**不在范围**：
- dashboard 的 `/chat` 页（走 `/api/chat` proxy，不受影响）。
- chat UI 视觉重构、富 metadata（POI 卡片/快捷动作）消费——本期仅留空兼容。
- 数据迁移（D1 已建表，无历史数据）。

## 1. 契约差异清单（现状）

| 维度 | iOS 期望（旧） | API 实际 |
|---|---|---|
| 外层 | `{success, data}` | `{data}` |
| id | `_id` | `id` |
| 字段命名 | camelCase | snake_case（`user_id`/`created_at`/`message_count`/`last_message_at`/`is_archived`） |
| 取消息 | `GET /sessions/:id/messages` | `GET /messages?sessionId=`（无会话作用域路由） |
| 发消息 | `POST /sessions/:id/messages {content}`，回 `{success,data:{userMessageId,response}}` | `POST /messages {sessionId,role,content}` 仅存、不回 AI |
| 改/删 | `PATCH /sessions/:id`；`DELETE /sessions/:id/messages` | 仅 `DELETE /sessions/:id`（归档）；无 PATCH |
| 建会话 | `{userId,title,itineraryId,guideId,context:string}` | `{title, context:record}` |
| AI 回复 | 会话内 | 仅无状态 `POST /query` |

**功能缺口**：API 无「会话内发送→AI 上下文回复→持久化」端点。本 spec 补齐。

## 2. 方案选型

| 方案 | 说明 | 取舍 | 结论 |
|---|---|---|---|
| **A（采用）** | iOS 适配 API；API 补一个「发送即回复」会话作用域端点 | API 保持一致；iOS 现代化契约；iOS 反正要改（韧性修复） | ✅ |
| B | API 适配 iOS（camelCase + `_id` + `success` + 旧路由） | chat 成全仓唯一异类，维护债 | ✗ |
| C | 两边都改成新形状 | 改动最大 | ✗ |

## 3. API 端 chat 契约（目标形状）

**新增端点：**

### `POST /api/chat/sessions/:id/messages` —— 发送即回复（持久对话核心）

- 鉴权：`authRequired()` + `requireOwnedSession(db, id, userId)`。
- body schema（Zod）：`{ content: z.string().trim().min(1) }`。
- 流程（**先获取 AI 回复，成功才持久化**——D1 不支持跨外部 fetch 的事务；AI 失败则不写任何消息，503，重试幂等）：
  1. 取该 session 最近 ≤20 条**已存**消息（按 `createdAt` 升序）作历史。
  2. 调 `deepSeekCompletion([{role:'system',content:系统提示}, ...历史(role/content), {role:'user',content:新内容}]?, { apiKey: c.env.DEEPSEEK_API_KEY ?? '', signal: c.req.raw.signal })`（新内容此时**未入库**，直接传给模型）。
  3. **成功后**才写库：插入用户消息 `{sessionId:id, role:'user', content:新内容}` → `userMessage`；插入 AI 消息 `{sessionId:id, role:'assistant', content:回复}` → `assistantMessage`；更新 session `lastMessageAt`。
  4. 返回 `201 { data: { user_message: toChatDto(userMessage), assistant_message: toChatDto(assistantMessage) } }`。
- **AI 失败**：`deepSeekCompletion` 抛错（含 `DeepSeekConfigError`）→ `503 { error: 'AI service unavailable' }`，**不写任何消息**。iOS 重试即重发（幂等）。

**新增端点：**

### `GET /api/chat/sessions/:id/messages` —— 会话作用域消息列表

- 鉴权：`authRequired()` + `requireOwnedSession`。
- query：`limit`（默认 50，上限 100）。**不分页游标**（会话消息量有限；YAGNI）。
- 返回 `200 { data: [toChatDto(...)] }`（按 `createdAt` 升序）。

**保留不动**：`GET /sessions`、`POST /sessions`、`DELETE /sessions/:id`、`POST /query`、`POST /messages`（通用 role 写入，留作内部/兼容）。旧 `GET /messages?sessionId=` 保留（不删，避免误伤）。

**系统提示**（复用现有风格）：`'你是 Sunpebble Trips 的旅行助手。结合会话历史，回答简洁、具体、可执行。'`

## 4. iOS 模型解码（`apps/ios/.../Models/Chat.swift`）

全量改为 API 形状（`{data}` + snake_case + `id`）：

- `ChatSessionListResponse`：去 `success` → `{ data: [ChatSession] }`。
- `ChatSession`：CodingKeys 改 snake_case + `id`：
  - `id`（删 `_id`）、`user_id`、`title`、`message_count`、`last_message_at`、`is_archived`、`created_at`。
  - `itineraryId/guideId/context` 及关联 `itinerary/guide`：API 不返回 → 删除这些字段与 `LinkedItinerary/LinkedGuide` 类型（YAGNI，UI 引用同步删）。
  - **时间字段格式**：API 经 `convertKeysToSnakeCase` 仅改键名，`Date` 值由 Hono `c.json` 序列化为 **ISO8601 字符串**（如 `"2026-07-08T10:51:16.528Z"`）。iOS 不再用旧的 `Double/1000`（那是 Convex 毫秒数值），改为用 `ISO8601DateFormatter` 把 `last_message_at`/`created_at` 字符串解码为 `Date`（`JSONDecoder.dateDecodingStrategy = .iso8601`）。
- `ChatMessage`：`id`（删 `_id`）、`session_id`、`role`、`content`、`created_at`。
- `ChatMessageListResponse`：去 `success`/`cursor`/`isDone` → `{ data: [ChatMessage] }`（无游标）。
- 新增 `SendMessageResponse`：`{ data: { user_message: ChatMessage, assistant_message: ChatMessage } }`。
- 删除/留空兼容富字段：`MessageMetadata`（`pois/quickActions/itineraryChanges/sources`）——本期 assistant 消息不带 metadata，类型保留但 UI 不消费（或删，按最小改动取舍）。

## 5. iOS `ChatStore`（`apps/ios/.../Core/ChatStore.swift`）

- `fetchSessions`：`GET chat/sessions?includeArchived=&limit=50`（删 `userId` 查询参；API 用 JWT）。
- `createSession`：`POST chat/sessions` body `{ title?, context? }`；`context` 若用传对象/record，不再传裸字符串、不传 `userId/itineraryId/guideId`。
- `fetchMessages`：`GET chat/sessions/:id/messages?limit=50` → `messages = data`；置 `messagesIsDone = true`（无游标）。
- `sendMessage`（核心重写）：`POST chat/sessions/:id/messages` body `{ content }` → 拿 `{ user_message, assistant_message }` → append 两条到 `messages`。**去掉**原先「POST + 再 fetchMessages + 再 fetchSessions」三段式。
- `archiveSession`：`DELETE chat/sessions/:id`（API 归档语义，已对齐）。
- **删除** API 不支持的方法/调用：`updateSessionTitle`（PATCH）、`clearMessages`（DELETE messages）、`loadMoreMessages`（无游标，置空/no-op）、`quickChat`（除非 dashboard 需要，否则删）。

## 6. iOS 韧性（`apps/ios/.../Features/Chat/ChatView.swift`，根治转圈）

- **登录门**：`ChatSessionListView.body` 顶层判断 `AuthManager.shared.isAuthenticated == false` → 显示 `ContentUnavailableView`（"请登录后使用 AI 助手" + 登录按钮），**不触发 fetch**。
- **不再 refresh 清空**：`fetchSessions(refresh:)` 移除 `sessions = []`；保留旧数据。`LoadingView` 仅在「`isLoadingSessions && sessions.isEmpty`」时显示。
- **错误兜底**：新增 `errorView`（`store.errorMessage != nil && sessions.isEmpty`）显示错误 + 「重试」按钮（重试调 `fetchSessions`）。`errorMessage` 从仅 NewSessionSheet 内可见 → 提升到列表层。
- **发消息失败**：`sendMessage` 返回 false（503）→ UI 在输入区附近提示「发送失败，重试」（重试即重发同一条）。

## 7. 测试

- **API**（Vitest）：
  - `POST /sessions/:id/messages` 发送即回复：mock `deepSeekCompletion` 返回文本 + mock db → 201，body 含 `user_message/assistant_message`，两条均入库，session `lastMessageAt` 更新。
  - AI 失败（mock 抛错）→ 503，**无消息入库**（先获取 AI、成功才写库）。
  - 鉴权：他人会话 → 403。
  - `GET /sessions/:id/messages`：列表返回 + 鉴权 403。
  - `pnpm check` 绿，覆盖率不回退。
- **iOS**：
  - 模型解码单测：用 API 真实形状的 fixture JSON（snake_case + `{data}`）解码 `ChatSession/ChatMessage/SendMessageResponse`。
  - `ChatStore` mock 测试：`sendMessage` 成功 append 两条；`fetchSessions` 不清空旧数据。

## 8. 验收标准

- `pnpm check` 全绿（含新端点测试）。
- iOS：未登录进助手 tab → 登录提示（不发请求）；登录后列出/创建/删除会话、查看消息、发送消息并收到 AI 上下文回复。
- 断网/服务器错误时，助手 tab 显示错误 + 重试，**不再永久转圈**。
- 一次会话多轮：AI 能引用前文（上下文生效）。

## 9. 分阶段落地顺序（writing-plans 骨架）

1. **API**：新增 `POST /sessions/:id/messages`（事务性发送即回复）+ `GET /sessions/:id/messages` + 单测。
2. **iOS 模型**：重写 `Chat.swift` 解码形状 + fixture 测试。
3. **iOS Store**：重写 `ChatStore` 路由/请求体/sendMessage + mock 测试。
4. **iOS 韧性**：登录门 + 错误兜底 + 不清空 + 发送失败提示。
5. **联调冒烟**：真机/模拟器登录后走完整 chat 流程。
