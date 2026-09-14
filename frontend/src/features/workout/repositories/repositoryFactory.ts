/**
 * FitNova AI — Workout Repository Factory
 * Provides seamless repository selection: MockWorkoutRepository for development/tests,
 * ApiWorkoutRepository for production FastAPI backend integration.
 */

import type { IWorkoutRepository } from './IWorkoutRepository.ts';
import { MockWorkoutRepository } from './MockWorkoutRepository.ts';
import { ApiWorkoutRepository } from './ApiWorkoutRepository.ts';
import type { ApiClient } from '../../../platform/network/ApiClient.ts';
import type { StorageService } from '../../../platform/storage/StorageService.ts';

export interface RepositoryFactoryOptions {
  apiClient?: ApiClient;
  storageService?: StorageService;
  useMock?: boolean;
}

export function createWorkoutRepository(
  options: RepositoryFactoryOptions = {}
): IWorkoutRepository {
  if (options.useMock || !options.apiClient) {
    return new MockWorkoutRepository({
      storageService: options.storageService,
    });
  }

  return new ApiWorkoutRepository({
    apiClient: options.apiClient,
    storageService: options.storageService,
  });
}
