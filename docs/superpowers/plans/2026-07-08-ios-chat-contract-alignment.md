# iOS 助手 tab + chat 契约对齐 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 iOS 助手 tab 与已上线的 chat API 对齐：会话 CRUD + 持久多轮对话（发送即 AI 上下文回复）+ 韧性（登录门、错误兜底、不再永久转圈）。

**Architecture:** iOS 适配 API（API 保持 `{data}` + snake_case + ISO8601）。API 侧新增「发送即回复」会话作用域端点（先获取 AI、成功才持久化两条消息）+ 会话作用域消息列表。iOS 重写 Chat 模型解码、ChatStore 路由/请求体、ChatView 韧性。

**Tech Stack:** Hono + Drizzle(D1) + DeepSeek（API）；SwiftUI + @Observable + XCTest（iOS）。

**Spec:** `docs/superpowers/specs/2026-07-08-ios-chat-contract-alignment-design.md`

## Global Constraints

- 对齐方向：iOS 适配 API；API 保持 `{data}` 外层 + snake_case（`convertKeysToSnakeCase`）+ ISO8601 时间字符串。
- 发送即回复 = **先获取 AI、成功才写库**（D1 不支持跨外部 fetch 的事务）；AI 失败 → 503、不写任何消息、iOS 重试幂等。
- iOS 去掉 API 不存在的能力：`success` 外层、`_id`、camelCase、`PATCH /sessions/:id`、`DELETE /sessions/:id/messages`、`LinkedItinerary/LinkedGuide`、`loadMoreMessages`（无游标）。
- 每个任务结束 `pnpm check` 绿（API 侧）；iOS 侧 Xcode 构建通过 + 相关 XCTest 绿。
- Conventional Commits；DB 列名 snake_case、Drizzle 定义 camelCase。

## File Structure（改动地图）

**API（Phase 1）**

- Modify: `packages/api/src/routes/chat.ts` — 加 `GET /sessions/:id/messages`、`POST /sessions/:id/messages`（发送即回复）
- Modify: `packages/api/src/routes/chat.test.ts` — 新端点测试

**iOS 模型（Phase 2）**

- Rewrite: `apps/ios/Pathfinding/Pathfinding/Models/Chat.swift` — 解码形状对齐
- Create: `apps/ios/Pathfinding/PathfindingTests/ChatModelDecodingTests.swift` — fixture 解码测试

**iOS Store（Phase 3）**

- Modify: `apps/ios/Pathfinding/Pathfinding/Core/ChatStore.swift` — 路由/请求体/sendMessage

**iOS 韧性（Phase 4）**

- Modify: `apps/ios/Pathfinding/Pathfinding/Features/Chat/ChatView.swift` — 登录门 + 错误兜底 + 不清空 + 发送失败提示

---

# Phase 1 — API：会话作用域消息 + 发送即回复

> 现有 chat 端点见 `chat.ts`。复用 `requireOwnedSession(db, id, userId)`、`toChatDto`、`deepSeekCompletion`、`deepSeekCompletion(messages, { apiKey, signal })`、`DeepSeekConfigError`。

## Task 1.1: `GET /sessions/:id/messages`（会话作用域消息列表）

**Files:**

- Modify: `packages/api/src/routes/chat.ts`（在 `GET /messages` 之后插入）
- Modify: `packages/api/src/routes/chat.test.ts`

**Interfaces:**

- 消费：`requireOwnedSession`、`toChatDto`、`parsePositiveInt`、`parsePagination`、`authRequired()`。
- 产出：`GET /api/chat/sessions/:id/messages?limit=` → `200 { data: [toChatDto] }`（升序），403 非所有者。

- [ ] **Step 1: 写失败测试**（`chat.test.ts`，加 describe）

```ts
describe('gET /api/chat/sessions/:id/messages', () => {
  it('lists messages for an owned session ascending by createdAt', async () => {
    const chain = createOrderBySelectChain([
      { id: 1, sessionId: 5, role: 'user', content: 'hi', createdAt: new Date('2026-07-08T10:00:00Z') },
      { id: 2, sessionId: 5, role: 'assistant', content: 'hello', createdAt: new Date('2026-07-08T10:00:01Z') },
    ]);
    const ownChain = createSelectChain([{ userId: 1 }]);
    mockDb.select.mockReturnValueOnce(ownChain).mockReturnValueOnce(chain);

    const response = await requestWithAuth(createApp(), '/api/chat/sessions/5/messages');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].content).toBe('hi');
  });

  it('rejects non-owner with 403', async () => {
    const ownChain = createSelectChain([{ userId: 999 }]);
    mockDb.select.mockReturnValueOnce(ownChain);
    const response = await requestWithAuth(createApp(), '/api/chat/sessions/5/messages');
    expect(response.status).toBe(403);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @pathfinding/api test src/routes/chat.test.ts`
Expected: FAIL（路由不存在 → 404，非 200/403）。

- [ ] **Step 3: 实现路由**（`chat.ts`，在 `GET /messages` 路由之后、`POST /messages` 之前插入）

```ts
// ── GET /sessions/:id/messages — Messages for a session ──
app.get('/sessions/:id/messages', authRequired(), async (c) => {
  const userId = Number(c.get('userId'));
  const sessionId = parsePositiveInt(c.req.param('id'));
  if (!sessionId) {
    return c.json({ error: '无效的会话ID' }, 400);
  }

  const db = c.get('db');
  await requireOwnedSession(db, sessionId, userId);

  const { limit } = parsePagination(c.req.query('limit'), undefined, 50);
  const results = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt)
    .limit(limit);

  return c.json({ data: results.map(toChatDto) });
});
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @pathfinding/api test src/routes/chat.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/routes/chat.ts packages/api/src/routes/chat.test.ts
git commit -m "feat(api): add GET /sessions/:id/messages (session-scoped message list)"
```

## Task 1.2: `POST /sessions/:id/messages`（发送即回复，持久对话核心）

**Files:**

- Modify: `packages/api/src/routes/chat.ts`
- Modify: `packages/api/src/routes/chat.test.ts`

**Interfaces:**

- 消费：`requireOwnedSession`、`toChatDto`、`deepSeekCompletion(messages, { apiKey, signal })`、`DeepSeekConfigError`、`chatMessages`、`chatSessions`。
- 产出：`POST /api/chat/sessions/:id/messages` body `{content}` → 201 `{data:{user_message, assistant_message}}`；AI 失败 → 503 不写库。

- [ ] **Step 1: 写失败测试**

```ts
describe('pOST /api/chat/sessions/:id/messages (send-and-reply)', () => {
  it('persists user+assistant messages and returns both', async () => {
    stubDeepSeek('sure- reply'); // vi.stubGlobal fetch → DeepSeek 返回 'sure- reply'
    const ownChain = createSelectChain([{ userId: 1 }]);
    const historyChain = createOrderBySelectChain([]); // 无历史
    // requireOwnedSession select(1) + history select(2) + insert user(3, returning id 10) + insert assistant(4, returning id 11)
    mockDb.select.mockReturnValueOnce(ownChain).mockReturnValueOnce(historyChain);
    mockDb.insert
      .mockReturnValueOnce({ values: () => ({ returning: vi.fn().mockResolvedValue([{ id: 10, sessionId: 5, role: 'user', content: 'hi', createdAt: new Date() }]) }) })
      .mockReturnValueOnce({ values: () => ({ returning: vi.fn().mockResolvedValue([{ id: 11, sessionId: 5, role: 'assistant', content: 'sure- reply', createdAt: new Date() }]) }) });
    mockDb.update.mockReturnValueOnce(createUpdateChain());

    const response = await requestWithAuth(createApp(), '/api/chat/sessions/5/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'hi' }),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.user_message.content).toBe('hi');
    expect(body.data.assistant_message.content).toBe('sure- reply');
    expect(mockDb.insert).toHaveBeenCalledTimes(2); // user + assistant
  });

  it('returns 503 and persists nothing when AI fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('upstream down'); })); // DeepSeek 失败
    const ownChain = createSelectChain([{ userId: 1 }]);
    const historyChain = createOrderBySelectChain([]);
    mockDb.select.mockReturnValueOnce(ownChain).mockReturnValueOnce(historyChain);

    const response = await requestWithAuth(createApp(), '/api/chat/sessions/5/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'hi' }),
    });
    expect(response.status).toBe(503);
    expect(mockDb.insert).not.toHaveBeenCalled(); // 成功才写库 → AI 失败则零插入
  });

  it('rejects non-owner with 403', async () => {
    const ownChain = createSelectChain([{ userId: 999 }]);
    mockDb.select.mockReturnValueOnce(ownChain);
    const response = await requestWithAuth(createApp(), '/api/chat/sessions/5/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'hi' }),
    });
    expect(response.status).toBe(403);
  });
});
```

> 测试装配按现有 `chat.test.ts` 的 mock helpers（`createSelectChain`/`createOrderBySelectChain`/`createUpdateChain`/`stubDeepSeek`）。如 helper 形状有出入，按实际调整但断言不变。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @pathfinding/api test src/routes/chat.test.ts`
Expected: FAIL（路由不存在）。

- [ ] **Step 3: 实现路由**（`chat.ts`，`POST /messages` 路由之后插入；`deepSeekCompletion`、`DeepSeekConfigError` 已 import）

```ts
// ── POST /sessions/:id/messages — Send a message and get an in-session AI reply ──
const sendSessionMessageSchema = z.object({ content: z.string().trim().min(1) });

app.post('/sessions/:id/messages', authRequired(), zValidator('json', sendSessionMessageSchema), async (c) => {
  const userId = Number(c.get('userId'));
  const sessionId = parsePositiveInt(c.req.param('id'));
  if (!sessionId) {
    return c.json({ error: '无效的会话ID' }, 400);
  }

  const { content } = c.valid('json');
  const db = c.get('db');
  await requireOwnedSession(db, sessionId, userId);

  // 1) 取最近 ≤20 条历史作上下文
  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(20);

  const system = '你是 Sunpebble Trips 的旅行助手。结合会话历史，回答简洁、具体、可执行。';
  const promptMessages = [
    { role: 'system', content: system },
    ...history.slice().reverse().map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content },
  ];

  // 2) 先获取 AI 回复；成功才写库（D1 不支持跨外部 fetch 的事务）
  let reply: string;
  try {
    reply = await deepSeekCompletion(promptMessages, {
      apiKey: c.env.DEEPSEEK_API_KEY ?? '',
      signal: c.req.raw.signal,
    });
  } catch {
    return c.json({ error: 'AI service unavailable' }, 503);
  }

  // 3) 持久化 user + assistant
  const [userRow] = await db
    .insert(chatMessages)
    .values({ sessionId, role: 'user', content })
    .returning();
  const [assistantRow] = await db
    .insert(chatMessages)
    .values({ sessionId, role: 'assistant', content: reply })
    .returning();

  await db
    .update(chatSessions)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatSessions.id, sessionId));

  return c.json({ data: { user_message: toChatDto(userRow!), assistant_message: toChatDto(assistantRow!) } }, 201);
});
```

> 注意 `.returning()`（无参）返回全行；`toChatDto` 接受含 `metadata` 的行（chatMessages 无 metadata 字段，`toChatDto<T extends {metadata: unknown}>` — 若类型报错，把 chatMessages 行用 `as any` 传入或放宽 `toChatDto` 泛型。按实际编译调整，行为不变）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @pathfinding/api test src/routes/chat.test.ts`
Expected: PASS（3/3）。

- [ ] **Step 5: `pnpm check` 全绿**

Run: `pnpm check`
Expected: exit 0。

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/chat.ts packages/api/src/routes/chat.test.ts
git commit -m "feat(api): add POST /sessions/:id/messages send-and-reply (persist on AI success)"
```

---

# Phase 2 — iOS Chat 模型解码对齐

## Task 2.1: 重写 `Chat.swift` 解码形状 + fixture 测试

**Files:**

- Rewrite: `apps/ios/Pathfinding/Pathfinding/Models/Chat.swift`
- Create: `apps/ios/Pathfinding/PathfindingTests/ChatModelDecodingTests.swift`

**目标形状**（对齐 API）：

- 外层去 `success`：`{ data: [...] }` / `{ data: {...} }`。
- `ChatSession`：`id`（非 `_id`）、`user_id`、`title`、`message_count`、`last_message_at`、`is_archived`、`created_at`（均 snake_case；时间 ISO8601 字符串 → Date）。
- 删除 `itineraryId/guideId/context` 字段、`LinkedItinerary/LinkedGuide` 及其 UI 引用。
- `ChatMessage`：`id`、`session_id`、`role`、`content`、`created_at`。
- 新增 `SendMessageResponse`：`{ data: { user_message: ChatMessage, assistant_message: ChatMessage } }`。
- `ChatMessageListResponse`：去 `success/cursor/isDone` → `{ data: [ChatMessage] }`。
- `MessageMetadata`/富字段：本期 assistant 不带；类型可删或保留不消费（按删更干净；若 UI `MetadataView` 引用则一并删 UI）。

- [ ] **Step 1: 写失败测试**（`ChatModelDecodingTests.swift`）

```swift
import XCTest
@testable import Pathfinding

final class ChatModelDecodingTests: XCTestCase {
  func testDecodesSessionList() throws {
    let json = """
    {"data":[{"id":7,"user_id":1,"title":"杭州三日","message_count":4,
    "last_message_at":"2026-07-08T10:51:16.528Z","is_archived":false,
    "created_at":"2026-07-07T08:00:00.000Z"}]}
    """.data(using: .utf8)!
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    let resp = try decoder.decode(ChatSessionListResponse.self, from: json)
    XCTAssertEqual(resp.data.count, 1)
    XCTAssertEqual(resp.data[0].id, 7)
    XCTAssertEqual(resp.data[0].userId, 1)
    XCTAssertEqual(resp.data[0].messageCount, 4)
    XCTAssertFalse(resp.data[0].isArchived)
  }

  func testDecodesSendMessageResponse() throws {
    let json = """
    {"data":{"user_message":{"id":10,"session_id":5,"role":"user","content":"hi","created_at":"2026-07-08T10:00:00.000Z"},
    "assistant_message":{"id":11,"session_id":5,"role":"assistant","content":"hello","created_at":"2026-07-08T10:00:01.000Z"}}}
    """.data(using: .utf8)!
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    let resp = try decoder.decode(SendMessageResponse.self, from: json)
    XCTAssertEqual(resp.data.userMessage.id, 10)
    XCTAssertEqual(resp.data.assistantMessage.role, .assistant)
    XCTAssertEqual(resp.data.assistantMessage.content, "hello")
  }
}
```

- [ ] **Step 2: 跑测试确认失败**

Run: `xcodebuild test -workspace apps/ios/Pathfinding/Pathfinding.xcodeproj -scheme Pathfinding -destination 'platform=iOS Simulator,name=iPhone 16'` （或既有 iOS test 命令；`ChatSessionListResponse` 当前含 `success` 且键名不对 → 解码失败）
Expected: FAIL（键不匹配 / `success` 缺失）。

- [ ] **Step 3: 重写 `Chat.swift`**（关键差异；保留 `QuickReplySuggestion` 等不冲突部分）

```swift
struct ChatSession: Codable, Identifiable, Hashable {
  let id: Int
  let userId: Int
  let title: String
  let messageCount: Int
  let lastMessageAt: Date
  let isArchived: Bool
  let createdAt: Date

  enum CodingKeys: String, CodingKey {
    case id, userId = "user_id", title, messageCount = "message_count"
    case lastMessageAt = "last_message_at", isArchived = "is_archived", createdAt = "created_at"
  }
  // 删除 LinkedItinerary/LinkedGuide、itineraryId/guideId/context、_id
  // timeAgo/lastMessageDate/createdDate 改用 Date 直接收（不再 /1000）
  var lastMessageDate: Date { lastMessageAt }
  var createdDate: Date { createdAt }
  var timeAgo: String { lastMessageDate.relativeFormatted(localeIdentifier: nil) }
  func hash(into h: inout Hasher) { h.combine(id) }
  static func == (l: Self, r: Self) -> Bool { l.id == r.id }
}

struct ChatMessage: Codable, Identifiable, Hashable {
  let id: Int
  let sessionId: Int
  let role: MessageRole
  let content: String
  let createdAt: Date
  enum MessageRole: String, Codable { case user, assistant, system }
  enum CodingKeys: String, CodingKey {
    case id, sessionId = "session_id", role, content, createdAt = "created_at"
  }
  var createdDate: Date { createdAt }
  func hash(into h: inout Hasher) { h.combine(id) }
  static func == (l: Self, r: Self) -> Bool { l.id == r.id }
}

struct ChatSessionListResponse: Codable { let data: [ChatSession] }
struct ChatMessageListResponse: Codable { let data: [ChatMessage] }

struct SendMessageResponse: Codable {
  let data: SendMessageData
  struct SendMessageData: Codable {
    let userMessage: ChatMessage
    let assistantMessage: ChatMessage
    enum CodingKeys: String, CodingKey {
      case userMessage = "user_message", assistantMessage = "assistant_message"
    }
  }
}
```

> `id` 由 `String` 改 `Int`（API 返回数字 id）。波及 `ChatStore`/`ChatView` 里 `id: String` 的引用——在 Task 3.1 一并改。`timeString`（`MessageBubble`）改用 `createdDate`。删除 `MessageMetadata` 及 `MetadataView/PoiCard/ChatQuickActionButton`（Task 3/4 顺手清引用）。

- [ ] **Step 4: 跑测试确认通过**

Run: iOS test 命令
Expected: `ChatModelDecodingTests` 2/2 PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/ios/Pathfinding/Pathfinding/Models/Chat.swift apps/ios/Pathfinding/PathfindingTests/ChatModelDecodingTests.swift
git commit -m "refactor(ios): align Chat models to API (snake_case, id, ISO8601, drop success/_id)"
```

---

# Phase 3 — iOS ChatStore 路由/请求体

## Task 3.1: 重写 `ChatStore.swift` 对齐新契约

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Core/ChatStore.swift`

**规程**（逐方法）：

- `id` 类型 `String` → `Int`（session/message id）。函数签名 `sessionId: String` → `Int`。
- `fetchSessions`：路径 `chat/sessions`，query `includeArchived`、`limit=50`；**删 `userId` 查询参**（API 用 JWT）。解码 `ChatSessionListResponse`（无 success）。
- `createSession`：body 仅 `{ title?, context? }`（`context` 用则传对象；删 `userId/itineraryId/guideId`）；解码 `CreateSessionResponse { data: ChatSession? }`（去 success）。
- `selectSession`/`fetchMessages`：路径 `chat/sessions/:id/messages?limit=50`；解码 `ChatMessageListResponse`；置 `messagesIsDone = true`、`messagesCursor = nil`。
- **`sendMessage`（核心重写）**：`POST chat/sessions/:id/messages` body `{ "content": content }` → 解码 `SendMessageResponse` → `messages.append(userMessage); messages.append(assistantMessage)`。**删**原「POST messages → fetchMessages(refresh) → fetchSessions」三段式与 `pendingUserMessage/pendingAssistantMessage`。
- `archiveSession`：`DELETE chat/sessions/:id`（已是归档语义，保留）。
- **删**：`updateSessionTitle`（PATCH 不存在）、`clearMessages`（DELETE messages 不存在）、`loadMoreMessages`（无游标，置 no-op 或删并清 UI 引用）、`quickChat`（如无 dashboard 引用则删）、`messagesCursor/messagesIsDone` 相关分页（保留 `messagesIsDone` 常真即可）。
- 错误：`errorMessage = error.userFacingMessage` 保留；`sendMessage` catch 返回 false。

- [ ] **Step 1: 改 `ChatStore.swift` 按上述规程**（`id: Int`、路由、body、`sendMessage` 重写）。
- [ ] **Step 2: 修编译连带**：`ChatView.swift` 里 `session.id`（String→Int）、`ChatConversationView(session:)`、`NavigationLink`、`.task { await store.selectSession(session) }` 等签名同步；删对 `updateSessionTitle/clearMessages/loadMoreMessages/MetadataView/PoiCard` 的 UI 引用（Task 4 一并清）。
- [ ] **Step 3: Xcode 构建通过**

Run: `xcodebuild build -workspace apps/ios/Pathfinding/Pathfinding.xcodeproj -scheme Pathfinding -destination 'platform=iOS Simulator,name=iPhone 16'`
Expected: BUILD SUCCEEDED。

- [ ] **Step 4: Commit**

```bash
git add apps/ios/Pathfinding/Pathfinding/Core/ChatStore.swift apps/ios/Pathfinding/Pathfinding/Features/Chat/ChatView.swift
git commit -m "refactor(ios): align ChatStore routes/bodies to API; rewrite sendMessage"
```

---

# Phase 4 — iOS 韧性（根治转圈）

## Task 4.1: `ChatView.swift` 登录门 + 错误兜底 + 不清空 + 发送失败

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Features/Chat/ChatView.swift`

**规程：**

- **登录门**：`ChatSessionListView.body` 顶层：
  ```swift
  if !AuthManager.shared.isAuthenticated {
    ContentUnavailableView {
      Label("请登录后使用 AI 助手", systemImage: "bubble.left.and.bubble.right.fill")
    } description: { Text("登录后即可查看历史会话并与 AI 对话。") }
      .accessibilityLabel("请登录")
  } else { /* 现有 ZStack 内容 */ }
  ```
  确保 `.task { fetchSessions }` 仅在 else 分支（未登录不触发）。
- **不清空**：`ChatStore.fetchSessions(refresh:)` 删 `if refresh { sessions = [] }`（Task 3.1 已触达；此处确认）。
- **错误兜底**：`ChatSessionListView` Group 内加分支 `else if store.errorMessage != nil && store.sessions.isEmpty { ErrorRetryView(message: store.errorMessage!) { Task { await store.fetchSessions(userId: AuthManager.shared.currentUserId ?? "", refresh: true) } }`；`LoadingView` 仅 `isLoadingSessions && sessions.isEmpty && errorMessage == nil`。
- **发送失败提示**：`ChatConversationView` 若 `store.sendMessage` 返回 false，输入区上方显示「发送失败，点击重试」横幅；点击重发同一条。
- 清理 Task 3 遗留的 `MessageMetadata/MetadataView/PoiCard/ChatQuickActionButton`/quick replies UI（API 不返回 → 删引用）。

- [ ] **Step 1: 实现 4 处韧性改动 + 清理富 metadata UI 引用**（按规程）。
- [ ] **Step 2: Xcode 构建通过 + 跑全部 iOS 测试**

Run: `xcodebuild test -workspace apps/ios/Pathfinding/Pathfinding.xcodeproj -scheme Pathfinding -destination 'platform=iOS Simulator,name=iPhone 16'`
Expected: BUILD + TESTS SUCCEEDED（含 `ChatModelDecodingTests`）。

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Pathfinding/Pathfinding/Features/Chat/ChatView.swift
git commit -m "feat(ios): chat auth gate, error fallback, no-clear-on-refresh, send-fail retry"
```

---

# Phase 5 — 联调冒烟

## Task 5.1: 真机/模拟器端到端

- [ ] **Step 1: 后端已上线**，iOS 指向 `https://api.trips.sunpebblelabs.com`（Release/Debug xcconfig 一致）。
- [ ] **Step 2: 冒烟**：未登录进助手 tab → 登录提示；登录 → 新建会话 → 发「帮我规划两天杭州」→ 收到 AI 上下文回复 → 再发「加一天」→ AI 引用前文（多轮）→ 返回列表看到会话 → 删除（归档）。
- [ ] **Step 3: 故障注入**：断网发消息 → 「发送失败，重试」；断网进 tab → 错误 + 重试（不再永久转圈）。
- [ ] **Step 4: 记录结果**（无需提交，除非有修）。

---

## Self-Review（plan vs spec 覆盖）

- §2 方案 A（iOS 适配 API）→ 全 plan 贯穿 ✅
- §3 API 端点（GET/POST sessions/:id/messages，先获取 AI 才写库）→ Task 1.1/1.2 ✅
- §4 iOS 模型（snake_case、id、ISO8601、删 success/\_id/Linked\*、SendMessageResponse）→ Task 2.1 ✅
- §5 iOS Store（路由/body/sendMessage/删 PATCH·clear·loadMore）→ Task 3.1 ✅
- §6 iOS 韧性（登录门、不清空、错误兜底、发送失败）→ Task 4.1 ✅
- §7 测试（API vitest + iOS 解码 fixture）→ Task 1.1/1.2/2.1 ✅（ChatStore 网络 mock 因 NetworkClient actor 单例难注入，靠编译 + 冒烟；spec 已默认此取舍）
- §8 验收 → Task 5.1 冒烟 ✅
- §9 分阶段 → Phase 1→5 ✅

**类型一致性**：API `POST /sessions/:id/messages` 返回 `{data:{user_message, assistant_message}}`（snake_case，Task 1.2）↔ iOS `SendMessageResponse.data.user_message/assistant_message`（CodingKeys `user_message`/`assistant_message`，Task 2.1）↔ `ChatStore.sendMessage` append（Task 3.1）—— 三处形状一致。`id: Int` API（D1 integer）↔ iOS（Int，Task 2.1/3.1）一致。
