/**
 * Chat API Route Handler
 * Proxies requests to AI Service and converts SSE format to Vercel AI SDK compatible format
 */

import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:3001';

export const maxDuration = 60;

interface RequestUIMessage {
  role: 'user' | 'assistant';
  parts: Array<{ type: string; text?: string }>;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, sessionId } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages must be a non-empty array' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1] as RequestUIMessage;
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response(JSON.stringify({ error: 'No user message found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract text from message parts
    const messageText
      = lastMessage.parts
        ?.filter(p => p.type === 'text')
        .map(p => p.text)
        .join('\n') || '';

    // Generate session ID if not provided
    const chatSessionId = sessionId || `chat-${Date.now()}`;

    // Call AI Service SSE endpoint
    const response = await fetch(`${AI_SERVICE_URL}/api/agent/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: chatSessionId,
        message: messageText,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert SSE stream to Vercel AI SDK UI message stream
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        const textId = `text-${Date.now()}`;
        const reasoningId = `reasoning-${Date.now()}`;
        let textStarted = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data:')) {
                const data = line.slice(5).trim();
                if (!data)
                  continue;

                try {
                  const event = JSON.parse(data);

                  switch (event.type) {
                    case 'token':
                      if (event.content) {
                        // Start text block if not started
                        if (!textStarted) {
                          writer.write({
                            type: 'text-start',
                            id: textId,
                          });
                          textStarted = true;
                        }
                        writer.write({
                          type: 'text-delta',
                          id: textId,
                          delta: event.content,
                        });
                      }
                      break;

                    case 'reasoning':
                      // Handle reasoning/thinking content from AI
                      if (event.content) {
                        writer.write({
                          type: 'reasoning-delta',
                          id: reasoningId,
                          delta: event.content,
                        });
                      }
                      break;

                    case 'tool_start':
                      if (event.tool) {
                        writer.write({
                          type: 'data-tool',
                          id: `tool-${Date.now()}`,
                          data: {
                            status: 'start',
                            name: event.tool.name,
                            args: event.tool.args,
                          },
                        });
                      }
                      break;

                    case 'tool_end':
                      if (event.tool) {
                        writer.write({
                          type: 'data-tool',
                          id: `tool-${Date.now()}`,
                          data: {
                            status: 'end',
                            name: event.tool.name,
                            result: event.tool.result,
                          },
                        });
                      }
                      break;

                    case 'done':
                      // End text block if started
                      if (textStarted) {
                        writer.write({
                          type: 'text-end',
                          id: textId,
                        });
                      }
                      break;

                    case 'error':
                      writer.write({
                        type: 'error',
                        errorText: event.error || 'Unknown error',
                      });
                      break;
                  }
                }
                catch {
                  // Skip invalid JSON
                }
              }
            }
          }

          // Ensure text block is closed
          if (textStarted) {
            writer.write({
              type: 'text-end',
              id: textId,
            });
          }
        }
        finally {
          reader.releaseLock();
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  }
  catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
