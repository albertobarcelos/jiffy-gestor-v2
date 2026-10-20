/** Remove não dígitos e limita a 8 caracteres */
export function normalizarDigitosCep(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 8)
}

/** Máscara brasileira 00000-000 */
export function formatarCepMascara(valor: string): string {
  const numeros = normalizarDigitosCep(valor)
  if (numeros.length <= 5) return numeros
  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
}

/** Quantidade de dígitos à esquerda do caret (inclusive até a posição). */
export function contarDigitosAtePosicao(valor: string, caret: number): number {
  const limite = Math.max(0, Math.min(caret, valor.length))
  return valor.slice(0, limite).replace(/\D/g, '').length
}

/**
 * Converte índice de dígitos (após edição) na posição do caret na máscara 00000-000.
 * Ex.: 5 dígitos → caret após o hífen (posição 6 em "12345-").
 */
export function mapearPosicaoCaretMascaraCep(
  valorMascarado: string,
  digitosAntesDoCaret: number
): number {
  if (digitosAntesDoCaret <= 0) return 0
  let digitos = 0
  for (let i = 0; i < valorMascarado.length; i++) {
    if (/\d/.test(valorMascarado[i]!)) {
      digitos += 1
      if (digitos >= digitosAntesDoCaret) return i + 1
    }
  }
  return valorMascarado.length
}
