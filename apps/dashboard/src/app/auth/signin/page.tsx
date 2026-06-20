'use client';

import { Compass, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TopographicBackground } from '@/components/ui/topographic-background';
import { useAuthContext as useAuth } from '@/providers/auth-provider';

export default function SignInPage() {
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
        <Compass className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (isAuthenticated)
    return null;

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn({ email, password });
      router.push('/overview');
    }
    catch (err) {
      setError(
        err instanceof Error ? err.message : '登录失败，请重试。',
      );
    }
    finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12">
      {/* Background */}
      <TopographicBackground lineCount={10} className="opacity-40" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo & Header */}
        <div className="text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <Compass className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900">
            欢迎回到探路
          </h1>
          <p className="mt-2 text-stone-500">
            登录以访问你的旅行仪表盘
          </p>
        </div>

        {/* Sign In Form */}
        <div className="rounded-2xl border border-stone-200/60 bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-5">
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
                  className="text-xs text-emerald-600 hover:text-emerald-700"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-500">
            还没有账号？
            {' '}
            <Link href="/auth/signup" className="font-medium text-emerald-600 hover:text-emerald-700">
              立即注册
            </Link>
          </div>
        </div>

        {/* Back to Landing */}
        <div className="text-center">
          <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
