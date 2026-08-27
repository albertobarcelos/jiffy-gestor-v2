import type {
  CategoriaPizza,
  CategoriaPizzaCompletoResponse,
  CreateCategoriaPizzaCompletoInput,
  CreateCategoriaPizzaInput,
  CreateSaborPizzaInput,
  PizzaPaginatedResponse,
  PizzaPaginationParams,
  PizzaTamanho,
  SaborPizza,
  SaborPizzaSummary,
  UpdateSaborPizzaInput,
} from '@/src/shared/types/pizza'

export interface IPizzaRepository {
  listarCategorias(params: PizzaPaginationParams): Promise<PizzaPaginatedResponse<CategoriaPizza>>
  buscarCategoriaPorId(id: string): Promise<CategoriaPizza>
  criarCategoria(input: CreateCategoriaPizzaInput): Promise<CategoriaPizza>
  criarCategoriaCompleto(input: CreateCategoriaPizzaCompletoInput): Promise<CategoriaPizzaCompletoResponse>
  atualizarCategoria(id: string, input: Partial<CreateCategoriaPizzaInput>): Promise<CategoriaPizza>
  reordenarCategoria(id: string, novaPosicao: number): Promise<CategoriaPizza>
  excluirCategoria(id: string): Promise<void>

  listarSabores(
    params: PizzaPaginationParams & { categoriaPizzaId?: string }
  ): Promise<PizzaPaginatedResponse<SaborPizzaSummary>>
  buscarSaborPorId(id: string): Promise<SaborPizza>
  criarSabor(input: CreateSaborPizzaInput): Promise<SaborPizza>
  atualizarSabor(id: string, input: UpdateSaborPizzaInput): Promise<SaborPizza>
  reordenarSabor(id: string, novaPosicao: number): Promise<SaborPizzaSummary>
  excluirSabor(id: string): Promise<void>

  listarTamanhos(
    params: PizzaPaginationParams & { categoriaPizzaId?: string }
  ): Promise<PizzaPaginatedResponse<PizzaTamanho>>
  buscarTamanhoPorId(id: string): Promise<PizzaTamanho>
  criarTamanho(input: {
    grupoPizzaConfigId: string
    nome: string
    quantidadePedacos: number
    quantidadeMaximaDivisoes: number
    ativo?: boolean
  }): Promise<PizzaTamanho>
  atualizarTamanho(
    id: string,
    input: Partial<{
      nome: string
      quantidadePedacos: number
      quantidadeMaximaDivisoes: number
      ativo: boolean
    }>
  ): Promise<PizzaTamanho>
  excluirTamanho(id: string): Promise<void>

  listarGruposBordas(
    params: PizzaPaginationParams & { categoriaPizzaId?: string }
  ): Promise<PizzaPaginatedResponse<unknown>>
  buscarGrupoBordasPorId(id: string): Promise<unknown>
  criarGrupoBordas(input: unknown): Promise<unknown>
  atualizarGrupoBordas(id: string, input: unknown): Promise<unknown>
  excluirGrupoBordas(id: string): Promise<void>

  listarGruposMassas(
    params: PizzaPaginationParams & { categoriaPizzaId?: string }
  ): Promise<PizzaPaginatedResponse<unknown>>
  buscarGrupoMassasPorId(id: string): Promise<unknown>
  criarGrupoMassas(input: unknown): Promise<unknown>
  atualizarGrupoMassas(id: string, input: unknown): Promise<unknown>
  excluirGrupoMassas(id: string): Promise<void>
}
