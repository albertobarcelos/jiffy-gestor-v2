export type PeriodoFinalizacaoRelatorio = {
  inicio: Date
  fim: Date
}

export type TipoCoberturaRelatorio = 'area' | 'raio'

export type CoberturaRelatorio = {
  id: string
  tipo: TipoCoberturaRelatorio
  origemId: string
  nome: string
  valorTaxa: number
}

export type EntregadorRelatorio = {
  id: string
  nome: string
  telefone: string | null
}

export type SnapshotCoberturaPedido = {
  areaId: string | null
  raioId: string | null
  valorCalculadoSistema: number | null
}

export const COBERTURA_AVULSA_ID = 'avulsa'

export function pedidoRelatorioEstaFinalizado(statusDelivery: string): boolean {
  return statusDelivery === 'FINALIZADO'
}

export type PedidoRelatorioEntregadores = {
  id: string
  statusDelivery: string
  tipoEntrega: string
  entregadorId: string | null
  dataCriacao: Date | null
  dataFinalizacao: Date | null
  cobertura: SnapshotCoberturaPedido | null
}

export type LinhaRelatorioEntregadores = {
  entregadorId: string
  nome: string
  telefone: string | null
  quantidadeEntregasFinalizadas: number
  quantidadeEntregasPendentes: number
  valorAReceberFinalizadas: number
  valorAReceberPendentes: number
  valorAReceber: number
}

export type TotaisRelatorioEntregadores = {
  quantidadeEntregasFinalizadas: number
  quantidadeEntregasPendentes: number
  valorAReceberFinalizadas: number
  valorAReceberPendentes: number
  valorAReceber: number
  quantidadeSemCobertura: number
}

export function idCoberturaRelatorio(tipo: TipoCoberturaRelatorio, origemId: string): string {
  return `${tipo}:${origemId}`
}
