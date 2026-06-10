# 数据链路全面体检报告

**日期:** 2026-06-10
**方法:** 6 维度并行探索（Go 爬虫 / 清洗层 / API 入库 / 数据库 schema / 前端消费 / 已有规划），42 个 critical/high 发现全部经独立 agent 证据核实确认，0 个被驳回。

## 痛点定性

「爬虫抓到的数据有限、缺失、不准确」的最大根因**不是**单一数据源，而是**管道连单源数据都留不住**：写入端无唯一键导致重复膨胀、事件序列化必然失败导致核心表恒空、清洗校验层被完全旁路、全链路无自动调度。先扩源只会更快积累脏数据。

## 八大根因

### RC1 战略层：用「爬 UGC 游记」的方式获取结构化 POI 事实数据，且仅依赖马蜂窝单源、仅依赖 Kernel.sh 单供应商。这是「该有的数据从源头就不存在」的根因——游记 feed 里本来就没有可靠的坐标/营业时间/票价，爬得再好也填不上。

- POI 无详情页爬取：坐标/地址/票价/开放时间永远为空（mafengwo.go:553-563 仅 5 个字段）
- transport/optimize 路线优化无真实经纬度可用（model/request.go:82-91）
- 电话被 content-cleaner 误删后无权威源可回补
- AI 脚本被迫让 LLM 编造坐标（batch-ai-process.ts:147-148）
- 数据总量受单 feed 页 + 20 次滚动上限（mafengwo.go:75-77）
- KERNEL_API_KEY 未配置时全部端点 503，爬虫完全停摆

### RC2 Schema 层：所有爬虫表与 travel_guides 的外部 ID 无唯一键，且存在 API importGuide 与 Go 事件 handler 两个互不知情的写入方。这是「数据错/重复/矛盾」的最大结构根因。

- 一次 import 产生两行，每次重爬再加一行，重复行无限膨胀
- Go 端 ON DUPLICATE KEY UPDATE 永不触发，更新全落新行、旧行永久 stale
- 同一游记两条路径得到 1 和 12000 两个矛盾的 viewCount
- syncFromMafengwoGuide 用 limit(1) 命中任意旧副本
- 读取端按 external_id 查询取到哪行取决于排序，数据互相矛盾

### RC3 Go 架构层：进程内内存 EventBus + 发布方/订阅方各自手写 payload 字段名（无共享 struct），json.Unmarshal 对缺键/错型零值吞错。这是「抓到了但库里没有/全是空字段」的根因。

- rating string→float64 反序列化失败，带评分 POI 整行永不入库（eventbus.go:80-85 仅留一行日志）
- poiId/guideId/questionId/sourceUrl 从未被发布，恒为空字符串入库
- 空 ID 做 upsert 导致所有行互相覆盖或无法溯源
- 目的地封面图/图集永远为空
- 通道满则丢、进程重启全丢、保存失败无死信无补偿
- Go INSERT 遗漏 NOT NULL JSON 列，严格模式下整行写入失败仅 slog.Error（events.go:318-323）

### RC4 管道治理层：清洗/校验/归一化层被主导入链路完全旁路 + 全链路静默兜底文化（||0、空结果当成功、catch 只打日志、假数据冒充真值）。这是「脏数据畅通无阻、好数据被误伤」的根因。

- validators 的 error 级阻断形同虚设，无目的地/低质/空壳数据照常入库
- 反爬验证码页被当成功入库并永久占用 sourceUrl 去重名额
- '1.2万' 被 parseInt 成 1 且 ||0 掩盖解析失败，互动数据系统性偏小 4 个数量级
- content-cleaner 整句误删电话/交通贴士且无 raw 留底不可逆
- 10000 字符硬截断不打标志，refetch 机制检测不到
- 三套质量评分真相源互相矛盾
- saves_count 硬编码 0 伪装成真实统计

### RC5 调度层：全链路无任何自动化执行器与刷新机制——Go cron 空壳、batch 任务无消费者、n8n 四条工作流全断、refetch_tasks 死表、「只填空不刷新」策略、AI 脚本筛选条件与入库行为互斥。这是「数据少且永不更新」的结构性根因。

- 数据增长完全依赖手工跑 scripts/crawl-mafengwo.ts（不在 package.json scripts 里）
- destination_fill 任务空转：标记 completed 但零入库
- batch 端点返回任务列表后事件直接蒸发
- 首抓错值（如 parseInt 的 1）被永久冻结，源站更新进不来
- enrichedData 非空使 batch-ai-process 永不命中新数据 → aiDays/geoData 系统性缺失 → 又喂出 backfill 缺口报告，形成死循环

### RC6 架构落地层：三层数据架构（暂存→归一化→应用）只建了 schema 没建数据流，归一化层与应用层 POI 全是死表。这是「爬了也白爬——数据停在暂存层到不了业务」的根因。

- pois/cities/normalized_pois/poi_source_mappings 全仓库无写入端，行程规划无 POI 可引用
- guide_destinations 零写入 → 缺口分析恒报「所有城市无覆盖」（backfill.service.ts:104-118）→ backfill-all 反复生成无效任务
- raw_crawl_records 死表 → 解析 bug 无法重放，只能重爬（又被 sourceUrl 去重挡住）
- mafengwo_reviews/poi_reviews 从未落库，评分无明细支撑无法验证

### RC7 元根因：零可观测性 + 零契约测试。这不直接制造脏数据，但解释了为什么 RC2-RC6 的几十个静默失败能存活至今——没有度量就没有发现，没有契约测试就没有拦截。修复它是防止「修完又烂回去」的前提。

- 所有「日志显示 Saved 成功」「任务 completed 但零产出」的假成功长期无人察觉
- 发布/订阅字段漂移（rating 类型、缺键）穿透到生产（handler_test.go:685 只测注册不测 payload）
- Go↔TS JSON 契约（中文数字字符串 vs 数字）无校验，两端各自理解
- 「数据少」无法量化：无新增行数/字段填充率/保存失败率基线，断供多久都不知道
- quality-alert 工作流永远收不到事件

### RC8 消费层：前后端契约错配（字段名/参数名/读写路径错位）。独立于采集问题存在，作用是放大「感知数据少」——库里明明有的数据用户也看不到，且让人误以为问题全在爬虫。

- POIs 页按 NormalizedPOI 形状渲染 Hono pois 表 → NaN% 徽章 + sources.map 崩溃，rating/business_hours/phone 明明有数据却不展示
- 搜索/城市筛选/分页参数错名或不转发，静默失效 → 用户感知「数据太少」
- 人工坐标修正写 dayItineraries(lat/lng) 读 enrichedData.aiDays(latitude/longitude)，修正永久不可见 → 「数据错且改不掉」
- geocodeConfidence 无生产者使整套置信度审核 UI 成死代码

## 已确认缺口清单（42 项，全部经独立核实）

### [CRITICAL] (go-crawler) list 爬取完全忽略 city 参数，抓全站 feed 且错误归属城市

**证据:** mafengwo.go:93 固定 url := "https://m.mafengwo.cn/note/"，req.City 仅用于日志(94)与回显(124,131)；guide-import.service.ts:62-66 传入 city 并把返回 URL 全部标记为该城市

**详情:** 无论请求哪个城市，抓到的都是马蜂窝全站最新游记 feed（与城市无关），TS 侧却按 city 入库归类。这是「数据不准确」的最大根因：城市维度的数据是随机的；同时单一 feed 页 + 最多 20 次滚动（mafengwo.go:75-77）决定了可发现的游记总量极小，是「数据有限」的直接原因。

**核实修正:** 唯一需修正的是 TS 侧机制描述：「把返回 URL 全部标记为该城市后按 city 入库归类」不完全准确。城市误归属发生在发现层 API 响应（guide-import.service.ts:97-103 将全站 feed 的 URL 全部标为请求的 city 返回给管理端），而实际入库 importGuide（169-183 行）并不写入任何 city/destinations 字段（travelGuides.destinations 与 guideDestinations 表均未填充）。因此 DB 后果是「城市维度数据缺失 + 发现层城市标签随机错误」，而非「DB 行被写入错误城市」。另证据行号 124 应为 123（事件载荷中的 city 回显）。核心结论不变：city 参数对抓取内容零影响，城市归属不可信，可发现量极小。

### [CRITICAL] (go-crawler) KERNEL_API_KEY 未配置时所有爬虫端点 503，爬虫完全不可用

**证据:** apps/server/.env 仅含 PORT/DATABASE*URL/OLLAMA*\*（无 KERNEL_API_KEY）；config.go:45 默认空串；handler.go:21-24 为空时 Kernel=nil；mafengwo.go:19-25 requireKernel 返回 503

**详情:** 爬虫硬依赖 Kernel.sh 付费云浏览器，无本地 chromedp 回退。当前环境未配置 key，意味着所有 /api/crawler/mafengwo/\* 调用直接失败——「数据少」可能首先是爬虫根本没在跑。

**核实修正:** 「所有爬虫端点 503」需收窄为「所有实际执行爬取的 7 个 /api/crawler/mafengwo/\* 端点 503」。两个例外：POST /api/crawler/fetch（crawler.go:17-93）是不依赖 Kernel 的纯 HTTP 抓取，不会 503；POST /api/crawler/mafengwo/batch（mafengwo.go:748-916）无 requireKernel 门禁，只发布 eventbus 事件即返回 success:true——无 Kernel 时它表面成功但下游爬取全部失败，制造爬虫在跑的假象，问题比直接 503 更隐蔽。另注：.env 仅反映本地/仓库环境，生产环境变量无法从仓库验证。

### [CRITICAL] (go-crawler) POI 保存因 rating 类型不匹配必然失败（string→float64）

**证据:** extract.go:46 POIItem.Rating 为 string；mafengwo.go:560 发布 "rating": poi.Rating；events.go:198 以 Rating float64 `json:"rating"` 解码 → json.Unmarshal 报错，events.go:208-209 直接 return err

**详情:** 任何带评分的 POI 事件在反序列化阶段即失败，整条 POI 永不入库，仅在日志留一行 handler error（eventbus.go:80-85）。即使解码成功，发布方也从未提供 poiId/sourceUrl/coverImageUrl（mafengwo.go:553-563 只有 name/url/rating/image/category/destinationId），poi_id 恒为空。mafengwo_pois 表实际等于空表或全是无 ID 脏行。

**核实修正:** 结论需两处小幅修正（均使问题更严重而非夸大）：(1) 不止"带评分的"POI 事件失败——发布方的 rating 键恒存在且恒为 JSON string（空串 "" 同样无法解码为 float64），因此 100% 的 POI 事件在反序列化阶段失败；(2) 由于失败发生在 INSERT 之前，"全是无 ID 脏行"的分支实际不可达，mafengwo_pois 从此管道严格为空表（events.go 为该表唯一 Go 侧写入方）。另注：即使类型修复，发布方发送的是 "url" 而解码方期待 "sourceUrl"，poi_id/source_url/cover_image_url 等仍会全为空，需一并修复字段契约。

### [CRITICAL] (go-crawler) 事件发布方与保存方字段名系统性不一致，关键字段静默丢失

**证据:** destination：发布 coverImage/images（mafengwo.go:336-337）vs 期望 coverImageUrl/imageUrls（events.go:158-159），且未发布 sourceUrl；guide：发布 url/author（mafengwo.go:451-456）vs 期望 guideId/sourceUrl/authorName（events.go:233-239）；qa：发布 answerCount（mafengwo.go:644）vs 期望 answersCount（events.go:274），未发布 questionId/sourceUrl；ranking：未发布 rankingId/sourceUrl/title（mafengwo.go:727-734 vs events.go:294-301）

**详情:** json.Unmarshal 对缺失键零值处理，不报错：目的地封面图/图集永远为空，guide_id/question_id/ranking_id/source_url 全为空字符串。以空 ID 做 ON DUPLICATE KEY upsert 会导致所有行互相覆盖（只剩一行）或产生无法关联溯源的脏数据。这是「数据缺失」最隐蔽的根因——日志全部显示 Saved 成功。

**核实修正:** 机制修正：packages/database/src/schema/mafengwo.ts 中 mafengwo_destinations/guides/qa/rankings 的 mdd_id/guide_id/question_id/ranking_id 均为非唯一 index()（第 50/149/179/234 行），主键是自增 bigint（columns.ts:31-33），全文件无 uniqueIndex，仓库内也无其他迁移 SQL 为这些表定义唯一键。因此 ON DUPLICATE KEY UPDATE 永远不会触发，真实后果不是「所有行互相覆盖只剩一行」，而是每次爬取/重爬都插入一条 ID 为空字符串的全新行——脏数据无限膨胀、重复堆积、无法去重且无法溯源。严重度仍为 critical：字段静默丢失 + 假性成功日志 + 重复行膨胀三重叠加，且缺唯一键本身是一个应一并修复的 schema 缺陷。

### [HIGH] (go-crawler) 空提取结果被当成功入库，无反爬/验证码检测

**证据:** mafengwo.go:186-213：Evaluate 成功即认为成功，不校验 result.Title/Content 是否为空；重试循环(164-192)仅捕获 chromedp 错误；extract.go:127-135 容器未命中时 content 为空串照常返回

**详情:** 马蜂窝触发验证码/登录墙/风控页时，chromedp 不报错，JS 返回全空字段，handler 返回 success=true 并入库空壳游记（仅 og:title 可能是「马蜂窝」站名）。既污染数据又消耗去重名额（TS 侧按 sourceUrl 判断已存在后不会再爬，guide-import.service.ts:127-137），错误数据永远无法被修复。

**核实修正:** 结论无需实质修正，仅行号微调：重试循环实际跨 mafengwo.go:164-255（证据所引 164-192 为其中错误捕获段，定性正确）；TS 查重精确位置为 guide-import.service.ts:130-137。可补充两点强化证据：TS 入库侧（guide-import.service.ts:156、169-183）同样无内容非空/质量分门槛，且 172 行 `data.title || '未命名'` 进一步掩盖空标题；Go 侧 CalculateQualityScore 产出的低分（mafengwo.go:199-204）仅被透传存储，从未用于拦截空壳数据。

### [HIGH] (go-crawler) cron 为空壳：无任何定时抓取、增量更新或失败重跑

**证据:** cron.go:32-33 ticker 触发后仅 slog.Debug("Polling pending guides...")；cron.go:46-47 仅 slog.Info("Cleaning up expired sessions...")；MafengwoCrawlTask 模型（model/mafengwo.go:169-184）在全仓库无任何读写

**详情:** 所有抓取必须由外部 HTTP 调用手动触发，没有调度器消费任务、没有增量策略（不会按 crawled_at 重抓过期数据）、没有失败任务持久化与重试。数据只会随手动操作零星增长——「数据有限」的结构性原因。

**核实修正:** 原结论成立并可补强：除 cron 空壳外，批量任务事件 crawler.mafengwo.batch.task.created 无订阅者（任务发布即丢失），TS API 的 scheduleCron 字段被接受但无任何调度器消费——调度链路在 Go 和 TS 两侧均断裂。

### [HIGH] (go-crawler) batch 端点产出的任务无人消费，批量爬取是空操作

**证据:** mafengwo.go:900-905 发布 topic "crawler.mafengwo.batch.task.created"；events.go:15-30 RegisterEventHandlers 未订阅该 topic（eventbus.go:106-110 无订阅者时仅 Debug 日志）；mafengwo.go:890 `_ = crawlDetails` 显式丢弃参数

**详情:** 调用 batch 会返回 totalTasks 和任务列表，看似成功，实际每个任务事件直接蒸发，没有任何爬取发生。这是一个完整的静默假成功路径。

**核实修正:** 仅一处措辞微调：crawlDetails 不是函数参数，而是从请求体 CrawlDetails 字段解析出的局部变量（mafengwo.go:790-792），890 行 `_ = crawlDetails` 丢弃的是该请求选项；不影响结论。

### [HIGH] (go-crawler) POI 无详情页爬取：坐标/地址/票价/开放时间等核心字段永远为空

**证据:** extract.go:255-310 JSExtractPOIList 仅提取 name/url/rating/category/image；model/mafengwo.go:54-78 定义了 address/latitude/longitude/openingHours/ticketPrice/phone/tips 等字段但无任何提取路径；events.go:225 以零值写入 latitude/longitude

**详情:** 行程规划应用最依赖的 POI 坐标恒为 0，地图展示、transport/optimize 路线优化（依赖经纬度，model/request.go:82-91）都没有真实数据可用。同理 QA 只有列表标题（extract.go:361-403），mafengwo_qa.content 与 BestAnswer 永远为空（events.go:280-289）。

**核实修正:** 原结论成立但低估了严重性，需补充两点：(a) POI 保存路径很可能完全失败而非仅坐标为零——发布方传的 rating 是字符串（extract.go:46 POIItem.Rating string，JS 端 textContent 清洗后仍为 string），而 events.go:198 解码结构声明 Rating float64，json.Unmarshal 类型不匹配会在 events.go:208-210 直接 return err，导致整条 POI 记录写库被中止；且事件载荷无 poiId，即使写入 poi_id 也恒为空串，唯一键冲突下最多只能存一行。(b) QA 除 content/BestAnswer 为空外，还存在键名不匹配：发布方用 answerCount（mafengwo.go:644），events.go:274 期望 answersCount，连回答数都恒为 0；questionId 同样从未发送，question_id 恒为空串。

### [HIGH] (go-crawler) 内存 EventBus 投递不可靠：满则丢、重启全丢、保存失败无补偿

**证据:** eventbus.go:117-124 通道满（容量 256，eventbus.go:44）时 default 分支直接丢弃事件仅 Warn；eventbus.go:80-85 handler 报错只记日志；events.go 保存用 context.Background 异步执行，HTTP 响应早已返回 success

**详情:** 爬取 HTTP 返回成功 ≠ 数据已落库。DB 抖动、字段解码失败、通道积压都会让数据无声丢失，且无死信/重试机制。配合 TS 侧 sourceUrl 去重，丢失的数据后续也不会被重爬。

**核实修正:** 内存 EventBus 投递尽力而为：通道满（容量 256，eventbus.go:44）即丢事件仅 Warn（eventbus.go:117-125）；handler 落库失败仅记日志，失败事件 crawler.mafengwo.data.saved 无任何订阅者，无重试/死信（eventbus.go:80-84，events.go:321-325）；HTTP 在事件入队后立即返回 success（mafengwo.go:216-244），落库在 goroutine 中以 context.Background 异步执行（eventbus.go:79）。修正三点：1）优雅关停会排空缓冲事件（main.go:117-121 + eventbus.go:133-150），仅 crash/强杀才丢；2）TS sourceUrl 去重基于 travel_guides 表中是否存在该 URL，未落库的数据下次 discovery 仍会被重新发现重爬，不是"永不重爬"；3）游记 /detail 主路径 TS 侧自行同步落库（guide-import.service.ts:169-183），事件丢失不致丢数据；真正高危的是 destination/poi/guide/qa/ranking 端点，事件总线是唯一持久化路径，丢事件即丢数据且无任何信号。

### [CRITICAL] (crawler-types) content-cleaner 过度清洗，整句删除真实旅游信息且不可逆

**证据:** content-cleaner.ts:119（点赞|收藏|关注|转发|分享|评论|留言 裸词删除）、:125（'觉得怎么样？._' 删整句）、:128（'持续更新._'）、:130（'查看更多._'）、:133（/\[?图片\]?/g）、:80（'推荐大家…好物._'）、:98（电话号删除）。实测：'酒店电话：13912345678，前台24小时有人'→'酒店，前台24小时有人'；'持续更新中的小贴士：地铁2号线可以直达机场'→''（整句删除）；'查看更多景点可以去游客中心拿一份免费地图…'→''；'大家觉得怎么样？我个人认为洱海的日出…建议早起前往才村码头'→''。scripts/clean-historical-guides.ts:60-63 将结果直接 update 覆盖 content，且导入路径不写 raw_crawl_records，无原文备份。

**详情:** 大量 pattern 以常用词为锚点并用 .\* 吞噬到行尾，旅游攻略中高频词（分享/关注/图片/电话/查看更多/持续更新）触发误删。POI 联系电话被当成个人信息删除——这是'电话数据缺失'的直接根因之一。同时真正的广告（'优惠券可在官方小程序领取：满100减20'）因 pattern 要求冒号紧跟而漏删。误删后无原始数据可重放，损失永久。

**核实修正:** 两点小修正不影响结论：(1) :98-99 只匹配大陆手机号 1[3-9]\d{9}，座机号（如 0872-xxxxxxx）不会被删，故「电话数据缺失」根因仅覆盖手机号类 POI 联系方式；(2) cleanContent 目前仅被 scripts/clean-historical-guides.ts 调用，实时导入路径（guide-import.service.ts、crawl-mafengwo.ts）并未接入清洗——破坏发生在历史批量清洗时，而非每次抓取时；(3) :80 模式要求「推荐大家」与「产品/东西/好物/神器」紧邻（中间只允许这/这个/这款），普通句式「推荐大家去XX景点」不会被误删。

### [CRITICAL] (crawler-types) 清洗/校验/评分层被主导入链路完全绕过，低质与缺字段数据照常入库

**证据:** guide-import.service.ts:169-183 直接 db.insert(travelGuides)，无 validateGuideEnhanced/cleanContent/calculateCompletenessLevel 调用；该文件 import 列表不含 crawler-types。grep 全仓库：calculateQualityScoreUnified、mapPlatformCategory、validateGuideEnhanced、isLowQualityContent 的仓库内调用方为零（仅 scripts/clean-historical-guides.ts 用 cleanContent）。

**详情:** validators.ts:805-972 设计了 error 级阻断（缺 destinations/content 不许入库）与 warning 级降级，但导入时 destinations、tags、publishedAt、commentCount 根本不写（insert values 无这些字段），completeness_level 不计算。quality-score.ts 只产生分数和 suggestions，无 reject/degrade 决策；isLowQualityContent（content-cleaner.ts:400-421）无人调用。结果：低质、无目的地、无标签的数据全部照常入库，validators 的契约形同虚设。

**核实修正:** 结论整体成立，仅一处细微修正：导入时 qualityScore 字段并非缺失——guide-import.service.ts:181 写入了 Go 端返回的分数（events.go:64-67 的 service.CalculateQualityScore 简化实现），但 TS 统一评分器 calculateQualityScoreUnified 确实未被任何生产代码调用。另外「主导入链路」实际有三条绕过路径（guide-import.service.ts、events.go 事件总线直插、crawl-mafengwo.ts 脚本），问题范围比原描述更广。

### [CRITICAL] (crawler-types) views/likes 中文数字解析错误：'1.2万' 被 parseInt 成 1

**证据:** mafengwo.go:247-248 HTTP 响应返回原始字符串 "views": result.Views（如 '1.2万'），而事件路径 mafengwo.go:228-229 返回 ParseChineseNumber 解析后的数字，两路分叉。API 端 guide-import.service.ts:179-180 用 Number.parseInt(data.views, 10) || 0 解析 → '1.2万' 得 1，'1.5k' 得 1，纯文案得 0。

**详情:** Go 端有正确的 ParseChineseNumber（content.go:340-364，处理 万/k），但 HTTP 路径不用它；crawler-types/mafengwo.ts:444-447 定义了 ParsedNumber 类型却没有对应 TS 实现可供 API 复用。互动数据（views/likes）系统性偏小 4 个数量级，直接污染质量评分的 engagement 维度和推荐排序。|| 0 静默兜底进一步掩盖了解析失败。

**核实修正:** 两点修正：(1) 影响范围夸大——「污染质量评分 engagement 维度和推荐排序」不成立：qualityScore 由 Go 端用正确解析的数字计算（handler/mafengwo.go:199-204）并经 guide-import.service.ts:181 原样透传存库，guides 路由排序只按 qualityScore/createdAt（routes/guides.ts:240-242, 297），不依赖 viewCount/likeCount。实际影响是 travelGuides 表的 viewCount/likeCount 列对含「万/k」的值系统性偏小（最高 4 个数量级），经 routes/guides.ts:195-196 暴露为 views_count/likes_count，错误展示在 dashboard 游记列表/详情/审核页。(2) 行号微调：ParseChineseNumber 位于 content.go:334-364（证据引 340-364）。

### [HIGH] (crawler-types) 质量评分三套真相源，权重与阈值互相矛盾

**证据:** crawler-types/quality-score.ts:69-76（title 15%/content 35%·1000字满分/author 5%/images 15%/engagement 15%/metadata 15%）vs apps/server/internal/service/content.go:366-391（title 20%/content 40%·2000字满分/author 10%/images 20%/interaction 10%，无 metadata 维度）。完整度分级同样分叉：content.go:393-402 usable 要求 contentLen>=100 且 complete 要求 score>=0.8；validators.ts:92/97 MIN_CONTENT_LENGTH=200、MIN_CONTENT_LENGTH_COMPLETE=500 且 complete 要求 likes/saves/comments/views 四计数齐全。

**详情:** 实际入库的 qualityScore 全部来自 Go 实现（guide-import.service.ts:181 直接透传），TS 的'统一评分'是死代码。同一篇攻略在两套体系下得分不同，min_quality_score 过滤、dashboard 展示与 training-dataset 的 min_quality_score 参数（training-dataset.ts:48）语义不一致。

**核实修正:** 结论无需修正，仅补充两点细化：① 除权重差异外，title 满分标准也分叉（TS 端 >=10 字符即满分，Go 端按 rune 数/20 线性计分），互动分计算方式不同（TS 按 views/likes/saves/comments 四项"存在个数"分档，Go 按 (views+likes)/1000 线性计分）；② TS 端完整度逻辑（calculateCompletenessLevel）同样是仅有测试覆盖的死代码，实际 completeness 判定也只有 Go 端 DetermineCompletenessLevel 生效，即评分与完整度两条链路均存在"TS 统一实现未接线"的问题。

### [HIGH] (crawler-types) 分类映射不覆盖任何实际爬取平台，未匹配返回 null 无兜底

**证据:** categories.ts:142-199 PLATFORM_CATEGORY_MAPPINGS 仅含 amap/osm 两平台；唯一实际爬取的 mafengwo 无映射。mapPlatformCategory（categories.ts:215-224）未匹配返回 null，且全仓库无调用方。amap 映射本身稀疏：050100 以下所有中餐细类一律映射 'chinese'，060300+ 等大量类目码缺失。

**详情:** POI 分类规范化路径实际不存在：travelGuides.category 列（guides.ts:45）无人写入，mafengwo.ts 的 MafengwoPOICategory 与 POI_CATEGORIES 七大类之间也没有映射函数。未匹配分类既不落 'other' 也不打标告警，直接静默丢失分类信息。

**核实修正:** 两处修正：(1)「050100 以下所有中餐细类一律映射 'chinese'」机制描述不准——映射表只有 '050000'/'050100' 两个精确码映射 chinese，050101+ 等细类码根本不在表中，且 mapPlatformCategory 是精确匹配（categories.ts:223 platformMappings[platformCategory]），这些细码会直接返回 null 而非折叠为 'chinese'，实际比原描述更糟；(2)「travelGuides.category 列无人写入」过于绝对——手动 API 端点 POST /guides（packages/api/src/routes/guides.ts:451）和 PATCH /guides/:id（guides.ts:487-488）可写入该列，但值是未经 POI_CATEGORIES 校验的自由字符串（createGuideSchema z.string().optional()，guides.ts:434），且整个爬虫/导入/AI 管道确实从不写入。另一缓和性事实：mafengwo POI 的原始分类有落库（schema/mafengwo.ts:67 mafengwo_pois.category，且 MafengwoPOICategory 六个字面量与 POI_CATEGORIES 键名恰好一致），故 POI 级分类并非完全丢失；真正缺失的是统一规范化路径（映射表/函数为死代码）、guides 表分类写入、以及 service 大类与未匹配兜底。

### [HIGH] (crawler-types) validators 不校验任何 POI 实体字段：坐标/电话/营业时间/价格均裸奔

**证据:** validators.ts 全文 972 行只校验 guide 维度（platform/externalId/content/destinations/计数）。无 latitude∈[-90,90]/longitude∈[-180,180] 检查、无电话格式、无 DayHours 'HH:MM' 格式校验（normalized-poi.ts:35-40 仅类型注释约定）、无 price_range/price_avg 合法性、无 URL 格式校验。SourceAttribution.confidence 0-1 范围（normalized-poi.ts:79）也无运行时校验。

**详情:** 坐标错误（0,0 或经纬度颠倒）、'营业时间：电话联系' 之类的脏值可以原样进入类型为 OperatingHours/Location 的字段。对'不准确'痛点而言，这一层本应是最后防线但完全缺位。

**核实修正:** 仅一处精度补充：confidence 的 (0–1) doc 注释位于 normalized-poi.ts:78，字段声明在第 79 行（原证据写 :79，指字段行，正确）。另外结论可补充限定：repo 内存在两处坐标校验（packages/api guides.ts:470-471 的人工修正端点、Go server 的 Weather/Transport 请求模型），但都不覆盖爬虫入库路径，不改变 gap 成立。

### [HIGH] (crawler-types) Go 端 10000 字符硬截断且不打截断标志，TRUNCATION_PATTERNS 检测不到

**证据:** mafengwo.go:197 service.CleanContent(result.Content, 10000)；content.go:30-33 直接 runes[:maxLen] 截断，不追加省略号、不返回 truncated 标志。validators.ts:107-115 TRUNCATION_PATTERNS 只匹配 '...'/'…'/'查看更多' 等结尾模式，对干净截断无法识别，contentTruncated 永远为 false。

**详情:** 长篇游记（马蜂窝精华游记普遍超 1 万字）尾部静默丢失，且因为检测不到截断，refetch_tasks 重抓机制（guides.ts:162-180）不会被触发，completeness_level 也不会降级。这是'内容缺失'的隐形根因。

**核实修正:** 结论需加强而非削弱，两点修正：(1) "refetch_tasks 重抓机制不会被触发"低估了问题——guides.ts:162-180 仅是表 schema，全仓 grep 确认没有任何代码向 refetch_tasks 写入或消费它（validators.ts:927 的 "will trigger refetch" 警告文案只是空头承诺），即重抓机制根本不存在可执行实现，而不只是"不被触发"。(2) crawler-types 的截断检测/completeness 计算压根不在线上摄入链路中：马蜂窝保存路径 apps/server/internal/handler/events.go:90-102 直接 INSERT travel_guides，不调用任何 validator，也不写 completeness_level；packages/api 零引用 crawler-types，唯一消费者是 scripts/clean-historical-guides.ts 且只 import content-cleaner。因此即使补上截断标志，现有链路也无人消费——修复需要同时打通 Go 端标志透传、摄入端验证接线和 refetch 任务的实际创建/执行。

### [CRITICAL] (api-ingestion) travel_guides 无唯一键 + 双写入方，同一游记必然重复入库

**证据:** packages/database/src/schema/guides.ts:59-64 仅有普通 index（travel_guides_platform_ext_idx 非 uniqueIndex）；apps/server/internal/handler/events.go:90-99 的 ON DUPLICATE KEY UPDATE 因无唯一键永不触发；packages/api/src/services/guide-import.service.ts:130-138 存在性检查发生在调用 Go 抓取(141)之前，而 Go 在抓取期间经事件旁路已插入一条(mafengwo.go:216→events.go:90)，随后 API 在 169 行再插一条

**详情:** 一次 import 产生两行；每次重爬再加一行。后续 syncFromMafengwoGuide 用 limit(1) 取 mafengwo_guides 也会命中任意一条旧副本。这是「数据错/重复」的最大根因，需要给 (platform, external_id) 加唯一键并统一为单一写入方（upsert）。

**核实修正:** 两处修正：(1) 发布事件的文件实际路径是 apps/server/internal/handler/mafengwo.go（非证据所写的 internal/crawler/mafengwo.go），216 行行号与内容完全吻合。(2) 「每次重爬再加一行」需限定范围：凡经 Go /api/crawler/mafengwo/detail 端点（即 detail.completed 事件路径）的重爬必然 +1 行；但用完全相同 URL 重复调用 importGuide 会被 guide-import.service.ts:136-138 的 sourceUrl 检查拦截提前返回，不再加行（该检查本身只会命中任意一条旧副本）。grep 确认 detail 端点的 TS 侧唯一调用方是 guide-import.service.ts。

### [CRITICAL] (api-ingestion) AI 增强永远选不到新数据：筛选条件与入库行为互斥

**证据:** scripts/batch-ai-process.ts:393 用 isNull(travelGuides.enrichedData) 找待处理游记，但 guide-import.service.ts:161-174 与 events.go（enrichedData 总含 contentFormatVersion:1）在入库时必写 enrichedData → 新游记永远不满足 IS NULL；guides.ts:205-213 因此读到的 ai_summary/ai_days 全为 null

**详情:** AI 摘要、每日行程、POI 坐标等增强字段对所有新抓数据为空，这是「缺失」类问题的核心。且脚本 processGuide 写回时 .set({ enrichedData }) 整体覆盖（batch-ai-process.ts:319-337），会把入库时的 contentHtml/contentMarkdown 抹掉——既漏处理新数据，又破坏旧数据。

**核实修正:** 修正两点：(a) isNull 筛选实际位于 scripts/batch-ai-process.ts:401（392-403 为完整查询）；(b) 「.set({ enrichedData }) 整体覆盖会抹掉入库的 contentHtml/contentMarkdown」应表述为潜在风险而非现行破坏：当前 IS NULL 筛选下被处理的行 enrichedData 本为 null（实际只可能命中 routes/guides.ts:441-453 手工 POST 创建的无 enrichedData 记录），一旦筛选条件改为按 aiSummary 缺失选取爬虫数据，该覆盖写法立即会抹掉入库时的 contentHtml/contentMarkdown，修复时必须改为合并写回。

### [CRITICAL] (api-ingestion) destination_fill 回填任务把爬取结果直接丢弃，目的地空白永远补不上

**证据:** packages/api/src/services/backfill-executor.service.ts:194-223：查询 mafengwoDestinations 的结果赋给 \_dest 后未使用(199-203)；调用 /api/crawler/mafengwo/list 后只判断 response.ok 计 processed++(205-217)，返回的 URL 列表从未导入（未调用 batchImportGuides/importGuide）

**详情:** 任务状态变 completed、统计显示成功，但数据库一条新游记都没增加。与 guide-import.service 的 discover→import 链路重复实现且半途而废，是「数据少」的直接根因。

### [HIGH] (api-ingestion) guideDestinations 辅助表全仓无写入方，目的地缺口分析全错

**证据:** grep 全仓仅 backfill.service.ts:100-102 读取 guideDestinations，无任何 insert（schema 定义于 packages/database/src/schema/guides.ts:68-81）

**详情:** analyzeDestinationGaps 把所有城市判为无覆盖（backfill.service.ts:104-118），backfill-all 会为已有游记的城市反复生成无效 destination_fill 任务；CLAUDE.md 宣称的辅助表过滤优化也因表为空而失效。importGuide/Go 写入 travel_guides 时应同步写 guide_destinations。

**核实修正:** 仅两处微调：证据行号上唯一读取实为 backfill.service.ts:99-102（.select 起于 99 行）；「把所有城市判为无覆盖」准确范围是 cities 表前 1000 行（analyzeFieldGaps/analyzeDestinationGaps 各有 limit）。其余结论无需修正；修复方向建议补充——除 importGuide 和 Go events.go 写入点外，还应为存量 travel_guides.destinations JSON 做一次性回填脚本，并补上 guide_destinations 的 Drizzle 迁移（仓内目前无任何包含该表的 migration SQL，生产表可能根本不存在）。

### [HIGH] (api-ingestion) 只填空不刷新：已存在记录永不更新，无 stale 处理机制

**证据:** guide-import.service.ts:136-138 已存在即跳过返回「游记已存在」；backfill-executor.service.ts:61-80、111-116 全部是 if (!guide.field) 才写；refetch_tasks 表（schema guides.ts:162-180）全仓零使用；lastUpdatedAt/completenessScore 在 API 中无任何写入（仅 guide-import.service.ts:182 写一次 crawledAt）

**详情:** viewCount/likeCount/content 在首次入库后永久冻结；源站修正或补充的内容无法进入系统；首次抓取到的错误值（见 parseInt 问题）会被「只填空」策略永久保留。没有基于 crawledAt 的过期重爬调度。

**核实修正:** 「永久冻结」需收窄为「API 链路内永久冻结」：根目录手工脚本存在带外刷新路径——scripts/crawl-mafengwo.ts:482-496 按 (platform, externalId) 去重后全量覆盖更新（含 viewCount/likeCount/content/crawledAt/lastUpdatedAt，且用 parseChineseNumber 而非 API 的 Number.parseInt）；scripts/backfill-structured-guide-content.ts:162,176 与 scripts/batch-ai-process.ts:331-335 也会更新 content/enrichedData 并写 lastUpdatedAt。但这些均为人工手跑脚本，无自动调度、不基于 staleness，因此系统层面「无 stale 处理机制、源站更新无法自动进入系统」的结论依然成立。

### [HIGH] (api-ingestion) importGuide 丢弃 destinations/publishedAt/tags/category，city 上下文在 discover→import 链路中丢失

**证据:** guide-import.service.ts:169-183 的 insert 未设置 destinations/publishedAt/tags/category 字段；crawl-jobs.ts:58-61 importGuidesSchema 只收 platform+urls，而 discoverNewGuides(platform, city) 明知 city（guide-import.service.ts:106-119）却不随 URL 传递

**详情:** 新导入游记的 destinations 恒为 null → 立刻被 analyzeFieldGaps 判为缺口 → 又生成回填任务，形成「导入即缺失」死循环。published_at 同样无人写入（Go 端 INSERT 列也不含 published_at，events.go:91-93），时效性判断无从谈起。

**核实修正:** 结论整体成立，两处细化：(a) publishedAt 不在 BACKFILLABLE_FIELDS/getMissingFields 检查范围（backfill.service.ts:3-11,35-61），故它不参与「缺口→回填」循环，而是更糟——缺失后永远不会被 gap 分析发现；且 Go 端 events.go:55 已解码 publishedAt 字段却在 INSERT 时丢弃，属于「拿到数据但不入库」而非「抓不到」。(b) destinations 死循环有一条窄逃生路径：当 mafengwo_guides 辅助表存在匹配 externalId 且 destinationName 非空时回填可补上（backfill-executor.service.ts:70-74）；对无辅助记录的游记（即 importGuide 直接导入的全部新游记）循环持续成立。

### [HIGH] (api-ingestion) viewCount/likeCount 解析错误：'1.2万' 被 parseInt 成 1

**证据:** apps/server/internal/handler/mafengwo.go:247-248 HTTP 响应返回原始字符串 result.Views（如 "1.2万"），而事件路径用 ParseChineseNumber 转成 12000(228-229)；guide-import.service.ts:179-180 对 HTTP 响应做 Number.parseInt(data.views, 10) || 0 → "1.2万"→1

**详情:** 同一游记经两条路径入库得到 1 和 12000 两个矛盾值；qualityScore 虽由 Go 端统一计算，但 API 侧存的浏览/点赞数严重失真，影响排序与推荐（guides.ts 按 quality_score/likes 展示）。API 应复用 Go 已解析的数值或在 TS 侧实现中文数字解析。

**核实修正:** 结论无需修正，仅补强：两条路径写入的是同一张 travel_guides 表（Go 端 events.go:91-97 为 ON DUPLICATE KEY UPDATE 的 upsert，TS 端 guide-import.service.ts:169 为普通 insert），同一次 /api/crawler/mafengwo/detail 请求会同时触发两个写入，view_count 最终是 1 还是 12000 取决于写入竞态与唯一键冲突行为。另外不带小数点的"12万"会被 parseInt 成 12，失真同样存在。修复方向正确：HTTP 响应应直接返回 Go 已解析的整数（与事件 payload 一致），并消除双写。

### [HIGH] (api-ingestion) 回填能力与缺口分析口径不匹配：dayItineraries/geoData/enrichedData 标记可回填但无实现

**证据:** backfill.service.ts:3-11 BACKFILLABLE_FIELDS 含 dayItineraries/geoData/enrichedData/coverImageUrl，但 executor 仅 syncFromMafengwoGuide(backfill-executor.service.ts:59-80，填 content/coverImageUrl/imageUrls/destinations/tags/authorName) 和 fetchAndUpdateGuide(109-116，只填 content/title) 两条路径；另外 173-192 行中「未更新也未抛错」的 guide 既不计 processed 也不计 failed

**详情:** gap 分析永远报告同一批缺口，任务每次都「成功完成」却什么都没填上；执行统计掩盖了无效执行。dayItineraries/geoData 只能靠手工跑 AI 脚本产生，闭环断裂。

**核实修正:** 仅一处需加强而非削弱：geoData 比原结论更严重——「只能靠手工跑 AI 脚本产生」对 geoData 不成立，因为全仓（含 Go server 与所有 scripts）没有任何代码写入 geoData；它只存在于 schema 定义（packages/database/src/schema/guides.ts:52）和缺口检测（backfill.service.ts:50-51），是一个有检测、零写入方的永久缺口。dayItineraries/enrichedData 的「手工 AI 脚本」描述准确（scripts/batch-ai-process.ts:333-334 等）。

### [CRITICAL] (database-schema) 爬虫表外部 ID 无唯一键，Go 端 ON DUPLICATE KEY UPDATE 永不触发 → 重复行膨胀且更新写不进旧行

**证据:** schema 仅普通索引：guides.ts:61 index('travel_guides_platform_ext_idx')、mafengwo.ts:50 (mdd_id)、:108 (poi_id)、:149 (guide_id)、:179 (question_id)、:234 (ranking_id)、pois.ts:65 (external_id,source)，均非 uniqueIndex；而写入端 apps/server/internal/handler/events.go:91-99/176/220/256/284/309 全部使用 ON DUPLICATE KEY UPDATE。grep 全 schema 的 uniqueIndex 仅命中用户投票/点赞类表。

**详情:** 表的唯一约束只有自增主键，ON DUPLICATE KEY UPDATE 没有可冲突的键，每次重爬都 INSERT 新行：同一 POI/攻略出现 N 份副本，浏览量、评分等"更新"全部落在新行，旧行数据永久 stale。读取端按 poi_id/external_id 查询时取到哪一行取决于排序，数据"错"和"互相矛盾"由此而来。且 drizzle.config.ts:9 的迁移输出目录 ./drizzle 不在仓库中、packages/database/package.json:15 仅有 db:push，schema 文件即线上结构，不存在"DB 里其实有唯一键"的可能。修复需先离线去重再为各外部 ID 加 uniqueIndex。

**核实修正:** 三处细节修正（不影响结论）：(a) package.json:15 确为 db:push，但"仅有 db:push"不准确——第 13/14 行还有 db:generate/db:migrate 脚本，只是仓库无已提交的迁移文件；(b) mafengwo*rankings 的 ON DUPLICATE KEY UPDATE 在 events.go:310 而非 309（INSERT 起于 307）；(c) pois 表（pois.ts:65）仅是 schema 缺唯一键的旁证：events.go 不写 pois 表，TS 侧也无 onDuplicateKeyUpdate 调用，"upsert 永不触发"严格适用于 events.go 写入的 travel_guides 及 5 张 mafengwo*\* 表。

### [CRITICAL] (database-schema) Go INSERT 遗漏 NOT NULL 且无默认值的 JSON 列，严格模式下 POI/攻略/问答整行写入失败

**证据:** mafengwo.ts:96 signatureDishes json notNull、:100 amenities json notNull → events.go:216-218 的 mafengwo_pois INSERT 列清单不含二者；mafengwo.ts:133 sections、:136 imageUrls、:142 tags 均 notNull → events.go:252-254 的 mafengwo_guides INSERT 不含三者；mafengwo.ts:172 tags notNull → events.go:281-282 的 mafengwo_qa INSERT 不含。

**详情:** TiDB 默认 STRICT_TRANS_TABLES，省略无默认值的 NOT NULL 列报 1364，整条 INSERT 失败，events.go:318-323 仅 slog.Error 后发失败事件——爬到的数据在落库一步被静默丢弃，这是"抓到但库里没有"的直接候选根因。即使运行在非严格模式，这些列也违背 schema 设计意图。schema 层修复：notNull JSON 列要么给应用层默认（写入端必填），要么改 nullable 并明确语义。

**核实修正:** 两处微调：1) 错误处理代码块实际在 events.go:319-326（原引 318-323，同一代码块差 1-3 行）；2) 「静默丢弃」措辞偏强——失败有 slog.Error 日志和 success:false 事件，并非完全静默，准确说法是「记错误日志并发失败事件后即丢弃，无重试与持久化补偿」。结论与严重度不变。

### [CRITICAL] (database-schema) 暂存层 → 归一化层 → 应用层管道在 schema 之外完全断裂：pois/cities 无任何写入端

**证据:** grep 全仓库（TS+Go）'insert(pois)|INTO pois|insert(cities)|INTO cities' 零命中；normalized_pois (pois.ts:312)、poi_source_mappings (pois.ts:295) 同样零写入端。itineraries.ts:79 itineraryItems.poiId fk notNull 依赖 pois 表供给。

**详情:** schema 设计了完整的三层（mafengwo\_\* 暂存 → normalized_pois+poi_source_mappings 归一化去重 → canonical pois），但归一化与提升逻辑从未实现：爬到的 mafengwo_pois 永远不会变成行程规划可引用的 pois。用户视角"POI 数据少"的根因不是没爬，而是爬完停在暂存层。poi_source_mappings 设计本可支撑多源合并与冲突解决（normalized_pois.confidence pois.ts:323），目前全是死表，跨源数据冲突在结构上无处解决。

**核实修正:** 仅一处精确性修正：itineraries.ts:79 的 fk() helper（columns.ts:43）只生成 unsigned bigint 列，不创建数据库级外键约束（TiDB 常见做法），故 itineraryItems.poiId 对 pois 表是逻辑层必填引用而非 DB 强约束。这不影响 gap 成立——行程项必填 poiId 而 pois 表全仓库无任何写入源，管道断裂事实不变。

### [HIGH] (database-schema) 辅助表 guide_destinations 零写入，目的地缺口分析与按目的地检索永远失真

**证据:** guides.ts:68 定义；全仓库引用仅 backfill.service.ts:100-102 的 groupBy 读取与测试 mock（guide-import.service.test.ts:40）；无任何 insert。guide-import.service.ts:169 插入 travelGuides 时未同步写 guideDestinations。

**详情:** backfill.service.ts:110-118 用空的 coveredDestinations 集合对比 cities，结论恒为"所有城市都没有攻略覆盖"，缺口报告完全不可信——这正是"数据缺失无法被发现"的实例。CLAUDE.md 性能规则还推荐用该表做目的地子串过滤，实际是空表。需在 travel_guides 写入路径（events.go、guide-import.service.ts:169、crawl-mafengwo.ts:498）同步提取 destinations JSON 写入辅助表，并补历史回填。

**核实修正:** 仅证据清单需微调：除 backfill.service.ts:100-102 与 guide-import.service.test.ts:40 外，引用还包括 crawl-jobs.test.ts:198（测试注释）与 docs/superpowers/specs/2026-05-01-travel-guide-backfill-design.md:35,90（设计文档，设计中描述的 LEFT JOIN 实际实现为两次查询+内存 Set 对比），但均非写入路径，不改变"零写入"结论。另一补充事实：guide-import.service.ts:169 的插入连 travelGuides.destinations JSON 列本身都未填充，意味着该路径即使做回填提取也无源数据，修复时需同时补 destinations 提取逻辑。

### [HIGH] (database-schema) 原始数据无留底：raw_crawl_records、mafengwo_reviews、poi_reviews、travel_blog_posts 均为死表

**证据:** grep 全仓库 'insert(rawCrawlRecords)'、'INSERT INTO raw_crawl_records'、'mafengwo_reviews'（Go 端仅 events.go:204/218/223 的 reviews_count 计数）、'insert(poiReviews)'、'insert(travelBlogPosts)' 均零命中；crawl.ts:30-48、mafengwo.ts:186-213、pois.ts:274-292 表定义存在。

**详情:** rawData/processedData 双列设计（crawl.ts:37-38）本意是留原始 payload 以便解析出错后重放，但没人写：解析逻辑一旦有 bug（坐标解析错、营业时间漏抓），数据永久丢失只能重爬。评论实体（mafengwoReviews/poiReviews）从未落库，pois.rating 没有任何支撑明细，评分无法验证、情感分析（poiReviews.sentiment pois.ts:284）无源数据。poi_source_mappings.rawRecordId (pois.ts:302) 指向死表，溯源链路断。

**核实修正:** 结论成立且实际比描述更严重：不仅 poi_source_mappings.rawRecordId 指向死表 raw_crawl_records，poi_source_mappings 与 normalized_pois 本身也仅存在于 schema 定义（packages/database/src/schema/pois.ts），全仓库无任何读写——整条 POI 归一化/溯源链路均未实现，而非仅溯源外键断裂。

### [CRITICAL] (consumers) AI 行程 POI 坐标不可用：0.0 占位 + 无地理编码 + geocodeConfidence 全链路无生产者，人工纠错 UI 永远不可达

**证据:** scripts/batch-ai-process.ts:169「如果无法确定某个景点的经纬度，请使用 0.0」（LLM 直接编造或填 0 入库，无任何 geocoding 步骤）；全仓库 grep geocodeConfidence 无任何后端生产者；apps/dashboard/src/app/(dashboard)/guides/[id]/page.tsx:548 `poi.geocodeConfidence !== undefined` 永为 false → GeocodingConfidenceBadge 不渲染 → 其 onClick 是 PoiEditor 唯一入口(553-560) → 人工坐标纠错功能完全死路；page.tsx:496-498 把 0.0 坐标渲染为「0.000000」而非 N/A；iOS BlogDetailView.swift:836/919/975 用 `lat != 0` 防御，证实 0,0 脏数据真实存在

**详情:** 消费端伤害最大的缺口：游记详情的「AI 提取的行程」坐标多为 0 或编造值，dashboard 地图/iOS 地图与导航功能全部失效；为审核坐标而建的整套置信度徽章+PoiEditor 工作流因后端从不产出 geocodeConfidence/geocodeSource/geocoding_metrics 字段而成为死代码。

**核实修正:** 仅一处微小行号偏差：GeocodingConfidenceBadge 的 JSX 为 page.tsx:549-561（onClick 处理器为 553-560），且 PoiEditor 渲染在 line 579 而非紧随其后；另外 page.tsx:446-456 的 geocoding_metrics 统计头（总 POI 数/平均置信度/需审核数）同样因无生产者永不渲染，属同一死代码链路，可并入该 gap。其余证据与结论均准确。

### [CRITICAL] (consumers) 人工坐标修正写入后永远不可见：写 dayItineraries(lat/lng)，读取优先 enrichedData.aiDays(latitude/longitude)

**证据:** packages/api/src/routes/guides.ts:526-553 PATCH /:id/poi-coordinates 只更新 dayItineraries 且写 `lat:`/`lng:` 键(540-541)；同文件 174-177 读取时 `arrayFromRecord(enrichedData,['aiDays','ai_days']) ?? dayItineraries` 优先 enrichedData；scripts/batch-ai-process.ts:320-337 所有 AI 处理过的 guide 都有 enrichedData.aiDays；packages/database/src/schema/guides.ts:24 PoiCoordinate{lat,lng} vs 前端读 latitude/longitude(guides/[id]/page.tsx:90-92)

**详情:** 双写双形状（lat/lng vs latitude/longitude）+ 读写路径错位：即使管理员修正了坐标，前端再读还是旧的 enrichedData 值；fallback 到 dayItineraries 时键名又对不上显示 N/A。数据修复闭环完全断裂，是「数据错且改不掉」的根因。

**核实修正:** 次要细节修正：「fallback 到 dayItineraries 时显示 N/A」不完全准确。batch-ai-process.ts:334 将同一个 aiResult.aiDays 数组（AI prompt 要求输出 latitude/longitude 键，见该文件 ~135-150 行）同时写入 dayItineraries，且 PATCH 在 guides.ts:538 先 spread 原 poi 再追加 lat/lng，因此 fallback 场景下前端展示的是陈旧的 latitude/longitude 值而非 N/A；N/A 仅在 poi 严格符合 schema 的 {lat,lng} 形状时出现，但当前无任何写入方产出该形状（schema 类型声明与实际存储数据形状不符）。无论哪种情况，人工修正的坐标值都不会被展示，主结论不变。

### [CRITICAL] (consumers) POIs 页面与真实 API 契约完全错配：渲染 NaN% 徽章并在 sources.map 处崩溃

**证据:** apps/dashboard/src/app/(dashboard)/pois/page.tsx:199-216 POICard 期望 quality_score/completeness_score/sources[]/rating_overall/operating_hours/subcategory/city/website；packages/api/src/routes/pois.ts:41-54 返回裸 pois 表行；packages/database/src/schema/pois.ts pois 表只有 rating/rating_count/business_hours/phone/source(字符串)；page.tsx:220 `Math.round(poi.quality_score*100)` → NaN%；page.tsx:312 `poi.sources.map(...)` 对 undefined 调用 → TypeError 整页崩溃；mock-data.ts:85-158 mock 恰好有全部字段 → dev 看起来一切正常

**详情:** 页面按 Go 爬虫的 NormalizedPOI 形状（crawler.ts:332-371 定义）开发，但 NEXT_PUBLIC_API_URL 默认 3000(next.config.ts:9-10)使代理实际打 Hono API。表里明明有 rating/business_hours/phone 数据，因字段名错配（rating_overall vs rating、operating_hours vs business_hours）全部不展示——用户感知「POI 数据几乎全缺」，实为消费端读错了名字。

**核实修正:** 两处细节修正，不影响结论：(1) 路由链不是经 next.config rewrite 的 /api/pois，而是 crawler.ts:23 API_BASE='/api/crawler' → Next route handler app/api/crawler/pois/route.ts:41-44 → backend.ts:25-27 getBackendApiBaseUrl() 读 NEXT_PUBLIC_API_URL（由 next.config.ts:9-10 env 内联默认 3000）→ Hono API；next.config.ts:30-32 的 rewrite 与该页面无关。(2) "dev 看起来一切正常"略夸大：mock quality_score 为 92（0-100 制），页面按 0-1 制乘 100，dev 实际显示 9200% 徽章，但不崩溃，掩盖效应成立。另外 phone 字段两端同名，若页面不崩溃本可展示；但因 sources.map 在每张卡片渲染时先抛错，实际所有数据均不可见，"全部不展示"在效果上成立。结论应加重：Go server 没有任何 /pois 端点，NormalizedPOI 契约纯属前端虚构，仅 mock 数据实现它。

### [HIGH] (consumers) POI 搜索/城市筛选/分页静默失效：参数名错配且 offset 不转发

**证据:** apps/dashboard/src/app/api/crawler/pois/route.ts:31-39 转发 query/city/min_quality，从不转发 offset；packages/api/src/routes/pois.ts:15-17 后端只读 q/cityId/category；pois/page.tsx:40-46 用户传 query/city/offset

**详情:** 搜索词和城市输入被后端完全忽略（还要求 cityId 数字而非城市名）；offset 丢失使翻页永远返回第一页。用户搜「上海」搜不到、翻页内容不变 → 直接感知为「爬的数据太少」。min_quality 同样被后端忽略。

**核实修正:** 结论整体成立，仅一处措辞需微调：搜索失效的表现不是「返回空结果」，而是搜索词被静默忽略后返回未过滤的第一页全量数据——当首页恰好不含目标城市 POI 时用户才感知为「搜不到」。其余描述（city/min_quality 被后端忽略、cityId 要求数字 ID、offset 在代理层丢失导致翻页内容不变）均与代码完全一致。

### [HIGH] (consumers) 游记搜索框无效 + destinations 过滤被代理丢弃

**证据:** guides/page.tsx:155-165 传 search → crawler.ts:481 映射为 q → apps/dashboard/src/app/api/crawler/guides/route.ts:56 转发 q → packages/api/src/routes/guides.ts:219-273 GET / 完全不读 q（仅 /search 端点支持 q，但 dashboard 未接）；crawler.ts:467-489 支持 destinations 参数但 guides/route.ts:50-66 不转发

**详情:** 游记列表搜索输入任何关键词结果不变（仅触发 refetch 造成「搜索过」的错觉）；按目的地过滤的能力在代理层被丢弃。内容明明在库里却找不到 = 用户感知「数据少」。

**核实修正:** 两点补充修正：(1) destinations 不仅在代理层（route.ts:50-66）被丢弃，后端 GET /（guides.ts:219-273）同样不读该参数，丢弃发生在两层，修复需同时改代理白名单和后端查询；(2) dashboard 当前没有任何调用方实际给 getTravelGuides 传 destinations（guides/page.tsx 只传 platforms/search），故 destinations 部分是潜在能力缺失而非正在发生的用户可见故障；搜索框失效则是真实的用户可见 bug。另注：后端 /search 端点本身也仅对 title 做 LIKE 匹配且 q 与 destination 互斥（guides.ts:284-290），即使接上搜索能力也偏弱。

### [HIGH] (consumers) saves_count 硬编码 0、ai_processed_at 硬编码 null：假数据冒充真实统计

**证据:** packages/api/src/routes/guides.ts:197 `saves_count: 0,`、211 `ai_processed_at: null,`；guides/[id]/page.tsx:283-288 收藏 StatCard 直接展示该值；guides/page.tsx 列表也消费 saves_count

**详情:** 收藏数永远显示 0，看起来像真实数据而非缺失——比显示 N/A 更具误导性（用户/运营误判内容热度，也掩盖了爬虫从未采集收藏数这一事实）。travel_guides 表本身就没有 saves 列，缺口在采集与 schema，但消费端用 0 把它藏住了。

**核实修正:** 证据中"guides/page.tsx 列表也消费 saves_count"不成立：列表页只展示 likes_count/views_count/comments_count（apps/dashboard/src/app/(dashboard)/guides/page.tsx:115/119/123），不展示收藏数。实际消费链应修正为：apps/dashboard/src/lib/api/backend.ts:211 `saves_count: toNumberOrDefault(guide.saves_count)` 映射 + 详情页 [id]/page.tsx:283-288 StatCard 展示。另一处需补充的细微修正：ai_processed_at 的硬编码 null 并非单纯遗漏，而是被 packages/api/src/routes/guides.test.ts:239-256 的测试（'keeps ai_processed_at null for current iOS compatibility'）刻意锁定的 iOS 兼容契约——但结论不变：该字段从未有真实值，schema 中也不存在 aiProcessedAt 列。

### [CRITICAL] (docs-and-automation) destination_fill 补齐任务是空转：目的地参数被忽略、抓到的 URL 被丢弃、无落库订阅者

**证据:** backfill-executor.service.ts:205-217 仅以 response.ok 计 processed++，不消费返回的 URL；apps/server/internal/handler/mafengwo.go:91-93 固定访问 https://m.mafengwo.cn/note/ 而 req.City 只用于日志（scripts/crawl-mafengwo.ts:612-615 注释明确该页对任何目的地都返回相同的 17 条热门游记）；mafengwo.go:120-126 发布 crawler.mafengwo.list.completed 事件，但 events.go:17-24 没有订阅该 topic；executor 中查出的 \_dest（backfill-executor.service.ts:199-203）从未使用

**详情:** 「为零覆盖城市补游记」这条被设计文档明确列为两大目标之一的链路，执行后会把任务标成 completed（processed>0）但数据库一条新游记都不会增加。这是『目的地缺 guide』gap 被认识但实际未解决、且监控上还显示成功的最严重断点。

### [CRITICAL] (docs-and-automation) field_backfill 无法补齐分析出的 7 个缺失字段中的关键 3 个（dayItineraries/geoData/enrichedData）

**证据:** backfill.service.ts:3-11 定义 BACKFILLABLE_FIELDS 含 7 字段；backfill-executor.service.ts:109-122 fetchAndUpdateGuide 只更新 content/title；syncFromMafengwoGuide（:59-86）最多补 content/coverImageUrl/imageUrls/destinations/tags/authorName；没有任何代码路径写 dayItineraries、geoData、enrichedData；Go /api/crawler/fetch 响应只含 url/title/content（backfill-executor.service.ts:14-22）

**详情:** 分析页报告缺 AI 结构化字段（行程/坐标/富内容），用户生成并执行补齐任务后这些字段依然缺失——任务却显示完成。分析能力与执行能力的字段集不一致，且没有任何文档记录这个差距。

**核实修正:** 结论成立，仅措辞微调：「没有任何代码路径写 dayItineraries/geoData/enrichedData」应限定为「field_backfill 执行链路内没有」——仓库中 guide-import.service.ts:161-174 及 scripts/batch-ai-process.ts、scripts/backfill-structured-guide-content.ts 可写这些字段，但都未被 backfill 执行器调用，需手动运行。

### [CRITICAL] (docs-and-automation) AI 结构化处理被筛选条件永久跳过：爬虫写入的 enrichedData 使 batch-ai-process 永不命中新数据

**证据:** scripts/batch-ai-process.ts:401 用 .where(isNull(travelGuides.enrichedData)) 选取待处理游记；但 scripts/crawl-mafengwo.ts:497-501 insert 时总是写入 enrichedData: structuredContent（buildStructuredGuideContent 产出的 contentHtml/contentMarkdown，:456-461），update 分支同样合并写入（:489-495）

**详情:** 9b75997『improve crawler content pipeline』之后，所有新爬游记入库即带非空 enrichedData，导致唯一的 AI 结构化脚本一条都选不出来。aiDays/aiSummary/geocode 系统性缺失的直接根因，进而又喂出 backfill 分析里的 dayItineraries/geoData 缺口。完全没被任何文档意识到。

**核实修正:** 结论整体成立，两点小修正：(a) 行号微调——insert 写入在 crawl-mafengwo.ts:498-501（:497 是 else 行），buildStructuredGuideContent 调用在 :456-461 无误。(b) geocode 部分需限定：batch-ai-process 只在 aiDays 的 POI 内嵌 geocodeConfidence/geocodeSource（batch-ai-process.ts:63-64），从不写 geoData 列——全仓库没有任何 geoData 写入方。因此该筛选 bug 是 aiDays/aiSummary/dayItineraries 缺失的直接根因，但 geoData 缺失是「无写入方」这一独立缺口，即使修复筛选条件 geoData 仍会缺失。另补充强化证据：Go 爬虫 ingest 路径 apps/server/internal/handler/events.go:78-101 同样总是写非空 enriched_data，即两条入库路径（TS 爬虫 + Go server）都会使新数据永久跳过 AI 处理。

### [CRITICAL] (docs-and-automation) 全链路无自动化执行器：Go cron 是空壳，普通 crawl job 没有任何 worker 消费

**证据:** apps/server/internal/cron/cron.go:26-38 『Poll pending guides every 30 seconds』循环体只有 slog.Debug，session cleanup 同样只打日志；compose.yml ENABLE_SCHEDULER=true 无代码消费（grep packages/apps 无 ENABLE_SCHEDULER 引用）；executeAllPendingBackfillJobs（backfill-executor.service.ts:280-287）只处理 field_backfill/destination_fill 两种 jobType，其余 pending 任务无人执行，且需管理员手动 POST /backfill-execute（crawl-jobs.ts:243）

**详情:** 设计文档已认识到（spec L42 'Crawler Worker (future/external)'、L239 'Auto-scheduled backfill' 列入 Future），但一年内没有落地。结果是：数据增长完全依赖有人在终端手工跑 npx tsx scripts/crawl-mafengwo.ts（该脚本甚至不在 package.json scripts 里）。

**核实修正:** 结论整体成立，仅时间表述需修正：『一年内没有落地』不准确。git 历史显示 cron.go 空壳引入于 2026-03-13（commit 3ca6d2d，约 3 个月前），backfill 设计文档提交于 2026-05-01（f83ef6a，约 6 周前），均不足一年。建议改为：『设计文档（2026-05-01）已将 Crawler Worker 与 Auto-scheduled backfill 列为 Future，至今约 6 周仍未落地；Go cron 空壳自 2026-03-13 引入后约 3 个月无任何实质实现』。其余描述（数据增长依赖手工运行 npx tsx scripts/crawl-mafengwo.ts、该脚本不在 package.json scripts、普通 crawl job 无 worker 消费、backfill 需管理员手动 POST 触发）全部准确。

### [HIGH] (docs-and-automation) n8n 4 个工作流与真实 API 合同全面不匹配，定时爬取/通知/图片生成均不可用

**证据:** scheduled-crawl.json:24-36 POST {CRAWLER_API_URL}/api/crawl-jobs 无 Authorization 头，而 crawl-jobs.ts:94 app.post('/', adminRequired(), ...) 必返 401；scheduled-crawl.json:48 调 /api/crawl-jobs/{{$json.id}}/start，但 API 只有 body 式 POST /start（crawl-jobs.ts:149），且响应为 {data:...} envelope 取不到 $json.id；目标平台 xiaohongshu 在仓库内无任何爬虫实现（apps/server/cmd/server/main.go:74-82 仅有 mafengwo handlers）；image-generation.json:20 调 /api/ai/generate-image、:75 PATCH /api/guides/{id}/image，两端点均不存在（main.go AI 路由仅 /api/ai/chat:91，guides.ts 仅 PATCH /:id 与 /:id/poi-coordinates:475,506）；crawl-notification/quality-alert 的 webhook 无任何发送方（grep packages/api 与 apps/server 无 n8n/webhook 引用），compose.yml:88-89 N8N_BASE_URL/N8N_API_KEY 无消费者

**详情:** n8n 目录给人「已有定时爬取+质量告警+封面图生成」的假象，实际四条链全断。这解释了为什么『数据少』——唯一的定时增量入口从未工作过；也解释了『质量问题无人知晓』——quality-alert 永远收不到事件。

**核实修正:** 结论整体无需修正，仅两处微调：① 证据行号 scheduled-crawl.json:24-36 实为节点参数块 22-37（url 在 :24、jsonBody 在 :36），属范围微偏；② 实际情况比原结论更严重——compose.yml 中携带 N8N 变量的 crawler 服务引用 apps/crawler/Dockerfile（compose.yml:63），而 apps/crawler 目录在仓库中根本不存在（apps/ 仅有 dashboard/ios/server）；且即使补上鉴权，POST /start 也只把 DB status 改为 running（crawl-jobs.ts:155-158），不会触发任何真实爬取，定时链路在鉴权、路由、取值、爬虫实现四层全部断裂。

### [HIGH] (docs-and-automation) 缺口分析只扫前 500 条 guide / 1000 个 city，结果系统性漏报且违反自家性能红线

**证据:** backfill.service.ts:65-68 db.select().from(travelGuides).limit(500) 无 WHERE/ORDER BY 拉全字段进内存再 JS 过滤排序；:93-96 cities .limit(1000)；plan 文档自己写明 gap-report 的 totalGuides 是『approximate; actual total requires separate count』（2026-05-01-travel-guide-backfill.md:590）；CLAUDE.md Performance Rules 与 .jules/bolt.md 明确要求 database-level filtering

**详情:** 库一旦超过 500 条（爬虫雪球模式很快超过），分析页展示的缺口数和分布就是错的，管理员据此生成的补齐任务覆盖不到大多数真实缺口。『错』的另一个来源：分析结果本身不准。

**核实修正:** 结论无需修正，仅行号有 1 行偏移：travelGuides 查询实际在 backfill.service.ts:66-69（非 65-68），cities 查询在 94-97（非 93-96）。另可补充加重项：fieldMissingDistribution（runFullAnalysis 173-181 行）基于已截断到 limit=100 的 fieldGaps 统计，分布数据实际只覆盖 ≤100 条 guide；backfill-all（crawl-jobs.ts:249-258）据此生成任务，单次补齐上限即任意 500 行窗口内的 top-100。

### [HIGH] (docs-and-automation) 唯一数据源 mafengwo 爬虫从源头制造缺口：destinations/tags 写死空数组、互动数靠正文正则猜

**证据:** scripts/crawl-mafengwo.ts:472-473 destinations: [] as string[], tags: [] as string[]（即使种子阶段明知该 ID 来自哪个目的地也不回填）；:476 commentCount: 0；:404-407 views/likes 从清洗后正文用正则猜（『(\d+)浏览/赞』），极易错配；:171-192 calculateQualityScore 仅按标题长度/内容长度/有无作者图片打分；种子城市硬编码 46 个（:61-110）；publishedAt 完全不提取

**详情:** backfill 分析里『destinations 缺失』的最大制造者就是爬虫本身——种子收集时 dest.name 已知却不写入。雪球与 ID 探测获得的游记更是天然无目的地。单平台+手工运行+字段不全 = 数据少且缺的总根因。

**核实修正:** 结论成立，补充两点精确化：(1)「唯一数据源」准确说是两条写入路径、单一平台——除 TS 爬虫外，Go server 的 apps/server/internal/handler/events.go:90-102 也 INSERT travel_guides，但同样硬编码 platform="mafengwo"，且其列清单完全不含 destinations/tags/comment_count/published_at，缺口与 TS 路径一致甚至更彻底；(2) 还有一个潜伏类型错配：schema 将 destinations 定义为 GuideDestination[] 对象数组（packages/database/src/schema/guides.ts:20,43），而爬虫写入 `[] as string[]`，因数组恒空未暴露，一旦回填 string 将与下游类型契约冲突。另 calculateQualityScore 除标题/内容/作者/图片外还对「有 views/likes」加 0.1（:189-190），原描述略有遗漏但不影响"纯表面启发式"的结论。

## 批判性补充：被遗漏的维度

- 数据源战略维度（被整体遗漏的最高层决策）：38 条 gap 全部在修「马蜂窝爬虫怎么爬得更好」，没有一条质疑「结构化 POI 事实数据（坐标/营业时间/电话/票价）是否根本不该从 UGC 游记里爬」。证据：全仓库无任何权威 POI API 集成——grep restapi.amap/nominatim/maps.googleapis 零命中；唯一 'geocode' 字样是 scripts/batch-ai-process.ts:63-64 的类型字段声明，全链路无生产者；platform 列按多平台设计（packages/database/src/schema/guides.ts:33、crawl.ts:12 均为 varchar(50)）但只有 mafengwo 一个实现。对「单源是否最大根因」的批判性回答：不是——当前管道连单源数据都留不住（双写无唯一键、字段静默丢失、归一化死表），先扩源只会更快地积累脏数据；但对 POI 结构化字段这一子集，接入高德 Place/Geocoding API（国内合规、有免费配额、坐标权威）是比修爬虫更根本的解法。可行性排序：高德 > Google Places（中国大陆 POI 覆盖差 + 坐标系偏移）> 大众点评（无公开 API，仍需爬且反爬更强）。

- AI 补全的质量控制维度：清单只说「AI 增强选不到新数据」（筛选条件互斥），但没人指出即使选到了，产出本身不可信——scripts/batch-ai-process.ts:128-148 的 SYSTEM_PROMPT 直接让 LLM 在 JSON 模板里填 "latitude": 0.0 / "longitude": 0.0（第 147-148 行），坐标来自模型记忆或编造，无地理编码交叉验证、无坐标范围校验、无 confidence 字段产出（这正是 consumers 维度发现「geocodeConfidence 全链路无生产者」的上游原因）。「AI 生成补全」作为修复手段方向可行（摘要/行程结构化很合适），但坐标类事实字段必须改为「AI 提取 POI 名称 → 地理编码 API 解析坐标 → 范围/城市一致性校验」三段式，现有实现是「幻觉即数据」。

- 用户众包修正维度：packages/database/src/schema/ 下 34 个 schema 文件中无任何 feedback/correction/report 类表（grep feedback|correction|crowdsource 零命中）；唯一的人工修正路径 PoiEditor 的读写闭环已被 consumers 维度证明断裂（写 dayItineraries 读 enrichedData.aiDays）。完全缺失的机制设计：用户/运营报错入口、修正值落库、修正值在重爬 upsert 时的保护策略（否则未来修好的 upsert 会把人工修正覆盖回错值）——这是「数据错且改不掉」问题在机制层的空白，比单点修 bug 更上游。

- 可观测性与数据质量度量维度（元根因级遗漏）：清单里十几处「静默失败但日志显示成功」「任务 completed 零产出」，却没有把「全链路零数据质量度量」本身列为独立 gap。证据：apps/server 无任何 metrics/sentry/prometheus 依赖（grep 零命中），落库失败仅 slog.Error 一行（events.go:318-323）；无每日新增行数、字段填充率、保存失败率、空值率、重复率任何基线指标。后果：「数据少」这个核心痛点本身无法被量化（少多少？缺哪类？哪天开始断的？），且所有假成功路径正是因为没有度量才存活至今。这是让其余 38 个 gap 得以长期隐身的元原因。

- 测试与契约保障维度：发布方/订阅方字段系统性漂移（rating 类型不匹配、poi_id 从未发布）能在生产存活，根因是零契约测试——apps/server/internal/handler/handler_test.go:685 的 TestRegisterEventHandlers 只验证 handler 注册成功，不验证 payload 序列化往返；不存在 events_test.go；Go→TS 的 HTTP JSON 契约（views/likes 字符串 vs 数字）无共享 schema 校验。CLAUDE.md 要求 60% 覆盖率，但数据链最关键的 events.go 保存逻辑、extract.go 提取逻辑测试为零（apps/server 仅有 content/transport/handler/eventbus 四个测试文件）。消费端的参数错配（query vs q、offset 不转发）同样是缺集成测试的症状。

- 坐标系维度（未来必踩的「不准确」隐性根因）：crawler-types 类型注释声明坐标为 WGS-84（packages/crawler-types/src/normalized-poi.ts:8-10、training-dataset.ts:150-152），但全仓库无任何 GCJ-02↔WGS-84↔BD-09 转换代码（grep gcj|wgs|bd09 仅命中这两处注释）。中国地图源（马蜂窝页面内嵌坐标、高德 API）输出 GCJ-02 火星坐标，按注释当 WGS-84 用会导致所有 POI 系统性偏移 100-600 米。当前因坐标全空尚未暴露，一旦按建议接入高德地理编码，这将立即成为新的「坐标不准」根因，清单完全未预见。

- 存量脏数据治理与修复依赖关系维度：清单全部面向「以后怎么写对」，没有盘点已有脏数据的可修复性分级与修复顺序依赖：(a) 重复行可离线去重（database-schema 提了一句但无方案）；(b) '1.2万'→1 的错值可从 mafengwo_guides 暂存层原值恢复或重爬；(c) 被 scripts/clean-historical-guides.ts 覆盖原文且无 raw_crawl_records 留底的 content 属不可逆损失只能重爬；(d) 而重爬全部被 sourceUrl 「已存在即跳过」去重锁挡住（guide-import.service.ts:127-137）——即修复任何历史数据前必须先改去重策略，这条关键依赖关系无人指出。空壳游记（反爬页入库）同样永久占用去重名额。

- 爬虫可持续性与合规维度（次要但应记录）：Kernel.sh 单一付费供应商锁定（KERNEL_API_KEY 缺失导致 503 已列为 gap，但供应商断供/成本上升风险未评估）；Go 爬虫无任何请求限速/robots 处理（apps/server grep rate.limit 零命中），对马蜂窝的抓取既易触发风控（已知无验证码检测）也有 ToS/法律风险；马蜂窝单平台改版即全量断供的脆弱性只在 opportunities 里带过一句，未形成 gap。

## 优先级框架

修复优先级建议采用「三轴打分 + 一个硬性 Gate + 五阶段排程」框架。

【硬性 Gate（最重要的一条原则）】任何「多爬数据」的动作（扩源、提频、补 POI 详情、重爬历史）必须排在写入端修复（唯一键 + 事件契约 + 校验接入）之后。当前管道是漏的：先开大水龙头只会让重复行和空字段数据膨胀得更快，并烧掉 Kernel.sh 配额。同理，修任何历史数据前必须先解开 sourceUrl「已存在即跳过」的去重锁（guide-import.service.ts:127-137），否则重爬路径不通。

【三轴打分】对每个 gap 按以下三轴 1-5 分加权排序：

1. 因果出度（修它能让多少下游 symptom 自动消失）——用上面 RC1-RC8 因果图衡量。例：统一事件 payload struct 一项就消灭 POI 不入库、空 ID、封面图丢失等 6+ 个症状；而修一个 NaN 徽章只消灭它自己。
2. 数据影响面（挽回/新增的数据行数与字段数，含「感知数据量」——消费端契约错配修复成本极低但感知收益巨大，应提权）。
3. 不可逆性（不修会不会持续造成永久损失）——content 被破坏性清洗覆盖、无 raw 留底、空壳数据占用去重名额属于「每天都在产生不可逆损失」，即使因果出度不高也要置顶止损。

【五阶段排程】

- Phase 0 止损（天级）：停用破坏性写入——batch-ai-process 整体覆盖 enrichedData、clean-historical 覆盖原文；落地 raw_crawl_records 留底；空提取/反爬页判失败禁止入库。目的：让损失停止累积。
- Phase 1 保真（写入正确性，1-2 周）：离线去重后加 (platform, external_id) 等唯一键并收敛单一写入方 upsert（RC2）；发布/订阅共享 Go struct 或直接改同步落库去掉内存 EventBus（RC3）；TS 实现 parseChineseNumber、validators 接入 import 主链路（RC4）。这是因果出度最高的根因簇，修完后「错、重复、矛盾、空字段」类症状大半消失。
- Phase 2 增量（让数据多起来，2-4 周）：list 按 mddId 真正实现 city 维度抓取；cron/worker 消费 crawl_jobs 实现自动调度与失败重试；destination_fill 接通实际导入；修 AI 筛选条件（enrichedData 字段级判断）；所有写入路径同步写 guide_destinations 修正缺口分析。此时 Gate 已解除，扩量是安全的。
- Phase 3 提质与换源（结构化字段，并行启动评估）：POI 坐标/营业时间/电话优先评估高德 Place/Geocoding API 而非继续爬马蜂窝（注意 GCJ-02/WGS-84 坐标系转换，全仓库目前无转换代码）；AI 补全改三段式（提取名称→地理编码→校验）并产出 geocodeConfidence 激活已有审核 UI；打通 mafengwo\_\*→normalized_pois→pois 提升管道；第二爬虫源做交叉验证。
- Phase 4 防回归与体验（持续）：消费端契约修复（字段/参数映射、假数据消灭）；发布/订阅契约测试 + Go↔TS schema 校验；数据质量度量基线（每日新增、字段填充率、保存失败率）接入告警——没有这一层，前四个阶段的修复会在下一次字段漂移时无声烂回去。

【对题目四个候选方向的裁决】单源马蜂窝不是当前最大根因（最大根因是 RC2+RC3：管道连单源数据都留不住），但换权威 API 源是 POI 结构化字段的正解（Phase 3）；外部 API 可行性：高德最优、Google Places 在中国大陆不可行、大众点评无公开 API；AI 补全可行但现实现是幻觉即数据，必须先加验证层；用户众包修正连 schema 和闭环都不存在，属 Phase 4 之后的增强，且必须先设计「人工修正防覆盖」策略再谈众包。

## 中低严重度缺口（未核实，仅记录）

- [medium] 无分页处理，列表数据上限极低: 马蜂窝桌面端列表多为分页（非无限滚动），对这些页面滚动根本不加载新内容；移动端 feed 滚 20 次也只覆盖几十条。每个目的地可获取的游记/POI/QA 数量被硬性卡死。
- [medium] 分类与排行 URL 映射错误，爬到的页面不是目标页面: hotel 类目数据等于 attraction 的重复；ranking 数据来自概览页随机列表，rank/score 不可信；按名称爬目的地返回全空字段。这是「数据不准确」的直接来源。
- [medium] 固定 Sleep 等待，无元素级等待条件: 页面加载慢于 sleep 时提取到空/半截内容且不报错（与 gap 5 叠加成空壳数据）；快时白白浪费云浏览器计费时长。
- [medium] 仅马蜂窝一个数据源，通用 fetch 不可用且结果不落库: 数据广度受限于单一平台；唯一的通用抓取通道既抓不到（自报爬虫 UA）也不保存（事件无消费者），等于摆设。
- [medium] 游记发布时间从未提取，时效性维度缺失: travel_guides.published_at 恒为 NULL，无法区分 2015 年与 2025 年的游记，下游 AI 生成行程会引用过时的票价/开放信息——「不准确」的时间维度根因。
- [low] 提取选择器脆弱、清洗规则过度删除: 马蜂窝改版任何 class 命名都会让字段静默变空或取错值；过度清洗规则（content.go:168-186 的 15 条正则）可能误伤正文（如「举报」二字全部替换为空格）。
- [low] 工具函数边界缺陷: 小概率导致 views/likes 解析为 0、externalId 取错引发去重键冲突或重复入库。
- [medium] 占位值与静默兜底掩盖缺失：'未命名'、||0、自动补 cover: 标题缺失被 '未命名' 占位后，validateTitle 的 warning 机制（validators.ts:634-641）永远不触发；计数解析失败与真实 0 不可区分；下游无法统计真实缺失率，质量报表（quality-report.ts CompletenessMetrics）的分子被人为抬高。
- [medium] Bronze/Silver 层类型与 DB schema 脱节，纸面架构无法支撑重处理: 导入路径不写 raw_crawl_records，原始 HTML 不留存，content_hash 去重设计未落地（去重靠 sourceUrl 字符串比对，guide-import.service.ts:130-137），清洗规则修复后无法重放历史数据。Silver 层 POI 管道（多源合并、ratings、operating_hours、sources 溯源）完全没有实现。
- [medium] 类型定义面远大于实际提取面：tags/publishedAt/saves/comments/sections 从未被抓取: '数据少'的上游根因：提取器只抓 8 个字段，POI 详情（电话、营业时间、门票、坐标）没有任何爬取-清洗-入库链路，类型定义给人'已支持'的错觉。published_at 缺失还导致 freshness 维度（quality-report.ts FreshnessMetrics）无法真实计算。
- [low] detectAdDensity 把个人信息计入广告密度，removedCount 统计失真: 含酒店/餐厅联系电话较多的实用型攻略可能被误判低质（若未来接入过滤则误杀）；removedCount/removedTypes 统计口径失真，影响清洗效果监控。
- [medium] 缺口分析只扫前 500 条且无排序，超出部分永不被分析: 数据量超过 500 后，后插入的游记永远进不了 gap 分析与回填范围；同时违反项目 bolt 规则（禁止全表取回 JS 过滤），应改为数据库端 IS NULL/JSON_LENGTH 条件分页扫描。
- [medium] destination 搜索条件与存储结构不匹配，查询恒空: GET /guides/search?destination=东京 对对象形态的数据返回 0 条，前端表现为「按目的地查不到攻略」，即用户感知的「数据少」。应改用 JSON_CONTAINS(..., JSON_OBJECT('name', ?)) 或查 guide_destinations 辅助表。
- [medium] crawl job 的 name/scheduleCron 被静默丢弃，系统没有任何定时重爬: 用户在 dashboard 配置的任务名与 cron 调度被无声吞掉，且全仓不存在调度器——所有抓取都靠手动触发，数据无法持续更新，是「过期」问题的机制性根因。
- [medium] raw_crawl_records 零使用、mafengwo_pois 无下游、pois 表全仓无写入方: 原始抓取数据不留存 → 解析规则修复后无法回放补救；爬到的 POI 数据是死端，App 的 POI 接口(/pois)查询的是一张没人写的表——POI 维度「数据少」的根因是管道根本没接通。
- [low] URL 去重仅做精确字符串匹配，无规范化: https/http、带 utm 参数、尾斜杠差异的同一篇游记会被判为新游记重复导入；反之 discover 阶段也可能漏报新游记。应统一 canonical URL 或改用 externalId 去重（ExtractExternalID 已存在于 Go 侧）。
- [low] gap-report 用缺口数充当总数、ai_processed_at 硬编码 null、travelGuideAiData 写后无读: dashboard 数据质量报表口径失真；客户端无法区分「未 AI 处理」与「AI 处理产出为空」，掩盖了 AI 增强断裂的症状。
- [medium] provenance 字段不完整：无字段级来源/置信度，crawled_at 可空，更新依赖手工传参: 行级只有 source+crawledAt，没有 per-field 的来源、抓取时间、置信度、版本：当两个来源对同一 POI 给出不同营业时间/评分时，schema 上没有任何结构能表达"哪个值来自哪、何时抓的、信多少"，冲突只能被覆盖或并存为重复行——"数据冲突无法被解决"的结构性根因。pois 主表缺 lastSyncedAt 也使"数据多旧"不可查询，无法驱动 refetch（refetc
- [medium] 业务关键字段大面积 nullable 且写入端不覆盖：电话/营业时间/票价/官网/坐标恒为 NULL: schema 预留了丰富列，但抓取 payload 和 INSERT 列清单远窄于表结构，这些列从第一天起就恒为 NULL——"抓到的数据有限"在 schema 视角的体现是表宽与写入宽度严重不匹配，且无 NOT NULL 约束或完整度字段（pois 无 completenessScore，对比 travelGuides guides.ts:50）让缺失在 DB 层不可见、不可按缺失度筛选回补。建
- [medium] 全库零数据库级外键 + 字符串弱关联，孤儿数据无防护: 删除 travel_guides 行不会清理 guide_destinations/travel_guide_ai_data/guide_comments；mafengwo_pois.destination_id 可指向不存在的 mdd_id；poi_source_mappings.raw_record_id 指向永远为空的表。TiDB 支持外键但代价高，不加 FK 是合理取舍，但 schema
- [low] 双爬取任务表并存（crawl_jobs vs mafengwo_crawl_tasks），raw 记录无处挂靠: 两套任务真相源：backfill.service.ts 写 crawlJobs，马蜂窝爬虫体系用 mafengwoCrawlTasks，进度/重试/错误分别记录，统计"爬了多少、失败多少"需要拼两张表，且任何一方的任务产物都无法统一关联到 raw_crawl_records 形成 job→raw→normalized→canonical 的完整血缘。
- [medium] AI 富字段链路断裂：iOS 模型定义了营业时间/价格/评分/交通等字段，产线几乎从不产出，dashboard 干脆不展示: 行程规划核心体验（何时开门、多少钱、怎么去下一站）依赖的字段在模型层三处定义不一致、生产层不产出、展示层不消费——三层各自为政，用户在 POI 详情看到的只有名字和描述。
- [medium] 行程编辑器：POI 坐标 ?? 0 兜底、rating 硬编码 undefined、搜索强依赖 cityId: 核心行程编排流程依赖 poi.latitude/longitude/rating/category/address：坐标缺失被 0,0 掩盖而非暴露；评分被前端主动丢弃；AI 聊天创建的行程无结构化 cityId 时整个 POI 添加功能不可用。
- [medium] dev mock 兜底掩盖后端缺失，且 mock 数据契约与真实 API 不符（quality_score 量纲错误）: mock 比真实 API 字段更全（如 POI 的 sources/quality_score），导致开发时 UI 完美、上线即露馅——POIs 页面崩溃问题正是被它掩盖的。三处 quality_score 量纲（0-1、0-100、0-5）并存。
- [low] normalizeTravelGuide 用占位符冒充数据：Untitled guide / Anonymous user / 计数缺失归零: 标题/作者缺失被替换为看似正常的英文占位、互动数缺失与真实 0 不可区分——审核者无法从 UI 识别哪些 guide 是字段缺失需要回填的（backfill 页面有此能力但列表页全被抹平）。
- [medium] AI 行程规划输出纯文本，与 POI 库和行程数据完全断裂: 「生成行程」结果不能落库、不引用爬到的 POI/游记数据做 grounding——爬虫数据与核心 AI 规划体验之间没有任何数据闭环，爬来的数据对核心流程价值为零。
- [low] guide 详情元数据无条件拼接「...」且 content_truncated/completeness_level 后端从不返回: 内容完整度信号（Go 爬虫已计算）丢在链路中间，消费端无法区分「内容短」与「内容被截断」。
- [medium] 三套互不一致的内容清洗/HTML 生成逻辑并存（多源真相）: 同一条游记经不同入口（TS 爬虫、Go 爬虫、历史回填脚本）会得到不同的清洗结果与 HTML 结构，contentMarkdown/contentHtml 质量不可预测，且修一处规则其它入口不会同步——『错/脏』内容反复回流。架构优化 plan 只统一了响应 DTO，未统一内容管线。
- [medium] ComfyUI 封面图生成无任何代码集成，coverImageUrl 缺口有方案无实现: backfill 分析中 coverImageUrl 是七大缺失字段之一，仓库已准备好 SDXL 工作流和容器编排，但缺一段把 guide → prompt → ComfyUI → 回写 cover_image_url 的胶水代码。
- [low] backfill 设计中的防错措施未实现：无效 ID 过滤、部分失败报告、进度跟踪均缺失: 管理员可以为已删除的 guide 或不存在的城市创建任务，任务照常『成功』，进一步放大『执行了但数据没变』的错觉。
