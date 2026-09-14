import { PedidoContaNoRelatorioEntregadoresPolicy } from '@/src/domain/policies/relatorio-entregadores/PedidoContaNoRelatorioEntregadoresPolicy'
import { ValorRepasseCoberturaPedidoPolicy } from '@/src/domain/policies/relatorio-entregadores/ValorRepasseCoberturaPedidoPolicy'
import {
  pedidoRelatorioEstaFinalizado,
  type CoberturaRelatorio,
  type EntregadorRelatorio,
  type LinhaRelatorioEntregadores,
  type PedidoRelatorioEntregadores,
  type PeriodoFinalizacaoRelatorio,
  type TotaisRelatorioEntregadores,
} from '@/src/domain/relatorio-entregadores/tipos'

export type AgregarRelatorioEntregadoresInput = {
  pedidos: readonly PedidoRelatorioEntregadores[]
  entregadores: readonly EntregadorRelatorio[]
  coberturas: readonly CoberturaRelatorio[]
  periodo: PeriodoFinalizacaoRelatorio
  coberturaId?: string | null
  entregadorId?: string | null
  q?: string | null
}

export type AgregarRelatorioEntregadoresResultado = {
  linhas: LinhaRelatorioEntregadores[]
  totais: TotaisRelatorioEntregadores
}

export class AgregarRelatorioEntregadoresService {
  static agregar(input: AgregarRelatorioEntregadoresInput): AgregarRelatorioEntregadoresResultado {
    const porId = new Map<string, LinhaRelatorioEntregadores>()
    for (const e of input.entregadores) {
      porId.set(e.id, {
        entregadorId: e.id,
        nome: e.nome.trim() || '—',
        telefone: e.telefone,
        quantidadeEntregasFinalizadas: 0,
        quantidadeEntregasPendentes: 0,
        valorAReceberFinalizadas: 0,
        valorAReceberPendentes: 0,
        valorAReceber: 0,
      })
    }

    const coberturaFiltro = input.coberturaId?.trim() || ''
    let quantidadeSemCobertura = 0

    for (const pedido of input.pedidos) {
      if (!PedidoContaNoRelatorioEntregadoresPolicy.check(pedido, input.periodo)) continue

      const entregadorId = pedido.entregadorId!.trim()
      const repasse = ValorRepasseCoberturaPedidoPolicy.resolver(pedido, input.coberturas)

      if (repasse.status === 'sem_cobertura') {
        if (!coberturaFiltro) quantidadeSemCobertura += 1
        continue
      }

      if (coberturaFiltro && repasse.coberturaId !== coberturaFiltro) continue

      const atual = porId.get(entregadorId) ?? {
        entregadorId,
        nome: '—',
        telefone: null,
        quantidadeEntregasFinalizadas: 0,
        quantidadeEntregasPendentes: 0,
        valorAReceberFinalizadas: 0,
        valorAReceberPendentes: 0,
        valorAReceber: 0,
      }
      if (pedidoRelatorioEstaFinalizado(pedido.statusDelivery)) {
        atual.quantidadeEntregasFinalizadas += 1
        atual.valorAReceberFinalizadas += repasse.valor
      } else {
        atual.quantidadeEntregasPendentes += 1
        atual.valorAReceberPendentes += repasse.valor
      }
      atual.valorAReceber = atual.valorAReceberFinalizadas + atual.valorAReceberPendentes
      porId.set(entregadorId, atual)
    }

    const busca = input.q?.trim().toLocaleLowerCase('pt-BR') ?? ''
    const entregadorFiltro = input.entregadorId?.trim() || ''
    const linhas = Array.from(porId.values()).filter(linha => {
      if (linha.quantidadeEntregasFinalizadas + linha.quantidadeEntregasPendentes <= 0) {
        return false
      }
      if (entregadorFiltro && linha.entregadorId !== entregadorFiltro) return false
      if (!busca) return true
      return linha.nome.toLocaleLowerCase('pt-BR').includes(busca)
    })

    const totais = linhas.reduce<TotaisRelatorioEntregadores>(
      (acc, linha) => ({
        quantidadeEntregasFinalizadas:
          acc.quantidadeEntregasFinalizadas + linha.quantidadeEntregasFinalizadas,
        quantidadeEntregasPendentes:
          acc.quantidadeEntregasPendentes + linha.quantidadeEntregasPendentes,
        valorAReceberFinalizadas: acc.valorAReceberFinalizadas + linha.valorAReceberFinalizadas,
        valorAReceberPendentes: acc.valorAReceberPendentes + linha.valorAReceberPendentes,
        valorAReceber: acc.valorAReceber + linha.valorAReceber,
        quantidadeSemCobertura,
      }),
      {
        quantidadeEntregasFinalizadas: 0,
        quantidadeEntregasPendentes: 0,
        valorAReceberFinalizadas: 0,
        valorAReceberPendentes: 0,
        valorAReceber: 0,
        quantidadeSemCobertura,
      }
    )

    if (linhas.length === 0) {
      totais.quantidadeSemCobertura = quantidadeSemCobertura
    }

    return { linhas, totais }
  }
}
