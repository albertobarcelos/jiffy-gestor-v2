'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useSuperficieQuadroPedidos } from '@/src/presentation/gestor-pedidos/kiosk/useSuperficieQuadroPedidos'
import { isQuadroKioskAtual, isRotaPedidos } from '@/src/presentation/gestor-pedidos/kiosk/isKioskGestorPedidos'
import { pathEscolherEmpresaKiosk } from '@/src/presentation/gestor-pedidos/sessao/pathsGestorSessao'
import { getTabTenantToken } from '@/src/shared/utils/tabSession'
import { parseEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import { JiffyWhatsAppToolbar } from '@/src/presentation/gestor-pedidos/whatsapp/JiffyWhatsAppToolbar'

/**
 * O mesmo `VendasKanban` de antes. Este ficheiro é o adapter da rota —
 * para retirar o casco `/pedidos`, apaga-se esta pasta e as pages.
 */
const Kanban = dynamic(
  () =>
    import('@/features/kanban').then(mod => ({
      default: mod.VendasKanban,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <JiffyLoading text="Carregando o quadro de pedidos…" />
      </div>
    ),
  }
)

function kioskSemEmpresaAberta(): boolean {
  if (typeof window === 'undefined') return false
  if (!isQuadroKioskAtual()) return false
  if (parseEmpresaSlugFromPath(window.location.pathname)) return false
  return !getTabTenantToken()
}

export function GestorPedidosKanban() {
  const pathname = usePathname()
  const superficie = useSuperficieQuadroPedidos()
  const rotaPedidos = isRotaPedidos(pathname ?? '')
  const [clientePronto, setClientePronto] = useState(false)
  const irALista = kioskSemEmpresaAberta()

  useEffect(() => {
    setClientePronto(true)
  }, [])

  useLayoutEffect(() => {
    if (!irALista) return
    window.location.replace(pathEscolherEmpresaKiosk())
  }, [irALista])

  if (irALista) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <JiffyLoading text="A abrir as empresas…" />
      </div>
    )
  }

  const mostrarToolbarFredy = clientePronto && superficie === 'fredy'

  return (
    <div className="flex h-full min-h-0 flex-col">
      {mostrarToolbarFredy ? (
        <JiffyWhatsAppToolbar aba="pedidos" />
      ) : !clientePronto && rotaPedidos ? (
        <div className="h-11 shrink-0 border-b border-transparent" aria-hidden />
      ) : null}
      <Kanban />
    </div>
  )
}
