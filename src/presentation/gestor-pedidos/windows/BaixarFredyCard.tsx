'use client'

import { urlInstaladorPedidosWindows } from '../constantes'
import { estaNoAppJiffyFlow } from '../kiosk/isKioskGestorPedidos'

export const FREDY_SETUP_DOWNLOAD = 'FredySetup.exe'

/** Download compacto do Fredy. Esconde-se quando o app já está aberto. */
export function BaixarFredyCard() {
  const url = urlInstaladorPedidosWindows()
  if (!url || estaNoAppJiffyFlow()) return null

  return (
    <a
      href={url}
      download={FREDY_SETUP_DOWNLOAD}
      title="Baixar Fredy para Windows — Windows 10 e 11, 64 bits"
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white py-1 pl-1 pr-3 text-sm font-semibold text-primary-text hover:bg-gray-50"
    >
      <img src="/fredy-icon.png" alt="" className="h-8 w-8 rounded-md" width={32} height={32} />
      Baixar Fredy
    </a>
  )
}
