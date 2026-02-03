# Crawler Test Fixtures

This directory contains HTML fixtures for testing crawler parsing logic.

## Structure

```
__fixtures__/
├── xiaohongshu/     # 小红书 HTML samples
├── mafengwo/        # 马蜂窝 HTML samples
├── ctrip/           # 携程 HTML samples
└── README.md
```

## Usage

Fixtures are static HTML snapshots used to test content extraction without making real network requests.

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

const html = readFileSync(
  join(__dirname, '__fixtures__/xiaohongshu/note-sample.html'),
  'utf-8'
);
```

## Adding New Fixtures

1. Save the HTML source of a representative page
2. Remove any sensitive or personal information
3. Name the file descriptively (e.g., `note-with-images.html`)
