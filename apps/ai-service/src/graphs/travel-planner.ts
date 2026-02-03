/**
 * Travel Planner Graph
 * LangGraph agent for interactive travel planning with human-in-the-loop
 *
 * Flow: parse_intent → gather_info → generate_draft → human_review (interrupt) → refine → add_transport → END
 */

import type { BaseMessage } from '@langchain/core/messages';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import {
  Annotation,
  Command,
  END,
  interrupt,
  MemorySaver,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { createLLM } from '../lib/llm/index.js';
import { loggers } from '../lib/logger.js';
import { toolsByUseCase } from '../tools/index.js';

// Type definitions for travel planning
interface WeatherInfo {
  temperature?: number;
  description?: string;
  forecast?: unknown[];
}

interface TravelGuide {
  title: string;
  aiSummary?: string;
}

interface RecommendedPoi {
  name: string;
  type?: string;
}

interface TravelActivity {
  time?: string;
  name: string;
  type?: string;
  duration?: string;
  description?: string;
  tips?: string;
  transportToNext?: { mode: string; note: string };
}

interface TravelDay {
  dayNumber: number;
  theme?: string;
  activities?: TravelActivity[];
}

interface TravelPlan {
  title?: string;
  summary?: string;
  days?: TravelDay[];
  estimatedBudget?: string;
  packingList?: string[];
  tips?: string[];
}

// Travel plan state annotation
const TravelPlanState = Annotation.Root({
  // Messages for conversation history
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),

  // Session info
  sessionId: Annotation<string>,
  userId: Annotation<string | undefined>,

  // Parsed intent
  destination: Annotation<string | undefined>,
  startDate: Annotation<string | undefined>,
  endDate: Annotation<string | undefined>,
  duration: Annotation<number | undefined>,
  budget: Annotation<string | undefined>,
  preferences: Annotation<string[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  travelersCount: Annotation<number | undefined>,

  // Gathered information
  weatherInfo: Annotation<WeatherInfo | undefined>,
  relatedGuides: Annotation<TravelGuide[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  recommendedPois: Annotation<RecommendedPoi[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),

  // Generated plan
  draftPlan: Annotation<TravelPlan | undefined>,
  refinedPlan: Annotation<TravelPlan | undefined>,
  finalPlan: Annotation<TravelPlan | undefined>,

  // Human feedback
  humanFeedback: Annotation<string | undefined>,
  feedbackAction: Annotation<'approve' | 'modify' | 'reject' | undefined>,

  // Status
  currentStep: Annotation<string>({
    reducer: (_, b) => b,
    default: () => 'init',
  }),
  error: Annotation<string | undefined>,
});

type TravelPlanStateType = typeof TravelPlanState.State;

// System prompt for travel planning
const PLANNING_SYSTEM_PROMPT = `你是一个专业的旅行规划师。你需要根据用户的需求，生成详细的旅行行程规划。

规划原则：
1. 考虑合理的行程节奏，不要安排过多景点
2. 考虑景点之间的地理位置，优化路线
3. 包含用餐建议和住宿建议
4. 考虑天气因素和最佳游览时间
5. 根据预算提供合适的建议

输出格式要求：
- 按天分组安排行程
- 每个景点包含名称、类型、建议停留时间、简短描述
- 包含交通建议`;

/**
 * Node: Parse user intent from initial request
 */
async function parseIntent(
  state: TravelPlanStateType,
): Promise<Partial<TravelPlanStateType>> {
  const llm = createLLM({ temperature: 0.3 });

  // Get the initial user message
  const userMessage = state.messages.find(m => m instanceof HumanMessage);
  if (!userMessage) {
    return { error: 'No user message found', currentStep: 'error' };
  }

  const prompt = `分析以下旅行规划请求，提取关键信息，返回JSON格式：

用户请求：${userMessage.content}

请返回JSON对象：
{
  "destination": "目的地",
  "startDate": "开始日期 (YYYY-MM-DD 或 null)",
  "endDate": "结束日期 (YYYY-MM-DD 或 null)",
  "duration": 天数 (数字),
  "budget": "预算范围",
  "preferences": ["偏好1", "偏好2"],
  "travelersCount": 人数
}

JSON:`;

  try {
    const response = await llm.invoke(prompt);
    const responseText
      = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        destination: parsed.destination,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        duration: parsed.duration,
        budget: parsed.budget,
        preferences: parsed.preferences || [],
        travelersCount: parsed.travelersCount,
        currentStep: 'intent_parsed',
      };
    }

    return { currentStep: 'intent_parsed' };
  }
  catch (error) {
    return {
      error: `Intent parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      currentStep: 'error',
    };
  }
}

/**
 * Check if tool calling is supported
 */
function isToolCallingSupported(): boolean {
  const provider = process.env.LLM_PROVIDER || 'ollama';
  return provider === 'openai' || provider === 'claude';
}

/**
 * Node: Gather information (weather, guides, POIs)
 * Falls back to simple mode if tool calling is not supported
 */
async function gatherInfo(
  state: TravelPlanStateType,
): Promise<Partial<TravelPlanStateType>> {
  const destination = state.destination || '未知目的地';

  // If tool calling is not supported, skip tool-based gathering
  if (!isToolCallingSupported()) {
    loggers.langgraph.info(
      'Tool calling not supported, skipping gatherInfo tools',
    );
    return { currentStep: 'info_gathered' };
  }

  const tools = toolsByUseCase.travelPlanning;
  const llm = createLLM({ temperature: 0.5 });

  // eslint-disable-next-line ts/no-explicit-any -- LangChain bindTools returns dynamic Runnable type
  const llmWithTools = (llm as any).bindTools(tools);

  // Create a message to trigger tool calls
  const gatherPrompt = `我需要为用户规划去${destination}的旅行。
请帮我：
1. 搜索${destination}的相关旅行攻略
2. 查找${destination}的热门景点

请调用相应的工具获取信息。`;

  try {
    const response = await llmWithTools.invoke([
      new SystemMessage(
        '你是一个旅行信息收集助手。请使用工具获取旅行相关信息。',
      ),
      new HumanMessage(gatherPrompt),
    ]);

    // Execute tool calls if any
    if (response.tool_calls?.length) {
      const toolNode = new ToolNode(tools);
      const toolResults = await toolNode.invoke({
        messages: [response],
      });

      // Parse tool results
      const guides: TravelGuide[] = [];
      const pois: RecommendedPoi[] = [];

      for (const result of toolResults.messages || []) {
        try {
          const data = JSON.parse(result.content as string);
          if (data.guides) {
            guides.push(...data.guides);
          }
          if (data.pois) {
            pois.push(...data.pois);
          }
        }
        catch {
          // Ignore parse errors
        }
      }

      return {
        relatedGuides: guides,
        recommendedPois: pois,
        currentStep: 'info_gathered',
      };
    }

    return { currentStep: 'info_gathered' };
  }
  catch (error) {
    loggers.langgraph.error({ error }, 'Gather info error');
    return { currentStep: 'info_gathered' }; // Continue even if gathering fails
  }
}

/**
 * Node: Generate draft plan
 */
async function generateDraft(
  state: TravelPlanStateType,
): Promise<Partial<TravelPlanStateType>> {
  const llm = createLLM({ temperature: 0.7 });

  const destination = state.destination || '未知目的地';
  const duration = state.duration || 3;
  const budget = state.budget || '中等预算';
  const preferences = state.preferences.length
    ? state.preferences.join('、')
    : '无特殊偏好';

  // Prepare context from gathered info
  const guidesContext = state.relatedGuides
    .slice(0, 3)
    .map(g => `- ${g.title}: ${g.aiSummary || ''}`)
    .join('\n');

  const poisContext = state.recommendedPois
    .slice(0, 10)
    .map(p => `- ${p.name} (${p.type || '景点'})`)
    .join('\n');

  const prompt = `${PLANNING_SYSTEM_PROMPT}

请为以下旅行生成详细行程规划：

目的地：${destination}
天数：${duration}天
预算：${budget}
偏好：${preferences}
人数：${state.travelersCount || 2}人

参考攻略：
${guidesContext || '无'}

推荐地点：
${poisContext || '无'}

请生成JSON格式的行程规划：
{
  "title": "行程标题",
  "summary": "行程概述",
  "days": [
    {
      "dayNumber": 1,
      "theme": "当天主题",
      "activities": [
        {
          "time": "09:00",
          "name": "景点名称",
          "type": "attraction/restaurant/hotel",
          "duration": "2小时",
          "description": "简短描述",
          "tips": "游览建议"
        }
      ]
    }
  ],
  "estimatedBudget": "预估总花费",
  "packingList": ["物品1", "物品2"],
  "tips": ["总体建议1", "总体建议2"]
}

JSON:`;

  try {
    const response = await llm.invoke(prompt);
    const responseText
      = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const plan = JSON.parse(jsonMatch[0]);
      return {
        draftPlan: plan,
        currentStep: 'draft_generated',
        messages: [
          new AIMessage(
            `我已经为您生成了${destination}${duration}天的行程草案：\n\n`
            + `**${plan.title}**\n\n${plan.summary}\n\n`
            + `行程包含${plan.days?.length || 0}天的详细安排。请查看后告诉我：\n`
            + `- 如果满意，回复"确认"\n`
            + `- 如果需要修改，请说明具体需求`,
          ),
        ],
      };
    }

    return {
      error: 'Failed to generate plan',
      currentStep: 'error',
    };
  }
  catch (error) {
    return {
      error: `Plan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      currentStep: 'error',
    };
  }
}

/**
 * Node: Human review - interrupt for user feedback
 */
function humanReview(state: TravelPlanStateType): Partial<TravelPlanStateType> {
  // Use interrupt to pause and wait for human feedback
  const feedback = interrupt({
    message: '请查看行程草案并提供反馈',
    plan: state.draftPlan,
    options: ['approve', 'modify', 'reject'],
  });

  // Parse feedback when resumed
  if (typeof feedback === 'string') {
    const lowerFeedback = feedback.toLowerCase();
    if (
      lowerFeedback.includes('确认')
      || lowerFeedback.includes('approve')
      || lowerFeedback.includes('好的')
      || lowerFeedback.includes('可以')
    ) {
      return {
        feedbackAction: 'approve',
        humanFeedback: feedback,
        currentStep: 'approved',
      };
    }
    else if (
      lowerFeedback.includes('取消')
      || lowerFeedback.includes('reject')
      || lowerFeedback.includes('不要')
    ) {
      return {
        feedbackAction: 'reject',
        humanFeedback: feedback,
        currentStep: 'rejected',
      };
    }
    else {
      return {
        feedbackAction: 'modify',
        humanFeedback: feedback,
        currentStep: 'needs_refinement',
      };
    }
  }

  const feedbackObj = feedback as
    | { action?: 'approve' | 'modify' | 'reject'; feedback?: string }
    | undefined;
  return {
    feedbackAction: feedbackObj?.action || 'modify',
    humanFeedback: feedbackObj?.feedback || '',
    currentStep: 'feedback_received',
  };
}

/**
 * Node: Refine plan based on feedback
 */
async function refinePlan(
  state: TravelPlanStateType,
): Promise<Partial<TravelPlanStateType>> {
  if (state.feedbackAction === 'approve') {
    // No refinement needed
    return {
      refinedPlan: state.draftPlan,
      currentStep: 'refined',
    };
  }

  if (state.feedbackAction === 'reject') {
    return {
      currentStep: 'cancelled',
      messages: [
        new AIMessage('好的，已取消行程规划。如需重新规划，请告诉我您的需求。'),
      ],
    };
  }

  // Refine based on feedback
  const llm = createLLM({ temperature: 0.7 });

  const prompt = `根据用户反馈修改行程规划：

原行程规划：
${JSON.stringify(state.draftPlan, null, 2)}

用户反馈：${state.humanFeedback}

请根据反馈修改行程，返回完整的JSON格式行程（与原格式相同）：`;

  try {
    const response = await llm.invoke(prompt);
    const responseText
      = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const refined = JSON.parse(jsonMatch[0]);
      return {
        refinedPlan: refined,
        currentStep: 'refined',
        messages: [
          new AIMessage(
            `我已根据您的反馈修改了行程。主要调整：\n${state.humanFeedback}\n\n请确认是否满意这个版本。`,
          ),
        ],
      };
    }

    // If parsing fails, keep the draft
    return {
      refinedPlan: state.draftPlan,
      currentStep: 'refined',
    };
  }
  catch {
    return {
      refinedPlan: state.draftPlan,
      currentStep: 'refined',
    };
  }
}

/**
 * Node: Add transport routing between POIs
 */
async function addTransport(
  state: TravelPlanStateType,
): Promise<Partial<TravelPlanStateType>> {
  const plan = state.refinedPlan || state.draftPlan;
  if (!plan || !plan.days) {
    return {
      finalPlan: plan,
      currentStep: 'completed',
    };
  }

  // For now, add placeholder transport info
  // In production, would call route_planner tool for each pair of POIs
  const planWithTransport = {
    ...plan,
    // eslint-disable-next-line ts/no-explicit-any -- Dynamic plan structure from LLM
    days: plan.days.map((day: any) => ({
      ...day,
      // eslint-disable-next-line ts/no-explicit-any -- Dynamic activity structure
      activities: day.activities?.map((activity: any, idx: number) => ({
        ...activity,
        transportToNext:
          idx < (day.activities?.length || 0) - 1
            ? { mode: 'walking', note: '步行前往下一地点' }
            : undefined,
      })),
    })),
  };

  return {
    finalPlan: planWithTransport,
    currentStep: 'completed',
    messages: [
      new AIMessage(
        `您的${state.destination}${state.duration || 3}天行程已规划完成！\n\n`
        + `行程包含详细的每日安排和交通建议。祝您旅途愉快！`,
      ),
    ],
  };
}

/**
 * Routing function after human review
 */
function routeAfterReview(
  state: TravelPlanStateType,
): 'refine' | 'add_transport' | '__end__' {
  if (state.feedbackAction === 'reject') {
    return '__end__';
  }
  if (state.feedbackAction === 'approve') {
    return 'add_transport';
  }
  return 'refine';
}

/**
 * Routing after refinement
 */
function routeAfterRefine(
  state: TravelPlanStateType,
): 'add_transport' | '__end__' {
  if (state.currentStep === 'cancelled') {
    return '__end__';
  }
  return 'add_transport';
}

/**
 * Build the travel planner graph
 */
export function buildTravelPlannerGraph() {
  const workflow = new StateGraph(TravelPlanState)
    .addNode('parse_intent', parseIntent)
    .addNode('gather_info', gatherInfo)
    .addNode('generate_draft', generateDraft)
    .addNode('human_review', humanReview)
    .addNode('refine', refinePlan)
    .addNode('add_transport', addTransport)
    // Edges
    .addEdge(START, 'parse_intent')
    .addEdge('parse_intent', 'gather_info')
    .addEdge('gather_info', 'generate_draft')
    .addEdge('generate_draft', 'human_review')
    .addConditionalEdges('human_review', routeAfterReview, {
      refine: 'refine',
      add_transport: 'add_transport',
      __end__: END,
    })
    .addConditionalEdges('refine', routeAfterRefine, {
      add_transport: 'add_transport',
      __end__: END,
    })
    .addEdge('add_transport', END);

  // Compile with checkpointer for state persistence
  const checkpointer = new MemorySaver();

  return workflow.compile({ checkpointer });
}

// Singleton instance
let travelPlanner: ReturnType<typeof buildTravelPlannerGraph> | null = null;

/**
 * Get or create the travel planner instance
 */
export function getTravelPlanner() {
  if (!travelPlanner) {
    travelPlanner = buildTravelPlannerGraph();
  }
  return travelPlanner;
}

/**
 * Start a new travel planning session
 */
export async function startPlanningSession(options: {
  sessionId: string;
  message: string;
  userId?: string;
}): Promise<{
  sessionId: string;
  response: string;
  plan?: TravelPlan;
  waitingForFeedback: boolean;
}> {
  const planner = getTravelPlanner();

  const config = {
    configurable: {
      thread_id: options.sessionId,
    },
  };

  try {
    const result = await planner.invoke(
      {
        sessionId: options.sessionId,
        userId: options.userId,
        messages: [new HumanMessage(options.message)],
      },
      config,
    );

    // Check if we hit an interrupt
    const lastMessage = [...result.messages]
      .reverse()
      .find(m => m instanceof AIMessage);

    return {
      sessionId: options.sessionId,
      response: (lastMessage?.content as string) || '行程规划已启动，请稍候...',
      plan: result.draftPlan,
      waitingForFeedback: result.currentStep === 'draft_generated',
    };
  }
  catch (error) {
    // Check if it's an interrupt
    if ((error as Error & { name?: string })?.name === 'GraphInterrupt') {
      return {
        sessionId: options.sessionId,
        response: '行程草案已生成，请查看并提供反馈。',
        waitingForFeedback: true,
      };
    }
    throw error;
  }
}

/**
 * Resume planning session with user feedback
 */
export async function resumePlanningSession(options: {
  sessionId: string;
  feedback: string;
}): Promise<{
  sessionId: string;
  response: string;
  plan?: TravelPlan;
  completed: boolean;
}> {
  const planner = getTravelPlanner();

  const config = {
    configurable: {
      thread_id: options.sessionId,
    },
  };

  try {
    // Resume with Command containing the feedback
    const result = await planner.invoke(
      new Command({ resume: options.feedback }),
      config,
    );

    const lastMessage = [...result.messages]
      .reverse()
      .find(m => m instanceof AIMessage);

    return {
      sessionId: options.sessionId,
      response: (lastMessage?.content as string) || '行程已更新。',
      plan: result.finalPlan || result.refinedPlan || result.draftPlan,
      completed: result.currentStep === 'completed',
    };
  }
  catch (error) {
    // Handle another interrupt (for iterative refinement)
    if ((error as Error & { name?: string })?.name === 'GraphInterrupt') {
      return {
        sessionId: options.sessionId,
        response: '请继续提供您的反馈。',
        completed: false,
      };
    }
    throw error;
  }
}
