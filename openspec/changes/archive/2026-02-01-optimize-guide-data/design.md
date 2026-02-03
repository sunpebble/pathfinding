## Context

travelGuides 表是项目的核心数据存储，包含从多个平台（小红书、微博、携程等）爬取的旅行攻略。当前实现存在以下问题：

1. **查询性能差**: `getByDestination` 使用 `collect()` 全表扫描，`count` 遍历所有记录
2. **数据耦合**: AI 处理结果（aiSummary, aiDays 等）与原始爬取数据存储在同一表
3. **类型混乱**: crawler-types 使用 snake_case，convex schema 使用 camelCase
4. **去重低效**: `removeDuplicates` 需要遍历所有平台数据，事后清理
5. **数据质量**: 大量可选字段，缺乏入库前验证

**技术栈**: Convex (后端数据库)、TypeScript、Hono (API)

## Goals / Non-Goals

**Goals:**
- 为高频查询字段添加索引，消除全表扫描
- 将 AI 处理结果拆分到独立表，支持版本管理
- 建立统一的类型转换层，消除命名混乱
- 在 upsert 时利用唯一索引即时去重
- 定义必填字段规则，在爬虫入库前验证

**Non-Goals:**
- 不改变现有 API 的对外接口签名
- 不迁移历史数据的 sourcePlatform 枚举值
- 不重构爬虫抓取逻辑本身
- 不改变前端展示逻辑

## Decisions

### 1. 索引策略

**决定**: 为 destinations 字段添加索引，但由于 Convex 不支持数组字段的直接索引，采用辅助表方案。

**替代方案**:
- A) 使用搜索索引 (search index) - 已有，但不适合精确匹配
- B) 创建 guideDestinations 辅助表 - 选择此方案

**理由**: 辅助表可以实现 O(1) 目的地查询，且支持双向查询（按目的地找攻略、按攻略找目的地）。

```typescript
// guideDestinations 表结构
{
  guideId: v.id('travelGuides'),
  destination: v.string(),  // 规范化的目的地名称
}
.index('by_destination', ['destination'])
.index('by_guide', ['guideId'])
```

### 2. AI 数据分离

**决定**: 创建 `travelGuideAiData` 表存储 AI 处理结果，通过 guideId 关联。

**替代方案**:
- A) 保持现状，字段放在同一表 - 耦合度高
- B) 使用 JSON 字段存储 - 无法查询
- C) 独立表 + 版本号 - 选择此方案

**理由**: 独立表便于重新处理、版本管理，且可以存储多个版本的 AI 结果用于 A/B 测试。

```typescript
// travelGuideAiData 表结构
{
  guideId: v.id('travelGuides'),
  version: v.number(),  // 处理版本
  aiSummary: v.optional(v.string()),
  aiTips: v.optional(v.array(v.string())),
  aiBestTime: v.optional(v.string()),
  aiDuration: v.optional(v.string()),
  aiBudget: v.optional(v.string()),
  aiDays: v.optional(v.array(...)),
  geocodingMetrics: v.optional(v.object(...)),
  processedAt: v.number(),
  modelVersion: v.optional(v.string()),
}
.index('by_guide', ['guideId'])
.index('by_guide_version', ['guideId', 'version'])
```

### 3. 类型转换层

**决定**: 在 `packages/crawler-types` 中保持 snake_case（与外部 API 一致），在 convex 边界层做转换。

**替代方案**:
- A) 全部统一为 camelCase - 需改动爬虫
- B) 全部统一为 snake_case - 不符合 TypeScript 惯例
- C) 边界层转换 - 选择此方案

**理由**: 最小化改动，保持各层的惯例一致性。

```typescript
// packages/crawler-types/src/converters.ts
export function toCamelCase<T>(snakeObj: SnakeCaseType): T
export function toSnakeCase<T>(camelObj: CamelCaseType): T
```

### 4. 计数优化

**决定**: 使用 Convex Aggregates 组件维护实时计数。

**替代方案**:
- A) 每次遍历计数 - 当前方案，O(n)
- B) 定时任务更新缓存 - 数据延迟
- C) Aggregates 组件 - 选择此方案

**理由**: Convex Aggregates 是官方推荐方案，提供 O(1) 计数。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 数据迁移可能失败 | 分批迁移，每批 100 条，失败自动重试 |
| AI 表分离增加查询复杂度 | 提供 `getGuideWithAiData` 联合查询函数 |
| 辅助表同步可能不一致 | 在 upsert 事务中同步更新辅助表 |
| 计数器可能漂移 | 定期校准任务，每日对账 |

## Migration Plan

1. **Phase 1 - Schema 变更** (无破坏性)
   - 添加新表: guideDestinations, travelGuideAiData
   - 添加新索引
   - 部署并验证

2. **Phase 2 - 数据迁移**
   - 运行迁移脚本填充 guideDestinations
   - 运行迁移脚本将 AI 字段复制到 travelGuideAiData
   - 验证数据一致性

3. **Phase 3 - 代码切换**
   - 更新查询函数使用新索引
   - 更新 AI 数据读写使用新表
   - 部署并监控

4. **Phase 4 - 清理** (可选，延迟执行)
   - 移除 travelGuides 表中的 AI 字段
   - 移除旧的查询逻辑

**回滚策略**: 每个 Phase 可独立回滚，Phase 4 执行前保留 7 天观察期。

## Open Questions

1. AI 数据表是否需要保留历史版本？保留几个版本？
2. 计数器是否需要按平台分别统计？
3. 目的地名称规范化规则是什么？（如"北京"vs"北京市"）
