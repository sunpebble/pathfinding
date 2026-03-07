# Motia 后端服务

基于 Motia 事件驱动框架的后端服务。

## 启动

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm start
```

## 环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
cp .env.example .env
```

| 变量              | 必需       | 说明                                |
| ----------------- | ---------- | ----------------------------------- |
| `KERNEL_API_KEY`  | 马蜂窝爬虫 | Kernel.sh 云浏览器 API Key          |
| `OPENAI_API_KEY`  | 可选       | AI 功能增强                         |
| `DATABASE_URL`    | 必需       | TiDB 连接字符串                     |
| `API_BASE_URL`    | 推荐       | Pathfinding API 地址，默认本地 3000 |
| `OLLAMA_BASE_URL` | 可选       | Ollama 服务地址                     |

## 健康检查

`GET /health` 现在验证两项运行时依赖：

- TiDB 是否已配置（`DATABASE_URL`）
- Pathfinding API 是否可达（`API_BASE_URL`，默认 `http://localhost:3000`）

当 TiDB 配置缺失或 API 不可达时，健康检查返回 `503`。

## API 端点

### 通用爬虫

- `POST /api/crawler/fetch` - 通用 URL 爬取

### 马蜂窝爬虫

- `POST /api/crawler/mafengwo/list` - 爬取游记列表
- `POST /api/crawler/mafengwo/detail` - 爬取游记详情

#### 列表爬取示例

```bash
curl -X POST http://localhost:3000/api/crawler/mafengwo/list \
  -H "Content-Type: application/json" \
  -d '{"city": "成都", "scrollCount": 5}'
```

响应：

```json
{
  "success": true,
  "city": "成都",
  "urls": ["https://m.mafengwo.cn/i/xxx.html", ...],
  "count": 18
}
```

#### 详情爬取示例

```bash
curl -X POST http://localhost:3000/api/crawler/mafengwo/detail \
  -H "Content-Type: application/json" \
  -d '{"url": "https://m.mafengwo.cn/i/24648165.html"}'
```

响应：

```json
{
  "success": true,
  "data": {
    "title": "...",
    "content": "...",
    "author": "...",
    "views": "1.2万",
    "images": [...]
  }
}
```

## 事件

| 事件                                | 触发时机     |
| ----------------------------------- | ------------ |
| `crawler.mafengwo.list.completed`   | 列表爬取完成 |
| `crawler.mafengwo.detail.completed` | 详情爬取完成 |
| `crawler.mafengwo.saved`            | 数据存储完成 |

## 测试

```bash
./scripts/test-mafengwo.sh
```
