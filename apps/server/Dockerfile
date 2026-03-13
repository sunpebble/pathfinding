# ---- Build stage ----
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /build

# 先复制依赖文件，利用 Docker 缓存
COPY go.mod go.sum ./
RUN go mod download

# 复制源码并编译
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /build/server ./cmd/server/

# ---- Runtime stage ----
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

# 非 root 用户
RUN adduser -D -u 1000 appuser

WORKDIR /app
COPY --from=builder /build/server .

# 默认端口
EXPOSE 3000

USER appuser

ENTRYPOINT ["./server"]
