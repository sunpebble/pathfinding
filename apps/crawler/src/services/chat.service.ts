/**
 * Chat Service - AI Travel Assistant
 * Provides context-aware chat functionality using Ollama
 */

import { chatLogger } from '../lib/logger.js';
import { parseJsonSafely } from '../lib/retry.js';
import { getOllamaService } from './ollama.service.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  // User's current itinerary
  itinerary?: {
    title: string;
    cityName?: string;
    startDate: string;
    endDate: string;
    days?: Array<{
      dayNumber: number;
      date: string;
      items: Array<{
        poiName?: string;
        poiCategory?: string;
        startTime?: string;
        endTime?: string;
        notes?: string;
      }>;
    }>;
  };
  // Linked travel guide
  guide?: {
    title?: string;
    destinations?: string[];
    aiSummary?: string;
    aiTips?: string[];
    aiBestTime?: string;
    aiDuration?: string;
    aiBudget?: string;
    aiDays?: Array<{
      dayNumber: number;
      theme?: string;
      pois: Array<{
        name: string;
        type: string;
        description?: string;
      }>;
    }>;
  };
  // Additional context from session
  sessionContext?: string;
  // User preferences
  preferences?: {
    language?: string;
    travelStyle?: string;
    budget?: string;
  };
}

export interface ChatResponse {
  content: string;
  metadata?: {
    pois?: Array<{
      name: string;
      type: string;
      description?: string;
      latitude?: number;
      longitude?: number;
      address?: string;
      rating?: number;
      priceInfo?: string;
    }>;
    itineraryChanges?: Array<{
      action: string;
      dayNumber?: number;
      poiName?: string;
      details?: string;
    }>;
    quickActions?: Array<{
      label: string;
      action: string;
      payload?: string;
    }>;
    sources?: string[];
  };
}

const SYSTEM_PROMPT = `你是探路(Pathfinding)旅行应用的AI旅行助手。你的职责是：

1. 回答用户关于旅行的问题
2. 推荐景点、餐厅、酒店等
3. 帮助用户规划和修改行程
4. 提供实用的旅行建议

请遵循以下原则：
- 使用友好、专业的语气
- 提供具体、可操作的建议
- 如果有用户的行程信息，结合行程给出个性化建议
- 推荐具体的景点时，尽量提供名称、类型、简短描述
- 回复要简洁明了，不要过于冗长
- 使用中文回复，除非用户使用其他语言

当你推荐景点或给出行程建议时，请在回复最后附上JSON格式的结构化数据：
\`\`\`json
{
  "pois": [{"name": "景点名", "type": "attraction/restaurant/hotel", "description": "简短描述"}],
  "quickActions": [{"label": "按钮文字", "action": "动作类型", "payload": "参数"}]
}
\`\`\``;

/**
 * ChatService - AI-powered travel assistant
 */
export class ChatService {
  private ollamaService = getOllamaService();

  /**
   * Build context string from chat context
   */
  private buildContextString(context?: ChatContext): string {
    if (!context) return '';

    const parts: string[] = [];

    // Add itinerary context
    if (context.itinerary) {
      const it = context.itinerary;
      parts.push(`用户当前行程：${it.title}`);
      if (it.cityName) {
        parts.push(`目的地：${it.cityName}`);
      }
      parts.push(`日期：${it.startDate} 至 ${it.endDate}`);

      if (it.days && it.days.length > 0) {
        parts.push('行程安排：');
        for (const day of it.days) {
          const items = day.items
            .map((i) => i.poiName || '未命名景点')
            .join(' -> ');
          parts.push(`  第${day.dayNumber}天(${day.date}): ${items || '暂无安排'}`);
        }
      }
    }

    // Add guide context
    if (context.guide) {
      const g = context.guide;
      if (g.title) {
        parts.push(`参考攻略：${g.title}`);
      }
      if (g.destinations && g.destinations.length > 0) {
        parts.push(`攻略目的地：${g.destinations.join(', ')}`);
      }
      if (g.aiSummary) {
        parts.push(`攻略摘要：${g.aiSummary}`);
      }
      if (g.aiBestTime) {
        parts.push(`最佳时间：${g.aiBestTime}`);
      }
      if (g.aiDuration) {
        parts.push(`建议天数：${g.aiDuration}`);
      }
      if (g.aiBudget) {
        parts.push(`预算：${g.aiBudget}`);
      }
    }

    // Add session context
    if (context.sessionContext) {
      parts.push(`其他信息：${context.sessionContext}`);
    }

    // Add preferences
    if (context.preferences) {
      if (context.preferences.travelStyle) {
        parts.push(`旅行风格：${context.preferences.travelStyle}`);
      }
      if (context.preferences.budget) {
        parts.push(`预算偏好：${context.preferences.budget}`);
      }
    }

    return parts.length > 0 ? `\n\n[当前上下文]\n${parts.join('\n')}` : '';
  }

  /**
   * Build conversation history string
   */
  private buildConversationHistory(messages: ChatMessage[]): string {
    if (messages.length === 0) return '';

    const history = messages
      .slice(-10) // Keep last 10 messages for context
      .map((m) => {
        const role = m.role === 'user' ? '用户' : m.role === 'assistant' ? '助手' : '系统';
        return `${role}: ${m.content}`;
      })
      .join('\n\n');

    return `\n\n[对话历史]\n${history}`;
  }

  /**
   * Parse structured data from assistant response
   */
  private parseResponseMetadata(content: string): ChatResponse {
    // Try to extract JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1];
      const { data, success } = parseJsonSafely<{
        pois?: Array<{
          name: string;
          type: string;
          description?: string;
          latitude?: number;
          longitude?: number;
          address?: string;
          rating?: number;
          priceInfo?: string;
        }>;
        itineraryChanges?: Array<{
          action: string;
          dayNumber?: number;
          poiName?: string;
          details?: string;
        }>;
        quickActions?: Array<{
          label: string;
          action: string;
          payload?: string;
        }>;
        sources?: string[];
      }>(jsonStr, {});

      if (success && Object.keys(data).length > 0) {
        // Remove JSON block from content
        const cleanContent = content.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
        return {
          content: cleanContent,
          metadata: data,
        };
      }
    }

    return { content };
  }

  /**
   * Generate chat response
   */
  async chat(
    userMessage: string,
    history: ChatMessage[] = [],
    context?: ChatContext
  ): Promise<ChatResponse> {
    try {
      const contextStr = this.buildContextString(context);
      const historyStr = this.buildConversationHistory(history);

      const prompt = `${SYSTEM_PROMPT}${contextStr}${historyStr}

用户: ${userMessage}

助手:`;

      chatLogger.info('Generating chat response', {
        messageLength: userMessage.length,
        historyLength: history.length,
        hasContext: !!context,
      });

      const response = await this.ollamaService.generate(prompt, {
        temperature: 0.7,
        max_tokens: 2000,
      });

      const result = this.parseResponseMetadata(response);

      chatLogger.info('Chat response generated', {
        responseLength: result.content.length,
        hasPois: !!result.metadata?.pois?.length,
        hasQuickActions: !!result.metadata?.quickActions?.length,
      });

      return result;
    } catch (error) {
      chatLogger.error(
        'Chat generation failed',
        error instanceof Error ? error : null
      );
      throw error;
    }
  }

  /**
   * Get POI recommendations based on query
   */
  async getRecommendations(
    query: string,
    context?: ChatContext
  ): Promise<ChatResponse> {
    const prompt = `请根据以下需求推荐合适的地点：

需求：${query}

${context?.itinerary ? `当前行程目的地：${context.itinerary.cityName || '未指定'}` : ''}
${context?.preferences?.budget ? `预算：${context.preferences.budget}` : ''}

请推荐3-5个具体的地点，并提供结构化的JSON数据。`;

    return this.chat(prompt, [], context);
  }

  /**
   * Get tips for a destination or activity
   */
  async getTips(topic: string, context?: ChatContext): Promise<ChatResponse> {
    const prompt = `请给我关于"${topic}"的旅行建议和注意事项。

${context?.itinerary ? `我的行程是：${context.itinerary.title}，目的地：${context.itinerary.cityName || '未指定'}` : ''}

请提供实用、具体的建议。`;

    return this.chat(prompt, [], context);
  }

  /**
   * Suggest itinerary modifications
   */
  async suggestItineraryChanges(
    request: string,
    context: ChatContext
  ): Promise<ChatResponse> {
    if (!context.itinerary) {
      return {
        content: '抱歉，我需要了解您当前的行程才能给出修改建议。请先创建或选择一个行程。',
        metadata: {
          quickActions: [
            { label: '创建新行程', action: 'create_itinerary', payload: '' },
          ],
        },
      };
    }

    const prompt = `用户想要修改行程：${request}

请分析用户需求，给出具体的行程修改建议。如果需要添加或删除景点，请在回复中包含itineraryChanges。`;

    return this.chat(prompt, [], context);
  }

  /**
   * Answer travel-related questions
   */
  async answerQuestion(
    question: string,
    history: ChatMessage[] = [],
    context?: ChatContext
  ): Promise<ChatResponse> {
    return this.chat(question, history, context);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return this.ollamaService.healthCheck();
  }
}

// Singleton instance
let chatServiceInstance: ChatService | null = null;

export function getChatService(): ChatService {
  if (!chatServiceInstance) {
    chatServiceInstance = new ChatService();
  }
  return chatServiceInstance;
}

export default ChatService;
