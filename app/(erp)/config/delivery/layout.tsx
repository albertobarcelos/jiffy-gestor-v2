'use client'

import { usePathname } from 'next/navigation'
import { ConfiguracoesDeliveryScreen } from '@/src/presentation/components/features/configuracoes/ConfiguracoesDeliveryScreen'
import {
  DELIVERY_HUB_PATH,
  deliveryEtapaIdFromSlug,
} from '@/src/shared/constants/configuracoesRoutes'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'

/**
 * Mantém o hub montado ao trocar de passo.
 * As páginas filhas só validam a URL; o painel lê a etapa do pathname.
 */
export default function DeliveryHubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const modulo = stripGestaoEmpresaSlugFromPath(pathname)
  const resto =
    modulo === DELIVERY_HUB_PATH
      ? ''
      : modulo.startsWith(`${DELIVERY_HUB_PATH}/`)
        ? modulo.slice(DELIVERY_HUB_PATH.length + 1)
        : ''
  const slug = resto.split('/').filter(Boolean)[0] ?? ''
  const etapaId = slug ? deliveryEtapaIdFromSlug(slug) : null

  if (slug && !etapaId) return children

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <ConfiguracoesDeliveryScreen etapaId={etapaId} />
    </div>
  )
}
