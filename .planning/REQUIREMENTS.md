# Requirements: Crawler Data Quality Fix

**Defined:** 2026-01-25
**Core Value:** 每个平台的爬虫都能稳定抓取完整的攻略内容

## v1 Requirements

### 诊断 (DIAG)

- [x] **DIAG-01**: 诊断每个平台数据缺失的根本原因（获取阶段 vs 解析阶段）
- [x] **DIAG-02**: 记录每个平台的反爬机制和登录要求
- [x] **DIAG-03**: 验证当前爬虫的 HTML/API 响应内容是否完整

### 基础设施 (INFRA)

- [x] **INFRA-01**: 实现智能等待策略替代固定 sleep() 延迟
- [x] **INFRA-02**: 实现登录态管理 — 支持手动登录后保存 cookie
- [x] **INFRA-03**: 实现会话持久化 — 跨运行保持登录状态

### 携程 (CTRIP)

- [x] **CTRIP-01**: 提取完整正文内容
- [x] **CTRIP-02**: 提取高清图片 URL（原图而非缩略图）
- [x] **CTRIP-03**: 提取作者信息（昵称 + 尽力提取头像）
- [x] **CTRIP-04**: 提取发布时间
- [x] **CTRIP-05**: 提取互动数据（点赞、收藏、评论数）
- [x] **CTRIP-06**: 验证数据完整性

### 马蜂窝 (MFW)

- [x] **MFW-01**: 添加详情页导航（当前仅列表页）
- [x] **MFW-02**: 提取完整正文内容
- [x] **MFW-03**: 提取高清图片 URL
- [x] **MFW-04**: 提取作者信息（昵称 + 尽力提取头像）
- [x] **MFW-05**: 提取发布时间
- [x] **MFW-06**: 提取互动数据（点赞、收藏、评论数）
- [x] **MFW-07**: 处理验证码/登录墙
- [x] **MFW-08**: 验证数据完整性

### 小红书 (XHS)

- [x] **XHS-01**: 提取完整正文内容
- [x] **XHS-02**: 提取高清图片 URL（带尺寸信息）
- [x] **XHS-03**: 提取视频 URL（H264/H265 流）
- [x] **XHS-04**: 提取作者信息（昵称 + 头像）
- [~] **XHS-05**: 提取发布时间 — N/A (API不提供此字段)
- [x] **XHS-06**: 提取互动数据（点赞、收藏、评论数）
- [x] **XHS-07**: 实现登录态支持（手动登录 + cookie 保存）
- [x] **XHS-08**: 验证数据完整性

### 去哪儿 (QUNAR)

- [x] **QUNAR-01**: 提取完整正文内容
- [x] **QUNAR-02**: 提取高清图片 URL
- [x] **QUNAR-03**: 提取作者信息（昵称 + 尽力提取头像）
- [x] **QUNAR-04**: 提取发布时间
- [x] **QUNAR-05**: 提取互动数据（点赞、收藏、评论数）
- [x] **QUNAR-06**: 验证数据完整性

### 同程 (TC)

- [x] **TC-01**: 添加详情页导航（当前仅列表页）
- [x] **TC-02**: 提取完整正文内容
- [x] **TC-03**: 提取高清图片 URL
- [x] **TC-04**: 提取作者信息（昵称 + 尽力提取头像）
- [x] **TC-05**: 提取发布时间
- [x] **TC-06**: 提取互动数据（点赞、收藏、评论数）
- [x] **TC-07**: 验证数据完整性

### 验证 (VERIFY)

- [ ] **VERIFY-01**: 每个平台至少抓取 10 条完整数据验证
- [ ] **VERIFY-02**: 验证所有 6 个核心字段都有值（视频仅小红书）
- [ ] **VERIFY-03**: 验证图片 URL 可访问且为高清原图
- [ ] **VERIFY-04**: 验证登录态可跨运行保持

## v2 Requirements

### 媒体持久化

- **MEDIA-01**: 下载图片到本地/云存储（CDN URL 会过期）
- **MEDIA-02**: 下载视频到本地/云存储
- **MEDIA-03**: 实现媒体 URL 过期检测和刷新

### 反检测增强

- **ANTI-01**: 迁移到 rebrowser-playwright（更强反检测）
- **ANTI-02**: 添加住宅代理支持
- **ANTI-03**: 实现浏览器指纹轮换

### 生产加固

- **PROD-01**: 添加速率限制和重试策略
- **PROD-02**: 添加提取监控和报警
- **PROD-03**: 实现熔断器模式

## Out of Scope

| Feature             | Reason                     |
| ------------------- | -------------------------- |
| 新增其他平台爬虫    | 先修复现有 5 个平台        |
| 自动登录/验证码破解 | 接受手动登录，避免法律风险 |
| 爬虫性能优化        | 先确保数据完整             |
| 数据清洗/去重逻辑   | 不在本次范围               |
| 实时评论抓取        | API 负载高，易被封禁       |
| 用户联系方式提取    | 隐私法规限制               |

## Traceability

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| DIAG-01     | Phase 1 | Complete |
| DIAG-02     | Phase 1 | Complete |
| DIAG-03     | Phase 1 | Complete |
| INFRA-01    | Phase 2 | Complete |
| INFRA-02    | Phase 2 | Complete |
| INFRA-03    | Phase 2 | Complete |
| CTRIP-01    | Phase 3 | Complete |
| CTRIP-02    | Phase 3 | Complete |
| CTRIP-03    | Phase 3 | Complete |
| CTRIP-04    | Phase 3 | Complete |
| CTRIP-05    | Phase 3 | Complete |
| CTRIP-06    | Phase 3 | Complete |
| QUNAR-01    | Phase 4 | Complete |
| QUNAR-02    | Phase 4 | Complete |
| QUNAR-03    | Phase 4 | Complete |
| QUNAR-04    | Phase 4 | Complete |
| QUNAR-05    | Phase 4 | Complete |
| QUNAR-06    | Phase 4 | Complete |
| MFW-01      | Phase 5 | Complete |
| MFW-02      | Phase 5 | Complete |
| MFW-03      | Phase 5 | Complete |
| MFW-04      | Phase 5 | Complete |
| MFW-05      | Phase 5 | Complete |
| MFW-06      | Phase 5 | Complete |
| MFW-07      | Phase 5 | Complete |
| MFW-08      | Phase 5 | Complete |
| TC-01       | Phase 6 | Complete |
| TC-02       | Phase 6 | Complete |
| TC-03       | Phase 6 | Complete |
| TC-04       | Phase 6 | Complete |
| TC-05       | Phase 6 | Complete |
| TC-06       | Phase 6 | Complete |
| TC-07       | Phase 6 | Complete |
| XHS-01      | Phase 7 | Complete |
| XHS-02      | Phase 7 | Complete |
| XHS-03      | Phase 7 | Complete |
| XHS-04      | Phase 7 | Complete |
| XHS-05      | Phase 7 | N/A      |
| XHS-06      | Phase 7 | Complete |
| XHS-07      | Phase 7 | Complete |
| XHS-08      | Phase 7 | Complete |
| VERIFY-01   | Phase 8 | Pending  |
| VERIFY-02   | Phase 8 | Pending  |
| VERIFY-03   | Phase 8 | Pending  |
| VERIFY-04   | Phase 8 | Pending  |

**Coverage:**

- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0 ✓

---

_Requirements defined: 2026-01-25_
_Last updated: 2026-01-25 Phase 6 requirements marked complete_
