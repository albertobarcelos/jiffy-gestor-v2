import type {
  CreateGrupoBordasPizzaInput,
  CreateGrupoMassasPizzaInput,
  IPizzaRepository,
  UpdateGrupoBordasPizzaInput,
  UpdateGrupoMassasPizzaInput,
} from '@/src/domain/repositories/IPizzaRepository'
import type {
  CreateCategoriaPizzaCompletoInput,
  CreateCategoriaPizzaInput,
  CreateComplementoPizzaInput,
  CreateSaborPizzaInput,
  PizzaPaginationParams,
  ReplaceComplementoPizzaPrecosInput,
  UpdateCategoriaPizzaInput,
  UpdateSaborPizzaInput,
} from '@/src/shared/types/pizza'

export class ListarPizzaCategoriasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(params: PizzaPaginationParams) {
    return this.repository.listarCategorias(params)
  }
}

export class BuscarPizzaCategoriaUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string) {
    return this.repository.buscarCategoriaPorId(id)
  }
}

export class CriarPizzaCategoriaUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(data: CreateCategoriaPizzaInput) {
    return this.repository.criarCategoria(data)
  }
}

export class CriarPizzaCategoriaCompletoUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  async execute(data: CreateCategoriaPizzaCompletoInput) {
    if (!data.nome?.trim()) {
      throw new Error('Nome da categoria é obrigatório')
    }
    const tamanhosAtivos = (data.tamanhos ?? []).filter(t => t.nome.trim())
    if (tamanhosAtivos.length === 0) {
      throw new Error('Informe ao menos um tamanho')
    }
    return this.repository.criarCategoriaCompleto({
      ...data,
      nome: data.nome.trim(),
      tamanhos: tamanhosAtivos,
    })
  }
}

export class AtualizarPizzaCategoriaUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string, data: UpdateCategoriaPizzaInput) {
    return this.repository.atualizarCategoria(id, data)
  }
}

export class ReordenarPizzaCategoriaUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string, novaPosicao: number) {
    return this.repository.reordenarCategoria(id, novaPosicao)
  }
}

export class ExcluirPizzaCategoriaUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string) {
    return this.repository.excluirCategoria(id)
  }
}

export class ListarPizzaSaboresUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(params: PizzaPaginationParams & { categoriaPizzaId?: string }) {
    return this.repository.listarSabores(params)
  }
}

export class BuscarPizzaSaborUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string) {
    return this.repository.buscarSaborPorId(id)
  }
}

export class CriarPizzaSaborUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  async execute(data: CreateSaborPizzaInput) {
    if (!data.nome?.trim()) {
      throw new Error('Nome do sabor é obrigatório')
    }
    if (!data.categoriaPizzaId) {
      throw new Error('Categoria é obrigatória')
    }
    const precos = (data.precosTamanho ?? []).filter(p => p.precoCheio > 0)
    if (precos.length === 0) {
      throw new Error('Informe preço em ao menos um tamanho')
    }
    return this.repository.criarSabor({
      ...data,
      nome: data.nome.trim(),
      precosTamanho: precos,
    })
  }
}

export class AtualizarPizzaSaborUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string, data: UpdateSaborPizzaInput) {
    return this.repository.atualizarSabor(id, data)
  }
}

export class ReordenarPizzaSaborUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string, novaPosicao: number) {
    return this.repository.reordenarSabor(id, novaPosicao)
  }
}

export class ExcluirPizzaSaborUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string) {
    return this.repository.excluirSabor(id)
  }
}

export class ListarPizzaTamanhosUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(params: PizzaPaginationParams & { categoriaPizzaId?: string }) {
    return this.repository.listarTamanhos(params)
  }
}

export class BuscarPizzaTamanhoUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string) {
    return this.repository.buscarTamanhoPorId(id)
  }
}

export class CriarPizzaTamanhoUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(data: {
    grupoPizzaConfigId: string
    nome: string
    quantidadePedacos: number
    quantidadeMaximaDivisoes: number
    ativo?: boolean
  }) {
    return this.repository.criarTamanho(data)
  }
}

export class AtualizarPizzaTamanhoUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(
    id: string,
    data: Partial<{
      nome: string
      quantidadePedacos: number
      quantidadeMaximaDivisoes: number
      ativo: boolean
    }>
  ) {
    return this.repository.atualizarTamanho(id, data)
  }
}

export class ExcluirPizzaTamanhoUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string) {
    return this.repository.excluirTamanho(id)
  }
}

export class ListarPizzaGruposBordasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(params: PizzaPaginationParams & { categoriaPizzaId?: string }) {
    return this.repository.listarGruposBordas(params)
  }
}

export class BuscarPizzaGrupoBordasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string) {
    return this.repository.buscarGrupoBordasPorId(id)
  }
}

export class CriarPizzaGrupoBordasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(data: CreateGrupoBordasPizzaInput) {
    return this.repository.criarGrupoBordas(data)
  }
}

export class AtualizarPizzaGrupoBordasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string, data: UpdateGrupoBordasPizzaInput) {
    return this.repository.atualizarGrupoBordas(id, data)
  }
}

export class ExcluirPizzaGrupoBordasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string) {
    return this.repository.excluirGrupoBordas(id)
  }
}

export class ListarPizzaGruposMassasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(params: PizzaPaginationParams & { categoriaPizzaId?: string }) {
    return this.repository.listarGruposMassas(params)
  }
}

export class BuscarPizzaGrupoMassasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string) {
    return this.repository.buscarGrupoMassasPorId(id)
  }
}

export class CriarPizzaGrupoMassasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(data: CreateGrupoMassasPizzaInput) {
    return this.repository.criarGrupoMassas(data)
  }
}

export class AtualizarPizzaGrupoMassasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string, data: UpdateGrupoMassasPizzaInput) {
    return this.repository.atualizarGrupoMassas(id, data)
  }
}

export class ExcluirPizzaGrupoMassasUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string) {
    return this.repository.excluirGrupoMassas(id)
  }
}

export class ListarPizzaComplementosUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(categoriaPizzaId: string) {
    return this.repository.listarComplementosPizza(categoriaPizzaId)
  }
}

export class CriarPizzaComplementoUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(data: CreateComplementoPizzaInput) {
    return this.repository.criarComplementoPizza(data)
  }
}

export class SubstituirPrecosPizzaComplementoUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string, data: ReplaceComplementoPizzaPrecosInput) {
    return this.repository.substituirPrecosComplementoPizza(id, data)
  }
}

export class DesvincularPizzaComplementoUseCase {
  constructor(private readonly repository: IPizzaRepository) {}

  execute(id: string) {
    return this.repository.desvincularComplementoPizza(id)
  }
}
