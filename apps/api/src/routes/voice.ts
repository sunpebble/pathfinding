import { Hono } from 'hono';

// Voice processing routes
const voiceRoutes = new Hono();

// Types for voice command processing
interface VoiceCommandRequest {
  text: string;
  language?: string;
  context?: {
    currentItineraryId?: string;
    currentDayNumber?: number;
  };
}

interface VoiceCommandResponse {
  success: boolean;
  command: ParsedCommand | null;
  suggestions?: string[];
  error?: string;
}

interface ParsedCommand {
  type: 'navigation' | 'itinerary' | 'poi' | 'search' | 'memo';
  action: string;
  parameters: Record<string, string | number | null>;
  confidence: number;
  description: string;
}

interface POISearchResult {
  id: string;
  name: string;
  type: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  description?: string;
}

// Command patterns for Chinese voice input
const commandPatterns = {
  navigation: {
    next: ['下一个', '下一站', '下一步', 'next'],
    previous: ['上一个', '上一站', '上一步', 'previous'],
    goToDay: ['第(\\d+)天', 'day (\\d+)'],
    goToPOI: ['第(\\d+)个景点', '景点(\\d+)'],
  },
  itinerary: {
    create: ['创建行程', '新建行程', 'create itinerary', '去(.+)玩'],
    setDuration: ['(\\d+)天行程', '玩(\\d+)天'],
    save: ['保存行程', 'save'],
  },
  poi: {
    add: ['添加(.+)', '加入(.+)', 'add (.+)', '去(.+)'],
    remove: ['删除(.+)', '移除(.+)', 'remove (.+)'],
    setTime: ['(.+)时间改为(.+)', 'set time for (.+) to (.+)'],
  },
  search: {
    search: ['搜索(.+)', '查找(.+)', '找(.+)', 'search (.+)'],
  },
  memo: {
    create: ['记录(.+)', '备忘(.+)', 'memo (.+)', 'note (.+)'],
  },
};

// Parse voice command
function parseVoiceCommand(text: string): ParsedCommand | null {
  const normalizedText = text.trim().toLowerCase();

  // Check navigation commands
  for (const pattern of commandPatterns.navigation.next) {
    if (normalizedText.includes(pattern)) {
      return {
        type: 'navigation',
        action: 'next',
        parameters: {},
        confidence: 0.95,
        description: '导航到下一个',
      };
    }
  }

  for (const pattern of commandPatterns.navigation.previous) {
    if (normalizedText.includes(pattern)) {
      return {
        type: 'navigation',
        action: 'previous',
        parameters: {},
        confidence: 0.95,
        description: '导航到上一个',
      };
    }
  }

  // Check day navigation
  for (const pattern of commandPatterns.navigation.goToDay) {
    const regex = new RegExp(pattern, 'i');
    const match = normalizedText.match(regex);
    if (match) {
      const dayNumber = parseInt(match[1], 10);
      return {
        type: 'navigation',
        action: 'goToDay',
        parameters: { dayNumber },
        confidence: 0.9,
        description: `跳转到第${dayNumber}天`,
      };
    }
  }

  // Check itinerary commands
  for (const pattern of commandPatterns.itinerary.create) {
    const regex = new RegExp(pattern, 'i');
    const match = normalizedText.match(regex);
    if (match) {
      return {
        type: 'itinerary',
        action: 'create',
        parameters: { destination: match[1] || null },
        confidence: 0.85,
        description: match[1] ? `创建${match[1]}行程` : '创建新行程',
      };
    }
  }

  for (const pattern of commandPatterns.itinerary.setDuration) {
    const regex = new RegExp(pattern, 'i');
    const match = normalizedText.match(regex);
    if (match) {
      const days = parseInt(match[1], 10);
      return {
        type: 'itinerary',
        action: 'setDuration',
        parameters: { days },
        confidence: 0.9,
        description: `设置行程为${days}天`,
      };
    }
  }

  for (const pattern of commandPatterns.itinerary.save) {
    if (normalizedText.includes(pattern)) {
      return {
        type: 'itinerary',
        action: 'save',
        parameters: {},
        confidence: 0.95,
        description: '保存行程',
      };
    }
  }

  // Check POI commands
  for (const pattern of commandPatterns.poi.add) {
    const regex = new RegExp(pattern, 'i');
    const match = normalizedText.match(regex);
    if (match) {
      const poiName = cleanPOIName(match[1]);
      if (poiName) {
        return {
          type: 'poi',
          action: 'add',
          parameters: { name: poiName },
          confidence: 0.85,
          description: `添加景点: ${poiName}`,
        };
      }
    }
  }

  for (const pattern of commandPatterns.poi.remove) {
    const regex = new RegExp(pattern, 'i');
    const match = normalizedText.match(regex);
    if (match) {
      const poiName = cleanPOIName(match[1]);
      if (poiName) {
        return {
          type: 'poi',
          action: 'remove',
          parameters: { name: poiName },
          confidence: 0.85,
          description: `删除景点: ${poiName}`,
        };
      }
    }
  }

  // Check search commands
  for (const pattern of commandPatterns.search.search) {
    const regex = new RegExp(pattern, 'i');
    const match = normalizedText.match(regex);
    if (match) {
      const query = match[1]?.trim();
      if (query) {
        return {
          type: 'search',
          action: 'search',
          parameters: { query },
          confidence: 0.9,
          description: `搜索: ${query}`,
        };
      }
    }
  }

  // Check memo commands
  for (const pattern of commandPatterns.memo.create) {
    const regex = new RegExp(pattern, 'i');
    const match = normalizedText.match(regex);
    if (match) {
      const content = match[1]?.trim();
      if (content) {
        return {
          type: 'memo',
          action: 'create',
          parameters: { content },
          confidence: 0.85,
          description: `备忘: ${content}`,
        };
      }
    }
  }

  return null;
}

// Clean POI name from common suffixes
function cleanPOIName(name: string): string {
  if (!name) return '';
  let cleaned = name.trim();
  const suffixes = ['吧', '啊', '呀', '吗', '呢', '了'];
  for (const suffix of suffixes) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.slice(0, -suffix.length);
    }
  }
  return cleaned;
}

// POST /voice/parse - Parse voice command
voiceRoutes.post('/parse', async (c) => {
  try {
    const body = await c.req.json<VoiceCommandRequest>();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return c.json<VoiceCommandResponse>(
        {
          success: false,
          command: null,
          error: '无效的输入文本',
        },
        400
      );
    }

    const command = parseVoiceCommand(text);

    if (command) {
      return c.json<VoiceCommandResponse>({
        success: true,
        command,
        suggestions: [],
      });
    }

    // If no command matched, suggest possible commands
    return c.json<VoiceCommandResponse>({
      success: true,
      command: null,
      suggestions: [
        '试试说"添加故宫"来添加景点',
        '说"下一个"切换到下一个景点',
        '说"搜索餐厅"来搜索附近餐厅',
      ],
    });
  } catch {
    return c.json<VoiceCommandResponse>(
      {
        success: false,
        command: null,
        error: '解析命令时出错',
      },
      500
    );
  }
});

// POST /voice/search - Voice-based POI search
voiceRoutes.post('/search', async (c) => {
  try {
    const body = await c.req.json<{ query: string; location?: { lat: number; lng: number } }>();
    const { query, location } = body;

    if (!query || typeof query !== 'string') {
      return c.json({ success: false, error: '无效的搜索词' }, 400);
    }

    // In production, this would call a geocoding/POI search service
    // For now, return mock results
    const mockResults: POISearchResult[] = [
      {
        id: `poi-${Date.now()}-1`,
        name: `${query} 景点1`,
        type: 'attraction',
        address: '北京市东城区',
        latitude: location?.lat ? location.lat + 0.01 : 39.9042,
        longitude: location?.lng ? location.lng + 0.01 : 116.4074,
        rating: 4.8,
        description: '热门旅游景点',
      },
      {
        id: `poi-${Date.now()}-2`,
        name: `${query} 餐厅`,
        type: 'restaurant',
        address: '北京市朝阳区',
        latitude: location?.lat ? location.lat + 0.02 : 39.9142,
        longitude: location?.lng ? location.lng + 0.02 : 116.4174,
        rating: 4.5,
        description: '特色美食餐厅',
      },
      {
        id: `poi-${Date.now()}-3`,
        name: `${query} 酒店`,
        type: 'hotel',
        address: '北京市海淀区',
        latitude: location?.lat ? location.lat + 0.03 : 39.9242,
        longitude: location?.lng ? location.lng + 0.03 : 116.4274,
        rating: 4.6,
        description: '舒适住宿体验',
      },
    ];

    return c.json({
      success: true,
      results: mockResults,
      query,
    });
  } catch {
    return c.json({ success: false, error: '搜索失败' }, 500);
  }
});

// POST /voice/itinerary/create - Create itinerary from voice input
voiceRoutes.post('/itinerary/create', async (c) => {
  try {
    const body = await c.req.json<{
      title?: string;
      destination?: string;
      duration?: number;
      pois?: Array<{ name: string; type?: string }>;
    }>();

    const { title, destination, duration = 1, pois = [] } = body;

    // Create itinerary structure
    const days = Array.from({ length: duration }, (_, i) => ({
      dayNumber: i + 1,
      theme: i === 0 ? '到达日' : `第${i + 1}天行程`,
      pois: [],
    }));

    // Distribute POIs across days if provided
    if (pois.length > 0) {
      const poisPerDay = Math.ceil(pois.length / duration);
      pois.forEach((poi, index) => {
        const dayIndex = Math.min(Math.floor(index / poisPerDay), duration - 1);
        days[dayIndex].pois.push({
          name: poi.name,
          type: poi.type || 'attraction',
          description: null,
          latitude: null,
          longitude: null,
          address: null,
        });
      });
    }

    const itinerary = {
      id: `voice-${Date.now()}`,
      title: title || (destination ? `${destination}之旅` : '语音创建的行程'),
      destination: destination || null,
      days,
      createdAt: new Date().toISOString(),
      source: 'voice',
    };

    return c.json({
      success: true,
      itinerary,
    });
  } catch {
    return c.json({ success: false, error: '创建行程失败' }, 500);
  }
});

// GET /voice/commands - Get available voice commands
voiceRoutes.get('/commands', (c) => {
  const commands = [
    {
      category: '导航',
      commands: [
        { pattern: '下一个', description: '切换到下一个景点或天数' },
        { pattern: '上一个', description: '切换到上一个景点或天数' },
        { pattern: '第N天', description: '跳转到指定天数' },
      ],
    },
    {
      category: '行程',
      commands: [
        { pattern: '创建行程', description: '创建新行程' },
        { pattern: '去[地点]玩', description: '创建指定目的地的行程' },
        { pattern: 'N天行程', description: '设置行程天数' },
        { pattern: '保存行程', description: '保存当前行程' },
      ],
    },
    {
      category: '景点',
      commands: [
        { pattern: '添加[景点名]', description: '添加景点到当前天' },
        { pattern: '删除[景点名]', description: '删除指定景点' },
        { pattern: '[景点]时间改为[时间]', description: '设置景点时间' },
      ],
    },
    {
      category: '搜索',
      commands: [
        { pattern: '搜索[关键词]', description: '搜索景点或餐厅' },
        { pattern: '找[内容]', description: '搜索相关内容' },
      ],
    },
    {
      category: '备忘',
      commands: [
        { pattern: '记录[内容]', description: '创建备忘录' },
        { pattern: '备忘[内容]', description: '创建备忘录' },
      ],
    },
  ];

  return c.json({
    success: true,
    commands,
    language: 'zh-CN',
  });
});

export { voiceRoutes };
