# ===========================================================================
# 探路 Pathfinding — Go Backend Makefile
# ===========================================================================

.PHONY: build run test clean dev lint fmt docker-build docker-run help

# 默认目标
.DEFAULT_GOAL := help

# 变量
BINARY    := server
CMD_DIR   := ./cmd/server
BUILD_DIR := .
GO        := go
GOFLAGS   := -ldflags="-s -w"

# ---------------------------------------------------------------------------
# 开发
# ---------------------------------------------------------------------------

## 编译二进制
build:
	$(GO) build $(GOFLAGS) -o $(BUILD_DIR)/$(BINARY) $(CMD_DIR)
	@echo "✓ 编译完成: $(BUILD_DIR)/$(BINARY)"

## 运行服务（直接 go run）
run:
	$(GO) run $(CMD_DIR)

## 开发模式（自动重载，需要 air: go install github.com/air-verse/air@latest）
dev:
	@command -v air > /dev/null 2>&1 || { echo "请先安装 air: go install github.com/air-verse/air@latest"; exit 1; }
	air

# ---------------------------------------------------------------------------
# 测试
# ---------------------------------------------------------------------------

## 运行全部测试
test:
	$(GO) test ./... -v -count=1

## 运行测试（带覆盖率）
test-cover:
	$(GO) test ./... -v -count=1 -coverprofile=coverage.out
	$(GO) tool cover -html=coverage.out -o coverage.html
	@echo "✓ 覆盖率报告: coverage.html"

## 运行测试（短模式，跳过集成测试）
test-short:
	$(GO) test ./... -v -short -count=1

# ---------------------------------------------------------------------------
# 代码质量
# ---------------------------------------------------------------------------

## 格式化代码
fmt:
	$(GO) fmt ./...

## 检查代码风格（需要 golangci-lint）
lint:
	@command -v golangci-lint > /dev/null 2>&1 || { echo "请先安装 golangci-lint"; exit 1; }
	golangci-lint run ./...

## 检查可疑代码
vet:
	$(GO) vet ./...

# ---------------------------------------------------------------------------
# Docker
# ---------------------------------------------------------------------------

## 构建 Docker 镜像
docker-build:
	docker build -t pathfinding-server .

## 运行 Docker 容器
docker-run:
	docker run --rm -p 3000:3000 --env-file .env pathfinding-server

# ---------------------------------------------------------------------------
# 清理
# ---------------------------------------------------------------------------

## 清理编译产物
clean:
	rm -f $(BUILD_DIR)/$(BINARY)
	rm -f coverage.out coverage.html
	$(GO) clean -cache
	@echo "✓ 已清理"

# ---------------------------------------------------------------------------
# 工具
# ---------------------------------------------------------------------------

## 更新依赖
deps:
	$(GO) mod tidy
	$(GO) mod download

## 检查服务健康状态
health:
	@curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || echo "服务未运行"

# ---------------------------------------------------------------------------
# 帮助
# ---------------------------------------------------------------------------

## 显示帮助信息
help:
	@echo ""
	@echo "  探路 Pathfinding — Go 后端"
	@echo "  ────────────────────────────────────"
	@echo ""
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/^## /  /' | \
		awk 'NR>0{if(prev){printf "  %-22s %s\n", prev, $$0; prev=""} else {prev=$$0}} END{if(prev) print "  "prev}'
	@echo ""
	@echo "  常用命令:"
	@echo "    make build        编译二进制"
	@echo "    make run          运行服务"
	@echo "    make test         运行测试"
	@echo "    make test-cover   测试+覆盖率"
	@echo "    make fmt          格式化代码"
	@echo "    make clean        清理产物"
	@echo "    make health       检查服务状态"
	@echo ""
