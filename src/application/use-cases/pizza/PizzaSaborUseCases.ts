import type { IPizzaRepository } from '@/src/domain/repositories/IPizzaRepository'
import type { CreateSaborPizzaInput, PizzaPaginationParams } from '@/src/shared/types/pizza'

export class ListarPizzaSaboresUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(params: PizzaPaginationParams & { categoriaPizzaId?: string }) {
    return this.repository.listarSabores(params)
  }
}

export class CriarPizzaSaborUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  async execute(input: CreateSaborPizzaInput) {
    if (!input.nome?.trim()) {
      throw new Error('Nome do sabor é obrigatório')
    }
    if (!input.categoriaPizzaId) {
      throw new Error('Categoria é obrigatória')
    }
    const precos = (input.precosTamanho ?? []).filter(p => p.precoCheio > 0)
    if (precos.length === 0) {
      throw new Error('Informe preço em ao menos um tamanho')
    }
    return this.repository.criarSabor({
      ...input,
      nome: input.nome.trim(),
      precosTamanho: precos,
    })
  }
}

export class ListarPizzaTamanhosUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(params: PizzaPaginationParams & { categoriaPizzaId?: string }) {
    return this.repository.listarTamanhos(params)
  }
}
