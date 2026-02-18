## ADDED Requirements

### Requirement: Default LLM Configuration

Stagehand 客户端 SHALL 使用以下默认配置：

- API 端点: `https://n.kunish.org/v1`
- 模型名称: `claude-opus-4-5-20251101`

用户 SHALL 能够通过环境变量覆盖这些默认值：

- `STAGEHAND_BASE_URL` - 自定义 API 端点
- `STAGEHAND_MODEL` - 自定义模型名称

#### Scenario: 使用默认配置

- **WHEN** 未设置 `STAGEHAND_BASE_URL` 和 `STAGEHAND_MODEL` 环境变量
- **THEN** 客户端使用 `https://n.kunish.org/v1` 作为 API 端点
- **AND** 客户端使用 `claude-opus-4-5-20251101` 作为模型

#### Scenario: 环境变量覆盖

- **WHEN** 设置了 `STAGEHAND_BASE_URL=https://custom.api.com/v1`
- **AND** 设置了 `STAGEHAND_MODEL=gpt-4o`
- **THEN** 客户端使用 `https://custom.api.com/v1` 作为 API 端点
- **AND** 客户端使用 `gpt-4o` 作为模型
