import type {
  Collaborator,
  InviteCollaboratorInput,
  UpdateCollaboratorInput,
} from '@/types/api';
import { createApiClient } from './client';

const collaboratorsClient = createApiClient('/api/itinerary-collaborators');

function toNumericId(value: string | number) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric ID: ${value}`);
  }

  return parsed;
}

export function getCollaborators(itineraryId: string | number) {
  return collaboratorsClient.get<{ data: Collaborator[] }>(`/?itineraryId=${itineraryId}`);
}

export interface InviteCollaboratorRequest {
  itineraryId: string | number;
  userId?: string | number;
  email?: string;
  role: InviteCollaboratorInput['role'];
}

export function inviteCollaborator(input: InviteCollaboratorRequest) {
  return collaboratorsClient.post<{ data: Collaborator }>('/invite', {
    itineraryId: toNumericId(input.itineraryId),
    userId: input.userId === undefined ? undefined : toNumericId(input.userId),
    email: input.email,
    role: input.role,
  });
}

export function updateCollaborator(
  collaboratorId: string | number,
  input: UpdateCollaboratorInput,
) {
  return collaboratorsClient.patch<{ data: Collaborator }>(`/${toNumericId(collaboratorId)}`, input);
}

export function removeCollaborator(collaboratorId: string | number) {
  return collaboratorsClient.delete<{ success: boolean }>(`/${toNumericId(collaboratorId)}`);
}
