/**
 * ComfyUI Service
 * AI image generation for travel guide illustrations
 */

import { Buffer } from 'node:buffer';

export interface ComfyUIConfig {
  baseUrl: string;
  timeout?: number;
  clientId?: string;
}

export interface ComfyUIWorkflow {
  prompt: Record<string, ComfyUINode>;
  client_id?: string;
}

export interface ComfyUINode {
  class_type: string;
  inputs: Record<string, unknown>;
}

export interface QueueResponse {
  prompt_id: string;
  number: number;
}

export interface HistoryItem {
  prompt: [
    number,
    string,
    Record<string, ComfyUINode>,
    Record<string, unknown>,
  ];
  outputs: Record<
    string,
    {
      images?: Array<{
        filename: string;
        subfolder: string;
        type: string;
      }>;
    }
  >;
  status: {
    status_str: string;
    completed: boolean;
    messages: Array<[string, Record<string, unknown>]>;
  };
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  sampler?: string;
  scheduler?: string;
  checkpoint?: string;
}

export interface GeneratedImage {
  filename: string;
  subfolder: string;
  url: string;
}

const DEFAULT_CONFIG: ComfyUIConfig = {
  baseUrl: process.env.COMFYUI_BASE_URL || 'http://comfyui:8188',
  timeout: 300000, // 5 minutes for image generation
  clientId: `pathfinding-${Date.now()}`,
};

// Default travel photography workflow template
const TRAVEL_PHOTO_WORKFLOW: Record<string, ComfyUINode> = {
  '3': {
    class_type: 'KSampler',
    inputs: {
      seed: 0,
      steps: 25,
      cfg: 7,
      sampler_name: 'euler_ancestral',
      scheduler: 'normal',
      denoise: 1,
      model: ['4', 0],
      positive: ['6', 0],
      negative: ['7', 0],
      latent_image: ['5', 0],
    },
  },
  '4': {
    class_type: 'CheckpointLoaderSimple',
    inputs: {
      ckpt_name: 'juggernautXL_v9.safetensors', // Popular realistic model
    },
  },
  '5': {
    class_type: 'EmptyLatentImage',
    inputs: {
      width: 1024,
      height: 768,
      batch_size: 1,
    },
  },
  '6': {
    class_type: 'CLIPTextEncode',
    inputs: {
      text: '',
      clip: ['4', 1],
    },
  },
  '7': {
    class_type: 'CLIPTextEncode',
    inputs: {
      text: 'blurry, low quality, distorted, deformed, ugly, bad composition, watermark, text, logo',
      clip: ['4', 1],
    },
  },
  '8': {
    class_type: 'VAEDecode',
    inputs: {
      samples: ['3', 0],
      vae: ['4', 2],
    },
  },
  '9': {
    class_type: 'SaveImage',
    inputs: {
      filename_prefix: 'travel_guide',
      images: ['8', 0],
    },
  },
};

/**
 * ComfyUIService - AI image generation for travel content
 */
export class ComfyUIService {
  private config: ComfyUIConfig;

  constructor(config: Partial<ComfyUIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if ComfyUI service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/system_stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get system stats from ComfyUI
   */
  async getSystemStats(): Promise<{
    devices: Array<{
      name: string;
      type: string;
      vram_total: number;
      vram_free: number;
    }>;
  } | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/system_stats`);
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  /**
   * Get available checkpoints/models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/object_info/CheckpointLoaderSimple`
      );
      if (!response.ok) return [];

      const data = (await response.json()) as {
        CheckpointLoaderSimple?: {
          input?: {
            required?: {
              ckpt_name?: [string[]];
            };
          };
        };
      };
      return data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
    } catch {
      return [];
    }
  }

  /**
   * Queue a prompt for execution
   */
  async queuePrompt(workflow: ComfyUIWorkflow): Promise<QueueResponse> {
    const response = await fetch(`${this.config.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflow.prompt,
        client_id: workflow.client_id || this.config.clientId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to queue prompt: ${error}`);
    }

    return response.json() as Promise<QueueResponse>;
  }

  /**
   * Get execution history
   */
  async getHistory(promptId?: string): Promise<Record<string, HistoryItem>> {
    const url = promptId
      ? `${this.config.baseUrl}/history/${promptId}`
      : `${this.config.baseUrl}/history`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get history: ${response.statusText}`);
    }

    return response.json() as Promise<Record<string, HistoryItem>>;
  }

  /**
   * Download generated image
   */
  async downloadImage(
    filename: string,
    subfolder: string = '',
    type: string = 'output'
  ): Promise<Buffer> {
    const params = new URLSearchParams({
      filename,
      subfolder,
      type,
    });

    const response = await fetch(`${this.config.baseUrl}/view?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Wait for prompt execution to complete
   */
  async waitForCompletion(
    promptId: string,
    timeoutMs: number = 300000,
    pollIntervalMs: number = 2000
  ): Promise<HistoryItem | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const history = await this.getHistory(promptId);
      const item = history[promptId];

      if (item && item.status.completed) {
        return item;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return null;
  }

  /**
   * Generate a travel destination image
   */
  async generateTravelImage(
    request: ImageGenerationRequest
  ): Promise<GeneratedImage[]> {
    // Build workflow from template
    const workflow = this.buildTravelWorkflow(request);

    // Queue the prompt
    const { prompt_id } = await this.queuePrompt({ prompt: workflow });
    console.warn(`[ComfyUI] Queued image generation: ${prompt_id}`);

    // Wait for completion
    const result = await this.waitForCompletion(prompt_id, this.config.timeout);
    if (!result) {
      throw new Error('Image generation timed out');
    }

    // Extract generated images
    const images: GeneratedImage[] = [];
    for (const [, output] of Object.entries(result.outputs)) {
      if (output.images) {
        for (const img of output.images) {
          images.push({
            filename: img.filename,
            subfolder: img.subfolder,
            url: `${this.config.baseUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${img.type}`,
          });
        }
      }
    }

    return images;
  }

  /**
   * Build travel photography workflow
   */
  private buildTravelWorkflow(
    request: ImageGenerationRequest
  ): Record<string, ComfyUINode> {
    const workflow = JSON.parse(
      JSON.stringify(TRAVEL_PHOTO_WORKFLOW)
    ) as Record<string, ComfyUINode>;

    // Set positive prompt with travel photography enhancements
    const enhancedPrompt = this.enhancePromptForTravel(request.prompt);
    (workflow['6'].inputs as Record<string, unknown>).text = enhancedPrompt;

    // Set negative prompt
    if (request.negativePrompt) {
      (workflow['7'].inputs as Record<string, unknown>).text =
        request.negativePrompt;
    }

    // Set dimensions
    if (request.width) {
      (workflow['5'].inputs as Record<string, unknown>).width = request.width;
    }
    if (request.height) {
      (workflow['5'].inputs as Record<string, unknown>).height = request.height;
    }

    // Set sampler settings
    const samplerInputs = workflow['3'].inputs as Record<string, unknown>;
    if (request.steps) {
      samplerInputs.steps = request.steps;
    }
    if (request.cfg) {
      samplerInputs.cfg = request.cfg;
    }
    if (request.seed !== undefined) {
      samplerInputs.seed = request.seed;
    } else {
      samplerInputs.seed = Math.floor(Math.random() * 2147483647);
    }
    if (request.sampler) {
      samplerInputs.sampler_name = request.sampler;
    }
    if (request.scheduler) {
      samplerInputs.scheduler = request.scheduler;
    }

    // Set checkpoint if specified
    if (request.checkpoint) {
      (workflow['4'].inputs as Record<string, unknown>).ckpt_name =
        request.checkpoint;
    }

    return workflow;
  }

  /**
   * Enhance prompt for travel photography style
   */
  private enhancePromptForTravel(prompt: string): string {
    const styleEnhancements = [
      'professional travel photography',
      'golden hour lighting',
      'vibrant colors',
      'high detail',
      'sharp focus',
      '8k resolution',
      'beautiful composition',
      'atmospheric perspective',
    ];

    return `${prompt}, ${styleEnhancements.join(', ')}`;
  }

  /**
   * Generate hero image for travel guide
   */
  async generateGuideHeroImage(
    destination: string,
    description?: string
  ): Promise<GeneratedImage[]> {
    const prompt = description
      ? `${destination}, ${description}, scenic landscape photography, travel destination`
      : `${destination}, iconic landmark, scenic view, travel destination photography`;

    return this.generateTravelImage({
      prompt,
      width: 1920,
      height: 1080,
      steps: 30,
      cfg: 7.5,
    });
  }

  /**
   * Generate thumbnail for POI
   */
  async generatePOIThumbnail(
    poiName: string,
    poiType: string,
    location?: string
  ): Promise<GeneratedImage[]> {
    const typePrompts: Record<string, string> = {
      restaurant: 'restaurant interior, food photography, cozy atmosphere',
      attraction: 'tourist attraction, iconic view, travel photography',
      hotel: 'luxury hotel exterior, hospitality, architectural photography',
      cafe: 'cozy cafe interior, coffee shop, lifestyle photography',
      museum: 'museum interior, art gallery, architectural photography',
      park: 'beautiful park, nature photography, scenic landscape',
      beach: 'tropical beach, ocean view, vacation photography',
      temple: 'ancient temple, religious architecture, cultural photography',
    };

    const typeHint = typePrompts[poiType] || 'travel destination photography';
    const prompt = location
      ? `${poiName} in ${location}, ${typeHint}`
      : `${poiName}, ${typeHint}`;

    return this.generateTravelImage({
      prompt,
      width: 512,
      height: 512,
      steps: 20,
      cfg: 7,
    });
  }

  /**
   * Generate itinerary day illustration
   */
  async generateDayIllustration(
    dayDescription: string,
    theme?: string
  ): Promise<GeneratedImage[]> {
    const themeStyles: Record<string, string> = {
      adventure: 'adventure travel, exciting activities, dynamic composition',
      relaxation: 'peaceful scenery, relaxing atmosphere, serene view',
      cultural: 'cultural experience, local traditions, authentic atmosphere',
      foodie: 'culinary journey, local cuisine, food market photography',
      nature: 'natural landscape, outdoor adventure, scenic wilderness',
      urban: 'city exploration, urban architecture, street photography',
    };

    const style = theme ? themeStyles[theme] || theme : 'travel experience';
    const prompt = `${dayDescription}, ${style}, travel itinerary illustration`;

    return this.generateTravelImage({
      prompt,
      width: 1024,
      height: 576, // 16:9 ratio
      steps: 25,
      cfg: 7,
    });
  }

  /**
   * Cancel a running prompt
   */
  async cancelPrompt(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/interrupt`, {
        method: 'POST',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Clear the queue
   */
  async clearQueue(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let comfyUIServiceInstance: ComfyUIService | null = null;

export function getComfyUIService(): ComfyUIService {
  if (!comfyUIServiceInstance) {
    comfyUIServiceInstance = new ComfyUIService();
  }
  return comfyUIServiceInstance;
}

export default ComfyUIService;
