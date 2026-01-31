'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Bot, Check, Copy, RefreshCcw, Sparkles } from 'lucide-react';
import { Fragment, useCallback, useMemo, useState } from 'react';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Loader } from '@/components/ai-elements/loader';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const [sessionId] = useState(() => `chat-${Date.now()}`);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { sessionId },
      }),
    [sessionId]
  );

  const { messages, sendMessage, status, regenerate } = useChat({ transport });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleSubmit = useCallback(
    (message: { text: string }) => {
      if (message.text.trim()) {
        sendMessage({ text: message.text });
      }
    },
    [sendMessage]
  );

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">AI 助手</h1>
            <p className="text-sm text-muted-foreground">
              旅行规划 · 内容审核 · 数据探索
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <Conversation className="flex-1 bg-muted/30">
        <ConversationContent className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Bot className="h-8 w-8" />}
              title="你好！我是你的 AI 助手"
              description="我可以帮你规划旅行行程、查询天气和景点信息、审核内容质量，或者探索数据库中的旅行数据。"
            >
              <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
                <SuggestionCard
                  title="规划行程"
                  description="帮我规划一个三天的杭州旅行"
                  onClick={() =>
                    handleSubmit({ text: '帮我规划一个三天的杭州旅行' })
                  }
                />
                <SuggestionCard
                  title="查询天气"
                  description="上海明天天气怎么样？"
                  onClick={() => handleSubmit({ text: '上海明天天气怎么样？' })}
                />
                <SuggestionCard
                  title="搜索攻略"
                  description="有哪些关于成都美食的攻略？"
                  onClick={() =>
                    handleSubmit({ text: '有哪些关于成都美食的攻略？' })
                  }
                />
                <SuggestionCard
                  title="数据统计"
                  description="目前数据库里有多少条攻略？"
                  onClick={() =>
                    handleSubmit({ text: '目前数据库里有多少条攻略？' })
                  }
                />
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {messages.map((message, messageIndex) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLastMessage={messageIndex === messages.length - 1}
                  isStreaming={status === 'streaming'}
                  lastMessageId={messages.at(-1)?.id}
                  onRegenerate={regenerate}
                />
              ))}
              {status === 'submitted' && (
                <Message from="assistant">
                  <MessageContent>
                    <div className="flex items-center gap-2">
                      <Loader size={16} />
                      <span className="text-sm text-muted-foreground">
                        思考中...
                      </span>
                    </div>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="border-t border-border bg-background p-4">
        <PromptInput onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <PromptInputTextarea
            placeholder="输入你的问题..."
            disabled={isLoading}
          />
          <PromptInputFooter>
            <div />
            <PromptInputSubmit status={status} disabled={isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<{
    type: string;
    text?: string;
  }>;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
  lastMessageId?: string;
  onRegenerate: () => void;
}

function MessageBubble({
  message,
  isLastMessage,
  isStreaming,
  lastMessageId,
  onRegenerate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Get the full text content for copy action
  const fullTextContent = message.parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('');

  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, i) => {
          const isLastPart =
            i === message.parts.length - 1 && message.id === lastMessageId;

          switch (part.type) {
            case 'text':
              return (
                // eslint-disable-next-line react/no-array-index-key -- parts are immutable and order-dependent
                <Fragment key={`${message.id}-text-${i}`}>
                  <MessageResponse>{part.text || ''}</MessageResponse>
                </Fragment>
              );
            case 'reasoning':
              return (
                <Reasoning
                  // eslint-disable-next-line react/no-array-index-key -- parts are immutable and order-dependent
                  key={`${message.id}-reasoning-${i}`}
                  className="w-full"
                  isStreaming={isStreaming && isLastPart}
                >
                  <ReasoningTrigger
                    getThinkingMessage={(streaming, duration) => {
                      if (streaming || duration === 0) {
                        return <span className="animate-pulse">思考中...</span>;
                      }
                      if (duration === undefined) {
                        return <span>思考了几秒</span>;
                      }
                      return <span>思考了 {duration} 秒</span>;
                    }}
                  />
                  <ReasoningContent>{part.text || ''}</ReasoningContent>
                </Reasoning>
              );
            default:
              return null;
          }
        })}
      </MessageContent>

      {/* Show actions only for the last assistant message */}
      {message.role === 'assistant' && isLastMessage && !isStreaming && (
        <MessageActions>
          <MessageAction
            onClick={onRegenerate}
            tooltip="重新生成"
            label="重新生成"
          >
            <RefreshCcw className="size-3" />
          </MessageAction>
          <MessageAction
            onClick={() => handleCopy(fullTextContent)}
            tooltip="复制"
            label="复制"
          >
            {copied ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
          </MessageAction>
        </MessageActions>
      )}
    </Message>
  );
}

function SuggestionCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border border-border bg-background p-4 text-left',
        'transition-colors hover:border-emerald-300 hover:bg-emerald-50',
        'dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20'
      )}
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
