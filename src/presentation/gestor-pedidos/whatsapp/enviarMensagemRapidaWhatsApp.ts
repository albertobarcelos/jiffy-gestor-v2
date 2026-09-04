import type { MensagemRapidaFlow } from './mensagensRapidasFlow'
import { aplicarVariaveisMensagem } from './mensagensRapidasFlow'
import { whatsappInserirTexto } from './tauriWhatsAppBridge'

export function mensagemPixSemChave(msg: MensagemRapidaFlow, chavePix: string): boolean {
  return msg.id === 'pix' && !chavePix.trim()
}

export function avisoAposInserirMensagem(inserida: boolean): string {
  return inserida
    ? 'Mensagem pronta no WhatsApp. Confira e envie.'
    : 'Mensagem copiada. Cole no WhatsApp (Ctrl+V).'
}

export async function inserirMensagemNaConversaWhatsApp(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
  } catch {
    /* segue para colar no WhatsApp */
  }
  try {
    return await whatsappInserirTexto(texto)
  } catch {
    return false
  }
}

export async function enviarMensagemRapidaWhatsApp(
  msg: MensagemRapidaFlow,
  chavePix: string
): Promise<{ ok: boolean; precisaConfigurarPix: boolean; aviso: string }> {
  if (mensagemPixSemChave(msg, chavePix)) {
    return {
      ok: false,
      precisaConfigurarPix: true,
      aviso: 'Configure a chave PIX nas mensagens.',
    }
  }
  const texto = aplicarVariaveisMensagem(msg.corpo, chavePix)
  const inserida = await inserirMensagemNaConversaWhatsApp(texto)
  return { ok: inserida, precisaConfigurarPix: false, aviso: avisoAposInserirMensagem(inserida) }
}
