import type { IPizzaCadastroGateway } from '@/src/application/ports/IPizzaCadastroGateway'
import type {
  CreateCategoriaPizzaCompletoInput,
  CreateComplementoPizzaInput,
  CreateSaborPizzaInput,
  PizzaPaginationParams,
  ReplaceComplementoPizzaPrecosInput,
  UpdateCategoriaPizzaInput,
  UpdateSaborPizzaInput,
} from '@/src/shared/types/pizza'

type TokenInput = { token: string }

export class ListarPizzaCategoriasViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & PizzaPaginationParams) {
    const { token, ...params } = input
    return this.gateway.listarCategorias(token, params)
  }
}

export class BuscarPizzaCategoriaViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { categoriaId: string }) {
    return this.gateway.buscarCategoria(input.token, input.categoriaId)
  }
}

export class AtualizarPizzaCategoriaViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { categoriaId: string; data: UpdateCategoriaPizzaInput }) {
    return this.gateway.atualizarCategoria(input.token, input.categoriaId, input.data)
  }
}

export class CriarPizzaCategoriaCompletoViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { data: CreateCategoriaPizzaCompletoInput }) {
    return this.gateway.criarCategoriaCompleto(input.token, input.data)
  }
}

export class ReordenarPizzaCategoriaViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { categoriaId: string; novaPosicao: number }) {
    return this.gateway.reordenarCategoria(input.token, input.categoriaId, input.novaPosicao)
  }
}

export class ListarPizzaSaboresViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & PizzaPaginationParams & { categoriaPizzaId?: string }) {
    const { token, ...params } = input
    return this.gateway.listarSabores(token, params)
  }
}

export class BuscarPizzaSaborViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { saborId: string }) {
    return this.gateway.buscarSabor(input.token, input.saborId)
  }
}

export class CriarPizzaSaborViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { data: CreateSaborPizzaInput }) {
    return this.gateway.criarSabor(input.token, input.data)
  }
}

export class AtualizarPizzaSaborViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { saborId: string; data: UpdateSaborPizzaInput }) {
    return this.gateway.atualizarSabor(input.token, input.saborId, input.data)
  }
}

export class ReordenarPizzaSaborViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { saborId: string; novaPosicao: number }) {
    return this.gateway.reordenarSabor(input.token, input.saborId, input.novaPosicao)
  }
}

export class ListarPizzaTamanhosViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & PizzaPaginationParams & { categoriaPizzaId?: string }) {
    const { token, ...params } = input
    return this.gateway.listarTamanhos(token, params)
  }
}

export class ListarPizzaComplementosViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { categoriaPizzaId: string }) {
    return this.gateway.listarComplementos(input.token, input.categoriaPizzaId)
  }
}

export class CriarPizzaComplementoViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { data: CreateComplementoPizzaInput }) {
    return this.gateway.criarComplemento(input.token, input.data)
  }
}

export class SubstituirPrecosPizzaComplementoViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { complementoId: string; data: ReplaceComplementoPizzaPrecosInput }) {
    return this.gateway.substituirPrecosComplemento(
      input.token,
      input.complementoId,
      input.data
    )
  }
}

export class DesvincularPizzaComplementoViaBffUseCase {
  constructor(private readonly gateway: IPizzaCadastroGateway) {}

  execute(input: TokenInput & { complementoId: string }) {
    return this.gateway.desvincularComplemento(input.token, input.complementoId)
  }
}
