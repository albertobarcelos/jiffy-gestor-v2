import type { IPizzaRepository } from '@/src/domain/repositories/IPizzaRepository'
import type {
  CreateCategoriaPizzaCompletoInput,
  PizzaPaginationParams,
} from '@/src/shared/types/pizza'

export class ListarPizzaCategoriasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(params: PizzaPaginationParams) {
    return this.repository.listarCategorias(params)
  }
}

export class CriarPizzaCategoriaCompletoUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  async execute(input: CreateCategoriaPizzaCompletoInput) {
    if (!input.nome?.trim()) {
      throw new Error('Nome da categoria é obrigatório')
    }
    const tamanhosAtivos = (input.tamanhos ?? []).filter(t => t.nome.trim())
    if (tamanhosAtivos.length === 0) {
      throw new Error('Informe ao menos um tamanho')
    }
    return this.repository.criarCategoriaCompleto({
      ...input,
      nome: input.nome.trim(),
      tamanhos: tamanhosAtivos,
    })
  }
}
