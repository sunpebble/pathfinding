'use client';

import type * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  DashboardCard,
  DashboardEmptyState,
  DashboardLoadingState,
  DashboardPageHeader,
} from '@/components/ui/dashboard-primitives';
import { useAuthContext as useAuth } from '@/providers/auth-provider';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
  });

  const fetchProfile = useCallback(async () => {
    if (authLoading)
      return;

    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          (errorData as Record<string, string> | null)?.error
          ?? `加载个人资料失败 (${res.status})`,
        );
      }
      const data = await res.json();
      setProfile(data.data);
      setFormData({
        displayName: data.data?.display_name ?? '',
        bio: data.data?.bio ?? '',
      });
      setError(null);
    }
    catch (err) {
      console.error('获取个人资料失败:', err);
      setError(err instanceof Error ? err.message : '加载个人资料失败');
    }
    finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user, token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!user || !token)
      return;

    try {
      const updateRes = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => null);
        throw new Error(
          (errorData as Record<string, string> | null)?.error
          ?? `更新个人资料失败 (${updateRes.status})`,
        );
      }
      setEditing(false);
      setError(null);
      // Refresh profile
      const res = await fetch(`/api/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`重新加载个人资料失败 (${res.status})`);
      }
      const data = await res.json();
      setProfile(data.data);
    }
    catch (err) {
      console.error('更新个人资料失败:', err);
      setError(err instanceof Error ? err.message : '更新个人资料失败');
    }
  };

  if (loading || authLoading) {
    return <DashboardLoadingState label="加载个人资料中" />;
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader title="个人资料" description="管理你的账户资料" />
        {error
          ? <DashboardCard className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</DashboardCard>
          : <DashboardEmptyState icon={UserIcon} title="请登录以查看个人资料" />}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <DashboardPageHeader title="个人资料" description="管理你的账户资料" />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DashboardCard className="space-y-6 p-6">
        {/* Avatar and name */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-bold text-emerald-700 ring-1 ring-emerald-200">
            {profile.display_name?.[0] ?? profile.name?.[0] ?? '?'}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile.display_name ?? profile.name}</h2>
            <p className="text-stone-500">{profile.email}</p>
          </div>
        </div>

        {/* Bio */}
        {editing
          ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    显示名称
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="dashboard-control w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    简介
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="dashboard-control w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus-explorer"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus-explorer"
                  >
                    取消
                  </button>
                </div>
              </div>
            )
          : (
              <div>
                <p className="text-stone-700">{profile.bio ?? '暂无简介'}</p>
                <button
                  onClick={() => setEditing(true)}
                  className="mt-4 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 focus-explorer"
                >
                  编辑资料
                </button>
              </div>
            )}

        {/* Joined date */}
        <p className="text-sm text-stone-400">
          加入于
          {' '}
          {new Date(profile.created_at).toLocaleDateString()}
        </p>
      </DashboardCard>
    </div>
  );
}

function UserIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
