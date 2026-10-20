import type { OperacaoCaixaEstacaoDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'

/** Rodapé do fechamento de caixa (tela e cupom térmico). */
export const RODAPE_FECHAMENTO_CAIXA_TAGLINE = 'Jiffy | Mais rápido. Mais simples.'

export type FechamentoCaixaMeioPagamentoLinha = {
  nome: string
  valor: number
}

export type FechamentoCaixaEstacaoRelatorioView = {
  titulo: string
  empresa: string
  subtitulo: string
  /** Data/hora + usuário na mesma linha. */
  abertura: string
  aberturaImpressao: string
  fechamento: string
  fechamentoImpressao: string
  tempoOperacao: string | null
  resumoCaixa: {
    recebimentosDinheiro: number
    totalSuprimentos: number
    totalSangrias: number
    totalTroco: number
    /** Dinheiro esperado em gaveta (contabilizado pelo sistema). */
    saldoEsperadoDinheiro: number
  } | null
  resumoRecebimentos: {
    meios: FechamentoCaixaMeioPagamentoLinha[]
    totalLiquido: number
  } | null
  conferencia: {
    valorEsperado: number
    valorContado: number
    diferenca: number
  } | null
  nomeCaixa: string
}

export function formatarMoedaFechamentoCaixa(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function formatarMoedaFechamentoCaixaSinal(valor: number): string {
  if (valor === 0) return formatarMoedaFechamentoCaixa(0)
  const abs = formatarMoedaFechamentoCaixa(Math.abs(valor))
  if (valor > 0) return `+ ${abs}`
  return `- ${abs}`
}

export function formatarDataHoraFechamentoCaixa(iso: string | null | undefined): string {
  if (!iso?.trim()) return '---'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '---'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatarDataHoraFechamentoCaixaCurta(iso: string | null | undefined): string {
  if (!iso?.trim()) return '---'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '---'
  const dd = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const hh = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${dd} - ${hh}`
}

export function formatarDuracaoFechamentoCaixa(seconds: number | null | undefined): string | null {
  if (seconds == null) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`
}

/**
 * Calcula a duração entre abertura e fechamento de uma operação de caixa.
 * Retorna string legível (ex.: "2h 35min") ou null se datas inválidas.
 */
export function calcularDuracaoOperacaoCaixa(
  dataAbertura: string,
  dataFechamento: string | null | undefined
): string | null {
  if (!dataFechamento?.trim()) return null
  const inicio = new Date(dataAbertura).getTime()
  const fim = new Date(dataFechamento).getTime()
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim < inicio) return null

  const minutos = Math.floor((fim - inicio) / 60_000)
  if (minutos < 1) return 'menos de 1 min'
  if (minutos < 60) return `${minutos} min`

  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (resto === 0) return `${horas}h`
  return `${horas}h ${resto}min`
}

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

/** Conteúdo canônico do relatório de fechamento (tela e cupom térmico). */
export function montarFechamentoCaixaEstacaoRelatorio(
  operacao: OperacaoCaixaEstacaoDTO
): FechamentoCaixaEstacaoRelatorioView {
  const fechamento = operacao.resumoFechamento
  const resumoCaixa = operacao.resumoCaixa
  const resumoPag = operacao.resumoPagamentos

  const abertoPor = operacao.abertoPorAtor?.nome?.trim() || '—'
  const fechadoPor =
    fechamento?.fechadoPorAtor?.nome?.trim() ||
    operacao.fechadoPorAtor?.nome?.trim() ||
    '—'
  const dataFechamento = operacao.dataFechamento || fechamento?.dataFechamento

  return {
    titulo: 'Relatório do Caixa',
    empresa: operacao.nomeEmpresa?.trim() || 'Sua loja',
    subtitulo: 'FECHAMENTO DE CAIXA',
    abertura: linhaDataComUsuario(operacao.dataAbertura, abertoPor, 'tela'),
    aberturaImpressao: linhaDataComUsuario(operacao.dataAbertura, abertoPor, 'impressao'),
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
    nomeCaixa: operacao.estacao?.nome?.trim() || '—',
  }
}
