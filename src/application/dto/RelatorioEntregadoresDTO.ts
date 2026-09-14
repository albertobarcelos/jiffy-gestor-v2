import { z } from 'zod'

export const OrderByFieldRelatorioEntregadoresSchema = z.enum([
  'nome',
  'quantidadeEntregasFinalizadas',
  'quantidadeEntregasPendentes',
  'valorAReceber',
])

export type OrderByFieldRelatorioEntregadores = z.infer<
  typeof OrderByFieldRelatorioEntregadoresSchema
>

export const OrderByDirectionRelatorioEntregadoresSchema = z.enum(['asc', 'desc'])

export type OrderByDirectionRelatorioEntregadores = z.infer<
  typeof OrderByDirectionRelatorioEntregadoresSchema
>

export const filtroRelatorioEntregadoresValidator = z.object({
  dataFinalizacaoInicio: z.string().min(1, 'Informe a data inicial de finalização'),
  dataFinalizacaoFim: z.string().min(1, 'Informe a data final de finalização'),
  q: z.string().optional(),
  entregadorId: z.string().optional(),
  coberturaId: z.string().optional(),
  orderByField: OrderByFieldRelatorioEntregadoresSchema.optional(),
  orderByDirection: OrderByDirectionRelatorioEntregadoresSchema.optional(),
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().max(100).optional(),
})

export type FiltroRelatorioEntregadoresDTO = z.infer<typeof filtroRelatorioEntregadoresValidator>

export type CoberturaRelatorioItemDTO = {
  id: string
  tipo: 'area' | 'raio'
  nome: string
  valorTaxa: number
}

export type RelatorioEntregadoresItemDTO = {
  entregadorId: string
  nome: string
  telefone: string | null
  quantidadeEntregasFinalizadas: number
  quantidadeEntregasPendentes: number
  valorAReceberFinalizadas: number
  valorAReceberPendentes: number
  valorAReceber: number
}

export type RelatorioEntregadoresTotaisDTO = {
  quantidadeEntregasFinalizadas: number
  quantidadeEntregasPendentes: number
  valorAReceberFinalizadas: number
  valorAReceberPendentes: number
  valorAReceber: number
  quantidadeSemCobertura: number
}

export type EntregadorRelatorioOpcaoDTO = {
  id: string
  nome: string
}

export type RelatorioEntregadoresResponseDTO = {
  items: RelatorioEntregadoresItemDTO[]
  totais: RelatorioEntregadoresTotaisDTO
  coberturas: CoberturaRelatorioItemDTO[]
  entregadores: EntregadorRelatorioOpcaoDTO[]
  count: number
  hasNext: boolean
  hasPrevious: boolean
  truncado: boolean
}

export class RelatorioEntregadoresFiltroError extends Error {
  readonly status = 400

  constructor(message: string) {
    super(message)
    this.name = 'RelatorioEntregadoresFiltroError'
  }
}
