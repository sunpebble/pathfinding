/**
 * Tracing Middleware
 * Simple structured logging for the crawler service
 */

interface TraceContext {
  traceId: string;
  spanId: string;
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

let currentContext: TraceContext = {
  traceId: generateId(),
  spanId: generateId(),
};

/**
 * Initialize tracing
 */
export function initTracing(): void {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'pathfinding-crawler';
  console.log(`📊 Tracing initialized for ${serviceName}`);

  // Reset context on startup
  currentContext = {
    traceId: generateId(),
    spanId: generateId(),
  };
}

/**
 * Get the tracer instance (dummy implementation for compatibility)
 */
export function getTracer(name: string = 'pathfinding-crawler') {
  return {
    name,
    startActiveSpan: async (
      spanName: string,
      fn: (span: any) => Promise<void>
    ) => {
      const span = {
        name: spanName,
        attributes: {} as Record<string, any>,
        setAttribute: (key: string, value: any) => {
          span.attributes[key] = value;
        },
        setStatus: () => {},
        recordException: () => {},
        end: () => {},
      };
      await fn(span);
    },
  };
}

/**
 * Create a new span for tracking operations
 */
export async function createSpan<T>(
  name: string,
  fn: (span: any) => Promise<T>
): Promise<T> {
  const span = {
    name,
    attributes: {} as Record<string, any>,
    setAttribute: (key: string, value: any) => {
      span.attributes[key] = value;
    },
    setStatus: () => {},
    recordException: () => {},
    end: () => {},
  };

  try {
    console.log(`[SPAN] ${name} started`);
    const result = await fn(span);
    console.log(`[SPAN] ${name} completed successfully`);
    return result;
  } catch (error) {
    console.error(`[SPAN] ${name} failed:`, error);
    throw error;
  }
}

/**
 * Add attributes to the current span
 */
export function setSpanAttributes(
  attributes: Record<string, string | number | boolean>
): void {
  console.debug('[ATTRIBUTES]', attributes);
}

/**
 * Record an exception on the current span
 */
export function recordException(error: Error): void {
  console.error('[EXCEPTION]', error);
}

/**
 * Get the current trace context
 */
export function getCurrentContext(): TraceContext {
  return currentContext;
}

/**
 * Shutdown tracing
 */
export async function shutdownTracing(): Promise<void> {
  console.log('📊 Tracing shutdown');
}
