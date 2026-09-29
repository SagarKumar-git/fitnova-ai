/**
 * FitNova AI — Centralized Platform API Client
 * Enterprise-grade fetch abstraction with offline detection, timeouts,
 * request correlation, latency telemetry, error normalization, and safe retry policy.
 */

import {
  FitNovaError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  TimeoutError,
} from '../errors/index.ts';
import type { NetworkService } from './NetworkService.ts';
import type { TelemetryService } from '../telemetry/TelemetryService.ts';
import type { Logger } from '../logging/Logger.ts';
import type { EventBus } from '../events/EventBus.ts';

export interface ApiClientConfig {
  baseUrl?: string;
  defaultTimeoutMs?: number;
  maxRetries?: number;
  networkService?: NetworkService;
  telemetryService?: TelemetryService;
  eventBus?: EventBus;
  logger?: Logger;
  getToken?: () => string | null;
  onAuthError?: (statusCode: number) => void;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  skipAuth?: boolean;
  correlationId?: string;
  idempotencyKey?: string;
  deduplicate?: boolean;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly networkService?: NetworkService;
  private readonly telemetryService?: TelemetryService;
  private readonly eventBus?: EventBus;
  private readonly logger?: Logger;
  private readonly getToken?: () => string | null;
  private readonly onAuthError?: (statusCode: number) => void;
  private readonly inFlightRequests = new Map<string, Promise<unknown>>();
  private counter = 0;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl?.replace(/\/+$/, '') ?? '';
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 15000;
    this.maxRetries = config.maxRetries ?? 2;
    this.networkService = config.networkService;
    this.telemetryService = config.telemetryService;
    this.eventBus = config.eventBus;
    this.logger = config.logger;
    this.getToken = config.getToken;
    this.onAuthError = config.onAuthError;
  }

  private generateCorrelationId(): string {
    return `req_${Date.now()}_${++this.counter}`;
  }

  private isIdempotent(method: string = 'GET'): boolean {
    const m = method.toUpperCase();
    return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
  }

  private isRetryableStatus(status: number): boolean {
    return status === 502 || status === 503 || status === 504 || status === 408;
  }

  async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const shouldDedup = options.deduplicate !== false && (method !== 'GET' || options.deduplicate === true);
    const bodyStr = typeof options.body === 'string' ? options.body : '';
    const dedupKey = shouldDedup ? `${method}:${endpoint}:${bodyStr}` : '';

    if (dedupKey && this.inFlightRequests.has(dedupKey)) {
      return this.inFlightRequests.get(dedupKey) as Promise<T>;
    }

    const requestPromise = this.executeRequest<T>(endpoint, options, method);

    if (dedupKey) {
      this.inFlightRequests.set(dedupKey, requestPromise);
      requestPromise
        .catch(() => {})
        .finally(() => {
          this.inFlightRequests.delete(dedupKey);
        });
    }

    return requestPromise;
  }

  private async executeRequest<T = unknown>(
    endpoint: string,
    options: RequestOptions,
    method: string
  ): Promise<T> {
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const correlationId = options.correlationId ?? this.generateCorrelationId();
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const maxRetries = options.retries !== undefined ? options.retries : this.isIdempotent(method) ? this.maxRetries : 0;

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxRetries) {
      // 1. Upfront offline detection
      if (this.networkService && !this.networkService.isOnline()) {
        throw new NetworkError('Cannot execute request: Device is offline', {
          metadata: { endpoint, method, correlationId },
        });
      }

      const controller = new AbortController();
      let didTimeout = false;
      let callerAbortListener: (() => void) | undefined;

      // Link caller-provided AbortSignal with internal controller
      if (options.signal) {
        if (options.signal.aborted) {
          controller.abort(options.signal.reason);
        } else {
          callerAbortListener = () => controller.abort(options.signal?.reason);
          options.signal.addEventListener('abort', callerAbortListener, { once: true });
        }
      }

      const timeoutTimer = setTimeout(() => {
        didTimeout = true;
        controller.abort('timeout');
      }, timeoutMs);

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'X-Correlation-ID': correlationId,
        ...(options.headers as Record<string, string>),
      };

      if (options.idempotencyKey && !headers['Idempotency-Key']) {
        headers['Idempotency-Key'] = options.idempotencyKey;
      }

      if (!options.skipAuth && this.getToken) {
        const token = this.getToken();
        if (token && !headers['Authorization']) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const startTime = performance.now();

      try {
        const response = await fetch(url, {
          ...options,
          method,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutTimer);
        if (options.signal && callerAbortListener) {
          options.signal.removeEventListener('abort', callerAbortListener);
        }

        const durationMs = Math.round(performance.now() - startTime);

        // Record telemetry
        if (this.telemetryService) {
          this.telemetryService.recordLatency('API_LATENCY', 'ApiClient', durationMs, {
            endpoint,
            method,
            status: response.status,
            correlationId,
          });
          if (durationMs > 3000) {
            this.telemetryService.recordPerformanceIssue({
              metric: 'API_LATENCY',
              durationMs,
              thresholdMs: 3000,
              sourceModule: 'ApiClient',
              metadata: { endpoint, method, status: response.status },
            });
          }
        }

        // Handle 401 / 403
        if (response.status === 401) {
          if (this.onAuthError) {
            this.onAuthError(401);
          }
          this.telemetryService?.recordApiFailure({
            endpoint,
            method,
            statusCode: 401,
            durationMs,
            error: 'Authentication expired or invalid',
            correlationId,
          });
          this.eventBus?.emit('API_FAILURE', {
            endpoint,
            method,
            statusCode: 401,
            error: 'Authentication expired or invalid',
            durationMs,
            correlationId,
            timestamp: Date.now(),
          });
          throw new AuthenticationError('Authentication expired or invalid', {
            metadata: { endpoint, correlationId },
          });
        }

        if (response.status === 403) {
          if (this.onAuthError) {
            this.onAuthError(403);
          }
          this.telemetryService?.recordApiFailure({
            endpoint,
            method,
            statusCode: 403,
            durationMs,
            error: 'Access forbidden',
            correlationId,
          });
          this.eventBus?.emit('API_FAILURE', {
            endpoint,
            method,
            statusCode: 403,
            error: 'Access forbidden',
            durationMs,
            correlationId,
            timestamp: Date.now(),
          });
          throw new AuthorizationError('Access forbidden', {
            metadata: { endpoint, correlationId },
          });
        }

        // Handle retryable server statuses on idempotent calls
        if (!response.ok) {
          const isRetryable = this.isRetryableStatus(response.status) && this.isIdempotent(method) && attempt < maxRetries;
          if (isRetryable) {
            attempt++;
            const backoffMs = Math.min(100 * Math.pow(2, attempt), 1500);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          let responseBody: unknown;
          try {
            responseBody = await response.json();
          } catch {
            try {
              responseBody = await response.text();
            } catch {
              responseBody = null;
            }
          }

          let message = `API request failed with status ${response.status}`;
          if (typeof responseBody === 'object' && responseBody !== null) {
            const bodyObj = responseBody as Record<string, unknown>;
            if (Array.isArray(bodyObj.detail)) {
              // FastAPI 422 validation errors: [{ loc: ['body', 'field'], msg: 'error msg' }]
              message = bodyObj.detail
                .map((item: unknown) => {
                  if (typeof item === 'object' && item !== null) {
                    const err = item as { loc?: unknown[]; msg?: string };
                    const loc = Array.isArray(err.loc)
                      ? err.loc.filter((l) => l !== 'body').join('.')
                      : 'field';
                    return `${loc || 'field'}: ${err.msg || 'Invalid value'}`;
                  }
                  return String(item);
                })
                .join('; ');
            } else if (typeof bodyObj.detail === 'string') {
              message = bodyObj.detail;
            } else if (typeof bodyObj.message === 'string') {
              message = bodyObj.message;
            }
          } else if (typeof responseBody === 'string' && responseBody.length > 0 && !responseBody.startsWith('<!DOCTYPE')) {
            message = responseBody;
          }

          this.telemetryService?.recordApiFailure({
            endpoint,
            method,
            statusCode: response.status,
            durationMs,
            error: message,
            correlationId,
          });
          this.eventBus?.emit('API_FAILURE', {
            endpoint,
            method,
            statusCode: response.status,
            error: message,
            durationMs,
            correlationId,
            timestamp: Date.now(),
          });

          if (response.status === 422 || response.status === 400) {
            throw new ValidationError(message, {
              metadata: { endpoint, correlationId, responseBody },
            });
          }

          throw new NetworkError(message, {
            statusCode: response.status,
            metadata: { endpoint, correlationId, responseBody },
          });
        }

        // 204 No Content
        if (response.status === 204) {
          return null as unknown as T;
        }

        const data = await response.json();
        return data as T;
      } catch (err) {
        clearTimeout(timeoutTimer);
        if (options.signal && callerAbortListener) {
          options.signal.removeEventListener('abort', callerAbortListener);
        }

        lastError = err;

        // Check if aborted by caller or timeout
        if (err instanceof DOMException && err.name === 'AbortError') {
          if (didTimeout) {
            lastError = new TimeoutError(`Request timed out after ${timeoutMs}ms`, {
              metadata: { endpoint, method, correlationId },
            });
          } else {
            // Caller cancellation
            throw err;
          }
        }

        // Check if we can retry
        const canRetry = this.isIdempotent(method) && attempt < maxRetries && !(err instanceof AuthenticationError) && !(err instanceof AuthorizationError) && !(err instanceof ValidationError);

        if (canRetry) {
          attempt++;
          const backoffMs = Math.min(100 * Math.pow(2, attempt), 1500);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        if (this.logger) {
          this.logger.error(`[ApiClient] Request error on [${method}] ${endpoint}:`, {
            error: err instanceof Error ? err.message : String(err),
            correlationId,
          });
        }

        const failureDurationMs = Math.round(performance.now() - startTime);
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.telemetryService?.recordApiFailure({
          endpoint,
          method,
          durationMs: failureDurationMs,
          error: errorMsg,
          correlationId,
        });
        this.eventBus?.emit('API_FAILURE', {
          endpoint,
          method,
          error: errorMsg,
          durationMs: failureDurationMs,
          correlationId,
          timestamp: Date.now(),
        });

        if (lastError instanceof FitNovaError) {
          throw lastError;
        }

        throw new NetworkError(err instanceof Error ? err.message : 'Network request failed', {
          cause: err,
          metadata: { endpoint, method, correlationId },
        });
      }
    }

    throw lastError;
  }

  // Convenience methods
  get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
      },
    });
  }

  put<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
      },
    });
  }

  delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export function createApiClient(config?: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
