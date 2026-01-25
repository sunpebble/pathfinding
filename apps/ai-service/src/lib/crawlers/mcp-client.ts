import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

let mcpClient: Client | null = null;
let mcpTransport: StdioClientTransport | null = null;
let connectionPromise: Promise<void> | null = null;
let currentSessionType: 'isolated' | 'persistent' = 'isolated';
let currentOptions: MCPConnectionOptions = {};

/**
 * Default user data directory for persistent Chrome sessions
 * Stores login cookies, local storage, etc.
 */
export const DEFAULT_USER_DATA_DIR = join(
  homedir(),
  '.pathfinding',
  'chrome-profile'
);

export interface PageSnapshot {
  content: string;
  url?: string;
}

export interface NetworkRequest {
  reqid: number;
  url: string;
  method: string;
  status?: number;
  resourceType?: string;
}

export interface NetworkRequestDetail {
  url: string;
  method: string;
  status: number;
  headers: Record<string, string>;
  body?: string;
  responseBody?: string;
}

export interface MCPConnectionOptions {
  /**
   * Use persistent Chrome profile with saved login sessions
   * If true, uses DEFAULT_USER_DATA_DIR
   * If string, uses that path as user data directory
   */
  persistent?: boolean | string;

  /**
   * Viewport size (default: 1920x1080)
   */
  viewport?: string;

  /**
   * Run in headless mode (default: false for persistent, true for isolated)
   */
  headless?: boolean;
}

/**
 * Ensure user data directory exists
 */
function ensureUserDataDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`[MCP] Created user data directory: ${dir}`);
  }
}

/**
 * Connect to Chrome DevTools MCP with specified options
 */
async function ensureConnected(
  options?: MCPConnectionOptions
): Promise<Client> {
  const effectiveOptions = options ?? currentOptions;
  const sessionType = effectiveOptions.persistent ? 'persistent' : 'isolated';

  // If already connected with the same session type, return existing client
  if (mcpClient && currentSessionType === sessionType) {
    return mcpClient;
  }

  // If connected with different session type, disconnect first
  if (mcpClient && currentSessionType !== sessionType) {
    console.log(
      `[MCP] Session type changed from ${currentSessionType} to ${sessionType}, reconnecting...`
    );
    await disconnect();
  }

  if (connectionPromise) {
    await connectionPromise;
    if (mcpClient) return mcpClient;
  }

  connectionPromise = (async () => {
    const args = ['-y', 'chrome-devtools-mcp@latest'];

    if (effectiveOptions.persistent) {
      const userDataDir =
        typeof effectiveOptions.persistent === 'string'
          ? effectiveOptions.persistent
          : DEFAULT_USER_DATA_DIR;

      ensureUserDataDir(userDataDir);
      args.push(`--userDataDir=${userDataDir}`);
      console.log(`[MCP] Using persistent Chrome profile: ${userDataDir}`);
    } else {
      args.push('--isolated');
    }

    const viewport = effectiveOptions.viewport || '1920x1080';
    args.push('--viewport', viewport);

    if (effectiveOptions.headless) {
      args.push('--headless');
    }

    console.log(`[MCP] Connecting to Chrome DevTools MCP (${sessionType})...`);
    console.log(`[MCP] Command: npx ${args.join(' ')}`);

    mcpTransport = new StdioClientTransport({
      command: 'npx',
      args,
    });

    mcpClient = new Client({
      name: 'pathfinding-crawler',
      version: '1.0.0',
    });

    await mcpClient.connect(mcpTransport);
    currentSessionType = sessionType;
    console.log('[MCP] Connected successfully');
  })();

  await connectionPromise;
  connectionPromise = null;

  if (!mcpClient) throw new Error('[MCP] Failed to connect');
  return mcpClient;
}

/**
 * Initialize MCP connection with specific options
 * Call this before using other MCP functions to configure session type
 */
export async function initMCP(
  options: MCPConnectionOptions = {}
): Promise<void> {
  currentOptions = options;
  await ensureConnected(options);
}

/**
 * Check if currently using persistent session
 */
export function isPersistentSession(): boolean {
  return currentSessionType === 'persistent';
}

export async function disconnect(): Promise<void> {
  if (mcpClient) {
    console.log('[MCP] Disconnecting...');
    await mcpClient.close();
    mcpClient = null;
    mcpTransport = null;
    console.log('[MCP] Disconnected');
  }
}

export async function navigateTo(
  url: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const client = await ensureConnected();
  console.log(`[MCP] Navigating to: ${url}`);
  const result = await client.callTool({
    name: 'new_page',
    arguments: {
      url,
      timeout: options.timeout || 30000,
    },
  });
  console.log(
    `[MCP] Navigation result:`,
    JSON.stringify(result).substring(0, 200)
  );
}

export async function takeSnapshot(
  options: { verbose?: boolean } = {}
): Promise<PageSnapshot> {
  const client = await ensureConnected();
  const result = await client.callTool({
    name: 'take_snapshot',
    arguments: {
      _: true,
      verbose: options.verbose || false,
    },
  });

  const content =
    typeof result.content === 'string'
      ? result.content
      : Array.isArray(result.content)
        ? result.content.map((c: { text?: string }) => c.text || '').join('\n')
        : '';

  return { content };
}

export async function waitForText(
  text: string,
  timeout: number = 10000
): Promise<void> {
  const client = await ensureConnected();
  await client.callTool({
    name: 'wait_for',
    arguments: { text, timeout },
  });
}

export async function listNetworkRequests(
  resourceTypes: string[] = ['xhr', 'fetch']
): Promise<NetworkRequest[]> {
  const client = await ensureConnected();
  const result = await client.callTool({
    name: 'list_network_requests',
    arguments: {
      _: true,
      resourceTypes,
    },
  });

  const content =
    typeof result.content === 'string'
      ? result.content
      : Array.isArray(result.content)
        ? result.content.map((c: { text?: string }) => c.text || '').join('\n')
        : '';

  const requests: NetworkRequest[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s+(\w+)\s+(\d+)?\s*(.+)$/);
    if (match) {
      requests.push({
        reqid: parseInt(match[1], 10),
        method: match[2],
        status: match[3] ? parseInt(match[3], 10) : undefined,
        url: match[4].trim(),
      });
    }
  }

  return requests;
}

export async function getNetworkRequest(
  reqid: number
): Promise<NetworkRequestDetail | null> {
  const client = await ensureConnected();
  const result = await client.callTool({
    name: 'get_network_request',
    arguments: { _: true, reqid },
  });

  const content =
    typeof result.content === 'string'
      ? result.content
      : Array.isArray(result.content)
        ? result.content.map((c: { text?: string }) => c.text || '').join('\n')
        : '';

  if (!content || content.includes('not found')) return null;

  try {
    const bodyMatch = content.match(/Response Body:\s*([\s\S]+)$/);
    const responseBody = bodyMatch ? bodyMatch[1].trim() : undefined;

    return {
      url: '',
      method: '',
      status: 200,
      headers: {},
      responseBody,
    };
  } catch {
    return null;
  }
}

export async function click(uid: string): Promise<void> {
  const client = await ensureConnected();
  await client.callTool({
    name: 'click',
    arguments: { uid },
  });
}

export async function scroll(direction: 'up' | 'down' = 'down'): Promise<void> {
  const client = await ensureConnected();
  await client.callTool({
    name: 'press_key',
    arguments: { key: direction === 'down' ? 'PageDown' : 'PageUp' },
  });
}

export async function pressKey(key: string): Promise<void> {
  const client = await ensureConnected();
  await client.callTool({
    name: 'press_key',
    arguments: { key },
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrollToLoadContent(
  scrollCount: number = 3
): Promise<void> {
  for (let i = 0; i < scrollCount; i++) {
    await scroll('down');
    await sleep(500);
  }
  await pressKey('Home');
  await sleep(300);
}

/**
 * Type text into the focused element
 */
export async function type(text: string): Promise<void> {
  const client = await ensureConnected();
  await client.callTool({
    name: 'type',
    arguments: { text },
  });
}

/**
 * Fill a specific element with text
 */
export async function fill(uid: string, text: string): Promise<void> {
  const client = await ensureConnected();
  await client.callTool({
    name: 'fill',
    arguments: { uid, text },
  });
}
