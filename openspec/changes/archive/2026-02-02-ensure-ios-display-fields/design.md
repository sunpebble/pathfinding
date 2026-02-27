## Context

iOS App 展示旅游攻略时依赖 `travelGuides` 表中的多个字段。当前数据层没有强制保证这些字段的存在，导致：

- 部分攻略缺少 `title`，显示为空白或 "无标题"
- `coverImageUrl` 缺失时需要客户端处理占位图逻辑
- `authorName` 为空影响社交属性展示
- `destinations` 数组为空导致地点标签无法显示

现有数据中约有部分记录存在字段缺失问题，需要批量修复并防止新数据入库时出现同样问题。

## Goals / Non-Goals

**Goals:**

- 定义 iOS 展示必需的字段清单
- 实现字段完整性验证函数
- 提供自动补全逻辑（从现有数据推断或生成默认值）
- 创建迁移脚本修复历史数据
- 增强 upsert 逻辑确保新数据完整性

**Non-Goals:**

- 不修改 schema 字段的可选性定义（保持向后兼容）
- 不强制所有字段必填（仅针对展示关键字段）
- 不涉及 AI 处理字段（aiSummary, aiDays 等）的补全

## Decisions

### 1. iOS 展示必需字段定义

| 字段            | 类型     | 缺失处理策略                        |
| --------------- | -------- | ----------------------------------- |
| `title`         | string   | 从 content 前30字符截取 + "..."     |
| `coverImageUrl` | string   | 取 imageUrls[0]，否则使用平台默认图 |
| `authorName`    | string   | 使用 "匿名用户"                     |
| `destinations`  | string[] | 空数组（允许，但记录警告）          |
| `likesCount`    | number   | 默认 0                              |
| `savesCount`    | number   | 默认 0                              |
| `commentsCount` | number   | 默认 0                              |
| `viewsCount`    | number   | 默认 0                              |
| `qualityScore`  | number   | 默认 0.5                            |

**理由**: 这些字段直接影响 iOS App 的列表卡片和详情页展示，缺失会导致 UI 异常。

### 2. 验证与补全分层

```
┌─────────────────────────────────────────┐
│  API Layer (Query)                      │
│  - ensureDisplayFields() 返回前保证     │
├─────────────────────────────────────────┤
│  Upsert Layer (Mutation)                │
│  - validateAndFillDisplayFields() 入库前│
├─────────────────────────────────────────┤
│  Migration Layer (One-time)             │
│  - 批量修复历史数据                      │
└─────────────────────────────────────────┘
```

**理由**: 三层防护确保新旧数据都有完整的展示字段。

### 3. 迁移策略

采用分页批量处理，每批 50 条，避免触发 Convex 16MB 限制。

**理由**: 与之前的迁移脚本保持一致的模式，已验证可行。

## Risks / Trade-offs

| 风险                      | 缓解措施                         |
| ------------------------- | -------------------------------- |
| 自动生成的 title 质量不高 | 仅作为兜底方案，优先使用原始数据 |
| 批量迁移可能耗时较长      | 使用 cursor 分页，支持断点续传   |
| 默认图片资源需要托管      | 使用项目已有的 CDN 资源          |
| 可能遗漏某些展示字段      | 与 iOS 团队确认字段清单          |
