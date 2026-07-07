# Sunpebble Trips 产品重整设计：定位收敛、流程修复、后端可用

日期：2026-07-07
状态：已与维护者确认关键取舍，待审阅
前置审计：本设计基于对 API / 数据库 / iOS / dashboard / 家族风格的六路并行审计（2026-07-07）。

## 1. 背景与诊断

产品于 2026-07-06（commit 3596643）从「马蜂窝攻略爬虫聚合器」转向「个人行程规划工具」，
但转型只做了一半：

- **后端代码本身健康**：typecheck 全绿、334 个单测全过、`pnpm dev:api` 正常启动、
  auth 自建（scrypt + jose JWT + authSessions）无外部依赖。
- **真正的「不可用」是三处断裂**：
  1. iOS 大面积调用不存在的端点：`api/auth/sms/send`、`api/auth/signin/phone`、
     `api/auth/refresh`、`api/itineraries/:id/budget*`、`api/me/*`、`api/categories`、
     `api/stats/*`、`api/footprints/*`、全部 `v1/*` 前缀（cities/preferences/insurance/
     collaboration/copy-history）——后端均无挂载，全部 404。
  2. 数据归属分裂：iOS 行程本体存 UserDefaults + CloudKit，预算/统计存服务器且两套 ID
     混用（`ItineraryDetailView` 中 analysis 用 apiItineraryId、budget 用本地 UUID）；
     web 端读服务器——三者互不相通。
  3. 迁移体系名存实亡：`drizzle.config.ts` 的 out 目录不存在、零迁移文件、靠 `db:push`
     裸奔；本地起库后不自动建表；currency 表无任何写入方。
- **爬虫遗留自成一块**：后端 5 组路由（crawl-jobs / quality-reports / training-datasets /
  crawler-fetch / guides）是死路由或僵尸（马蜂窝抓取被硬编码禁用、Go crawler 已删）；
  48 张表中 17 张是爬虫遗留；dashboard 有 14 条爬虫代理路由和被 `notFound()` 打洞的孤儿
  页面；iOS 的发现/攻略搜索/攻略详情/城市百科/公共行程广场是不可达死代码树。
- **社区壳与定位冲突**：Profile 展示关注者/粉丝/点赞/收藏统计，但 app 内已无任何内容
  发现入口，数字永远为 0；评论 UI 唯一挂载点是死的攻略详情页。
- **功能性破损**：无退出登录入口、Apple/微信登录按钮恒抛 `oauthNotImplemented`（拒审
  风险）、忘记密码空 TODO、收藏详情占位符、API 设置页保存不生效、游客聊天共享
  `"guest"` 身份直传服务器（游客间数据互通隐患）、PDF 导出两端入口均坏（501 / 无
  rewrite）、dashboard 的 expenses 与 profile 页缺 rewrite 而 404。

## 2. 已确认的决策

| # | 决策 | 结论 |
|---|------|------|
| R1 | 行程数据单一事实源 | **服务器为源**；web 与 iOS 是同一数据的两个视图 |
| R2 | 爬虫/聚合遗留 | **整树删除**（代码 + 表退役；生产表冷备后清理） |
| R3 | 社交边界 | **留同行、删社区**：保留协作者、分账、只读分享链接；删除关注/粉丝/点赞/收藏/评论/公共内容 |
| R4 | 后端可用标准 | **本地端到端跑通**：一键起库自动建表、核心流程冒烟通过、正规迁移、死端点清零 |
| R5 | 实施路径 | **方案 A**：先收缩 → 再夯实后端 → 后 iOS 对齐与品牌 |
| R6 | 删除清单 | 按清单全删（含 travel-notes、PDF 导出、手机验证码登录） |
| R7 | iOS 离线策略 | **离线可编辑（排队同步）**：本地镜像 + 变更队列 + 后写胜 |
| R8 | 游客模式 | **游客本地试用**：可建行程但仅存本机、明确标注；登录后一次性上行；AI/预算/分账需登录 |

## 3. 定位声明

Sunpebble Trips 是 Sunpebble 家族的 calm、private 个人行程规划工具，服务「自己和
同行人」：把松散的旅行想法变成可编辑的计划——行程、地点、预算、分账、行前提醒，
AI 只作起草辅助。不是社区、不是攻略聚合器、不是爬虫控制台（沿用 PRODUCT.md
Anti-references）。数据以服务器为源，隐私边界是「我的账号与我邀请的同行人」，
无追踪、无公开内容面。

## 4. 功能清单

### 保留（核心）

- 邮箱注册登录 + **Sign in with Apple**（iOS 端真实现；后端 `/api/auth/social` 已有
  Apple JWKS 通道）；补退出登录入口。
- 行程 / 天 / 地点（POI）编辑；MKLocalSearch 搜地点（本地能力，与后端无关）。
- 预算与消费记录（端点补全，统一挂服务器行程 ID）。
- 同行分账（trip_members / shared_expenses / expense_participants / settlements）。
- 行程协作者（后端 itinerary-collaborators + dashboard 面板已存在；iOS 的实时协作
  死模块删除，v1 不做实时协同编辑）。
- AI 行程规划（`/api/agent/plan/*`）+ AI 助手聊天（`/api/chat/*`）；聊天需登录。
- 只读分享链接（sharing；`resourceType` 收敛为 `itinerary` 枚举，清理 guide 类型历史行）。
- 天气（auxiliary `/weather`，OpenWeatherMap）。
- 行前提醒：改用 **iOS 本地通知**（UNUserNotificationCenter），删除服务器推送依赖
  （push.service.ts 本就只写日志）。

### 删除（整树）

- **爬虫遗留**：后端路由 crawl-jobs、quality-reports、training-datasets、crawler-fetch
  （SSRF 面，agent 不依赖）、guides 及其服务（guide-writer、guide-import、
  backfill-executor）、`@pathfinding/guide-shape` 与 `@pathfinding/crawler-types`
  整包；dashboard 的 `src/app/api/crawler/*` 全部 14 条代理、`src/lib/api/crawler.ts`、
  jobs/guides/datasets 孤儿页面（含存活的 `jobs/[id]`）、poi-editor 等孤儿组件；
  iOS 的 DiscoverView、SearchView、PublicItineraryDiscoveryView、BlogDetailView 及
  BlogDetail/、CityEncyclopediaView 及 Encyclopedia/、GuideStore、GuideAPIClient、
  CityAPIClient、BlogPost 模型、mafengwo/xiaohongshu 硬编码、聚合器文案字符串。
- **社区壳**：后端 comments、likes、favorites、collections、notifications、push-tokens、
  qa、travel-notes 路由及服务；iOS 的 FollowStore、FollowManagementView、UserProfileView、
  CommentStore、CommentSectionView、TravelNoteStore、ActivityFeed、FavoriteStore、
  MyFavoritesView、Profile 五项社交统计。
  （行程评论唯一入口挂在死的攻略详情页上——`guide_comments` 无需迁移，随树删除。）
- **坏承诺**：PDF 导出（iOS PdfExportSheet、PDFAPIClient、dashboard pdf-export-button
  与 `/api/export-pdf` 调用、后端 `/pdf/*` 501 stub）；机票 `/flights` 501；翻译组
  （routes/translations + iOS 死模型）；保险（InsuranceView/InsuranceStore，后端无路由）；
  手机验证码登录（LoginView 的 SMS UI + AuthManager 的 sms/send、signin/phone 调用）；
  微信登录假按钮；忘记密码空按钮（两端三处）；API 设置页改 `#if DEBUG`。
- **iOS 死模块**：Collaboration/ 实时协作、DebugMenuView 入口核查、PreferencesAPIClient、
  ItineraryAPIClient 的 v1/copy-history 与 /public 调用。

### 本地化（降级但保留体验）

- 旅行统计与足迹地图：iOS 本地从行程数据聚合计算（后端本就没有 stats/footprints 路由；
  StatsStore/FootprintStore 改本地实现或并入展示层）。
- 用户偏好：回归 UserDefaults。
- 行程复制：客户端复制（读取现有行程 → POST 新行程），删 copy-history。
- 消费分类：客户端常量（删 `api/categories` 调用）。

### 补齐（少量新建，Phase 2）

- `POST /api/auth/refresh`：基于现有 authSessions 会话换发新 JWT（iOS 调用点已存在）。
- budgets / expenses 补全 CRUD：`GET/POST /api/budgets?itineraryId=`、
  `PATCH/DELETE /api/budgets/:id`；expenses 同构。iOS BudgetStore 改用这些路径。
- 汇率：`/api/currency` 增加按需拉取（frankfurter.app，免 key）+ 写入现有
  currency_rates 缓存表，解决「表无写入方、接口永远 null」。
- dashboard rewrite 收敛：删除逐条 rewrite，改为 `/api/:path*` 单条 catch-all 转发后端
  （Next 自有 route handler 优先级更高，保留 chat 转发 handler 并带上 Authorization）。

## 5. 用户流程

### iOS 主流程

启动 → 登录（邮箱 / Apple）或游客试用 → 行程列表（空态 CTA：AI 规划 / 手动新建）→
建行程 → 详情页首屏显式「添加地点」引导 → 天卡编辑（加 POI、交通方式）→ 预算 / 分账 →
行前本地提醒。

修复项：

- 补退出登录（ProfileView 设置区）。
- 聊天去掉 NewSessionSheet 冷启动表单：直接开聊，标题取首条消息自动生成。
- 游客聊天不再以共享 `"guest"` 身份直传服务器：聊天需登录，游客看到登录引导。
- 聊天身份由 token 推导，后端不再信任 query/body 里的 userId。

### 游客模式（R8）

- 游客可建/编辑行程，数据仅存本机镜像（不入同步队列），UI 明确标注「未登录·仅保存在
  本机」。
- 登录后一次性上行迁移：本地行程推到服务器，成功后本地转为镜像缓存。
- AI 聊天、AI 规划、预算、分账、协作、分享需登录。

### Web（dashboard）= 薄客户端

页面收敛为：总览、行程、费用分摊、AI 助手、设置。同一账号看同一数据。

- 登录收敛到 `/`（amber/sun 品牌落地页），`/auth/signin`、`/auth/signup` 重定向到 `/`。
- 新增 middleware 统一鉴权守卫（删除各页面重复的 useEffect 守卫）。
- chat 转发带 Authorization；后端 agent/chat 路由挂 `authRequired`（堵匿名 AI 配额洞）。
- 「Sunpebble Trips 控制台」改名「Sunpebble Trips」；settings 删 crawlerApiUrl。
- 删除 `/pois` 全局浏览页（爬虫数据集浏览器，与定位冲突）。
- profile / expenses 页由 catch-all rewrite 自然修复。

## 6. 后端方案

### 路由收敛（36 → 15 组）

保留：health、auth（+refresh）、users、itineraries、itinerary-collaborators、pois、
budgets、expenses、expense-splitting、currency、sharing、chat、agent、auxiliary
（天气 + 交通优化，删 501 stub）、uploads。

删除：crawl-jobs、quality-reports、training-datasets、crawler-fetch、guides、qa、
translations、travel-notes、comments、likes、favorites、collections、notifications、
push-tokens。

鉴权变化：agent 与 chat 路由挂 `authRequired`；身份一律由 token 推导。

### 表退役（48 → ~25 张）

- 删除 schema：crawl.ts（5）、guides.ts（7）、mafengwo.ts（5）全部 17 张；
  profiles/user_follows、poi_questions/poi_answers、travel_notes、
  itinerary_likes/favorite_collections/itinerary_favorites/comment_reports、
  notifications/push_tokens/notification_settings/scheduled_notifications、
  translation_phrases/saved_translations/offline_translation_packs/user_offline_packs/
  content_translations。
- 生产库处置：先 `RENAME TABLE x TO _retired_x` 冷备，一个发布周期后 DROP；
  本设计只交付 rename 迁移与回滚说明。
- share_links 清理 `resourceType != 'itinerary'` 的历史行，字段收敛为枚举。

### 迁移体系正规化

- 以收敛后的 schema 生成 **baseline migration** 提交进仓库；`drizzle.config.ts` 的
  out 目录落地。
- `pnpm dev:db` 起库后自动执行 migrate（ensure-dev-db 之后接 db:migrate），新人
  一条命令可用。
- 此后 schema 变更一律 `db:generate` → `db:migrate`，废弃 `db:push` 工作流。
- 删除随爬虫退役的 scripts/（dedupe/backfill/clean/batch-ai-process 等）。

### 可用性验收（R4，Definition of Done）

1. `pnpm dev:db && pnpm dev:api` 一键到位（起 TiDB → 自动建表 → API 就绪，
   `/health/ready` 200）。
2. 冒烟脚本（scripts/smoke.mjs）走通：注册 → 登录 → 建行程 → 加天/POI → 记消费 →
   查预算 → 分账 →（有 `DEEPSEEK_API_KEY` 时）AI 规划启动。CI 可选跑。
3. 死端点清零：iOS 与 dashboard 调用的每个端点在后端存在；以一份端点清单
   contract 测试锁定。
4. `pnpm check` 全绿；测试覆盖 ≥ 60% 维持。

## 7. iOS 数据层：API 为源 + 离线可编辑（R1 + R7）

### 架构

- **本地镜像（mirror）**：行程域数据的整体本地副本（沿用现有 JSON 持久化形态即可，
  不引入新存储框架）。每个资源带 `serverId`、`updatedAt`、`dirty` 标志。UI 一律读写
  镜像——本地写永远即时成功。
- **变更队列（mutation queue）**：每次写操作追加一条 `{upsert|delete, 资源类型,
  资源快照}`；同一资源的多次 upsert 合并为最后一条（队列按资源去重）。
- **冲刷（flush）**：在线时立即冲刷；离线积压；网络恢复（NWPathMonitor）或 app 激活时
  按序重放。
- **冲突策略：后写胜（LWW）**。重放即覆盖，服务器返回权威副本回写镜像。单人 + 少量
  同行的场景冲突罕见，不做三方合并。
- **CloudKit 同步层退役**：服务器已是跨设备源，删除 CloudKitSyncManager；
  SavedItinerary 中 sourcePlatform/blogId 等爬虫字段停止读写（字段保留可选以兼容
  旧 iCloud 归档的解码）。
- **一次性上行迁移**：既有本地行程在首次登录/升级后推到服务器（复用队列机制：
  全部标 dirty 入队）。
- **token**：后端补 `/api/auth/refresh` 后，iOS 现有刷新调用点即可工作；长离线导致
  会话过期时，队列保留、提示重新登录后继续冲刷。

### 影响面

- ItineraryStore 重构为 mirror + queue；BudgetStore/StatsStore/FootprintStore 改造
  （预算走统一行程 ID；统计/足迹本地聚合）。
- 两套 ID 混用问题随「服务器 ID 为主键、本地 UUID 仅作未上行前的临时键」消失。

## 8. 品牌与文档同步

- **dashboard**：调色系统化对齐 BRAND.md（cream #FFF6E8 / ink #232733 / sun #F7B733 /
  pebble / night；sun 上只放 ink 文字）；替换残留的 emerald/stone Explorer 体系与
  auth 页旧风格孤岛。
- **iOS**：清理 Localizable.strings 聚合器话术（tab.discover / guides.* 等随死代码删）；
  AboutSheet 版本口径修正；ChatView 的 ExplorerPageBackground 完成玻璃化收尾
  （Liquid Glass 烂尾项，遵循已有的七条玻璃纪律：系统材质、克制 tint）。
- **文档**：CLAUDE.md（删 Nx/Go server 描述、更新命令与结构）、CONTEXT.md（guide
  ingest 域整节随代码删除重写为现行域模型）、README.md（包清单、功能列表、离线措辞
  改为「离线可编辑，联网后自动同步」）、AGENTS.md 核对。
- **跨仓库建议（不在本设计执行）**：sunpebble.github.io/BRAND.md 的 per-app 表补录
  Trips 条目。

## 9. 实施划分（方案 A，三个独立可验证阶段）

每阶段各出一份实施计划（writing-plans），完成后 `pnpm check` 全绿再进下一阶段。

- **Phase 1 收缩**：删除爬虫遗留整树、社区壳、坏承诺、iOS 死代码树与死模块；
  表退役迁移（rename 冷备）；dashboard 孤儿页面/代理清理。产出：表面积减半的干净仓库。
- **Phase 2 后端夯实**：baseline migration + 自动建表；auth/refresh；budgets/expenses
  CRUD 补全；currency 按需拉取；agent/chat 鉴权 + 身份从 token 推导；dashboard
  catch-all rewrite + middleware 守卫 + 登录页收敛；冒烟脚本 + 端点 contract 测试。
  产出：R4 验收全部达成。
- **Phase 3 iOS 对齐与品牌**：mirror + queue 数据层改造；CloudKit 退役与上行迁移；
  登录闭环（Apple 真实现、退出登录、删 SMS/微信/忘记密码残留）；本地通知提醒；
  统计/足迹本地化；聊天流程简化与登录门槛；品牌调色与文案、文档同步。
  产出：两端与后端零死端点、流程闭环。

## 10. 风险与未决

- **生产数据**：线上遗留表有真实存量（曾跑过 dedupe/backfill 运维脚本）。退役采用
  rename 冷备，不可逆删除延后一个发布周期。
- **App Store**：删除假的第三方登录按钮 + 真实现 Sign in with Apple 同时消除拒审风险；
  上架前需核对隐私标签与实际数据流向一致。
- **旧 iCloud 归档**：CloudKit 退役后，旧设备升级路径需保证本地归档可解码（字段保留
  可选而非删除），一次性上行完成后不再读 CloudKit。
- **flue beta 运行时**：`@flue/runtime 1.0.0-beta.9` 是 beta 依赖，本设计不动它；
  若后续出现阻塞性问题另行评估。
- **uploads 本地磁盘存储**：生产多实例/无状态部署会丢文件；本地可用标准下不改，
  记录为生产化前的已知项。
