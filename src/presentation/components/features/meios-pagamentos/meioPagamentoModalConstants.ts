/** `id` do `<form>` no modal lateral — botão Salvar do rodapé usa `form="..."` */
export const MEIO_PAGAMENTO_TABS_MODAL_FORM_ID = 'meio-pagamento-tabs-modal-form'

export const FORMA_FISCAL_CARTAO_CREDITO = 'cartao_credito'

export function isFormaFiscalCartaoCredito(forma: string): boolean {
  return forma.toLowerCase() === FORMA_FISCAL_CARTAO_CREDITO
}

export const TIPOS_PARCELAMENTO_OPCOES = [
  { value: 'jurosVendedor' as const, label: 'Juros do vendedor' },
  { value: 'jurosCliente' as const, label: 'Juros do cliente' },
]
