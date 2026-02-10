## Context

当前 Stagehand 浏览器客户端在两个文件中配置 LLM：

- `anti-detection-client.ts` - 新的反检测客户端
- `stagehand-client.ts` - 旧版客户端

两者都硬编码了默认值：

- `baseURL`: `https://new-api.kunish.org/v1` (已过期)
- `model`: `gpt-4o`

需要更新为：

- `baseURL`: `https://n.kunish.org/v1`
- `model`: `claude-opus-4-5-20251101`

## Goals / Non-Goals

**Goals:**

- 更新默认 API 端点为 `https://n.kunish.org/v1`
- 更新默认模型为 `claude-opus-4-5-20251101`
- 保持环境变量覆盖能力（用户仍可通过 `STAGEHAND_BASE_URL` 和 `STAGEHAND_MODEL` 自定义）

**Non-Goals:**

- 不改变 Stagehand 客户端的架构或 API
- 不添加新功能
- 不修改 Vercel AI SDK 集成方式（当前使用 OpenAI SDK 兼容模式已足够）

## Decisions

### 1. 保持现有 LLM 客户端实现方式

**决定**: 继续使用 `CustomOpenAIClient` 包装器 + OpenAI SDK

**原因**:

- Stagehand V3 的原生 `model` 配置不支持自定义 `baseURL`
- 当前实现已经可以正确工作，只需更新默认值
- 避免不必要的重构风险

**备选方案**:

- 使用 Vercel AI SDK (`@ai-sdk/anthropic`) - 需要额外依赖，且 Stagehand 的 `llmClient` 接口已兼容当前方式

### 2. 同时更新两个客户端文件

**决定**: 同步更新 `anti-detection-client.ts` 和 `stagehand-client.ts`

**原因**:

- 两个文件都可能被使用（取决于 `USE_LEGACY_CLIENT` 配置）
- 保持一致性，避免混淆

## Risks / Trade-offs

| 风险                           | 缓解措施                                                                |
| ------------------------------ | ----------------------------------------------------------------------- |
| 新 API 端点不可用              | 用户可通过 `STAGEHAND_BASE_URL` 环境变量回退到其他端点                  |
| Claude 模型与 Stagehand 不兼容 | Claude 已被 Stagehand 官方支持，且用户可通过 `STAGEHAND_MODEL` 切换模型 |
| 破坏现有用户配置               | 无破坏性：已设置环境变量的用户不受影响                                  |
