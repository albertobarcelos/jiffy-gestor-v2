export function formatarHoraParaInputCalendar(d: Date | null | undefined): string {
  if (!d) return '00:00'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatarMoeda(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarContagemPedidos(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatarItensPorPedido(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })
}

export function labelDataHoje() {
  const d = new Date()
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function tituloFaturamentoBanner(periodoData: string): string {
  switch (periodoData) {
    case 'hoje':
      return 'Hoje você faturou'
    case 'ontem':
      return 'Ontem você faturou'
    case 'semana':
      return 'Nos últimos 7 dias você faturou'
    case '30dias':
      return 'Nos últimos 30 dias você faturou'
    case 'personalizado':
      return 'No período escolhido você faturou'
    default:
      return 'Você faturou'
  }
}

export function rotuloRodapeComparacaoCards(periodoData: string): string {
  switch (periodoData) {
    case 'hoje':
      return 'Ontem'
    case 'ontem':
      return 'Ante-ontem'
    case 'semana':
      return '7 dias anteriores'
    case '30dias':
      return '30 dias anteriores'
    case 'personalizado':
      return `30 dias antes`
    default:
      return 'Período anterior'
  }
}

export function rotuloPeriodoTituloCard(periodoData: string): string | null {
  switch (periodoData) {
    case 'hoje':
      return 'hoje'
    case 'ontem':
      return 'ontem'
    case 'semana':
      return '7 dias'
    case '30dias':
      return '30 dias'
    case 'personalizado':
      return 'período escolhido'
    default:
      return null
  }
}

export function textosComparacaoPeriodoAnterior(periodoData: string): {
  sufixoVs: string
  acimaResto: string
  abaixoResto: string
  alinhadoCom: string
} {
  switch (periodoData) {
    case 'hoje':
      return {
        sufixoVs: 'ontem',
        acimaResto: 'de ontem',
        abaixoResto: 'de ontem',
        alinhadoCom: 'ontem',
      }
    case 'ontem':
      return {
        sufixoVs: 'no ante-ontem',
        acimaResto: 'de ante-ontem',
        abaixoResto: 'de ante-ontem',
        alinhadoCom: 'ante-ontem',
      }
    case 'semana':
      return {
        sufixoVs: 'nos 7 dias anteriores',
        acimaResto: 'dos 7 dias anteriores',
        abaixoResto: 'dos 7 dias anteriores',
        alinhadoCom: 'os 7 dias anteriores',
      }
    case '30dias':
      return {
        sufixoVs: 'nos 30 dias anteriores',
        acimaResto: 'dos 30 dias anteriores',
        abaixoResto: 'dos 30 dias anteriores',
        alinhadoCom: 'os 30 dias anteriores',
      }
    case 'personalizado':
      return {
        sufixoVs: `na janela 30 dias antes`,
        acimaResto: `da janela 30 dias antes`,
        abaixoResto: `da janela 30 dias antes`,
        alinhadoCom: `a janela 30 dias antes`,
      }
    default:
      return {
        sufixoVs: 'no período anterior',
        acimaResto: 'do período anterior',
        abaixoResto: 'do período anterior',
        alinhadoCom: 'o período anterior',
      }
  }
}

export function prefixoSemFaturamentoNaBase(periodoData: string): string {
  switch (periodoData) {
    case 'hoje':
      return 'Ontem não houve faturamento'
    case 'ontem':
      return 'Ante-ontem não houve faturamento'
    case 'semana':
      return 'Nos 7 dias anteriores não houve faturamento'
    case '30dias':
      return 'Nos 30 dias anteriores não houve faturamento'
    case 'personalizado':
      return `Na janela 30 dias antes não houve faturamento`
    default:
      return 'No período de comparação não houve faturamento'
  }
}

export function textoUltimaAtualizacao(ultimaAtualizacaoMs: number): string {
  const diffMs = Math.max(0, Date.now() - ultimaAtualizacaoMs)
  const segundos = Math.floor(diffMs / 1000)
  if (segundos < 45) return 'Atualizado agora há pouco'
  if (segundos < 90) return 'Atualizado há 1 minuto'
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) {
    return minutos === 1 ? 'Atualizado há 1 minuto' : `Atualizado há ${minutos} minutos`
  }
  const horas = Math.floor(minutos / 60)
  if (horas < 24) {
    return horas === 1 ? 'Atualizado há 1 hora' : `Atualizado há ${horas} horas`
  }
  const dias = Math.floor(horas / 24)
  if (dias < 7) {
    return dias === 1 ? 'Atualizado há 1 dia' : `Atualizado há ${dias} dias`
  }
  const d = new Date(ultimaAtualizacaoMs)
  return `Atualizado em ${d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
}

export function badgeVariacaoPercentual(
  atual: number,
  referencia: number,
  opcoes?: { menorMelhor?: boolean }
): { texto: string; positivo: boolean } {
  const menorMelhor = opcoes?.menorMelhor === true
  if (referencia <= 0 && atual <= 0) return { texto: '0%', positivo: true }
  if (referencia <= 0 && atual > 0) return { texto: 'Novo', positivo: !menorMelhor }
  const pct = Math.round(((atual - referencia) / referencia) * 100)
  const texto = `${pct > 0 ? '+' : ''}${pct}%`
  if (menorMelhor) return { texto, positivo: pct <= 0 }
  return { texto, positivo: pct >= 0 }
}

export function badgeTextoCancelamentos(
  atual: number,
  anterior: number
): { texto: string; positivo: boolean } {
  if (anterior <= 0 && atual <= 0) {
    return { texto: '0% Baixo', positivo: true }
  }
  if (anterior <= 0 && atual > 0) {
    return { texto: 'Novo +Alto', positivo: false }
  }
  const pct = Math.round(((atual - anterior) / anterior) * 100)
  if (atual > anterior) {
    const pctStr = `${pct > 0 ? '+' : ''}${pct}%`
    return { texto: `${pctStr} +Alto`, positivo: false }
  }
  const pctAbs = Math.abs(pct)
  return { texto: `${pctAbs}% +Baixo`, positivo: true }
}
