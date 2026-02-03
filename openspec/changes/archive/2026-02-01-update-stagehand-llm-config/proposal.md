## Why

Stagehand 浏览器客户端的 LLM 配置硬编码了旧的 API 端点 (`https://new-api.kunish.org/v1`) 和默认模型 (`gpt-4o`)。需要更新为新的 API 端点 (`https://n.kunish.org/v1`) 和 Claude Opus 4.5 模型 (`claude-opus-4-5-20251101`)，以确保爬虫的 AI 功能正常工作。

## What Changes

- 更新 `anti-detection-client.ts` 中的默认 `baseURL` 从 `https://new-api.kunish.org/v1` 改为 `https://n.kunish.org/v1`
- 更新 `stagehand-client.ts` 中的默认 `baseURL` 从 `https://new-api.kunish.org/v1` 改为 `https://n.kunish.org/v1`
- 更新两个文件中的默认模型从 `gpt-4o` 改为 `claude-opus-4-5-20251101`
- 更新 `.env.example` 中的示例配置

## Capabilities

### New Capabilities

(无新增功能)

### Modified Capabilities

(无规格变更，仅配置更新)

## Impact

- `apps/ai-service/src/lib/crawlers/clients/anti-detection-client.ts` - 两处默认值更新
- `apps/ai-service/src/lib/crawlers/clients/stagehand-client.ts` - 两处默认值更新
- `apps/ai-service/.env.example` - 示例配置更新
- 所有使用 Stagehand 客户端的爬虫将使用新的 API 端点和模型
