'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  MapPin,
  RefreshCcw,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const TRAVEL_STYLES = [
  { value: '休闲', label: '休闲' },
  { value: '文化探索', label: '文化探索' },
  { value: '美食之旅', label: '美食之旅' },
  { value: '户外冒险', label: '户外冒险' },
  { value: '亲子游', label: '亲子游' },
  { value: '购物', label: '购物' },
] as const;

const BUDGET_LEVELS = [
  { value: '经济', label: '经济' },
  { value: '适中', label: '适中' },
  { value: '豪华', label: '豪华' },
] as const;

export default function NewItineraryPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/signin');
    }
  }, [authLoading, isAuthenticated, router]);

  // Form state
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [style, setStyle] = useState<string>(TRAVEL_STYLES[0].value);
  const [budget, setBudget] = useState<string>(BUDGET_LEVELS[1].value);
  const [travelers, setTravelers] = useState(2);
  const [requirements, setRequirements] = useState('');

  const responseRef = useRef<HTMLDivElement>(null);

  const [sessionId] = useState(() => `itinerary-${Date.now()}`);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { sessionId },
      }),
    [sessionId],
  );

  const { messages, sendMessage, status, regenerate } = useChat({ transport });

  const isLoading = status === 'streaming' || status === 'submitted';
  const hasResponse = messages.some(m => m.role === 'assistant');

  const buildPrompt = useCallback(() => {
    const parts = [
      `帮我规划一个从${startDate}到${endDate}去${destination}的旅行`,
      `${travelers}人出行`,
      `旅行风格是${style}`,
      `预算${budget}`,
    ];
    if (requirements.trim()) {
      parts.push(requirements.trim());
    }
    return `${parts.join('，')}。`;
  }, [destination, startDate, endDate, style, budget, travelers, requirements]);

  const handleGenerate = useCallback(() => {
    if (!destination.trim() || !startDate || !endDate)
      return;
    const prompt = buildPrompt();
    sendMessage({ text: prompt });

    // Scroll to response area after a short delay
    setTimeout(() => {
      responseRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  }, [destination, startDate, endDate, buildPrompt, sendMessage]);

  const isFormValid = destination.trim() && startDate && endDate;

  const handleRegenerate = useCallback(() => {
    regenerate();
  }, [regenerate]);

  // Extract assistant text from messages
  const assistantText = messages
    .filter(m => m.role === 'assistant')
    .flatMap(m => m.parts)
    .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
    .map(p => p.text)
    .join('');

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <Link
              href="/itineraries"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                'border border-border text-muted-foreground',
                'transition-colors hover:bg-muted hover:text-foreground',
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                AI 行程规划
              </h1>
              <p className="text-sm text-muted-foreground">
                填写旅行信息，AI 为你生成专属行程
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Form Section */}
        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <h2 className="mb-6 text-base font-semibold text-foreground">
            旅行信息
          </h2>

          <div className="space-y-5">
            {/* Destination */}
            <div>
              <label
                htmlFor="destination"
                className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
              >
                <MapPin className="h-4 w-4 text-emerald-600" />
                目的地
              </label>
              <input
                id="destination"
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="请输入城市名称，如：杭州、东京、巴黎"
                className={cn(
                  'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground',
                  'placeholder:text-muted-foreground',
                  'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
                )}
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  出发日期
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground',
                    'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
                  )}
                />
              </div>
              <div>
                <label
                  htmlFor="endDate"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  返回日期
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground',
                    'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
                  )}
                />
              </div>
            </div>

            {/* Style & Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="style"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  旅行风格
                </label>
                <select
                  id="style"
                  value={style}
                  onChange={e => setStyle(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground',
                    'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
                  )}
                >
                  {TRAVEL_STYLES.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="budget"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  预算水平
                </label>
                <select
                  id="budget"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground',
                    'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
                  )}
                >
                  {BUDGET_LEVELS.map(b => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Travelers */}
            <div>
              <label
                htmlFor="travelers"
                className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
              >
                <Users className="h-4 w-4 text-emerald-600" />
                出行人数
              </label>
              <input
                id="travelers"
                type="number"
                min={1}
                max={20}
                value={travelers}
                onChange={e =>
                  setTravelers(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                className={cn(
                  'w-32 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground',
                  'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
                )}
              />
            </div>

            {/* Special Requirements */}
            <div>
              <label
                htmlFor="requirements"
                className="mb-1.5 text-sm font-medium text-foreground"
              >
                特殊要求
                <span className="ml-1 text-muted-foreground">（选填）</span>
              </label>
              <textarea
                id="requirements"
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder="例如：希望包含当地特色美食推荐、避免爬山、需要无障碍设施..."
                rows={3}
                className={cn(
                  'w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground',
                  'placeholder:text-muted-foreground',
                  'focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
                )}
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!isFormValid || isLoading}
              className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white',
                'bg-emerald-600 transition-colors hover:bg-emerald-700',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
              )}
            >
              {isLoading
                ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  )
                : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      生成行程
                    </>
                  )}
            </button>
          </div>
        </div>

        {/* AI Response Area */}
        <div ref={responseRef} className="mt-8">
          {/* Loading indicator when submitted but no response yet */}
          {status === 'submitted' && !hasResponse && (
            <div className="rounded-xl border border-border bg-background p-8 shadow-sm">
              <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm">AI 正在为你规划行程，请稍候...</p>
              </div>
            </div>
          )}

          {/* Streaming / Completed response */}
          {hasResponse && (
            <div className="rounded-xl border border-border bg-background shadow-sm">
              {/* Response header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    AI 行程方案
                  </span>
                  {status === 'streaming' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      生成中
                    </span>
                  )}
                </div>

                {/* Regenerate button */}
                {!isLoading && (
                  <button
                    type="button"
                    onClick={() => handleRegenerate()}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
                      'border border-border text-muted-foreground',
                      'transition-colors hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <RefreshCcw className="h-3 w-3" />
                    重新生成
                  </button>
                )}
              </div>

              {/* Response content */}
              <div className="px-6 py-5">
                <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                  {assistantText.split('\n').map((paragraph) => {
                    const trimmed = paragraph.trim();
                    if (!trimmed)
                      return null;
                    return (
                      <p
                        key={trimmed}
                        className="mb-3 whitespace-pre-wrap leading-relaxed last:mb-0"
                      >
                        {trimmed}
                      </p>
                    );
                  })}
                  {status === 'streaming' && (
                    <span className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-emerald-600" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
