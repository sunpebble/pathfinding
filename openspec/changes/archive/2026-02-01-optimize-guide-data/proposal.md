## Why

攻略数据（travelGuides）是项目的核心资产，但当前实现存在多个性能和架构问题：查询使用全表扫描、AI 数据与原始数据耦合、类型命名不一致、去重机制效率低。随着数据量增长，这些问题会严重影响系统性能和可维护性。

## What Changes

- **性能优化**: 为高频查询字段添加索引，优化计数逻辑，消除全表扫描
- **数据结构重构**: 将 AI 处理结果拆分到独立表，支持版本管理和重新处理
- **类型统一**: 统一 crawler-types 和 convex schema 的命名约定，消除 snake_case/camelCase 混用
- **去重优化**: 利用唯一索引在 upsert 时即时去重，移除事后清理逻辑
- **数据校验**: 区分必填/可选字段，在爬虫层添加数据验证

## Capabilities

### New Capabilities

- `query-optimization`: 为 destinations、sourcePlatform 等字段添加索引，优化 getByDestination 和 count 查询
- `ai-data-separation`: 将 aiSummary、aiDays 等 AI 生成字段拆分到 travelGuideAiData 表
- `type-consistency`: 在 crawler-types 和 convex 之间建立统一的类型转换层
- `upsert-deduplication`: 重构 upsert 逻辑，使用 by_platform_external 索引实现即时去重
- `data-validation`: 定义必填字段规则，在爬虫入库前进行数据质量校验

### Modified Capabilities

（无现有规格需要修改）

## Impact

- **数据库**: convex/schema.ts 需要添加新索引和新表
- **API**: travelGuides.ts 的查询和 upsert 逻辑需要重构
- **类型**: packages/crawler-types 需要与 convex schema 对齐
- **爬虫**: apps/ai-service/src/routes/crawler.ts 需要添加验证逻辑
- **迁移**: 需要编写数据迁移脚本，将现有 AI 字段迁移到新表
