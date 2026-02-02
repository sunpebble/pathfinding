## 1. 数据完整性分级

- [x] 1.1 在 `packages/crawler-types/src/travel-guide.ts` 新增 `CompletenessLevel` 类型定义
- [x] 1.2 在 `packages/crawler-types/src/validators.ts` 实现 `calculateCompletenessLevel()` 函数
- [x] 1.3 在 `packages/convex-client/src/validators/` 新增 completenessLevel 验证器
- [x] 1.4 更新 `convex/travelGuides.ts` schema 添加 completenessLevel 字段和索引
- [x] 1.5 更新查询函数支持按 completenessLevel 筛选

## 2. 验证规则升级

- [x] 2.1 修改 `MIN_CONTENT_LENGTH` 从 200 改为 500（用于 complete 级别判断）
- [x] 2.2 实现标题验证逻辑（缺失标题 → 降级，超长标题 → 截断）
- [x] 2.3 实现图片验证逻辑（无图片 → 降级，coverImageUrl 自动填充）
- [x] 2.4 实现作者验证逻辑（缺失作者 → 降级）
- [x] 2.5 区分 error 级别和 warning 级别验证，更新错误返回结构
- [x] 2.6 更新 `apps/ai-service/src/scripts/import-to-convex.ts` 导入逻辑

## 3. 内容截断检测与二次爬取

- [x] 3.1 在 `convex/` 新增 `refetchTasks.ts` 定义二次爬取任务表
- [x] 3.2 更新截断检测逻辑，从警告改为触发二次爬取任务
- [x] 3.3 实现 Convex scheduled function 处理二次爬取队列
- [x] 3.4 集成 `platform-rate-limiter` 控制爬取频率
- [x] 3.5 实现二次爬取结果合并逻辑，更新原记录并重新计算 completenessLevel
- [x] 3.6 实现任务状态追踪（pending/running/completed/failed）
- [x] 3.7 集成 `smart-retry-strategy` 处理失败重试

## 4. AI 内容增强

- [x] 4.1 在 `apps/ai-service/src/routes/ai.ts` 新增 `/enhance` 端点
- [x] 4.2 实现 AI 标题生成逻辑（从 content 提取/生成，≤50 字符）
- [x] 4.3 实现 AI 摘要生成逻辑（100-200 字符摘要）
- [x] 4.4 实现批量增强 API（最多 10 个攻略/次）
- [x] 4.5 增强后触发 completenessLevel 重新计算
- [x] 4.6 实现增强优先级逻辑（usable > incomplete）

## 5. 测试与验证

- [ ] 5.1 为 `calculateCompletenessLevel()` 编写单元测试
- [ ] 5.2 为验证规则变更编写测试用例
- [ ] 5.3 为二次爬取队列编写集成测试
- [ ] 5.4 为 AI 增强接口编写测试
- [ ] 5.5 验证查询筛选功能正常工作
