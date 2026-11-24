import type {
  MesaAbertaSummary,
  MesaAbertaTipoVenda,
  MesasAbertasMetricas,
  UsuarioPdvResumo,
} from '@/src/domain/types/mesasAbertas'

export type MesaAbertaSummaryDTO = MesaAbertaSummary
export type MesaAbertaTipoVendaDTO = MesaAbertaTipoVenda
export type MesasAbertasMetricasDTO = MesasAbertasMetricas
export type UsuarioPdvResumoDTO = UsuarioPdvResumo

export interface ListarMesasAbertasParams {
  token: string
  page: number
  pageSize: number
  apenasSemMovimentacao: boolean
}

export interface ListarMesasAbertasResultDTO {
  items: MesaAbertaSummaryDTO[]
  metricas: MesasAbertasMetricasDTO
  hasNext: boolean
  page: number
}
