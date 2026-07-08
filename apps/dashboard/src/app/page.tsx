'use client';

/**
 * Landing page: Sunpebble Trips login and product entry.
 */

import {
  Compass,
  Globe,
  Loader2,
  Map,
  Mountain,
  Route,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TopographicBackground } from '@/components/ui/topographic-background';
import { useAuthContext as useAuth } from '@/providers/auth-provider';

const features = [
  {
    icon: Sparkles,
    title: 'AI 辅助规划',
    description: '生成可编辑的初稿，而不是替你做决定',
  },
  {
    icon: Map,
    title: '地点整理',
    description: '把景点、餐厅和交通放进清晰日程',
  },
  {
    icon: Route,
    title: '灵活行程',
    description: '每天的安排都能继续手动调整',
  },
  {
    icon: Globe,
    title: '跨设备',
    description: 'Web 与 iOS 使用同一套 Sunpebble 服务',
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
          <Compass className="h-8 w-8 animate-spin text-amber-600" />
          <p className="text-sm text-stone-500">正在准备 Sunpebble Trips...</p>
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
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#232733] via-stone-950 to-[#151821] lg:flex">
        {/* 地形图背景 */}
        <TopographicBackground
          lineCount={16}
          animated
          variant="dark"
          className="opacity-60"
        />

        {/* 品牌内容 */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-16">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-300/15 text-amber-300 ring-1 ring-amber-300/25">
              <Route className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Sunpebble Trips
              </h1>
              <p className="text-sm font-medium tracking-widest text-amber-300/80">
                SMALL, POLISHED APPS.
              </p>
            </div>
          </div>

          {/* 标语 */}
          <h2 className="mb-4 max-w-md text-4xl font-bold leading-tight text-white xl:text-5xl">
            把旅程
            <br />
            <span className="text-amber-300">
              安静地整理好
            </span>
          </h2>
          <p className="mb-10 max-w-md text-lg leading-relaxed text-stone-300">
            一个 Sunpebble 风格的小工具：规划行程、整理地点、同步细节，
            不用依赖来源不清的外部内容。
          </p>

          {/* 功能亮点 */}
          <div className="grid max-w-lg grid-cols-2 gap-4">
            {features.map(feature => (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:border-amber-300/20 hover:bg-white/10"
              >
                <feature.icon className="mb-2 h-5 w-5 text-amber-300 transition-transform group-hover:scale-110" />
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
          <span>© 2026 Sunpebble</span>
          <span className="mx-2">·</span>
          <Map className="h-3.5 w-3.5" />
          <span>Sunpebble Trips</span>
        </div>
      </div>

      {/* ======= 右侧：登录表单区 ======= */}
      <div className="flex w-full flex-col justify-center bg-stone-50 px-6 py-12 sm:px-12 lg:w-[480px] lg:px-16 xl:w-[520px]">
        {/* 移动端 Logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <Route className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Sunpebble Trips</h1>
            <p className="text-xs font-medium tracking-widest text-amber-700">
              SMALL, POLISHED APPS.
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
              登录以继续整理你的行程
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
                className="mt-1.5 block w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-colors"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-stone-700"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-colors"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F7B733] px-4 py-2.5 font-medium text-[#232733] shadow-sm transition-all hover:bg-amber-300 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-sm"
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
              className="font-medium text-amber-700 transition-colors hover:text-amber-800"
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
              <feature.icon className="h-4 w-4 shrink-0 text-amber-600" />
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
