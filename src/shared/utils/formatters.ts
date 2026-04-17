/**
 * Converte um input mascarado (ex.: "R$ 1.234,56") ou número para centavos → float.
 * Retorna `null` se o valor não for parseável.
 */
export function parseBRLToNumber(value: number | string): number | null {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value
  }
  const trimmed = value.replace(/\s/g, '').replace(/[^\d.,-]/g, '')
  if (!trimmed) return null
  const hasComma = trimmed.includes(',')
  const normalized = hasComma
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Formata um valor bruto de input (dígitos digitados) como moeda BRL mascarada.
 * Trata o valor como centavos inteiros (ex.: "1234" → "R$ 12,34").
 */
export function formatBRLFromMaskedInput(value: number | string): string {
  const raw = typeof value === 'number'
    ? value
    : Number(String(value).replace(/\D/g, '')) / 100

  const numberValue = typeof value === 'number'
    ? value
    : raw

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Number.isNaN(numberValue) ? 0 : numberValue)
}

/**
 * Formata valor para Real (R$)
 * Replica exatamente a função transformarParaReal do Flutter
 */
export function transformarParaReal(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return 'R$ 0,00'

  let numero: number

  if (typeof valor === 'string') {
    numero = parseFloat(valor.replace(',', '.')) || 0.0
  } else if (typeof valor === 'number') {
    numero = valor
  } else {
    return 'R$ 0,00'
  }

  return `R$ ${numero.toFixed(2).replace('.', ',')}`
}

/**
 * Converte valor brasileiro (R$ 1.234,56 ou 1.234,56) para formato americano (1234.56)
 * Replica a função brToEUA do Flutter
 */
export function brToEUA(valorBr: string): number {
  // Remove R$ e espaços
  let valor = valorBr.replace(/R\$/g, '').trim()

  if (valor === '') {
    return 0.0
  }

  // Remove pontos (separadores de milhar)
  valor = valor.replace(/\./g, '')

  // Substitui vírgula por ponto
  valor = valor.replace(',', '.')

  return parseFloat(valor) || 0.0
}

/**
 * Formata o tempo decorrido desde uma data inicial de forma dinâmica.
 * - Até 10 minutos: "agora"
 * - De 11 a 59 minutos: "X min" (arredondado para o múltiplo de 10 minutos mais próximo)
 * - De 1 hora a 23 horas e 59 minutos: "Xh Y min" (arredondado para o múltiplo de 10 minutos mais próximo)
 * - A partir de 24 horas: "X dias" (arredondado para o dia mais próximo)
 */
export function formatElapsedTime(initialDate: Date | string): string {
  const parseAsLocalWallTime = (value: Date | string): number => {
    if (value instanceof Date) return value.getTime()

    const raw = value || ''
    // Remove sufixo de fuso (Z ou ±hh:mm) para interpretar como horário local "puro"
    const stripped = raw.replace(/([+-]\d{2}:\d{2}|[zZ])$/, '')
    const localParsed = new Date(stripped)

    if (!Number.isNaN(localParsed.getTime())) {
      return localParsed.getTime()
    }

    // Fallback para parsing padrão caso a limpeza falhe
    const fallback = new Date(raw)
    return fallback.getTime()
  }

  const startMs = parseAsLocalWallTime(initialDate)
  const nowMs = Date.now()
  const diffMs = nowMs - startMs
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes <= 10) {
    return 'agora';
  } else if (diffMinutes < 60) {
    // Exibe minutos exatos (sem arredondar para cima)
    return `${diffMinutes} min`;
  } else if (diffMinutes < 24 * 60) {
    const hours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    // Exibe minutos restantes exatos (sem arredondar para cima)
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes} min`;
  }

  // 24h ou mais: calcula dias completos + horas/minutos restantes (sem arredondar)
  const minutesPerDay = 24 * 60
  const diffDays = Math.floor(diffMinutes / minutesPerDay)
  const remainingAfterDays = diffMinutes - diffDays * minutesPerDay
  const remainingHours = Math.floor(remainingAfterDays / 60)

  // Para > 1 dia, não exibimos minutos
  if (remainingHours === 0) {
    return `${diffDays} dia${diffDays === 1 ? '' : 's'}`
  }

  return `${diffDays} dia${diffDays === 1 ? '' : 's'} ${remainingHours}h`
}