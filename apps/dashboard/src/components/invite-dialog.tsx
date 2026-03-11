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
      setError('Please enter a user ID');
      return;
    }

    if (trimmedUserId === currentUserId) {
      setError('You cannot invite yourself');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await inviteMutation.mutateAsync(trimmedUserId);
      await queryClient.invalidateQueries({
        queryKey: ['itinerary-collaborators', itineraryId],
      });

      setSuccess(`Successfully invited ${trimmedUserId} as ${role}`);
      setUserId('');
      setRole('editor');

      timerRef.current = setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
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
              Invite Collaborator
            </h2>
            <p className="text-sm text-gray-500 mt-1">Add people to collaborate on this itinerary</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
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
                User ID or Email
              </label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="e.g., user-123 or email@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={inviteMutation.isPending}
              />
              <p className="text-xs text-gray-500">Enter the user ID or email of the person you want to invite</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={e => setRole(e.target.value as 'editor' | 'viewer')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all cursor-pointer"
                disabled={inviteMutation.isPending}
              >
                <option value="editor">Editor - Can add, edit, and remove POIs</option>
                <option value="viewer">Viewer - Can only view the itinerary</option>
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
                      Sending invitation...
                    </>
                  )
                : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Send Invitation
                    </>
                  )}
            </button>
          </form>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              Shareable links are temporarily disabled for security reasons.
              Please invite collaborators by user ID or email.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
