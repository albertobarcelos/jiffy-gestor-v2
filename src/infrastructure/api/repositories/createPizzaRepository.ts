import { ApiClient } from '@/src/infrastructure/api/apiClient'
import type { IPizzaRepository } from '@/src/domain/repositories/IPizzaRepository'
import { PizzaRepository } from '@/src/infrastructure/api/repositories/PizzaRepository'

export function createPizzaRepository(token: string): IPizzaRepository {
  return new PizzaRepository(new ApiClient(), token)
}
