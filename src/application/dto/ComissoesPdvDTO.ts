import { z } from 'zod'

/** Campos de ordenação aceitos pelo relatório de comissões PDV (API fiscal). */
export const OrderByFieldComissoesSchema = z.enum([
  'nomeUsuarioPdv',
  'valorTotalVendasParticipadas',
  'valorBaseTaxaUsuario',
  'countVendasParticipadas',
  'valorTotalComissao',
])

export type OrderByFieldComissoes = z.infer<typeof OrderByFieldComissoesSchema>

export const OrderByDirectionComissoesSchema = z.enum(['asc', 'desc'])

export type OrderByDirectionComissoes = z.infer<typeof OrderByDirectionComissoesSchema>

/** Linha do relatório — espelha o contrato JSON do fiscal. */
export type ComissaoPdvItemDTO = {
  usuarioPdvId: string
  nomeUsuarioPdv: string
  valorTotalVendasParticipadas: number
  valorBaseTaxaUsuario: number
  countVendasParticipadas: number
  valorTotalComissao: number
}

/** Resposta paginada do fiscal para GET .../comissoes. */
export type ComissoesPdvListagemResponseDTO = {
  count?: number
  page?: number
  limit?: number
  totalPages?: number
  hasNext?: boolean
  hasPrevious?: boolean
  items?: ComissaoPdvItemDTO[]
}
