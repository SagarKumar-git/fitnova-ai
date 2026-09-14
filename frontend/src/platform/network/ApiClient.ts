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

export interface ApiClientConfig {
  baseUrl?: string;
  defaultTimeoutMs?: number;
  maxRetries?: number;
  networkService?: NetworkService;
  telemetryService?: TelemetryService;
  logger?: Logger;
  getToken?: () => string | null;
  onAuthError?: (statusCode: number) => void;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  skipAuth?: boolean;
  correlationId?: string;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly networkService?: NetworkService;
  private readonly telemetryService?: TelemetryService;
  private readonly logger?: Logger;
  private readonly getToken?: () => string | null;
  private readonly onAuthError?: (statusCode: number) => void;
  private counter = 0;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl?.replace(/\/+$/, '') ?? '';
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 15000;
    this.maxRetries = config.maxRetries ?? 2;
    this.networkService = config.networkService;
    this.telemetryService = config.telemetryService;
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
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const method = (options.method || 'GET').toUpperCase();
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
      const timeoutTimer = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'X-Correlation-ID': correlationId,
        ...(options.headers as Record<string, string>),
      };

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
        const durationMs = Math.round(performance.now() - startTime);

        // Record telemetry
        if (this.telemetryService) {
          this.telemetryService.recordLatency('API_LATENCY', 'ApiClient', durationMs, {
            endpoint,
            method,
            status: response.status,
            correlationId,
          });
        }

        // Handle 401 / 403
        if (response.status === 401) {
          if (this.onAuthError) {
            this.onAuthError(401);
          }
          throw new AuthenticationError('Authentication expired or invalid', {
            metadata: { endpoint, correlationId },
          });
        }

        if (response.status === 403) {
          if (this.onAuthError) {
            this.onAuthError(403);
          }
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
            responseBody = await response.text();
          }

          const message = typeof responseBody === 'object' && responseBody && 'detail' in responseBody
            ? String((responseBody as { detail: unknown }).detail)
            : `API request failed with status ${response.status}`;

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
        lastError = err;

        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new TimeoutError(`Request timed out after ${timeoutMs}ms`, {
            metadata: { endpoint, method, correlationId },
          });
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
