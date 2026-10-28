import type {
  CreateGrupoBordasPizzaInput,
  CreateGrupoMassasPizzaInput,
  UpdateGrupoBordasPizzaInput,
  UpdateGrupoMassasPizzaInput,
} from '@/src/domain/repositories/IPizzaRepository'
import type {
  CategoriaPizza,
  CategoriaPizzaCompletoResponse,
  ComplementoPizza,
  CreateCategoriaPizzaCompletoInput,
  CreateComplementoPizzaInput,
  CreateSaborPizzaInput,
  GrupoBordasPizza,
  GrupoBordasPizzaSummary,
  GrupoMassasPizza,
  GrupoMassasPizzaSummary,
  PizzaPaginatedResponse,
  PizzaPaginationParams,
  PizzaTamanho,
  ReplaceComplementoPizzaPrecosInput,
  SaborPizza,
  SaborPizzaSummary,
  UpdateCategoriaPizzaInput,
  UpdateSaborPizzaInput,
} from '@/src/shared/types/pizza'

/**
 * Gateway do cadastro pizza via BFF `/api/cardapio/pizza/*` (browser → Next).
 * Implementação em infrastructure; use cases dependem só deste contrato.
 */
export interface IPizzaCadastroGateway {
  listarCategorias(
    token: string,
    params?: PizzaPaginationParams
  ): Promise<PizzaPaginatedResponse<CategoriaPizza>>

  buscarCategoria(token: string, categoriaId: string): Promise<CategoriaPizza>

  atualizarCategoria(
    token: string,
    categoriaId: string,
    input: UpdateCategoriaPizzaInput
  ): Promise<CategoriaPizza>

  criarCategoriaCompleto(
    token: string,
    input: CreateCategoriaPizzaCompletoInput
  ): Promise<CategoriaPizzaCompletoResponse>

  reordenarCategoria(
    token: string,
    categoriaId: string,
    novaPosicao: number
  ): Promise<CategoriaPizza>

  listarSabores(
    token: string,
    params?: PizzaPaginationParams & { categoriaPizzaId?: string }
  ): Promise<PizzaPaginatedResponse<SaborPizzaSummary>>

  buscarSabor(token: string, saborId: string): Promise<SaborPizza>

  criarSabor(token: string, input: CreateSaborPizzaInput): Promise<SaborPizza>

  atualizarSabor(
    token: string,
    saborId: string,
    input: UpdateSaborPizzaInput
  ): Promise<SaborPizza>

  reordenarSabor(
    token: string,
    saborId: string,
    novaPosicao: number
  ): Promise<SaborPizzaSummary>

  listarTamanhos(
    token: string,
    params?: PizzaPaginationParams & { categoriaPizzaId?: string }
  ): Promise<PizzaPaginatedResponse<PizzaTamanho>>

  criarTamanho(
    token: string,
    input: {
      grupoPizzaConfigId: string
      nome: string
      quantidadePedacos: number
      quantidadeMaximaDivisoes: number
      ativo?: boolean
    }
  ): Promise<PizzaTamanho>

  atualizarTamanho(
    token: string,
    tamanhoId: string,
    input: Partial<{
      nome: string
      quantidadePedacos: number
      quantidadeMaximaDivisoes: number
      ativo: boolean
    }>
  ): Promise<PizzaTamanho>

  excluirTamanho(token: string, tamanhoId: string): Promise<void>

  listarGruposMassas(
    token: string,
    params?: PizzaPaginationParams & { categoriaPizzaId?: string }
  ): Promise<PizzaPaginatedResponse<GrupoMassasPizzaSummary>>

  buscarGrupoMassas(token: string, grupoId: string): Promise<GrupoMassasPizza>

  criarGrupoMassas(
    token: string,
    input: CreateGrupoMassasPizzaInput
  ): Promise<GrupoMassasPizza>

  atualizarGrupoMassas(
    token: string,
    grupoId: string,
    input: UpdateGrupoMassasPizzaInput
  ): Promise<GrupoMassasPizza>

  listarGruposBordas(
    token: string,
    params?: PizzaPaginationParams & { categoriaPizzaId?: string }
  ): Promise<PizzaPaginatedResponse<GrupoBordasPizzaSummary>>

  buscarGrupoBordas(token: string, grupoId: string): Promise<GrupoBordasPizza>

  criarGrupoBordas(
    token: string,
    input: CreateGrupoBordasPizzaInput
  ): Promise<GrupoBordasPizza>

  atualizarGrupoBordas(
    token: string,
    grupoId: string,
    input: UpdateGrupoBordasPizzaInput
  ): Promise<GrupoBordasPizza>

  listarComplementos(token: string, categoriaPizzaId: string): Promise<ComplementoPizza[]>

  criarComplemento(
    token: string,
    input: CreateComplementoPizzaInput
  ): Promise<ComplementoPizza>

  substituirPrecosComplemento(
    token: string,
    complementoId: string,
    input: ReplaceComplementoPizzaPrecosInput
  ): Promise<ComplementoPizza>

  desvincularComplemento(token: string, complementoId: string): Promise<void>
}
