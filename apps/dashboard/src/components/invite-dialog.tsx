'use client';

import { api } from '@pathfinding/convex-client';
import { useMutation } from 'convex/react';
import { Check, Mail, UserPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { toConvexId } from '@/types/convex';

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itineraryId: string;
  currentUserId: string;
}

export function InviteDialog({
  isOpen,
  onClose,
  itineraryId,
  currentUserId,
}: InviteDialogProps) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current)
        clearTimeout(timerRef.current);
    },
    [],
  );

  const inviteCollaborator = useMutation(
    api.itineraryCollaborators.inviteCollaborator,
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!userId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    if (userId === currentUserId) {
      setError('You cannot invite yourself');
      return;
    }

    setIsInviting(true);
    setError('');
    setSuccess('');

    try {
      await inviteCollaborator({
        itineraryId: toConvexId<'itineraries'>(itineraryId),
        userId: userId.trim(),
        role,
        invitedBy: currentUserId,
      });

      setSuccess(`Successfully invited ${userId} as ${role}`);
      setUserId('');
      setRole('editor');

      timerRef.current = setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    }
    catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send invitation',
      );
    }
    finally {
      setIsInviting(false);
    }
  };

  if (!isOpen)
    return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              Invite Collaborator
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Add people to collaborate on this itinerary
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <Check className="h-4 w-4" />
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Invite by User ID Form */}
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="userId"
                className="text-sm font-medium text-gray-700 flex items-center gap-2"
              >
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
                disabled={isInviting}
              />
              <p className="text-xs text-gray-500">
                Enter the user ID or email of the person you want to invite
              </p>
            </div>

            {/* Role Selector */}
            <div className="space-y-2">
              <label
                htmlFor="role"
                className="text-sm font-medium text-gray-700"
              >
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={e => setRole(e.target.value as 'editor' | 'viewer')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all cursor-pointer"
                disabled={isInviting}
              >
                <option value="editor">
                  Editor - Can add, edit, and remove POIs
                </option>
                <option value="viewer">
                  Viewer - Can only view the itinerary
                </option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isInviting || !userId.trim()}
              className={cn(
                'w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
                (isInviting || !userId.trim())
                && 'opacity-50 cursor-not-allowed hover:bg-emerald-600',
              )}
            >
              {isInviting
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

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <button
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
