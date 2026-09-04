/** Esconde o WebView sem o destruir (modais largos do Gestor). */

let suspenso = false
const ouvintes = new Set<() => void>()

export function whatsappWebViewEstaSuspenso(): boolean {
  return suspenso
}

export function setWhatsAppWebViewSuspenso(valor: boolean): void {
  if (suspenso === valor) return
  suspenso = valor
  ouvintes.forEach(fn => fn())
}

export function onWhatsAppWebViewSuspenso(fn: () => void): () => void {
  ouvintes.add(fn)
  return () => {
    ouvintes.delete(fn)
  }
}
