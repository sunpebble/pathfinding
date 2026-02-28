'use client';

import { api } from '@pathfinding/convex-client';
import { useMutation } from 'convex/react';
import {
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toConvexId } from '@/types/convex';

interface Collaborator {
  _id: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'rejected';
}

interface CollaboratorPanelProps {
  itineraryId: string;
  collaborators: Collaborator[];
  currentUserId: string;
  isOwner: boolean;
}

export function CollaboratorPanel({
  itineraryId,
  collaborators,
  currentUserId,
  isOwner,
}: CollaboratorPanelProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const removeCollaborator = useMutation(
    api.itineraryCollaborators.removeCollaborator,
  );
  const updateRole = useMutation(api.itineraryCollaborators.updateRole);

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-800 border-purple-200',
    editor: 'bg-blue-100 text-blue-800 border-blue-200',
    viewer: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const roleIcons = {
    owner: Shield,
    editor: UserCheck,
    viewer: UserMinus,
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    accepted: 'Active',
    rejected: 'Rejected',
  };

  const statusColors: Record<string, string> = {
    pending: 'text-amber-600',
    accepted: 'text-emerald-600',
    rejected: 'text-red-600',
  };

  const handleRemove = async (collaboratorId: string, userId: string) => {
    if (userId === currentUserId) {
      setError('You cannot remove yourself');
      return;
    }

    setRemovingId(collaboratorId);
    setError('');

    try {
      await removeCollaborator({
        itineraryId: toConvexId<'itineraries'>(itineraryId),
        userId,
        removedBy: currentUserId,
      });
    }
    catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove collaborator',
      );
    }
    finally {
      setRemovingId(null);
    }
  };

  const handleRoleChange = async (
    collaboratorId: string,
    userId: string,
    newRole: 'editor' | 'viewer',
  ) => {
    setUpdatingRoleId(collaboratorId);
    setError('');

    try {
      await updateRole({
        itineraryId: toConvexId<'itineraries'>(itineraryId),
        userId,
        newRole,
        updatedBy: currentUserId,
      });
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
    finally {
      setUpdatingRoleId(null);
    }
  };

  if (collaborators.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" />
          Collaborators
        </h3>
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No collaborators yet</p>
          {isOwner && (
            <p className="text-gray-400 text-xs mt-1">
              Invite people to collaborate on this itinerary
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-emerald-600" />
        Collaborators (
        {collaborators.length}
        )
      </h3>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {collaborators.map((collab) => {
          const RoleIcon = roleIcons[collab.role];
          const isCurrentUser = collab.userId === currentUserId;
          const canRemove
            = isOwner && collab.role !== 'owner' && !isCurrentUser;
          const canChangeRole
            = isOwner && collab.role !== 'owner' && !isCurrentUser;
          const isRemoving = removingId === collab._id;
          const isUpdating = updatingRoleId === collab._id;

          return (
            <div
              key={collab._id}
              className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                  {collab.userId.slice(0, 2).toUpperCase()}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {collab.userId}
                    </p>
                    {isCurrentUser && (
                      <span className="text-xs text-emerald-600 font-medium">
                        (You)
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-xs font-medium',
                      statusColors[collab.status],
                    )}
                  >
                    {statusLabels[collab.status]}
                  </p>
                </div>

                {/* Role Badge/Selector */}
                <div className="flex items-center gap-2">
                  {canChangeRole && collab.status === 'accepted'
                    ? (
                        <select
                          value={collab.role}
                          onChange={e =>
                            handleRoleChange(
                              collab._id,
                              collab.userId,
                              e.target.value as 'editor' | 'viewer',
                            )}
                          disabled={isUpdating}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors',
                            roleColors[collab.role],
                            isUpdating && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )
                    : (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border',
                            roleColors[collab.role],
                          )}
                        >
                          <RoleIcon className="h-3.5 w-3.5" />
                          {collab.role.charAt(0).toUpperCase()
                            + collab.role.slice(1)}
                        </span>
                      )}
                </div>

                {/* Remove Button */}
                {canRemove && (
                  <button
                    onClick={() => handleRemove(collab._id, collab.userId)}
                    disabled={isRemoving}
                    className={cn(
                      'p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors',
                      isRemoving && 'opacity-50 cursor-not-allowed',
                    )}
                    title="Remove collaborator"
                    aria-label={isRemoving ? 'Removing collaborator' : 'Remove collaborator'}
                  >
                    {isRemoving
                      ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        )
                      : (
                          <Trash2 className="h-4 w-4" />
                        )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      {isOwner && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 flex items-start gap-2">
            <Shield className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              As the owner, you can change roles and remove collaborators.
              <strong className="block mt-1">Editor:</strong>
              {' '}
              Can add, edit, and
              remove POIs.
              <strong className="block mt-1">Viewer:</strong>
              {' '}
              Can only view the
              itinerary.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
