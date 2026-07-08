'use client'

import type { DeliveryLayoutId } from '../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryLayoutHomeComponent } from './DeliveryLayoutHomeProps'
import { BasicoLayoutHome } from './basico/BasicoLayoutHome'

function LayoutEmBreve({ layoutNome }: { layoutNome: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-lg font-bold" style={{ color: 'var(--delivery-text)' }}>
        Layout {layoutNome}
      </p>
      <p className="mt-2 text-sm text-gray-500">Disponível em breve no plano Mais+</p>
    </div>
  )
}

const VitrineLayoutHome: DeliveryLayoutHomeComponent = () => (
  <LayoutEmBreve layoutNome="Vitrine" />
)

const GradeLayoutHome: DeliveryLayoutHomeComponent = () => (
  <LayoutEmBreve layoutNome="Grade" />
)

const CatalogoLayoutHome: DeliveryLayoutHomeComponent = () => (
  <LayoutEmBreve layoutNome="Catálogo" />
)

const REGISTRY: Record<DeliveryLayoutId, DeliveryLayoutHomeComponent> = {
  basico: BasicoLayoutHome,
  vitrine: VitrineLayoutHome,
  grade: GradeLayoutHome,
  catalogo: CatalogoLayoutHome,
}

export function resolveDeliveryLayoutHome(layoutId: DeliveryLayoutId): DeliveryLayoutHomeComponent {
  return REGISTRY[layoutId] ?? BasicoLayoutHome
}
