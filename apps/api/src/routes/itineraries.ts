import { Hono } from "hono";
import { zValidator } from "npm:@hono/zod-validator";
import {
  CreateItinerarySchema,
  UpdateItinerarySchema,
  ItineraryListQuerySchema,
} from "../models/itinerary.ts";
import { ItineraryService } from "../services/itineraryService.ts";

type Variables = {
  userId: string;
  accessToken: string;
};

export const itinerariesRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /itineraries - List user's itineraries with pagination
 */
itinerariesRoutes.get("/", zValidator("query", ItineraryListQuerySchema), async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const query = c.req.valid("query");

  const { data, total } = await ItineraryService.list(userId, query, accessToken);

  return c.json({
    success: true,
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount: total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  });
});

/**
 * POST /itineraries - Create a new itinerary
 */
itinerariesRoutes.post("/", zValidator("json", CreateItinerarySchema), async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const input = c.req.valid("json");

  const itinerary = await ItineraryService.create(userId, input, accessToken);

  return c.json(
    {
      success: true,
      data: itinerary,
    },
    201
  );
});

/**
 * GET /itineraries/:id - Get itinerary by ID with days and items
 */
itinerariesRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const itineraryId = c.req.param("id");

  const itinerary = await ItineraryService.getById(itineraryId, userId, accessToken);

  return c.json({
    success: true,
    data: itinerary,
  });
});

/**
 * PATCH /itineraries/:id - Update an itinerary
 */
itinerariesRoutes.patch("/:id", zValidator("json", UpdateItinerarySchema), async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const itineraryId = c.req.param("id");
  const input = c.req.valid("json");

  const itinerary = await ItineraryService.update(itineraryId, userId, input, accessToken);

  return c.json({
    success: true,
    data: itinerary,
  });
});

/**
 * DELETE /itineraries/:id - Delete an itinerary
 */
itinerariesRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const accessToken = c.get("accessToken");
  const itineraryId = c.req.param("id");

  await ItineraryService.delete(itineraryId, userId, accessToken);

  return c.json({
    success: true,
    data: null,
  });
});

// Copy itinerary endpoint (US4)
itinerariesRoutes.post("/:id/copy", async (c) => {
  // TODO: T102 - Implement copy itinerary
  return c.json({ error: "Not implemented" }, 501);
});

// Public itineraries for community (US4)
itinerariesRoutes.get("/public", async (c) => {
  // TODO: T103 - Implement list public itineraries
  return c.json({ data: [], pagination: { total: 0, limit: 20, offset: 0 } });
});
