import { createMiddleware } from "hono/factory";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import type { Context, Next } from "hono";

const tracer = trace.getTracer("pathfinding-api", "1.0.0");

/**
 * OpenTelemetry tracing middleware
 * Creates spans for each request with travel-specific context
 */
export const tracingMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const method = c.req.method;
  const path = c.req.path;
  const spanName = `${method} ${path}`;

  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      // Add request attributes
      span.setAttribute("http.method", method);
      span.setAttribute("http.url", c.req.url);
      span.setAttribute("http.route", path);

      // Add user context if available (set by auth middleware)
      const userId = c.get("userId");
      if (userId) {
        span.setAttribute("user.id", userId);
      }

      // Extract travel-specific context from request
      const tripId = c.req.param("id");
      if (tripId && path.includes("/itineraries")) {
        span.setAttribute("travel.itinerary_id", tripId);
      }

      await next();

      // Add response attributes
      span.setAttribute("http.status_code", c.res.status);

      if (c.res.status >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${c.res.status}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
});
