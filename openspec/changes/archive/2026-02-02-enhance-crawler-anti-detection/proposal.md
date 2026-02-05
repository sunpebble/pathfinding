## Why

当前爬虫在抓取小红书、马蜂窝、穷游等平台时频繁遭遇反爬虫检测，导致：

- 验证码拦截频繁出现
- 会话过期需要手动干预
- 抓取成功率不稳定（部分平台低于 50%）

项目已集成 Stagehand v3.0.8 和 Kernel.sh SDK，但未充分利用其反检测能力。现在需要统一优化所有非 ctrip 平台的爬虫，提升抓取稳定性和成功率。

## What Changes

- 统一使用 Kernel.sh 云浏览器作为默认后端（stealth 模式内置反检测）
- 增强 Stagehand AI 能力用于动态页面交互（验证码绕过、登录流程）
- 实现智能重试策略（检测封禁后自动切换 IP/会话）
- 添加浏览器指纹随机化（User-Agent、viewport、timezone）
- 优化请求间隔策略（基于平台特性的自适应延迟）
- 统一会话管理（跨平台的 cookie 持久化和刷新机制）

## Capabilities

### New Capabilities

- `anti-detection-browser`: 统一的反检测浏览器客户端，封装 Kernel.sh stealth 模式和指纹随机化
- `smart-retry-strategy`: 智能重试策略，包括封禁检测、会话刷新、IP 轮换触发
- `platform-rate-limiter`: 平台感知的速率限制器，根据平台特性自适应调整请求间隔

### Modified Capabilities

_无需修改现有 specs_

## Impact

- **代码变更**：
  - `apps/ai-service/src/lib/crawlers/clients/` - 增强客户端实现
  - `apps/ai-service/src/lib/crawlers/*.ts` - 各平台爬虫适配新客户端
  - `apps/ai-service/src/lib/crawlers/session/` - 统一会话管理

- **配置变更**：
  - `.env` 新增 Kernel.sh 配置项
  - 可能需要 Kernel.sh 付费账户

- **依赖**：
  - `@onkernel/sdk` - 已安装
  - `@browserbasehq/stagehand` - 已安装 v3.0.8

- **排除范围**：
  - `ctrip.ts` 爬虫不在本次优化范围内
