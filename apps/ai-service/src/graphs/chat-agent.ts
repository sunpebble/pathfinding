/**
 * Chat Agent Graph
 * LangGraph agent for enhanced conversational AI with tool calling
 */

import type { BaseMessage } from '@langchain/core/messages';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import {
  Annotation,
  END,
  MemorySaver,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { createLLM } from '../lib/llm/index.js';
import { toolsByUseCase } from '../tools/index.js';

// Chat state annotation
const ChatState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  // Session metadata
  sessionId: Annotation<string>,
  userId: Annotation<string | undefined>,
  context: Annotation<string | undefined>,
});

type ChatStateType = typeof ChatState.State;

// System prompt for the chat agent
const SYSTEM_PROMPT = `你是一个专业的旅行规划助手。你可以帮助用户：

1. 查询目的地天气预报
2. 搜索景点、餐厅、酒店等地点信息
3. 翻译旅行相关内容
4. 搜索和查看旅行攻略
5. 规划交通路线

回答时请：
- 使用中文回答
- 提供实用、具体的建议
- 在需要时主动调用工具获取信息
- 保持友好和专业的语气

如果用户问的问题需要实时信息（如天气、交通），请使用相应的工具获取最新数据。`;

// Simple system prompt for models without tool support
const SIMPLE_SYSTEM_PROMPT = `你是一个专业的旅行规划助手。你可以帮助用户：

1. 提供目的地旅行建议
2. 推荐景点、餐厅、酒店
3. 提供旅行攻略和行程规划
4. 回答旅行相关问题

回答时请：
- 使用中文回答
- 提供实用、具体的建议
- 保持友好和专业的语气`;

/**
 * Check if the LLM supports tool calling
 * Returns false for Ollama models that don't support native tool calling
 */
function checkToolSupport(): boolean {
  // Check environment to determine provider
  const provider = process.env.LLM_PROVIDER || 'ollama';

  // Only OpenAI and Claude reliably support tool calling
  return provider === 'openai' || provider === 'claude';
}

/**
 * Build the chat agent graph with optional tool support
 */
export function buildChatAgentGraph(enableTools = true) {
  const tools = toolsByUseCase.chat;
  const llm = createLLM({ temperature: 0.7 });

  // Check if we should use tools based on provider support
  let llmWithTools: ReturnType<typeof createLLM> | null = null;
  let useTools = enableTools && checkToolSupport();

  if (useTools) {
    try {
      // @ts-expect-error - bindTools exists on LangChain chat models
      llmWithTools = llm.bindTools(tools);
    } catch (error) {
      console.warn('Tool binding failed, falling back to simple chat:', error);
      useTools = false;
    }
  }

  // Tool node for executing tools (only if tools are enabled)
  const toolNode = useTools ? new ToolNode(tools) : null;

  // Agent node: decide whether to call tools or respond
  async function agentNode(
    state: ChatStateType
  ): Promise<Partial<ChatStateType>> {
    const messages = state.messages;

    // Add system message if this is the first message
    const hasSystemMessage = messages.some((m) => m instanceof SystemMessage);
    const systemPrompt = useTools ? SYSTEM_PROMPT : SIMPLE_SYSTEM_PROMPT;
    const messagesWithSystem = hasSystemMessage
      ? messages
      : [new SystemMessage(systemPrompt), ...messages];

    // Add context if provided
    if (state.context && !hasSystemMessage) {
      messagesWithSystem.splice(
        1,
        0,
        new SystemMessage(`用户上下文：${state.context}`)
      );
    }

    const activeLLM = llmWithTools || llm;
    const response = await activeLLM.invoke(messagesWithSystem);

    return { messages: [response] };
  }

  // Routing function: check if we should call tools
  function shouldContinue(state: ChatStateType): 'tools' | '__end__' {
    if (!useTools) {
      return '__end__';
    }

    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
      return 'tools';
    }

    return '__end__';
  }

  // Build the graph
  const workflow = new StateGraph(ChatState)
    .addNode('agent', agentNode)
    .addEdge(START, 'agent');

  if (useTools && toolNode) {
    workflow
      .addNode('tools', toolNode)
      .addConditionalEdges('agent', shouldContinue, {
        tools: 'tools',
        __end__: END,
      })
      .addEdge('tools', 'agent');
  } else {
    workflow.addEdge('agent', END);
  }

  // Compile with memory saver for session persistence
  const checkpointer = new MemorySaver();

  return workflow.compile({ checkpointer });
}

// Singleton instance
let chatAgent: ReturnType<typeof buildChatAgentGraph> | null = null;

/**
 * Get or create the chat agent instance
 */
export function getChatAgent() {
  if (!chatAgent) {
    chatAgent = buildChatAgentGraph();
  }
  return chatAgent;
}

/**
 * Send a message to the chat agent
 */
export async function chat(options: {
  sessionId: string;
  message: string;
  userId?: string;
  context?: string;
}): Promise<{
  response: string;
  toolCalls?: Array<{ name: string; args: any }>;
}> {
  const agent = getChatAgent();

  const config = {
    configurable: {
      thread_id: options.sessionId,
    },
  };

  const result = await agent.invoke(
    {
      messages: [new HumanMessage(options.message)],
      sessionId: options.sessionId,
      userId: options.userId,
      context: options.context,
    },
    config
  );

  // Find the last AI message
  const lastAIMessage = [...result.messages]
    .reverse()
    .find((m) => m instanceof AIMessage);

  if (!lastAIMessage) {
    return { response: '抱歉，我无法生成回复。' };
  }

  const content = lastAIMessage.content;
  const response =
    typeof content === 'string' ? content : JSON.stringify(content);

  return {
    response,
    toolCalls: lastAIMessage.tool_calls?.map((tc: any) => ({
      name: tc.name,
      args: tc.args,
    })),
  };
}

/**
 * Stream chat response (for SSE)
 */
export async function* streamChat(options: {
  sessionId: string;
  message: string;
  userId?: string;
  context?: string;
}): AsyncGenerator<{
  type: 'token' | 'tool_start' | 'tool_end' | 'done';
  content?: string;
  tool?: { name: string; args?: any; result?: any };
}> {
  const agent = getChatAgent();

  const config = {
    configurable: {
      thread_id: options.sessionId,
    },
  };

  const stream = await agent.stream(
    {
      messages: [new HumanMessage(options.message)],
      sessionId: options.sessionId,
      userId: options.userId,
      context: options.context,
    },
    config
  );

  for await (const chunk of stream) {
    // Handle agent output
    if ('agent' in chunk && chunk.agent) {
      const agentMessages = chunk.agent.messages || [];
      for (const msg of agentMessages) {
        if (msg instanceof AIMessage) {
          // Check for tool calls
          if (msg.tool_calls?.length) {
            for (const tc of msg.tool_calls) {
              yield {
                type: 'tool_start',
                tool: { name: tc.name, args: tc.args },
              };
            }
          }
          // Yield content if present
          if (msg.content) {
            let content: string;
            if (typeof msg.content === 'string') {
              content = msg.content;
            } else if (Array.isArray(msg.content)) {
              // Extract text from content blocks (Claude format)
              content = msg.content
                .filter((block: any) => block.type === 'text' && block.text)
                .map((block: any) => block.text)
                .join('');
            } else {
              content = String(msg.content);
            }
            if (content) {
              yield { type: 'token', content };
            }
          }
        }
      }
    }

    // Handle tool output
    if ('tools' in chunk && chunk.tools) {
      const toolMessages = (chunk.tools as any).messages || [];
      for (const msg of toolMessages) {
        yield {
          type: 'tool_end',
          tool: {
            name: msg.name,
            result:
              typeof msg.content === 'string'
                ? msg.content
                : JSON.stringify(msg.content),
          },
        };
      }
    }
  }

  yield { type: 'done' };
}
