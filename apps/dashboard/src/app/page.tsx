'use client';

/**
 * Landing page — 方案 B: 左右分屏 Hero + 登录
 *
 * 左侧：品牌展示区（地形图动画背景 + 品牌信息 + 功能亮点）
 * 右侧：登录表单
 *
 * 探索者/户外冒险风设计语言，与 iOS 端 DesignSystem 保持一致。
 */

import {
  Compass,
  Globe,
  Loader2,
  Map,
  MapPin,
  Mountain,
  Route,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TopographicBackground } from '@/components/ui/topographic-background';
import { useAuth } from '@/hooks/use-auth';

const features = [
  {
    icon: Sparkles,
    title: 'AI 智能规划',
    description: '基于大语言模型的行程智能推荐',
  },
  {
    icon: MapPin,
    title: '海量目的地数据',
    description: '覆盖全球热门景点与小众秘境',
  },
  {
    icon: Route,
    title: '灵活行程定制',
    description: '多日行程自动编排，随心调整',
  },
  {
    icon: Globe,
    title: '多平台同步',
    description: 'Web 与 iOS 数据实时同步',
  },
];

export default function LandingPage() {
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/overview');
    }
  }, [isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <Compass className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-stone-500">正在准备你的探索之旅...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated)
    return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn({ email, password });
      router.push('/overview');
    }
    catch (err) {
      setError(
        err instanceof Error ? err.message : '登录失败，请重试',
      );
    }
    finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ======= 左侧：品牌展示区 ======= */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-900 via-stone-900 to-stone-950 lg:flex">
        {/* 地形图背景 */}
        <TopographicBackground
          lineCount={16}
          animated
          variant="dark"
          className="opacity-60"
        />

        {/* 装饰：指南针 */}
        <div className="absolute right-12 top-12 opacity-10">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="55" stroke="white" strokeWidth="1" />
            <circle cx="60" cy="60" r="45" stroke="white" strokeWidth="0.5" />
            <line x1="60" y1="5" x2="60" y2="115" stroke="white" strokeWidth="0.5" />
            <line x1="5" y1="60" x2="115" y2="60" stroke="white" strokeWidth="0.5" />
            <polygon points="60,10 55,30 65,30" fill="white" />
            <text x="60" y="8" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">N</text>
          </svg>
        </div>

        {/* 品牌内容 */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-16">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 backdrop-blur-sm">
              <Compass className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                探路
              </h1>
              <p className="text-sm font-medium tracking-widest text-emerald-400/80">
                PATHFINDING
              </p>
            </div>
          </div>

          {/* 标语 */}
          <h2 className="mb-4 max-w-md text-4xl font-bold leading-tight text-white xl:text-5xl">
            让每段旅程
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              成为独特的探索
            </span>
          </h2>
          <p className="mb-10 max-w-md text-lg leading-relaxed text-stone-300">
            AI 驱动的智能旅行规划平台，从灵感发现到行程落地，
            一站式解决所有旅行规划难题。
          </p>

          {/* 功能亮点 */}
          <div className="grid max-w-lg grid-cols-2 gap-4">
            {features.map(feature => (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-emerald-500/20 hover:bg-white/10"
              >
                <feature.icon className="mb-2 h-5 w-5 text-emerald-400 transition-transform group-hover:scale-110" />
                <h3 className="text-sm font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="relative z-10 flex items-center gap-2 px-12 pb-8 text-xs text-stone-500 xl:px-16">
          <Mountain className="h-3.5 w-3.5" />
          <span>© 2025 探路 Pathfinding</span>
          <span className="mx-2">·</span>
          <Map className="h-3.5 w-3.5" />
          <span>用 AI 探索世界</span>
        </div>
      </div>

      {/* ======= 右侧：登录表单区 ======= */}
      <div className="flex w-full flex-col justify-center bg-stone-50 px-6 py-12 sm:px-12 lg:w-[480px] lg:px-16 xl:w-[520px]">
        {/* 移动端 Logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <Compass className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">探路</h1>
            <p className="text-xs font-medium tracking-widest text-emerald-600">
              PATHFINDING
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          {/* 标题 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-stone-900">
              欢迎回来
            </h2>
            <p className="mt-2 text-stone-500">
              登录以开始规划你的下一段旅程
            </p>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 登录表单 */}
          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-700"
              >
                邮箱地址
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-stone-700"
                >
                  密码
                </label>
                <button
                  type="button"
                  className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  忘记密码？
                </button>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-sm"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 分割线 */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-stone-200" />
            <span className="text-xs text-stone-400">或</span>
            <div className="flex-1 border-t border-stone-200" />
          </div>

          {/* 注册链接 */}
          <p className="text-center text-sm text-stone-500">
            还没有账号？
            {' '}
            <Link
              href="/auth/signup"
              className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              立即注册
            </Link>
          </p>
        </div>

        {/* 移动端底部功能展示 */}
        <div className="mt-12 grid grid-cols-2 gap-3 lg:hidden">
          {features.map(feature => (
            <div
              key={feature.title}
              className="flex items-center gap-2.5 rounded-lg bg-white p-3 shadow-sm"
            >
              <feature.icon className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="text-xs font-medium text-stone-600">
                {feature.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
