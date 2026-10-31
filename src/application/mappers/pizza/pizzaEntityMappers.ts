import { CategoriaPizza } from '@/src/domain/entities/pizza/CategoriaPizza'
import { SaborPizza } from '@/src/domain/entities/pizza/SaborPizza'
import type {
  CategoriaPizza as CategoriaPizzaRecord,
  SaborPizza as SaborPizzaRecord,
  SaborPizzaSummary,
} from '@/src/shared/types/pizza'

export function mapCategoriaPizzaToEntity(input: CategoriaPizzaRecord): CategoriaPizza {
  return CategoriaPizza.fromDatabase(input)
}

export function mapCategoriaPizzaFromEntity(entity: CategoriaPizza): CategoriaPizzaRecord {
  return entity.toJSON()
}

export function mapSaborPizzaToEntity(input: SaborPizzaRecord): SaborPizza {
  return SaborPizza.fromDatabase(input)
}

export function mapSaborPizzaSummaryToEntity(input: SaborPizzaSummary): SaborPizza {
  return SaborPizza.fromSummary(input)
}

export function mapSaborPizzaFromEntity(entity: SaborPizza): SaborPizzaRecord {
  return entity.toJSON()
}
