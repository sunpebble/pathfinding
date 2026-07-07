import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithEnv } from '../test/helpers.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('crawler fetch route', () => {
  it('rejects invalid JSON', async () => {
    const response = await requestWithEnv(createApp(), '/api/crawler/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Invalid JSON body',
    });
  });

  it('rejects invalid URLs', async () => {
    const response = await requestWithEnv(createApp(), '/api/crawler/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Valid URL required',
    });
  });

  it('fetches, cleans, and classifies HTML content', async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(`
        <html>
          <head><TITLE>  北京攻略  </TITLE><style>.x{color:red}</style></head>
          <body><h1>标题</h1><script>alert('x')</script><p>第一段。</p></body>
        </html>
      `, {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/html' },
      });
    vi.stubGlobal('fetch', vi.fn(fetchMock));

    const response = await requestWithEnv(createApp(), '/api/crawler/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.mafengwo.cn/i/24648165.html' }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      new URL('https://www.mafengwo.cn/i/24648165.html'),
      expect.objectContaining({
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TravelBot/1.0)' },
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      platform: 'mafengwo',
      data: {
        url: 'https://www.mafengwo.cn/i/24648165.html',
        title: '北京攻略',
        content: '北京攻略 标题 第一段。',
        contentTruncated: false,
      },
    });
  });

  it('keeps legacy success false envelope for upstream HTTP failures', async () => {
    const fetchMock: typeof fetch = async () => new Response('blocked', { status: 403, statusText: 'Forbidden' });
    vi.stubGlobal('fetch', vi.fn(fetchMock));

    const response = await requestWithEnv(createApp(), '/api/crawler/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.xiaohongshu.com/explore/12345' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      platform: 'unknown',
      error: 'HTTP 403 Forbidden',
    });
  });
});
