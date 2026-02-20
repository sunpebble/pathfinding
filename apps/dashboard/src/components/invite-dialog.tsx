'use client';

import { api } from '@pathfinding/convex-client';
import { useMutation } from 'convex/react';
import { Check, Copy, Link2, Mail, UserPlus } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [shareableLinkCopied, setShareableLinkCopied] = useState(false);

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

      // Auto-close after 2 seconds on success
      setTimeout(() => {
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

  const generateShareableLink = () => {
    // Generate a shareable link with itinerary ID and role
    const baseUrl = window.location.origin;
    const shareToken = btoa(`${itineraryId}:${role}:${Date.now()}`);
    return `${baseUrl}/itineraries/accept?token=${shareToken}`;
  };

  const handleCopyLink = async () => {
    const link = generateShareableLink();
    try {
      await navigator.clipboard.writeText(link);
      setShareableLinkCopied(true);
      setTimeout(() => setShareableLinkCopied(false), 2000);
    }
    catch {
      setError('Failed to copy link to clipboard');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            Invite Collaborator
          </DialogTitle>
          <DialogDescription>
            Add people to collaborate on this itinerary
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
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

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500">Or</span>
            </div>
          </div>

          {/* Shareable Link Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Shareable Link
            </label>
            <p className="text-xs text-gray-500">
              Generate a link that anyone can use to join as a
              {' '}
              {role}
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={generateShareableLink()}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
                  shareableLinkCopied
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200',
                )}
              >
                {shareableLinkCopied
                  ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    )
                  : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong>
                {' '}
                Anyone with this link can join your
                itinerary. The link will grant them
                {role}
                {' '}
                access.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-end border-t border-gray-200 pt-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
