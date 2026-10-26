/** Lado do canvas enviado ao jsQR. Menor = mais rápido; 360 cobre QR de comanda no visor. */
export const LADO_SCAN_JSQR = 360

export type RecorteVisorScan = {
  sx: number
  sy: number
  sw: number
  sh: number
  dw: number
  dh: number
}

/**
 * Recorte quadrado central do vídeo — a área visível no visor (object-cover).
 * jsQR no frame inteiro deixa o QR pequeno e a leitura lenta.
 */
export function recorteVisorScan(
  videoW: number,
  videoH: number,
  ladoDestino = LADO_SCAN_JSQR
): RecorteVisorScan | null {
  if (videoW < 8 || videoH < 8 || ladoDestino < 8) return null
  const lado = Math.min(videoW, videoH)
  return {
    sx: Math.floor((videoW - lado) / 2),
    sy: Math.floor((videoH - lado) / 2),
    sw: lado,
    sh: lado,
    dw: ladoDestino,
    dh: ladoDestino,
  }
}

/** Inversão custa o dobro. Só a cada 4º frame, para QR claro-em-escuro. */
export function deveTentarInversaoJsQr(indiceFrame: number): boolean {
  return indiceFrame % 4 === 3
}

export type FeedbackScanQr = 'procurando' | 'lido' | 'falhou'

export function mensagemFeedbackScanQr(estado: FeedbackScanQr, ocupado: boolean): string {
  if (ocupado) return 'Adicionando pedido…'
  if (estado === 'lido') return 'Código lido'
  if (estado === 'falhou') return 'Não reconheci. Aponte de novo'
  return 'Aponte o QR para o quadro'
}
