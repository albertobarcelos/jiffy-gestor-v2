'use client'

import { CATALOGO_INTEGRACOES } from '@/src/presentation/components/features/delivery/integracoes/catalogoIntegracoes'
import { MarketplaceIntegracaoCard } from '@/src/presentation/components/features/delivery/integracoes/MarketplaceIntegracaoCard'

export function DeliveryIntegracoesView() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Integrações</h1>
        <p className="mt-1 text-sm text-secondary-text">
          Conecte marketplaces à empresa aberta. Os pedidos entram no Kanban.
        </p>
      </header>

      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
        {CATALOGO_INTEGRACOES.map(item => (
          <MarketplaceIntegracaoCard key={item.marketplace} item={item} />
        ))}
      </div>
    </div>
  )
}
