# Contributing to Pathfinding

感谢你对 Pathfinding 项目的贡献！本文档提供了开发规范和指南。

## 开发环境设置

```bash
# 安装依赖
pnpm install

# 运行开发服务器
pnpm dev

# 运行测试
pnpm test
```

## 测试编写规范

### 测试文件组织

- 测试文件放置在被测模块同级的 `__tests__/` 目录下
- 测试文件命名：`<module-name>.test.ts`
- Fixtures 放置在 `__fixtures__/` 目录下

```
src/
  lib/
    crawlers/
      __tests__/
        xiaohongshu.test.ts
        mafengwo.test.ts
      __fixtures__/
        sample-page.html
      xiaohongshu.ts
      mafengwo.ts
```

### 测试框架

项目使用 [Vitest](https://vitest.dev/) 作为测试框架。

```typescript
import { describe, expect, it, vi } from 'vitest';

describe('ModuleName', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Mock 最佳实践

#### 模块 Mock

```typescript
// 使用 vi.hoisted 确保 mock 在模块加载前初始化
const { MockClass } = vi.hoisted(() => {
  const MockClass = vi.fn();
  return { MockClass };
});

vi.mock('module-path', () => ({
  ClassName: MockClass,
}));
```

#### 环境变量隔离

```typescript
describe('Module with env vars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should use default when env not set', async () => {
    delete process.env.SOME_VAR;
    vi.resetModules();
    const { someFunction } = await import('../module.js');
    // ...
  });
});
```

### 覆盖率要求

- **最低覆盖率门槛：60%**
- 新功能必须包含对应的单元测试
- PR 不应降低整体覆盖率

运行覆盖率检查：

```bash
pnpm test --coverage
```

### 测试类型

#### 单元测试

测试独立函数和模块：

```typescript
it('should parse URL correctly', () => {
  const result = parseUrl('https://example.com/path');
  expect(result.host).toBe('example.com');
});
```

#### 集成测试

测试模块间交互，使用 mock 隔离外部依赖：

```typescript
it('should clean content with LLM', async () => {
  mockLLM.invoke.mockResolvedValue({ content: '...' });

  const result = await cleanContentWithLLM(rawData);

  expect(result.content).toBeDefined();
  expect(mockLLM.invoke).toHaveBeenCalled();
});
```

### 常见模式

#### 错误处理测试

```typescript
it('should throw error when API key missing', () => {
  delete process.env.API_KEY;
  expect(() => createClient()).toThrow('API_KEY is not set');
});

it('should handle errors gracefully', async () => {
  mockFetch.mockRejectedValue(new Error('Network error'));

  const result = await fetchData();

  expect(result).toBeNull();
});
```

#### 异步测试

```typescript
it('should fetch data successfully', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => data });

  const result = await fetchData();

  expect(result).toEqual(data);
});
```

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
feat: add user authentication
fix: resolve memory leak in crawler
test: add unit tests for LLM module
docs: update API documentation
```

## 代码审查

- 所有 PR 需要至少一个审批
- CI 检查必须通过（包括测试和覆盖率）
- 保持代码风格一致（使用 ESLint + Prettier）

## 问题反馈

如有问题，请通过 GitHub Issues 提交。
