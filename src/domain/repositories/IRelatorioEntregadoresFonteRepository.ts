import type {
  CoberturaRelatorio,
  EntregadorRelatorio,
  PedidoRelatorioEntregadores,
  PeriodoFinalizacaoRelatorio,
} from '@/src/domain/relatorio-entregadores/tipos'

export type FonteRelatorioEntregadores = {
  coberturas: CoberturaRelatorio[]
  entregadores: EntregadorRelatorio[]
  pedidos: PedidoRelatorioEntregadores[]
  truncado: boolean
}

export interface IRelatorioEntregadoresFonteRepository {
  carregar(input: {
    token: string
    periodo: PeriodoFinalizacaoRelatorio
  }): Promise<FonteRelatorioEntregadores>
}
