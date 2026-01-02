# Feature Specification: 出行攻略 (Travel Itinerary)

**Feature Branch**: `001-travel-itinerary`  
**Created**: 2026-01-02  
**Status**: Draft  
**Input**: User description: "出行攻略功能 - 行程规划、时间轴管理、景点美食推荐、博主方案复制"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 创建出行攻略 (Priority: P1)

用户想要创建一个新的出行攻略，选择目的地城市和出行日期，系统自动生成基于时间轴的空白行程框架。

**Why this priority**: 这是整个功能的核心入口，没有攻略就无法进行后续的规划、编辑和分享。

**Independent Test**: 用户可以成功创建一个包含城市、日期的攻略，并看到按天划分的时间轴视图。

**Acceptance Scenarios**:

1. **Given** 用户已登录, **When** 点击"创建攻略"并选择城市"杭州"和日期"2026-01-10 至 2026-01-12", **Then** 系统创建包含 3 天时间轴的空白攻略
2. **Given** 用户在创建攻略页面, **When** 未选择城市直接提交, **Then** 系统显示"请选择目的地城市"错误提示
3. **Given** 用户离线状态, **When** 创建攻略, **Then** 攻略保存到本地，联网后自动同步

---

### User Story 2 - 添加景点/美食到行程 (Priority: P1)

用户可以在时间轴的某一天添加景点或美食地点，设置预计停留时间和备注。

**Why this priority**: 行程规划的核心交互，直接影响用户对产品价值的感知。

**Independent Test**: 用户可以在指定日期添加一个景点，设置时间和备注，并在时间轴上看到该项目。

**Acceptance Scenarios**:

1. **Given** 用户有一个 3 天的杭州攻略, **When** 在第 1 天添加"西湖"景点并设置"09:00-12:00", **Then** 时间轴显示该景点卡片
2. **Given** 用户添加景点时, **When** 搜索"西湖", **Then** 系统返回包含评分、地址、营业时间的景点列表
3. **Given** 时间轴已有"西湖 09:00-12:00", **When** 添加"雷峰塔 10:00-11:00", **Then** 系统提示时间冲突并建议调整

---

### User Story 3 - 按评分推荐景点/美食 (Priority: P2)

用户在添加行程项目时，系统根据当前位置或目的地城市推荐高评分的景点和美食。

**Why this priority**: 推荐功能提升用户发现效率，但用户也可手动搜索完成规划。

**Independent Test**: 用户打开推荐列表，可以看到按评分排序的景点/美食，并可直接添加到行程。

**Acceptance Scenarios**:

1. **Given** 用户正在编辑杭州攻略, **When** 点击"推荐景点", **Then** 显示杭州景点列表按评分降序排列
2. **Given** 推荐列表显示中, **When** 切换筛选为"美食", **Then** 列表切换为美食推荐
3. **Given** 用户授权位置权限, **When** 点击"周边推荐", **Then** 基于当前 GPS 位置推荐 5km 内的地点

---

### User Story 4 - 一键复制博主攻略 (Priority: P2)

用户可以浏览社区中博主分享的攻略，一键复制整个行程到自己的攻略列表，然后进行个性化编辑。

**Why this priority**: 降低用户规划成本，提升社区内容价值，但需要先有基础编辑功能。

**Independent Test**: 用户可以从社区选择一个攻略，复制后在"我的攻略"中看到完整副本。

**Acceptance Scenarios**:

1. **Given** 用户浏览博主攻略"杭州 3 日游", **When** 点击"复制到我的攻略", **Then** "我的攻略"新增一份完整副本
2. **Given** 复制的攻略中, **When** 用户修改第 2 天行程, **Then** 不影响原博主攻略
3. **Given** 博主攻略日期为过去时间, **When** 用户复制, **Then** 系统提示"请选择新的出行日期"

---

### User Story 5 - 编辑行程项目 (Priority: P2)

用户可以拖拽调整行程项目顺序，修改时间、删除项目，支持撤销操作。

**Why this priority**: 灵活编辑是行程规划的必要功能，但基于已有添加功能扩展。

**Independent Test**: 用户可以拖拽重排行程项目，修改后时间轴实时更新。

**Acceptance Scenarios**:

1. **Given** 时间轴有 3 个行程项目, **When** 拖拽第 3 个到第 1 位, **Then** 顺序变为 3-1-2 并更新时间
2. **Given** 用户删除一个行程项目, **When** 点击"撤销", **Then** 项目恢复到原位置
3. **Given** 用户离线编辑, **When** 恢复网络, **Then** 变更自动同步到云端

---

### User Story 6 - 出行方式规划 (Priority: P3)

用户可以为相邻行程项目设置出行方式（步行/打车/自驾），查看预估时间和距离，并可跳转到第三方导航。

**Why this priority**: 增强体验但非核心，用户可以先不设置出行方式完成基本规划。

**Independent Test**: 用户设置两个景点间的出行方式为"打车"，可看到预估时间并跳转滴滴。

**Acceptance Scenarios**:

1. **Given** 时间轴有"西湖"和"雷峰塔", **When** 设置出行方式为"步行", **Then** 显示"步行约 15 分钟，1.2km"
2. **Given** 出行方式为"打车", **When** 点击"去打车", **Then** 跳转到滴滴 App 并预填起终点
3. **Given** 出行方式为"自驾", **When** 点击"导航", **Then** 跳转到高德地图导航

---

### User Story 7 - 行程提醒 (Priority: P3)

用户可以为行程项目设置提醒，到达指定时间前收到推送通知。

**Why this priority**: 辅助功能，用户可以使用手机原生提醒作为替代。

**Independent Test**: 用户设置"西湖 09:00"提前 30 分钟提醒，08:30 收到推送通知。

**Acceptance Scenarios**:

1. **Given** 行程项目"西湖 09:00", **When** 设置"提前 30 分钟提醒", **Then** 08:30 收到"30 分钟后：西湖"推送
2. **Given** 用户在国外时区, **When** 收到提醒, **Then** 通知时间基于行程所在时区
3. **Given** App 被系统杀死, **When** 提醒时间到, **Then** 仍能收到推送通知

---

### Edge Cases

- **离线状态**：用户在无网络环境下创建/编辑攻略，数据本地缓存，联网后自动同步，冲突时提示用户选择版本
- **时区处理**：跨时区旅行（如北京 → 东京），时间轴按当地时区显示，提醒按实际时间触发
- **景点数据缺失**：搜索结果无匹配时，允许用户手动输入地点名称和地址
- **大量行程项目**：单日超过 10 个项目时，时间轴支持折叠/展开以优化显示
- **账号注销**：用户注销时，所有攻略数据彻底删除，不可恢复

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to create itinerary with destination city and date range
- **FR-002**: System MUST display itinerary as a timeline view organized by day
- **FR-003**: System MUST allow adding POI (Point of Interest) items with time slot and notes
- **FR-004**: System MUST detect and warn about time conflicts between items
- **FR-005**: System MUST support offline creation and editing with automatic sync
- **FR-006**: System MUST provide POI recommendations sorted by rating
- **FR-007**: System MUST filter recommendations by category (attractions, restaurants)
- **FR-008**: System MUST support location-based "nearby" recommendations when GPS authorized
- **FR-009**: System MUST allow one-click copy of shared itineraries from community
- **FR-010**: System MUST allow drag-and-drop reordering of itinerary items
- **FR-011**: System MUST support undo/redo for edit operations
- **FR-012**: System MUST calculate travel time/distance between consecutive items
- **FR-013**: System MUST support deep links to third-party apps (Didi, Gaode Maps)
- **FR-014**: System MUST support scheduling push notification reminders
- **FR-015**: System MUST handle timezone correctly for international trips

### Non-Functional Requirements

- **NFR-001**: Itinerary list MUST load within 2 seconds on 4G network
- **NFR-002**: Offline cache MUST support at least 10 itineraries with full POI data
- **NFR-003**: Timeline drag-and-drop MUST maintain 60fps animation
- **NFR-004**: API responses MUST be < 100KB for initial itinerary load
- **NFR-005**: Push notifications MUST arrive within 30 seconds of scheduled time

### Key Entities

- **Itinerary (攻略)**: Travel plan containing destination, date range, owner, visibility
- **ItineraryDay (行程日)**: Single day within itinerary, ordered by day number
- **ItineraryItem (行程项目)**: POI or activity on a day, with time slot, notes, transport mode
- **POI (兴趣点)**: Location data including name, category, coordinates, rating, business hours
- **TransportMode (出行方式)**: Walking, taxi, driving, with estimated time/distance
- **Reminder (提醒)**: Notification schedule linked to itinerary item

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create an itinerary and add first POI within 60 seconds
- **SC-002**: 80% of users who copy a community itinerary make at least one edit
- **SC-003**: Offline-created itineraries sync successfully 99% of the time
- **SC-004**: Timeline interaction maintains 60fps on devices from 2020 or newer
- **SC-005**: Push notification delivery rate exceeds 95% within 30 seconds of scheduled time
