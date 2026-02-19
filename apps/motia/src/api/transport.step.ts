import { z } from "zod";

type TransportMode = "walking" | "driving" | "transit";

interface POI {
  name: string;
  latitude: number;
  longitude: number;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestNeighborTSP(matrix: number[][]): number[] {
  const n = matrix.length;
  if (n <= 1) return n === 0 ? [] : [0];
  const visited = new Set<number>([0]);
  const route = [0];
  let current = 0;

  while (visited.size < n) {
    let nearest = -1,
      minDist = Infinity;
    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && matrix[current][i] < minDist) {
        minDist = matrix[current][i];
        nearest = i;
      }
    }
    if (nearest === -1) break;
    route.push(nearest);
    visited.add(nearest);
    current = nearest;
  }
  return route;
}

const poiSchema = z.object({
  name: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
});
const bodySchema = z.object({
  pois: z.array(poiSchema).min(1),
  transportMode: z.enum(["walking", "driving", "transit"]),
});

export const config = {
  type: "api",
  name: "TransportOptimize",
  description: "交通路线优化 API",
  path: "/api/transport/optimize",
  method: "POST",
  emits: [],
  flows: ["transport"],
  bodySchema,
};

interface HandlerContext {
  logger: {
    info: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  };
}

export async function handler(
  req: { body?: unknown },
  { logger }: HandlerContext,
) {
  const parseResult = bodySchema.safeParse(req.body);
  if (!parseResult.success)
    return { status: 400, body: { error: parseResult.error.message } };

  const { pois, transportMode } = parseResult.data;
  const speeds: Record<TransportMode, number> = {
    walking: 5,
    driving: 40,
    transit: 25,
  };

  logger.info("Optimizing route", { count: pois.length, mode: transportMode });

  if (pois.length === 1) {
    return {
      status: 200,
      body: {
        optimizedOrder: [0],
        segments: [],
        savings: { distanceKm: 0, durationMinutes: 0 },
      },
    };
  }

  const matrix = pois.map((p1, i) =>
    pois.map((p2, j) =>
      i === j
        ? 0
        : (calculateDistance(
            p1.latitude,
            p1.longitude,
            p2.latitude,
            p2.longitude,
          ) /
            speeds[transportMode]) *
          60,
    ),
  );
  const optimizedOrder = nearestNeighborTSP(matrix);

  const segments = optimizedOrder.slice(0, -1).map((idx, i) => {
    const from = pois[idx],
      to = pois[optimizedOrder[i + 1]];
    const dist = calculateDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude,
    );
    const dur = (dist / speeds[transportMode]) * 60;
    return { from: from.name, to: to.name, distance: dist, duration: dur };
  });

  return {
    status: 200,
    body: {
      optimizedOrder,
      segments,
      savings: { distanceKm: 0, durationMinutes: 0 },
    },
  };
}
