## 1. 项目配置

- [x] 1.1 在 `apps/motia/package.json` 添加依赖 `@browserbasehq/stagehand` 和 `@onkernel/sdk`
- [x] 1.2 在 `apps/motia/.env.example` 添加 `KERNEL_API_KEY` 环境变量说明
- [x] 1.3 创建共享的浏览器工具模块 `apps/motia/src/lib/kernel-browser.ts`

## 2. 马蜂窝爬虫服务 (mafengwo-crawler-service)

- [x] 2.1 创建列表爬取 Step `apps/motia/src/api/mafengwo-list.step.ts`
- [x] 2.2 实现 Kernel.sh 浏览器会话创建和释放逻辑
- [x] 2.3 实现移动版游记列表页爬取（滚动加载）
- [x] 2.4 实现游记 URL 提取逻辑
- [x] 2.5 添加 `crawler.mafengwo.list.completed` 事件发送
- [x] 2.6 创建详情爬取 Step `apps/motia/src/api/mafengwo-detail.step.ts`
- [x] 2.7 实现单篇游记详情页爬取
- [x] 2.8 实现内容过短检测和重试逻辑
- [x] 2.9 添加 `crawler.mafengwo.detail.completed` 事件发送

## 3. 数据转换器 (mafengwo-data-converter)

- [x] 3.1 创建数据转换模块 `apps/motia/src/lib/mafengwo-converter.ts`
- [x] 3.2 实现字段映射函数（title, content, author 等）
- [x] 3.3 实现浏览量格式转换（"1.2万" → 12000）
- [x] 3.4 实现 sourceExternalId 提取（从 URL 提取 /i/(\\d+).html）
- [x] 3.5 实现质量分数计算逻辑
- [x] 3.6 实现 completenessLevel 判断逻辑

## 4. Convex 数据存储

- [x] 4.1 创建存储 Step `apps/motia/src/events/mafengwo-save.step.ts`
- [x] 4.2 实现 Convex client 初始化
- [x] 4.3 调用 `travelGuides.upsert` mutation 存储单条数据
- [x] 4.4 实现批量存储逻辑（调用 `travelGuides.bulkUpsert`）
- [x] 4.5 添加 `crawler.mafengwo.saved` 事件发送

## 5. 测试和验证

- [x] 5.1 创建本地测试脚本验证列表爬取
- [x] 5.2 创建本地测试脚本验证详情爬取
- [ ] 5.3 验证数据正确写入 Convex
- [ ] 5.4 验证去重逻辑（同一游记不重复创建）
- [ ] 5.5 验证错误处理和重试逻辑

## 6. 文档和部署

- [x] 6.1 更新 apps/motia/README.md 添加马蜂窝爬虫 API 说明
- [ ] 6.2 在生产环境配置 KERNEL_API_KEY
- [ ] 6.3 部署并验证 API 端点可访问
