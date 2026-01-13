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
  const now = new Date();
  const start = new Date(initialDate);
  const diffMs = now.getTime() - start.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes <= 10) {
    return 'agora';
  } else if (diffMinutes < 60) {
    const roundedMinutes = Math.ceil(diffMinutes / 10) * 10;
    return `${roundedMinutes} min`;
  } else if (diffMinutes < 24 * 60) {
    const hours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    const roundedMinutes = Math.ceil(remainingMinutes / 10) * 10;
    if (roundedMinutes === 60) { // Se arredondar para 60 min, adiciona 1h
      return `${hours + 1}h`;
    }
    return `${hours}h ${roundedMinutes} min`;
  } else {
    const diffDays = Math.round(diffMinutes / (24 * 60));
    return `${diffDays} dia${diffDays === 1 ? '' : 's'}`;
  }
}