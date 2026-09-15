import { ApiClient } from '@/src/infrastructure/api/apiClient'
import type { IMenuRepository } from '@/src/domain/repositories/IMenuRepository'
import { MenuRepository } from '@/src/infrastructure/database/repositories/MenuRepository'

export function createMenuRepository(token: string): IMenuRepository {
  return new MenuRepository(new ApiClient(), token)
}
