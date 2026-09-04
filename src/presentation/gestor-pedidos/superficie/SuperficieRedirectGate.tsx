'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { autorizarRotaNaSuperficieUseCase } from '@/src/application/use-cases/superficie/AutorizarRotaNaSuperficieUseCase'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  buildGestaoPath,
  parseEmpresaSlugFromPath,
  stripGestaoEmpresaSlugFromPath,
} from '@/src/shared/utils/gestaoRoutes'
import { montarContextoAcessoSuperficie } from './montarContextoAcessoSuperficie'

/**
 * Encaminha o operador exclusivo para `/pedidos` e impede o resto do ERP.
 */
export function SuperficieRedirectGate() {
  const pathname = usePathname()
  const router = useRouter()
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const isTabVerified = useAuthStore(s => s.isTabVerified)

  useEffect(() => {
    if (!isRehydrated || !isTabVerified || !pathname) return
    const token = tenantAuth?.getAccessToken()
    if (!token) return

    const pathModulo = stripGestaoEmpresaSlugFromPath(pathname)
    const resultado = autorizarRotaNaSuperficieUseCase.execute({
      pathModulo,
      contexto: montarContextoAcessoSuperficie(token),
    })
    if (resultado.permitido) return

    const slug = parseEmpresaSlugFromPath(pathname)
    const destino = slug
      ? buildGestaoPath(slug, resultado.destinoSeNegado)
      : resultado.destinoSeNegado
    if (destino !== pathname) {
      router.replace(destino)
    }
  }, [isRehydrated, isTabVerified, pathname, router, tenantAuth])

  return null
}
