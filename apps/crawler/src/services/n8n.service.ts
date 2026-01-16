/**
 * n8n Workflow Service
 * Integration with n8n for workflow automation, scheduling, and notifications
 */

export interface N8nConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  status: 'success' | 'error' | 'waiting' | 'running';
  data?: Record<string, unknown>;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface CrawlNotification {
  type: 'crawl_started' | 'crawl_completed' | 'crawl_failed' | 'quality_alert';
  jobId: string;
  jobName: string;
  platform: string;
  status: string;
  message: string;
  statistics?: {
    recordsExtracted?: number;
    requestsTotal?: number;
    requestsSuccess?: number;
    requestsFailed?: number;
    durationSeconds?: number;
  };
  error?: string;
  timestamp: string;
}

export interface ScheduleConfig {
  cron: string;
  timezone?: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: N8nConfig = {
  baseUrl: process.env.N8N_BASE_URL || 'http://n8n:5678',
  apiKey: process.env.N8N_API_KEY,
  timeout: 30000,
};

// Webhook path constants - configure these in n8n
const WEBHOOK_PATHS = {
  CRAWL_NOTIFICATION: '/webhook/crawl-notification',
  SCHEDULE_CRAWL: '/webhook/schedule-crawl',
  QUALITY_ALERT: '/webhook/quality-alert',
  IMAGE_GENERATION: '/webhook/image-generation',
} as const;

/**
 * N8nService - Workflow automation and notification integration
 */
export class N8nService {
  private config: N8nConfig;

  constructor(config: Partial<N8nConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if n8n service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/healthz`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey) {
      headers['X-N8N-API-KEY'] = this.config.apiKey;
    }
    return headers;
  }

  /**
   * Trigger a webhook in n8n
   */
  async triggerWebhook(
    path: string,
    payload: WebhookPayload
  ): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Webhook error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send crawl notification to n8n
   */
  async sendCrawlNotification(
    notification: CrawlNotification
  ): Promise<boolean> {
    const result = await this.triggerWebhook(WEBHOOK_PATHS.CRAWL_NOTIFICATION, {
      event: notification.type,
      timestamp: notification.timestamp,
      data: notification as unknown as Record<string, unknown>,
    });
    return result.success;
  }

  /**
   * Notify crawl job started
   */
  async notifyCrawlStarted(job: {
    id: string;
    name: string;
    platform: string;
  }): Promise<boolean> {
    return this.sendCrawlNotification({
      type: 'crawl_started',
      jobId: job.id,
      jobName: job.name,
      platform: job.platform,
      status: 'running',
      message: `Crawl job "${job.name}" has started`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify crawl job completed
   */
  async notifyCrawlCompleted(job: {
    id: string;
    name: string;
    platform: string;
    statistics: CrawlNotification['statistics'];
  }): Promise<boolean> {
    return this.sendCrawlNotification({
      type: 'crawl_completed',
      jobId: job.id,
      jobName: job.name,
      platform: job.platform,
      status: 'completed',
      message: `Crawl job "${job.name}" completed successfully. Extracted ${job.statistics?.recordsExtracted || 0} records.`,
      statistics: job.statistics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify crawl job failed
   */
  async notifyCrawlFailed(job: {
    id: string;
    name: string;
    platform: string;
    error: string;
    statistics?: CrawlNotification['statistics'];
  }): Promise<boolean> {
    return this.sendCrawlNotification({
      type: 'crawl_failed',
      jobId: job.id,
      jobName: job.name,
      platform: job.platform,
      status: 'failed',
      message: `Crawl job "${job.name}" failed: ${job.error}`,
      error: job.error,
      statistics: job.statistics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send quality alert
   */
  async sendQualityAlert(alert: {
    jobId: string;
    jobName: string;
    platform: string;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details?: Record<string, unknown>;
  }): Promise<boolean> {
    const result = await this.triggerWebhook(WEBHOOK_PATHS.QUALITY_ALERT, {
      event: 'quality_alert',
      timestamp: new Date().toISOString(),
      data: {
        type: 'quality_alert',
        jobId: alert.jobId,
        jobName: alert.jobName,
        platform: alert.platform,
        status: alert.severity,
        message: `Quality alert for "${alert.jobName}": ${alert.issue}`,
        issue: alert.issue,
        severity: alert.severity,
        details: alert.details,
      },
    });
    return result.success;
  }

  /**
   * Request image generation through n8n workflow
   */
  async requestImageGeneration(request: {
    guideId: string;
    prompt: string;
    destination: string;
    style?: string;
    dimensions?: { width: number; height: number };
  }): Promise<{ success: boolean; executionId?: string; error?: string }> {
    const result = await this.triggerWebhook(WEBHOOK_PATHS.IMAGE_GENERATION, {
      event: 'image_generation_request',
      timestamp: new Date().toISOString(),
      data: {
        guideId: request.guideId,
        prompt: request.prompt,
        destination: request.destination,
        style: request.style || 'photorealistic',
        dimensions: request.dimensions || { width: 1024, height: 768 },
      },
    });

    return {
      success: result.success,
      executionId: (result.data as { executionId?: string })?.executionId,
      error: result.error,
    };
  }

  /**
   * Schedule a crawl job through n8n
   */
  async scheduleCrawl(schedule: {
    jobId: string;
    name: string;
    platform: string;
    config: Record<string, unknown>;
    cron: string;
    timezone?: string;
  }): Promise<{ success: boolean; workflowId?: string; error?: string }> {
    const result = await this.triggerWebhook(WEBHOOK_PATHS.SCHEDULE_CRAWL, {
      event: 'schedule_crawl',
      timestamp: new Date().toISOString(),
      data: {
        jobId: schedule.jobId,
        name: schedule.name,
        platform: schedule.platform,
        config: schedule.config,
        schedule: {
          cron: schedule.cron,
          timezone: schedule.timezone || 'Asia/Shanghai',
        },
      },
    });

    return {
      success: result.success,
      workflowId: (result.data as { workflowId?: string })?.workflowId,
      error: result.error,
    };
  }

  /**
   * List all workflows (requires API key)
   */
  async listWorkflows(): Promise<N8nWorkflow[]> {
    if (!this.config.apiKey) {
      console.warn('n8n API key not configured, cannot list workflows');
      return [];
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/workflows`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        throw new Error(`Failed to list workflows: ${response.status}`);
      }

      const data = (await response.json()) as { data: N8nWorkflow[] };
      return data.data || [];
    } catch (error) {
      console.error('Failed to list n8n workflows:', error);
      return [];
    }
  }

  /**
   * Get execution status (requires API key)
   */
  async getExecution(executionId: string): Promise<N8nExecution | null> {
    if (!this.config.apiKey) {
      console.warn('n8n API key not configured, cannot get execution');
      return null;
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/api/v1/executions/${executionId}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(this.config.timeout!),
        }
      );

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as N8nExecution;
    } catch {
      return null;
    }
  }

  /**
   * Activate a workflow (requires API key)
   */
  async activateWorkflow(workflowId: string): Promise<boolean> {
    if (!this.config.apiKey) {
      console.warn('n8n API key not configured');
      return false;
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/api/v1/workflows/${workflowId}/activate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(this.config.timeout!),
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Deactivate a workflow (requires API key)
   */
  async deactivateWorkflow(workflowId: string): Promise<boolean> {
    if (!this.config.apiKey) {
      console.warn('n8n API key not configured');
      return false;
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/api/v1/workflows/${workflowId}/deactivate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(this.config.timeout!),
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let n8nServiceInstance: N8nService | null = null;

export function getN8nService(): N8nService {
  if (!n8nServiceInstance) {
    n8nServiceInstance = new N8nService();
  }
  return n8nServiceInstance;
}

export default N8nService;
