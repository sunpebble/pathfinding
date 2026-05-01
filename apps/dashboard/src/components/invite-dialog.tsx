'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Mail, UserPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { inviteCollaborator } from '@/lib/api/collaborators';
import { cn } from '@/lib/utils';

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itineraryId: string;
  currentUserId: string;
}

function parseInvitee(value: string) {
  const trimmedValue = value.trim();
  const placeholderUserIdMatch = /^user-(\d+)$/i.exec(trimmedValue);

  if (placeholderUserIdMatch) {
    return { userId: Number.parseInt(placeholderUserIdMatch[1]!, 10) };
  }

  if (trimmedValue.includes('@')) {
    return { email: trimmedValue };
  }

  const numericUserId = Number.parseInt(trimmedValue, 10);
  if (Number.isInteger(numericUserId) && numericUserId > 0) {
    return { userId: numericUserId };
  }

  return { email: trimmedValue };
}

export function InviteDialog({
  isOpen,
  onClose,
  itineraryId,
  currentUserId,
}: InviteDialogProps) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inviteMutation = useMutation({
    mutationFn: (value: string) => inviteCollaborator({
      itineraryId: Number.parseInt(itineraryId, 10),
      role,
      ...parseInvitee(value),
    }),
  });

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      setError('请输入用户 ID');
      return;
    }

    if (trimmedUserId === currentUserId) {
      setError('不能邀请自己');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await inviteMutation.mutateAsync(trimmedUserId);
      await queryClient.invalidateQueries({
        queryKey: ['itinerary-collaborators', itineraryId],
      });

      setSuccess(`成功邀请 ${trimmedUserId} 为 ${role === 'editor' ? '编辑者' : '浏览者'}`);
      setUserId('');
      setRole('editor');

      timerRef.current = setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '发送邀请失败');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              邀请协作者
            </h2>
            <p className="text-sm text-gray-500 mt-1">邀请他人协作编辑此行程</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <Check className="h-4 w-4" />
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="userId" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                用户 ID 或邮箱
              </label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="例如：user-123 或 email@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={inviteMutation.isPending}
              />
              <p className="text-xs text-gray-500">输入你想邀请的人的用户 ID 或邮箱</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium text-gray-700">
                角色
              </label>
              <select
                id="role"
                value={role}
                onChange={e => setRole(e.target.value as 'editor' | 'viewer')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all cursor-pointer"
                disabled={inviteMutation.isPending}
              >
                <option value="editor">编辑者 - 可以添加、编辑和移除兴趣点</option>
                <option value="viewer">浏览者 - 只能查看行程</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={inviteMutation.isPending || !userId.trim()}
              className={cn(
                'w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
                (inviteMutation.isPending || !userId.trim()) && 'opacity-50 cursor-not-allowed hover:bg-emerald-600',
              )}
            >
              {inviteMutation.isPending
                ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      发送邀请中...
                    </>
                  )
                : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      发送邀请
                    </>
                  )}
            </button>
          </form>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              出于安全原因，可分享链接暂时禁用。
              请通过用户 ID 或邮箱邀请协作者。
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
