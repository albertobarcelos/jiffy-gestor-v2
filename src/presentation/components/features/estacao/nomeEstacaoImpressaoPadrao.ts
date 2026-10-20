/** Nome sugerido ao criar estação local (browser + data). */
export function nomeEstacaoImpressaoPadrao(): string {
  if (typeof window === 'undefined') return 'Estação Gestor'
  const userAgent = window.navigator.userAgent
  const browser =
    userAgent.includes('Edg') ? 'Edge'
    : userAgent.includes('Chrome') ? 'Chrome'
    : userAgent.includes('Firefox') ? 'Firefox'
    : 'Navegador'
  return `Estação ${browser} - ${new Date().toLocaleDateString('pt-BR')}`
}
