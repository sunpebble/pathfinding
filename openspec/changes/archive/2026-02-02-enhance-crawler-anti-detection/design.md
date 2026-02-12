## Context

当前爬虫架构位于 `apps/ai-service/src/lib/crawlers/`，已有 6 个平台实现（xiaohongshu, mafengwo, tongcheng, qyer, qunar, ctrip）。项目已集成：

- **Stagehand v3.0.8**: AI 驱动的浏览器自动化，支持自然语言操作
- **Kernel.sh SDK**: 云端浏览器基础设施，内置 stealth 模式

现有问题：

- 各平台爬虫独立实现反爬逻辑，缺乏统一策略
- Kernel.sh 的 stealth 模式未被充分利用
- 验证码检测后仅记录错误，无自动恢复机制
- 会话管理仅在小红书实现，其他平台缺失

## Goals / Non-Goals

**Goals:**

- 统一反检测浏览器客户端，所有非 ctrip 平台使用相同的反爬基础设施
- 实现智能重试策略，自动处理封禁和会话过期
- 平台感知的速率限制，根据各平台特性自适应调整
- 提升整体抓取成功率至 80% 以上

**Non-Goals:**

- 不修改 ctrip.ts 爬虫
- 不实现 weibo/douyin/tripadvisor 新爬虫（仅优化现有平台）
- 不实现代理 IP 池管理（依赖 Kernel.sh 内置能力）
- 不实现验证码自动识别（仅绕过和重试）

## Decisions

### Decision 1: Kernel.sh 作为默认浏览器后端

**选择**: 优先使用 Kernel.sh，Stagehand 作为 AI 操作补充

**原因**:

- Kernel.sh stealth 模式内置指纹随机化、IP 轮换
- 云端执行避免本地 IP 被封
- Stagehand 的 AI 能力（act/extract）仍可通过 Kernel 浏览器使用

**替代方案**:

- 纯 Stagehand LOCAL 模式 → 缺少 stealth，本地 IP 容易被封
- Browserbase → 功能类似但 Kernel.sh 已集成

### Decision 2: 三层重试策略

**选择**: 请求级 → 会话级 → 浏览器级 三层重试

```
Layer 1: 请求重试 (3次，指数退避)
  ↓ 失败
Layer 2: 会话刷新 (清除 cookie，重新登录)
  ↓ 失败
Layer 3: 浏览器重建 (新建 Kernel 实例，获取新 IP)
```

**原因**: 渐进式恢复，避免频繁创建新浏览器实例（成本高）

### Decision 3: 平台配置驱动的速率限制

**选择**: 集中配置文件定义各平台参数

```typescript
const PLATFORM_CONFIG = {
  xiaohongshu: { minDelay: 2000, maxDelay: 5000, burstLimit: 10 },
  mafengwo: { minDelay: 1500, maxDelay: 3000, burstLimit: 20 },
  // ...
};
```

**原因**:

- 各平台反爬严格程度不同
- 便于运维调整，无需修改代码

### Decision 4: 统一封禁检测接口

**选择**: 每个平台实现 `detectBlock(response): BlockType` 接口

```typescript
type BlockType =
  | "none"
  | "captcha"
  | "rate-limit"
  | "ip-ban"
  | "session-expired";
```

**原因**: 统一检测逻辑，重试策略可根据 BlockType 选择恢复方式

## Risks / Trade-offs

| 风险                 | 缓解措施                         |
| -------------------- | -------------------------------- |
| Kernel.sh 服务不可用 | 回退到 Stagehand LOCAL 模式      |
| Kernel.sh 成本增加   | 监控使用量，设置每日限额         |
| 新客户端引入 bug     | 保留现有客户端代码，通过配置切换 |
| 平台更新反爬策略     | 模块化检测逻辑，便于快速适配     |

## Migration Plan

1. **Phase 1**: 实现新客户端和重试策略（不影响现有代码）
2. **Phase 2**: 逐个平台迁移，从风险最低的 qunar 开始
3. **Phase 3**: 监控成功率，调整平台配置参数
4. **Rollback**: 环境变量 `USE_LEGACY_CLIENT=true` 切回旧客户端

## Open Questions

- [ ] Kernel.sh 免费额度是否满足当前抓取量？
- [ ] 是否需要实现多账号轮换（针对小红书登录态）？
