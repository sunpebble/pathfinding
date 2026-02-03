## 1. CI 覆盖率配置

- [x] 1.1 配置 Vitest 覆盖率报告（vitest.config.ts 添加 coverage 配置）
- [x] 1.2 设置整体覆盖率门槛 60%
- [x] 1.3 配置 CI workflow 运行覆盖率检查
- [x] 1.4 添加覆盖率徽章到 README

## 2. Convex 核心模块测试

- [x] 2.1 为 `convex/travelGuides.ts` 编写 upsert 逻辑测试
- [x] 2.2 为 `convex/travelGuides.ts` 编写 bulkUpsert 去重测试
- [x] 2.3 为 `convex/guideDestinations.ts` 编写目的地同步测试
- [x] 2.4 为 `convex/guideAggregates.ts` 编写聚合更新测试
- [x] 2.5 为 `convex/lib/displayFields.ts` 补充边界情况测试

## 3. 爬虫模块测试

- [x] 3.1 创建 HTML fixtures 目录结构 (`apps/ai-service/src/lib/crawlers/__fixtures__/`)
- [x] 3.2 为小红书爬虫 (`xiaohongshu.ts`) 编写解析测试
- [x] 3.3 为马蜂窝爬虫 (`mafengwo.ts`) 编写解析测试
- [x] 3.4 为携程爬虫 (`ctrip.ts`) 编写解析测试
- [x] 3.5 为内容清洗器 (`content-cleaner.ts`) 编写测试

## 4. LLM 集成层测试

- [x] 4.1 为 `lib/llm/claude.ts` 编写初始化测试
- [x] 4.2 为 `lib/llm/ollama.ts` 编写初始化测试
- [x] 4.3 为 `lib/llm/openai.ts` 编写初始化测试
- [x] 4.4 为 `lib/llm/index.ts` 编写 provider 选择逻辑测试

## 5. 验证与文档

- [x] 5.1 运行全量测试确保通过
- [x] 5.2 生成覆盖率报告验证达到 60% 门槛
- [x] 5.3 更新 CONTRIBUTING.md 添加测试编写规范
