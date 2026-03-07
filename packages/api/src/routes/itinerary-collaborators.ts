import type { AuthVariables } from '../middleware/auth.js';
import { zValidator } from '@hono/zod-validator';
import {
  createDb,
  itineraries,
  itineraryCollaborators,
  users,
} from '@pathfinding/database';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { convertKeysToSnakeCase } from '../lib/case-converter.js';
import { authRequired } from '../middleware/auth.js';

const app = new Hono<{ Variables: AuthVariables }>();

function getDb() {
  return createDb();
}

async function getOwnedItinerary(
  itineraryId: number,
  userId: number,
) {
  const db = getDb();

  const result = await db
    .select()
    .from(itineraries)
    .where(and(eq(itineraries.id, itineraryId), eq(itineraries.userId, userId)))
    .limit(1);

  return result[0] ?? null;
}

async function getAccessibleItinerary(
  itineraryId: number,
  userId: number,
) {
  const ownedItinerary = await getOwnedItinerary(itineraryId, userId);
  if (ownedItinerary) {
    return ownedItinerary;
  }

  const db = getDb();
  const collaboratorRows = await db
    .select()
    .from(itineraryCollaborators)
    .where(
      and(
        eq(itineraryCollaborators.itineraryId, itineraryId),
        eq(itineraryCollaborators.userId, userId),
      ),
    )
    .limit(1);

  if (!collaboratorRows[0]) {
    return null;
  }

  const itineraryRows = await db
    .select()
    .from(itineraries)
    .where(eq(itineraries.id, itineraryId))
    .limit(1);

  return itineraryRows[0] ?? null;
}

function parsePositiveInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isDuplicateError(error: unknown) {
  return error instanceof Error
    && ('code' in error)
    && (error as Error & { code?: string }).code === 'ER_DUP_ENTRY';
}

const inviteCollaboratorSchema = z
  .object({
    itineraryId: z.number().int().positive(),
    userId: z.number().int().positive().optional(),
    email: z.string().email().optional(),
    role: z.enum(['viewer', 'editor']),
  })
  .refine(body => body.userId !== undefined || body.email !== undefined, {
    message: 'userId or email is required',
  });

const updateCollaboratorSchema = z.object({
  role: z.enum(['viewer', 'editor']),
});

app.get('/', authRequired(), async (c) => {
  const itineraryId = parsePositiveInt(c.req.query('itineraryId') ?? '');
  const authUserId = parsePositiveInt(c.get('userId'));

  if (!authUserId) {
    return c.json({ error: 'Invalid authenticated user' }, 401);
  }

  if (!itineraryId) {
    return c.json({ error: 'Invalid itinerary ID' }, 400);
  }

  const accessibleItinerary = await getAccessibleItinerary(itineraryId, authUserId);
  if (!accessibleItinerary) {
    return c.json({ error: 'Itinerary not found or access denied' }, 403);
  }

  const db = getDb();
  const ownerRows = await db
    .select()
    .from(users)
    .where(eq(users.id, accessibleItinerary.userId))
    .limit(1);
  const ownerUser = ownerRows[0] ?? null;

  const collaboratorRows = await db
    .select()
    .from(itineraryCollaborators)
    .where(eq(itineraryCollaborators.itineraryId, itineraryId))
    .limit(1000);

  const collaboratorUserIds = collaboratorRows.map(row => row.userId);
  const collaboratorUsers = collaboratorUserIds.length > 0
    ? await db
        .select()
        .from(users)
        .where(inArray(users.id, collaboratorUserIds))
        .limit(collaboratorUserIds.length)
    : [];

  const usersById = new Map(collaboratorUsers.map(user => [user.id, user]));
  const data = [
    {
      id: `owner-${itineraryId}`,
      itineraryId,
      userId: accessibleItinerary.userId,
      role: 'owner' as const,
      user: ownerUser,
    },
    ...collaboratorRows.map(row => ({
      ...row,
      user: usersById.get(row.userId) ?? null,
    })),
  ];

  return c.json({ data: convertKeysToSnakeCase(data) });
});

app.post(
  '/invite',
  authRequired(),
  zValidator('json', inviteCollaboratorSchema),
  async (c) => {
    const authUserId = parsePositiveInt(c.get('userId'));
    const body = c.req.valid('json');

    if (!authUserId) {
      return c.json({ error: 'Invalid authenticated user' }, 401);
    }

    const ownedItinerary = await getOwnedItinerary(body.itineraryId, authUserId);
    if (!ownedItinerary) {
      return c.json({ error: 'Itinerary not found or access denied' }, 403);
    }

    const db = getDb();
    const matchedUsers = await db
      .select()
      .from(users)
      .where(
        body.userId !== undefined
          ? eq(users.id, body.userId)
          : eq(users.email, body.email!),
      )
      .limit(1);
    const targetUser = matchedUsers[0];

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (targetUser.id === ownedItinerary.userId) {
      return c.json({ error: 'Owner is already a collaborator' }, 400);
    }

    const existingCollaborator = await db
      .select()
      .from(itineraryCollaborators)
      .where(
        and(
          eq(itineraryCollaborators.itineraryId, body.itineraryId),
          eq(itineraryCollaborators.userId, targetUser.id),
        ),
      )
      .limit(1);

    if (existingCollaborator[0]) {
      return c.json({ error: 'Collaborator already exists' }, 409);
    }

    let result: { id: number } | undefined;

    try {
      [result] = await db
        .insert(itineraryCollaborators)
        .values({
          itineraryId: body.itineraryId,
          userId: targetUser.id,
          role: body.role,
        })
        .$returningId();
    }
    catch (error) {
      if (isDuplicateError(error)) {
        return c.json({ error: 'Collaborator already exists' }, 409);
      }

      throw error;
    }

    return c.json(
      {
        data: convertKeysToSnakeCase({
          id: result!.id,
          itineraryId: body.itineraryId,
          userId: targetUser.id,
          role: body.role,
        }),
      },
      201,
    );
  },
);

app.patch(
  '/:id',
  authRequired(),
  zValidator('json', updateCollaboratorSchema),
  async (c) => {
    const collaboratorId = parsePositiveInt(c.req.param('id'));
    const authUserId = parsePositiveInt(c.get('userId'));
    const body = c.req.valid('json');

    if (!authUserId) {
      return c.json({ error: 'Invalid authenticated user' }, 401);
    }

    if (!collaboratorId) {
      return c.json({ error: 'Invalid collaborator ID' }, 400);
    }

    const db = getDb();
    const collaboratorRows = await db
      .select()
      .from(itineraryCollaborators)
      .where(eq(itineraryCollaborators.id, collaboratorId))
      .limit(1);
    const collaborator = collaboratorRows[0];

    if (!collaborator) {
      return c.json({ error: 'Collaborator not found' }, 404);
    }

    const ownedItinerary = await getOwnedItinerary(collaborator.itineraryId, authUserId);
    if (!ownedItinerary) {
      return c.json({ error: 'Itinerary not found or access denied' }, 403);
    }

    await db
      .update(itineraryCollaborators)
      .set({ role: body.role })
      .where(eq(itineraryCollaborators.id, collaboratorId));

    return c.json({
      data: convertKeysToSnakeCase({
        ...collaborator,
        role: body.role,
      }),
    });
  },
);

app.delete('/:id', authRequired(), async (c) => {
  const collaboratorId = parsePositiveInt(c.req.param('id'));
  const authUserId = parsePositiveInt(c.get('userId'));

  if (!authUserId) {
    return c.json({ error: 'Invalid authenticated user' }, 401);
  }

  if (!collaboratorId) {
    return c.json({ error: 'Invalid collaborator ID' }, 400);
  }

  const db = getDb();
  const collaboratorRows = await db
    .select()
    .from(itineraryCollaborators)
    .where(eq(itineraryCollaborators.id, collaboratorId))
    .limit(1);
  const collaborator = collaboratorRows[0];

  if (!collaborator) {
    return c.json({ error: 'Collaborator not found' }, 404);
  }

  const ownedItinerary = await getOwnedItinerary(collaborator.itineraryId, authUserId);
  if (!ownedItinerary) {
    return c.json({ error: 'Itinerary not found or access denied' }, 403);
  }

  await db
    .delete(itineraryCollaborators)
    .where(eq(itineraryCollaborators.id, collaboratorId));

  return c.json({
    success: true,
    data: convertKeysToSnakeCase(collaborator),
  });
});

export default app;
