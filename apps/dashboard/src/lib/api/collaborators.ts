/**
 * Collaborator API client.
 *
 * Provides CRUD operations for itinerary collaborators via the
 * dashboard's `/api/itinerary-collaborators` proxy.
 *
 * @module
 */

import type {
  Collaborator,
  InviteCollaboratorInput,
  UpdateCollaboratorInput,
} from '@/types/api';
import { toNumericId } from '@/lib/utils';
import { createApiClient } from './client';

const collaboratorsClient = createApiClient('/api/itinerary-collaborators');

/**
 * List all collaborators for a given itinerary.
 *
 * @param itineraryId - The itinerary to list collaborators for.
 */
export function getCollaborators(itineraryId: string | number): Promise<{ data: Collaborator[] }> {
  return collaboratorsClient.get<{ data: Collaborator[] }>(`/?itineraryId=${itineraryId}`);
}

/** Input shape for the {@link inviteCollaborator} function. */
export interface InviteCollaboratorRequest {
  itineraryId: string | number;
  userId?: string | number;
  email?: string;
  role: InviteCollaboratorInput['role'];
}

/**
 * Invite a collaborator to an itinerary by user ID or email.
 *
 * @param input - Invitation details including role.
 */
export function inviteCollaborator(input: InviteCollaboratorRequest): Promise<{ data: Collaborator }> {
  return collaboratorsClient.post<{ data: Collaborator }>('/invite', {
    itineraryId: toNumericId(input.itineraryId),
    userId: input.userId === undefined ? undefined : toNumericId(input.userId),
    email: input.email,
    role: input.role,
  });
}

/**
 * Update a collaborator's role.
 *
 * @param collaboratorId - Collaborator record ID.
 * @param input - Fields to update (currently only `role`).
 */
export function updateCollaborator(
  collaboratorId: string | number,
  input: UpdateCollaboratorInput,
): Promise<{ data: Collaborator }> {
  return collaboratorsClient.patch<{ data: Collaborator }>(`/${toNumericId(collaboratorId)}`, input);
}

/**
 * Remove a collaborator from an itinerary.
 *
 * @param collaboratorId - Collaborator record ID to remove.
 */
export function removeCollaborator(collaboratorId: string | number): Promise<{ success: boolean }> {
  return collaboratorsClient.delete<{ success: boolean }>(`/${toNumericId(collaboratorId)}`);
}
