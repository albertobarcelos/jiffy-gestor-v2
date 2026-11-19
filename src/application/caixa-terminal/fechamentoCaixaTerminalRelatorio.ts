import type { OperacaoCaixaTerminalDetalhadaDTO } from '@/src/application/dto/caixa-terminal/OperacaoCaixaTerminalDTO'
import type { FechamentoCaixaEstacaoRelatorioView } from '@/src/application/caixa-estacao/fechamentoCaixaEstacaoRelatorio'
import {
  formatarDataHoraFechamentoCaixa,
  formatarDataHoraFechamentoCaixaCurta,
  formatarDuracaoFechamentoCaixa,
} from '@/src/application/caixa-estacao/fechamentoCaixaEstacaoRelatorio'

function normalizarNomeMeio(nome: string): string {
  return nome.trim().toUpperCase() || 'MÉTODO'
}

function linhaDataComUsuario(
  iso: string | null | undefined,
  usuario: string,
  formato: 'tela' | 'impressao'
): string {
  const data =
    formato === 'impressao'
      ? formatarDataHoraFechamentoCaixaCurta(iso)
      : formatarDataHoraFechamentoCaixa(iso)
  const nome = usuario.trim() || '—'
  return `${data} · ${nome}`
}

/** Relatório canônico do fechamento PDV (tela/cupom) — mesmo layout da estação. */
export function montarFechamentoCaixaTerminalRelatorio(
  operacao: OperacaoCaixaTerminalDetalhadaDTO
): FechamentoCaixaEstacaoRelatorioView {
  const fechamento = operacao.resumoFechamento
  const resumoCaixa = operacao.resumoCaixa
  const resumoPag = operacao.resumoPagamentos
  const dataFechamento = operacao.dataFechamento || fechamento?.dataFechamento
  const fechadoPor =
    fechamento?.responsavelFechamento?.trim() ||
    operacao.nomeResponsavelFechamento?.trim() ||
    '—'
  const nomeCaixa =
    [operacao.codigoTerminal, operacao.nomeTerminal].filter(Boolean).join(' · ') ||
    operacao.nomeTerminal?.trim() ||
    operacao.codigoTerminal?.trim() ||
    '—'

  return {
    titulo: 'Relatório do Caixa',
    empresa: operacao.nomeEmpresa?.trim() || 'Sua loja',
    subtitulo: 'FECHAMENTO DE CAIXA',
    abertura: linhaDataComUsuario(operacao.dataAbertura, '—', 'tela'),
    aberturaImpressao: linhaDataComUsuario(operacao.dataAbertura, '—', 'impressao'),
    fechamento: linhaDataComUsuario(dataFechamento, fechadoPor, 'tela'),
    fechamentoImpressao: linhaDataComUsuario(dataFechamento, fechadoPor, 'impressao'),
    tempoOperacao: formatarDuracaoFechamentoCaixa(fechamento?.tempoOperacaoInSeconds),
    resumoCaixa: resumoCaixa
      ? {
          recebimentosDinheiro: resumoPag?.totalDinheiro ?? 0,
          totalSuprimentos: resumoCaixa.totalSuprimento ?? 0,
          totalSangrias: resumoCaixa.totalSangria ?? 0,
          totalTroco: resumoPag?.totalTroco ?? 0,
          saldoEsperadoDinheiro: resumoCaixa.valorLiquidoDinheiroCaixa ?? 0,
        }
      : null,
    resumoRecebimentos: resumoPag
      ? {
          meios: (resumoPag.meiosPagamento ?? []).map(meio => ({
            nome: normalizarNomeMeio(meio.nomeMeioPagamento || 'Método'),
            valor: meio.valorContabilizado ?? 0,
          })),
          totalLiquido: resumoPag.totalLiquido ?? 0,
        }
      : null,
    conferencia: fechamento
      ? {
          valorEsperado: resumoCaixa?.valorLiquidoDinheiroCaixa ?? 0,
          valorContado: fechamento.valorFornecido ?? 0,
          diferenca: fechamento.diferencaValorFornecidoEValorCaixa ?? 0,
        }
      : null,
    nomeCaixa,
  }
}
