export type DecisaoPreDialogoPropagacao = 'so-origem' | 'abrir-dialogo'

/**
 * Sem diálogo: grava só neste local.
 * `cancelado` fica para o usuário fechar o modal — não para falha de listagem.
 */
export function resolverDecisaoPreDialogoPropagacao(input: {
  pedidoAberto: boolean
  temToken: boolean
  listagemOk?: boolean
  quantidadeUsos?: number
}): DecisaoPreDialogoPropagacao {
  if (input.pedidoAberto) return 'so-origem'
  if (!input.temToken) return 'so-origem'
  if (input.listagemOk === false) return 'so-origem'
  if (input.listagemOk === true && (input.quantidadeUsos ?? 0) === 0) return 'so-origem'
  return 'abrir-dialogo'
}
