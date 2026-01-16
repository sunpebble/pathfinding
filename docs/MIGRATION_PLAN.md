# Supabase 到 Convex 迁移计划

## 概述

将整个项目从 Supabase 迁移到 Convex，包括：

- 数据库和数据模型
- 用户认证系统
- 后端 API 逻辑
- 实时订阅
- 定时任务

## 当前架构

```
Mobile App (Expo) ──► Hono API ──► Supabase
     │                    │            │
     │                    └────────────┼── PostgreSQL 数据库
     │                                 ├── Auth (JWT)
     └─────────────────────────────────├── RLS 策略
                                       └── Edge Functions
```

## 目标架构

```
Mobile App (Expo) ──► Convex
                        │
                        ├── Document 数据库
                        ├── Convex Auth (手机 OTP)
                        ├── Queries/Mutations/Actions
                        └── Cron Jobs
```

## 数据模型迁移

### Supabase 表 → Convex 表

| Supabase 表     | Convex 表      | 说明                    |
| --------------- | -------------- | ----------------------- |
| auth.users      | users          | 用户基本信息            |
| profiles        | users (合并)   | 用户档案，与 users 合并 |
| cities          | cities         | 城市数据                |
| pois            | pois           | 兴趣点                  |
| itineraries     | itineraries    | 行程                    |
| itinerary_days  | itineraryDays  | 行程天数                |
| itinerary_items | itineraryItems | 行程项目                |
| reminders       | reminders      | 提醒                    |

---

## 实施阶段

### Phase 1: 项目设置

**任务:**

1. 初始化 Convex 项目
2. 配置 monorepo 结构
3. 设置环境变量

**命令:**

```bash
# 在项目根目录
npx convex dev
```

**文件结构:**

```
/convex
  /schema.ts          # 数据库 schema
  /_generated/        # 自动生成
  /users.ts           # 用户相关函数
  /itineraries.ts     # 行程相关函数
  /itineraryItems.ts  # 行程项目函数
  /pois.ts            # POI 函数
  /reminders.ts       # 提醒函数
  /auth.ts            # 认证函数
  /sms.ts             # 短信 action
  /crons.ts           # 定时任务
  /http.ts            # HTTP 端点
```

---

### Phase 2: 数据库 Schema

创建 `convex/schema.ts` 定义所有表结构和索引。

---

### Phase 3: 认证系统

使用 Convex 函数实现自定义手机 OTP 认证，结合腾讯云短信。

---

### Phase 4: 业务逻辑函数

实现所有 queries 和 mutations。

---

### Phase 5: 定时任务

配置 cron jobs 发送提醒和清理过期数据。

---

### Phase 6: 前端集成

更新 React Native 代码使用 Convex 客户端。

---

### Phase 7: 移除 Supabase

删除所有 Supabase 相关代码和配置。

---

## 执行顺序

1. [x] 分析现有代码库
2. [x] 研究 Convex 文档
3. [ ] 初始化 Convex 项目
4. [ ] 创建数据库 Schema
5. [ ] 实现认证函数
6. [ ] 实现业务逻辑函数
7. [ ] 配置定时任务
8. [ ] 更新前端代码
9. [ ] 迁移数据
10. [ ] 测试
11. [ ] 删除 Supabase 代码
12. [ ] 部署
