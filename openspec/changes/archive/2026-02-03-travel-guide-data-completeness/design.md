## Context

当前爬虫系统采集的旅游指南数据存在以下问题：
1. `TravelGuideRaw` 只有 `content` 是必填字段，其他关键展示字段（标题、封面、作者）都是可选
2. 内容截断检测（如"查看更多"结尾）只是警告级别，不完整内容仍会入库
3. 数据导入时使用默认值填充（空字符串、0、空数组），用户看到的是空白数据
4. iOS 展示需要 9 个必填字段，但验证层只检查 4 个

现有验证规范在 `openspec/specs/data-validation/spec.md`，最小内容长度为 200 字符。

## Goals / Non-Goals

**Goals:**
- 建立数据完整性分级机制，让前端可以按质量筛选展示
- 实现内容截断时的二次爬取，获取完整文章
- 提升验证门槛，阻止明显低质量数据入库
- 通过 AI 补全缺失的标题和摘要字段

**Non-Goals:**
- 不修改 iOS 客户端展示逻辑（客户端自行适配新字段）
- 不处理历史数据迁移（后续单独任务）
- 不涉及图片下载和存储优化

## Decisions

### Decision 1: 完整性分级放在验证层而非查询层

**选择**: 在 `validators.ts` 计算 `completenessLevel` 并存入数据库

**理由**: 
- 查询时无需重复计算，提升查询性能
- 可建立索引，支持按完整性等级筛选
- 数据入库时就有明确的质量标记

**备选方案**: 查询时动态计算 → 弃用，因为会增加查询复杂度

### Decision 2: 二次爬取使用异步队列

**选择**: 检测到截断时，将任务推入 Convex 的 scheduled function

**理由**:
- 不阻塞首次入库流程
- 可控制爬取频率，避免触发反爬
- 失败可重试，有完整的任务状态追踪

**备选方案**: 同步爬取 → 弃用，会导致 API 超时

### Decision 3: AI 补全使用现有 AI Service 架构

**选择**: 在 `apps/ai-service/src/routes/ai.ts` 新增 `/enhance` 端点

**理由**:
- 复用现有 LLM 配置和错误处理
- 统一的 AI 调用入口，便于监控和限流
- 可批量处理，减少 API 调用次数

### Decision 4: 完整性等级定义

```typescript
type CompletenessLevel = 'complete' | 'usable' | 'incomplete';

// complete: 所有 iOS 必填字段齐全，内容 ≥ 500 字，无截断
// usable: 有标题+内容+至少一张图片，可展示但有缺失
// incomplete: 关键字段缺失或内容截断，需要补全
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 二次爬取增加平台压力，可能触发反爬 | 使用现有 `platform-rate-limiter`，设置较长间隔 |
| AI 补全成本增加 | 只对 `usable` 级别数据补全，`incomplete` 优先二次爬取 |
| 提升门槛导致数据量下降 | 分级而非拒绝，`incomplete` 数据仍保留，只是不优先展示 |
| 历史数据没有 `completenessLevel` | 查询兼容处理，缺失字段视为 `null`，前端降级展示 |

## Migration Plan

1. **Phase 1**: 新增 `completenessLevel` 字段，验证逻辑更新
2. **Phase 2**: 部署二次爬取队列，处理截断内容
3. **Phase 3**: 上线 AI 补全功能
4. **Rollback**: 字段向后兼容，回滚只需关闭新功能开关
