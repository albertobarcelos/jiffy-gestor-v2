/** Política: endereço fora da área de cobertura de entrega. */

export const MSG_FORA_COBERTURA_ENTREGA_PUBLICA =
  'Seu endereço está fora da nossa área de cobertura para entrega. Você ainda pode retirar o pedido na loja.'

export function isErroCoberturaEntregaPublica(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    message === MSG_FORA_COBERTURA_ENTREGA_PUBLICA ||
    lower.includes('cobertura') ||
    lower.includes('fora da área') ||
    lower.includes('fora da area') ||
    lower.includes('fora do raio') ||
    lower.includes('raio de entrega') ||
    lower.includes('área de entrega') ||
    lower.includes('area de entrega') ||
    lower.includes('coberto por nenhuma') ||
    lower.includes('não atend') ||
    lower.includes('nao atend')
  )
}
