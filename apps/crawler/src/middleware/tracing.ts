/**
 * OpenTelemetry Tracing Middleware
 * Initialize distributed tracing for the crawler service
 */

import type { Span } from '@opentelemetry/api';
import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK
 */
export function initTracing(): void {
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const serviceName = process.env.OTEL_SERVICE_NAME || 'pathfinding-crawler';

  // Skip if no endpoint configured
  if (!otlpEndpoint || otlpEndpoint === 'http://localhost:4318') {
    console.warn('📊 OpenTelemetry: No endpoint configured, tracing disabled');
    return;
  }

  try {
    const exporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    });

    sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]:
          process.env.npm_package_version || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
          process.env.NODE_ENV || 'development',
      }),
      traceExporter: exporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingPaths: ['/health'],
          },
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ],
    });

    sdk.start();
    console.warn(`📊 OpenTelemetry: Tracing enabled for ${serviceName}`);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      sdk?.shutdown().then(
        () => console.warn('📊 OpenTelemetry: SDK shut down successfully'),
        (error: unknown) =>
          console.error('📊 OpenTelemetry: Error shutting down SDK', error)
      );
    });
  } catch (error) {
    console.error('📊 OpenTelemetry: Failed to initialize tracing', error);
  }
}

/**
 * Get the tracer instance
 */
export function getTracer(name: string = 'pathfinding-crawler') {
  return trace.getTracer(name);
}

/**
 * Create a new span for tracking operations
 */
export function createSpan(
  name: string,
  fn: (span: Span) => Promise<void>
): Promise<void> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, async (span: Span) => {
    try {
      await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Add attributes to the current span
 */
export function setSpanAttributes(
  attributes: Record<string, string | number | boolean>
): void {
  const span = trace.getActiveSpan();
  if (span) {
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }
  }
}

/**
 * Record an exception on the current span
 */
export function recordException(error: Error): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

/**
 * Get the current trace context
 */
export function getCurrentContext() {
  return context.active();
}

/**
 * Shutdown the OpenTelemetry SDK
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
  }
}
