# AI Services Integration

本目录包含与 AI 服务集成的相关配置和工作流文件。

## 服务概述

### 1. Ollama + Gemma3 (内容提取和摘要)

Ollama 是本地运行的 LLM 服务，使用 Gemma3 模型进行：

- 旅行攻略内容智能提取
- POI (兴趣点) 识别
- 内容摘要生成
- 质量评分分析
- 多语言翻译

### 2. n8n (工作流自动化)

n8n 用于自动化爬取调度和通知：

- 定时爬取任务调度
- 爬取完成/失败通知
- 质量告警
- 图像生成请求转发

### 3. ComfyUI (AI 图像生成)

ComfyUI 用于为攻略生成配图：

- 旅行目的地 Hero 图片
- POI 缩略图
- 行程日插图

## 快速开始

### 1. 配置环境变量

复制 `.env.example` 到 `.env` 并填写配置：

```bash
cp .env.example .env
```

关键配置项：

```env
# Ollama
OLLAMA_MODEL=gemma3:12b

# n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password
N8N_ENCRYPTION_KEY=your-32-char-encryption-key

# ComfyUI (需要 NVIDIA GPU)
# 无需额外配置
```

### 2. 启动服务

```bash
# 启动所有服务
docker compose up -d

# 等待 Ollama 下载模型 (首次启动约需 10-20 分钟)
docker compose logs -f ollama-init

# 检查服务状态
curl http://localhost:3000/health
```

### 3. 导入 n8n 工作流

1. 访问 n8n 界面: http://localhost:5678
2. 使用配置的用户名密码登录
3. 导入 `n8n/workflows/` 目录下的工作流文件
4. 配置 Slack/Email 凭据 (可选)
5. 激活工作流

## API 端点

### AI 处理

```bash
# 检查 AI 服务状态
GET /api/ai/health

# 处理单个攻略
POST /api/ai/process/guide
{
  "guideId": "uuid",
  "options": {
    "extractContent": true,
    "generateSummary": true,
    "analyzeQuality": true,
    "generateImages": false
  }
}

# 批量处理攻略
POST /api/ai/process/batch
{
  "guideIds": ["uuid1", "uuid2"],
  "options": {...}
}

# 生成内容摘要
POST /api/ai/summarize
{
  "content": "...",
  "maxLength": 500
}

# 提取 POI
POST /api/ai/extract-pois
{
  "content": "..."
}

# 翻译内容
POST /api/ai/translate
{
  "content": "...",
  "targetLang": "zh"
}

# 生成图片
POST /api/ai/generate-image
{
  "prompt": "...",
  "destination": "Tokyo",
  "width": 1024,
  "height": 768
}
```

### n8n Webhook 端点

- `POST /webhook/crawl-notification` - 爬取通知
- `POST /webhook/schedule-crawl` - 调度爬取
- `POST /webhook/quality-alert` - 质量告警
- `POST /webhook/image-generation` - 图像生成请求

## 工作流说明

### crawl-notification.json

处理爬取完成/失败通知，发送到 Slack 频道。

### scheduled-crawl.json

每日定时触发爬取任务 (默认凌晨 2:00)。

### image-generation.json

接收图像生成请求，调用 ComfyUI 生成图片并更新数据库。

### quality-alert.json

处理质量告警，根据严重程度发送不同级别的通知。

## 资源需求

| 服务    | CPU  | 内存 | GPU      | 存储  |
| ------- | ---- | ---- | -------- | ----- |
| Ollama  | 4 核 | 16GB | 推荐     | 20GB+ |
| n8n     | 2 核 | 2GB  | -        | 1GB   |
| ComfyUI | 4 核 | 8GB  | **必需** | 50GB+ |

## 故障排除

### Ollama 模型下载失败

```bash
# 手动拉取模型
docker exec -it pathfinding-ollama-1 ollama pull gemma3:12b
```

### ComfyUI 无法启动

确保安装了 NVIDIA 驱动和 Docker GPU 支持：

```bash
nvidia-smi  # 检查 GPU
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

### n8n 工作流未触发

1. 检查工作流是否已激活
2. 验证 webhook URL 是否正确
3. 查看 n8n 执行日志

## 自定义

### 添加新的 ComfyUI 工作流

将 `.json` 工作流文件放入 `comfyui/workflows/` 目录。

### 修改 AI 提示词

编辑 `apps/motia/src/api/ai-chat.step.ts` 中的 prompt 模板。

### 配置通知渠道

在 n8n 中配置 Slack、Email、Discord 等凭据。
