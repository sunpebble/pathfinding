import type { AuthVariables } from '../middleware/auth.js';
import { Buffer } from 'node:buffer';
import * as fs from 'node:fs';
import * as path from 'node:path';
/**
 * File upload routes — upload, serve, and delete user files.
 */
import { Hono } from 'hono';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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

function getUploadsDir(): string {
  return path.join(process.cwd(), 'uploads');
}

// ── POST / — Upload a file ─────────────────────────────
app.post('/', authRequired(), async (c) => {
  const userId = c.get('userId');
  const body = await c.req.parseBody();
  const file = body.file;

  if (!file || !(file instanceof File)) {
    return c.json({ error: '请上传文件' }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: '文件大小不能超过 10MB' }, 400);
  }

  const mimeType = file.type;
  if (!ALLOWED_TYPES[mimeType]) {
    return c.json(
      { error: '不支持的文件类型，仅支持 jpg、png、gif、webp、pdf' },
      400,
    );
  }

  const ext = ALLOWED_TYPES[mimeType];
  const timestamp = Date.now();
  // Strip any path separators and non-safe characters from the original name
  const safeName = path.basename(file.name).replace(/[^\w.-]/g, '_');
  const filename = `${timestamp}-${safeName}${ext}`;

  const userDir = path.join(getUploadsDir(), userId);
  try {
    fs.mkdirSync(userDir, { recursive: true });
  }
  catch {
    return c.json({ error: '无法创建上传目录' }, 500);
  }

  const filePath = path.join(userDir, filename);

  // Verify the resolved path is still within the user's upload directory
  // to prevent path traversal attacks
  const resolvedPath = path.resolve(filePath);
  const resolvedUserDir = path.resolve(userDir);
  if (!resolvedPath.startsWith(resolvedUserDir + path.sep) && resolvedPath !== resolvedUserDir) {
    return c.json({ error: '无效的文件名' }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    fs.writeFileSync(filePath, buffer);
  }
  catch {
    return c.json({ error: '文件保存失败' }, 500);
  }

  return c.json({
    url: `/api/uploads/${filename}`,
    filename,
    size: file.size,
    type: mimeType,
  });
});

// ── GET /:filename — Serve an uploaded file ────────────
app.get('/:filename', authRequired(), async (c) => {
  const userId = c.get('userId');
  const filename = c.req.param('filename');

  // Sanitize filename: use only the basename to prevent path traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(getUploadsDir(), userId, safeFilename);

  // Verify the resolved path is within the user's upload directory
  const resolvedPath = path.resolve(filePath);
  const resolvedUserDir = path.resolve(path.join(getUploadsDir(), userId));
  if (!resolvedPath.startsWith(resolvedUserDir + path.sep) && resolvedPath !== resolvedUserDir) {
    return c.json({ error: '无效的文件名' }, 400);
  }

  if (!fs.existsSync(filePath)) {
    return c.json({ error: '文件不存在' }, 404);
  }

  const ext = path.extname(safeFilename).toLowerCase();
  const contentType = EXTENSION_TO_CONTENT_TYPE[ext] ?? 'application/octet-stream';

  let fileBuffer: Buffer;
  try {
    fileBuffer = fs.readFileSync(filePath);
  }
  catch {
    return c.json({ error: '文件读取失败' }, 500);
  }
  return new Response(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(fileBuffer.length),
    },
  });
});

// ── DELETE /:filename — Delete an uploaded file ────────
app.delete('/:filename', authRequired(), async (c) => {
  const userId = c.get('userId');
  const filename = c.req.param('filename');

  // Sanitize filename: use only the basename to prevent path traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(getUploadsDir(), userId, safeFilename);

  // Verify the resolved path is within the user's upload directory
  const resolvedPath = path.resolve(filePath);
  const resolvedUserDir = path.resolve(path.join(getUploadsDir(), userId));
  if (!resolvedPath.startsWith(resolvedUserDir + path.sep) && resolvedPath !== resolvedUserDir) {
    return c.json({ error: '无效的文件名' }, 400);
  }

  if (!fs.existsSync(filePath)) {
    return c.json({ error: '文件不存在' }, 404);
  }

  try {
    fs.unlinkSync(filePath);
  }
  catch {
    return c.json({ error: '文件删除失败' }, 500);
  }

  return c.json({ success: true });
});

export default app;
