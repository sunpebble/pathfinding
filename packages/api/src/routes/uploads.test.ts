import type { Env } from '../env.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth } from '../test/helpers.js';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');
  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
  };
});

interface R2ObjectStub {
  body: ReadableStream<Uint8Array>;
  writeHttpMetadata: (headers: Headers) => void;
  httpMetadata?: { contentType?: string };
}

interface FakeR2Bucket {
  put: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function makeR2Stub(): FakeR2Bucket {
  return {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function makeFile(body: string | Uint8Array, opts: { type: string; name: string }): File {
  return new File([body], opts.name, { type: opts.type });
}

function makeR2Object(contentType?: string, contents = 'payload'): R2ObjectStub {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(contents));
      controller.close();
    },
  });
  return {
    body,
    httpMetadata: contentType ? { contentType } : undefined,
    writeHttpMetadata: vi.fn((headers: Headers) => {
      if (contentType)
        headers.set('Content-Type', contentType);
    }),
  };
}

describe('uploads routes', () => {
  let uploads: FakeR2Bucket;

  beforeEach(() => {
    uploads = makeR2Stub();
  });

  function uploadEnv(): Partial<Env> {
    return { UPLOADS: uploads as unknown as Env['UPLOADS'] };
  }

  describe('pOST /api/uploads', () => {
    it('puts the file under "<userId>/<filename>" and returns the url contract', async () => {
      const file = makeFile('hello', { type: 'image/png', name: 'photo' });
      const form = new FormData();
      form.append('file', file);

      const response = await requestWithAuth(
        createApp(),
        '/api/uploads',
        { method: 'POST', body: form },
        { userId: '42' },
        uploadEnv(),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.url).toMatch(/^\/api\/uploads\//);
      expect(body.filename).toContain('photo');
      expect(body.filename.endsWith('.png')).toBe(true);
      expect(body.size).toBe(5);
      expect(body.type).toBe('image/png');

      expect(uploads.put).toHaveBeenCalledTimes(1);
      const [key, _stream, options] = uploads.put.mock.calls[0]!;
      expect(key.startsWith('42/')).toBe(true);
      expect(key.endsWith('-photo.png')).toBe(true);
      expect(options).toEqual({ httpMetadata: { contentType: 'image/png' } });
    });

    it('rejects files larger than 10MB', async () => {
      const oversized = new Uint8Array(MAX_FILE_SIZE + 1);
      const file = makeFile(oversized, { type: 'image/png', name: 'big.png' });
      const form = new FormData();
      form.append('file', file);

      const response = await requestWithAuth(
        createApp(),
        '/api/uploads',
        { method: 'POST', body: form },
        { userId: '1' },
        uploadEnv(),
      );

      expect(response.status).toBe(400);
      expect(uploads.put).not.toHaveBeenCalled();
    });

    it('rejects unsupported content types', async () => {
      const file = makeFile('evil', { type: 'text/javascript', name: 'x.js' });
      const form = new FormData();
      form.append('file', file);

      const response = await requestWithAuth(
        createApp(),
        '/api/uploads',
        { method: 'POST', body: form },
        { userId: '1' },
        uploadEnv(),
      );

      expect(response.status).toBe(400);
      expect(uploads.put).not.toHaveBeenCalled();
    });

    it('sanitizes filenames to prevent path traversal in the key', async () => {
      const file = makeFile('hi', { type: 'image/png', name: '../etc/passwd' });
      const form = new FormData();
      form.append('file', file);

      await requestWithAuth(
        createApp(),
        '/api/uploads',
        { method: 'POST', body: form },
        { userId: '7' },
        uploadEnv(),
      );

      const [key] = uploads.put.mock.calls[0]!;
      expect(key.startsWith('7/')).toBe(true);
      expect(key).not.toContain('..');
      expect(key).not.toContain('/etc/');
    });

    it('rejects when no file is provided', async () => {
      const form = new FormData();
      const response = await requestWithAuth(
        createApp(),
        '/api/uploads',
        { method: 'POST', body: form },
        { userId: '1' },
        uploadEnv(),
      );

      expect(response.status).toBe(400);
      expect(uploads.put).not.toHaveBeenCalled();
    });

    it('requires authentication', async () => {
      const file = makeFile('hi', { type: 'image/png', name: 'a.png' });
      const form = new FormData();
      form.append('file', file);

      const { requestWithEnv } = await import('../test/helpers.js');
      const response = await requestWithEnv(createApp(), '/api/uploads', {
        method: 'POST',
        body: form,
      }, uploadEnv());

      expect(response.status).toBe(401);
      expect(uploads.put).not.toHaveBeenCalled();
    });
  });

  describe('gET /api/uploads/:filename', () => {
    it('streams the object from R2 when it exists', async () => {
      uploads.get.mockResolvedValueOnce(makeR2Object('image/png', 'pngdata'));

      const response = await requestWithAuth(
        createApp(),
        '/api/uploads/123-foo.png',
        { method: 'GET' },
        { userId: '42' },
        uploadEnv(),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/png');
      expect(await response.text()).toBe('pngdata');
      expect(uploads.get).toHaveBeenCalledWith('42/123-foo.png');
    });

    it('returns 404 when the object is missing', async () => {
      uploads.get.mockResolvedValueOnce(null);

      const response = await requestWithAuth(
        createApp(),
        '/api/uploads/missing.png',
        { method: 'GET' },
        { userId: '42' },
        uploadEnv(),
      );

      expect(response.status).toBe(404);
    });

    it('falls back to application/octet-stream when extension is unknown', async () => {
      uploads.get.mockResolvedValueOnce(makeR2Object(undefined, 'blob'));

      const response = await requestWithAuth(
        createApp(),
        '/api/uploads/123-foo.xyz',
        { method: 'GET' },
        { userId: '42' },
        uploadEnv(),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
    });
  });

  describe('dELETE /api/uploads/:filename', () => {
    it('deletes the object when it exists', async () => {
      uploads.get.mockResolvedValueOnce(makeR2Object('image/png'));

      const response = await requestWithAuth(
        createApp(),
        '/api/uploads/123-foo.png',
        { method: 'DELETE' },
        { userId: '42' },
        uploadEnv(),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(uploads.delete).toHaveBeenCalledWith('42/123-foo.png');
    });

    it('returns 404 when the object is missing', async () => {
      uploads.get.mockResolvedValueOnce(null);

      const response = await requestWithAuth(
        createApp(),
        '/api/uploads/missing.png',
        { method: 'DELETE' },
        { userId: '42' },
        uploadEnv(),
      );

      expect(response.status).toBe(404);
      expect(uploads.delete).not.toHaveBeenCalled();
    });
  });

  describe('isolation between users', () => {
    it('gET never crosses into another user namespace', async () => {
      uploads.get.mockResolvedValueOnce(makeR2Object('image/png', 'mine'));

      await requestWithAuth(
        createApp(),
        '/api/uploads/123-foo.png',
        { method: 'GET' },
        { userId: '42' },
        uploadEnv(),
      );

      // A malicious second user requesting the same filename should hit a
      // different key — the stub returns null by default after the first call.
      uploads.get.mockResolvedValueOnce(null);
      const response = await requestWithAuth(
        createApp(),
        '/api/uploads/123-foo.png',
        { method: 'GET' },
        { userId: '999' },
        uploadEnv(),
      );

      expect(response.status).toBe(404);
      expect(uploads.get).toHaveBeenNthCalledWith(1, '42/123-foo.png');
      expect(uploads.get).toHaveBeenNthCalledWith(2, '999/123-foo.png');
    });
  });
});
