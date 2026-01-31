## 1. Schema 变更

- [x] 1.1 在 convex/schema.ts 中添加 guideDestinations 辅助表定义
- [x] 1.2 在 convex/schema.ts 中添加 travelGuideAiData 表定义
- [x] 1.3 为 travelGuideAiData 添加 by_guide 和 by_guide_version 索引
- [x] 1.4 安装 @convex-dev/aggregate 组件用于计数优化
- [x] 1.5 部署 schema 变更并验证

## 2. 类型转换层

- [x] 2.1 在 packages/crawler-types/src 中创建 converters.ts 文件
- [x] 2.2 实现 toCamelCase<T>() 递归转换函数
- [x] 2.3 实现 toSnakeCase<T>() 递归转换函数
- [x] 2.4 添加类型定义确保转换类型安全
- [x] 2.5 编写单元测试验证嵌套对象转换

## 3. 数据验证

- [x] 3.1 在 packages/crawler-types/src 中创建 validators.ts 文件
- [x] 3.2 定义必填字段规则 (sourcePlatform, sourceExternalId, content, destinations)
- [x] 3.3 实现 validateGuide() 函数，返回验证错误数组
- [x] 3.4 实现内容长度验证 (最小 200 字符)
- [x] 3.5 实现数值范围验证 (likesCount >= 0, qualityScore 0-1)
- [x] 3.6 在 apps/ai-service/src/routes/crawler.ts 中集成验证逻辑

## 4. 查询优化

- [x] 4.1 创建 convex/guideDestinations.ts 文件
- [x] 4.2 实现 syncDestinations 内部函数，在攻略创建/更新时同步辅助表
- [x] 4.3 重构 getByDestination 使用 guideDestinations 索引查询
- [x] 4.4 配置 Aggregates 组件用于计数
- [x] 4.5 重构 count() 使用 Aggregates 预计算值
- [x] 4.6 实现 countByPlatform() 按平台计数查询

## 5. AI 数据分离

- [x] 5.1 创建 convex/travelGuideAiData.ts 文件
- [x] 5.2 实现 createAiData mutation，支持版本管理
- [x] 5.3 实现 getLatestAiData query
- [x] 5.4 实现 getAiDataByVersion query
- [x] 5.5 实现 getGuideWithAiData 联合查询函数
- [x] 5.6 重构 updateAiData mutation 写入新表

## 6. Upsert 去重优化

- [x] 6.1 重构 upsert mutation，移除事后去重调用
- [x] 6.2 在 upsert 中集成 syncDestinations 调用
- [x] 6.3 在 upsert 中集成 Aggregates 计数更新
- [x] 6.4 实现 bulkUpsert mutation，返回 inserted/updated 统计
- [x] 6.5 移除或废弃 removeDuplicates mutation

## 7. 数据迁移

- [x] 7.1 创建 convex/migrations/migrateDestinations.ts 迁移脚本
- [x] 7.2 创建 convex/migrations/migrateAiData.ts 迁移脚本
- [x] 7.3 创建 convex/migrations/cleanupDuplicates.ts 一次性清理脚本
- [x] 7.4 运行 destinations 迁移并验证
- [x] 7.5 运行 AI 数据迁移并验证
- [x] 7.6 运行重复数据清理并验证

## 8. 测试与验证

- [x] 8.1 编写 guideDestinations 同步测试
- [x] 8.2 编写 travelGuideAiData 版本管理测试
- [x] 8.3 编写类型转换器单元测试
- [x] 8.4 编写数据验证器单元测试
- [x] 8.5 验证查询性能改进 (对比迁移前后)
- [x] 8.6 验证数据一致性 (抽样检查)
