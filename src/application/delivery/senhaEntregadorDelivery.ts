/** OpenAPI homologação: `CreateEntregadorRequest.senha` e `UpdateEntregadorRequest.senha` — `^\d{4}$`. */
export const SENHA_ENTREGADOR_DIGITOS = 4

export function normalizarSenhaEntregadorDelivery(valor: string | null | undefined): string {
  return String(valor ?? '').replace(/\D/g, '').slice(0, SENHA_ENTREGADOR_DIGITOS)
}

export function senhaEntregadorDeliveryValida(valor: string | null | undefined): boolean {
  return /^\d{4}$/.test(normalizarSenhaEntregadorDelivery(valor))
}
