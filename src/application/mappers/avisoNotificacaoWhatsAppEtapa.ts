const TEXTO_SUCESSO = 'Notificação enviada com sucesso'

/**
 * Frase da notificação automática da etapa atual do pedido.
 * Sem data e sem feedback, o envio ainda não terminou e a linha não aparece.
 */
export function avisoNotificacaoWhatsAppDaEtapaAtual(
  sequencia: unknown,
  statusAtual: string | null | undefined
): string | null {
  const status = String(statusAtual ?? '').trim().toUpperCase()
  if (!status || !Array.isArray(sequencia)) return null

  let ultima: Record<string, unknown> | null = null
  for (const item of sequencia) {
    if (!item || typeof item !== 'object') continue
    const transicao = item as Record<string, unknown>
    const statusTransicao = String(transicao.status ?? '').trim().toUpperCase()
    if (statusTransicao === status) ultima = transicao
  }
  if (!ultima) return null

  const enviada = ultima.notificacaoEnviada === true
  const feedback =
    typeof ultima.feedbackEnvioNotificacao === 'string'
      ? ultima.feedbackEnvioNotificacao.trim()
      : ''

  if (enviada || feedback === TEXTO_SUCESSO) {
    return `WhatsApp: ${TEXTO_SUCESSO}`
  }
  if (feedback) return `Mensagem não entregue: ${feedback}`
  return null
}
