'use client';

import { Compass, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TopographicBackground } from '@/components/ui/topographic-background';
import { useAuthContext as useAuth } from '@/providers/auth-provider';

export default function SignUpPage() {
  const { isAuthenticated, isLoading: authLoading, signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8)
      return '密码长度至少为 8 位';
    if (!/[A-Z]/.test(pwd))
      return '密码需包含至少一个大写字母';
    if (!/[a-z]/.test(pwd))
      return '密码需包含至少一个小写字母';
    if (!/\d/.test(pwd))
      return '密码需包含至少一个数字';
    return null;
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      await signUp({ email, password });
      router.push('/overview');
    }
    catch (err) {
      setError(
        err instanceof Error ? err.message : '注册失败，请重试。',
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
            创建账号
          </h1>
          <p className="mt-2 text-stone-500">
            开始整理你的下一段行程
          </p>
        </div>

        {/* Sign Up Form */}
        <div className="rounded-2xl border border-stone-200/60 bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignUp} className="space-y-5">
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
                className="mt-1.5 block w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <p className="mt-1.5 text-xs text-stone-400">
                至少 8 位，包含大写字母、小写字母和数字
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-stone-700"
              >
                确认密码
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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
              {isLoading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-500">
            已有账号？
            {' '}
            <Link href="/auth/signin" className="font-medium text-emerald-600 hover:text-emerald-700">
              立即登录
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
