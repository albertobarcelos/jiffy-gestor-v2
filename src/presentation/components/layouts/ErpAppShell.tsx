'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'
import { ErpTenantAccessGuard } from '@/src/presentation/components/layouts/ErpTenantAccessGuard'
import {
  chromeErpCasco,
  isRotaPedidos,
} from '@/src/presentation/gestor-pedidos/kiosk/isKioskGestorPedidos'
import { useSuperficieQuadroPedidos } from '@/src/presentation/gestor-pedidos/kiosk/useSuperficieQuadroPedidos'
import { WhatsAppWebViewHost } from '@/src/presentation/gestor-pedidos/whatsapp/WhatsAppWebViewHost'
import { useDetectCacheLeaks } from '@/src/presentation/hooks/useDetectCacheLeaks'
import { HUB_PATH } from '@/src/shared/constants/hubRoutes'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'

function ErpAppShellInner({ children }: { children: ReactNode }) {
  useDetectCacheLeaks()
  const pathname = usePathname()
  const superficie = useSuperficieQuadroPedidos()
  const pedidos = isRotaPedidos(stripGestaoEmpresaSlugFromPath(pathname ?? ''))
  const [clientePronto, setClientePronto] = useState(false)

  useEffect(() => {
    setClientePronto(true)
  }, [])

  const { layoutKiosk, mostrarTopNav } = chromeErpCasco({
    superficie,
    rotaPedidos: pedidos,
    clientePronto,
  })

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-gray-50">
      {superficie === 'fredy' && clientePronto ? <WhatsAppWebViewHost /> : null}
      {mostrarTopNav ? <TopNav /> : null}

      <main
        className={
          layoutKiosk
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
            : 'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-1 md:px-2'
        }
      >
        {children}
      </main>
    </div>
  )
}

/**
 * Shell único do ERP: TopNav montado uma vez por sessão de navegação entre rotas irmãs em `app/(erp)/`.
 * Padrão visual: coluna 100dvh, TopNav fixo, `main` com scroll (ex-layout dashboard).
 * Protegido por ErpTenantAccessGuard: redireciona para /login ou {@link HUB_PATH} se a sessão de empresa for inválida.
 */
export function ErpAppShell({ children }: { children: ReactNode }) {
  return (
    <ErpTenantAccessGuard>
      <ErpAppShellInner>{children}</ErpAppShellInner>
    </ErpTenantAccessGuard>
  )
}
