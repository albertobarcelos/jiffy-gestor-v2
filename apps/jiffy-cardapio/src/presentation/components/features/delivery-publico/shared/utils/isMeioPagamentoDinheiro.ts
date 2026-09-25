import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

function normalizarTexto(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
}

/**
 * Troco só para a forma cujo tipo fiscal é dinheiro e o nome é exatamente DINHEIRO.
 * Outros meios com tipo dinheiro (PIX, débito, crédito cadastrados assim) não pedem troco.
 */
export function isMeioPagamentoDinheiro(
  meio: Pick<MeioPagamentoPublicoDTO, 'nome' | 'formaPagamentoFiscal'> | null | undefined
): boolean {
  if (!meio) return false
  if (normalizarTexto(meio.formaPagamentoFiscal) !== 'dinheiro') return false
  return normalizarTexto(meio.nome) === 'dinheiro'
}

/** DINHEIRO fica à esquerda; as demais formas mantêm a ordem original. */
export function ordenarMeioDinheiroPrimeiro<
  T extends Pick<MeioPagamentoPublicoDTO, 'nome' | 'formaPagamentoFiscal'>,
>(meios: readonly T[]): T[] {
  return [...meios].sort((a, b) => {
    const aDinheiro = isMeioPagamentoDinheiro(a)
    const bDinheiro = isMeioPagamentoDinheiro(b)
    if (aDinheiro === bDinheiro) return 0
    return aDinheiro ? -1 : 1
  })
}
