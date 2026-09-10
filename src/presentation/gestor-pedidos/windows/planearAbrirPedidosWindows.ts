export type PlanoAbrirPedidosWindows = {
  tentarProtocolo: boolean
  mostrarDownload: boolean
  motivo: 'nao-windows' | 'windows'
}

export function isWindowsUserAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  if (ua.includes('windows phone')) return false
  return ua.includes('windows')
}

export function planearAbrirPedidosWindows(input: {
  userAgent: string
}): PlanoAbrirPedidosWindows {
  if (!isWindowsUserAgent(input.userAgent)) {
    return { tentarProtocolo: false, mostrarDownload: true, motivo: 'nao-windows' }
  }
  return { tentarProtocolo: true, mostrarDownload: true, motivo: 'windows' }
}
