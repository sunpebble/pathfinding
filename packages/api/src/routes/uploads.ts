// packages/api/src/routes/uploads.ts
import type { AppContext } from '../env.js';
import { Hono } from 'hono';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<AppContext>();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};
const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

// 仅取 basename，防穿越（R2 key 扁平，但仍清洗）
function safeBase(name: string): string {
  return name.split('/').pop()!.replace(/[^\w.-]/g, '_');
}

app.post('/', authRequired(), async (c) => {
  const userId = c.get('userId');
  const body = await c.req.parseBody();
  const file = body.file;
  if (!file || !(file instanceof File))
    return c.json({ error: '请上传文件' }, 400);
  if (file.size > MAX_FILE_SIZE)
    return c.json({ error: '文件大小不能超过 10MB' }, 400);
  const mimeType = file.type;
  if (!ALLOWED_TYPES[mimeType]) {
    return c.json({ error: '不支持的文件类型，仅支持 jpg、png、gif、webp、pdf' }, 400);
  }
  const ext = ALLOWED_TYPES[mimeType];
  const filename = `${Date.now()}-${safeBase(file.name)}${ext}`;
  const key = `${userId}/${filename}`;
  await c.env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: mimeType },
  });
  return c.json({ url: `/api/uploads/${filename}`, filename, size: file.size, type: mimeType });
});

app.get('/:filename', authRequired(), async (c) => {
  const userId = c.get('userId');
  const filename = safeBase(c.req.param('filename'));
  const key = `${userId}/${filename}`;
  const obj = await c.env.UPLOADS.get(key);
  if (!obj)
    return c.json({ error: '文件不存在' }, 404);
  const ext = `.${filename.split('.').pop()!.toLowerCase()}`;
  const contentType = EXTENSION_TO_CONTENT_TYPE[ext] ?? 'application/octet-stream';
  const headers = new Headers({ 'Content-Type': contentType });
  obj.writeHttpMetadata(headers);
  return new Response(obj.body, { headers });
});

app.delete('/:filename', authRequired(), async (c) => {
  const userId = c.get('userId');
  const filename = safeBase(c.req.param('filename'));
  const key = `${userId}/${filename}`;
  const obj = await c.env.UPLOADS.get(key);
  if (!obj)
    return c.json({ error: '文件不存在' }, 404);
  await c.env.UPLOADS.delete(key);
  return c.json({ success: true });
});

export default app;
