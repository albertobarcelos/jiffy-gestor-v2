'use client'

import type { DeliveryLayoutId } from '../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryLayoutHomeComponent } from './DeliveryLayoutHomeProps'
import { BasicoLayoutHome } from './basico/BasicoLayoutHome'
import { VitrineLayoutHome } from './vitrine/VitrineLayoutHome'
import { GradeLayoutHome } from './grade/GradeLayoutHome'
import { CatalogoLayoutHome } from './catalogo/CatalogoLayoutHome'

const REGISTRY: Record<DeliveryLayoutId, DeliveryLayoutHomeComponent> = {
  basico: BasicoLayoutHome,
  vitrine: VitrineLayoutHome,
  grade: GradeLayoutHome,
  catalogo: CatalogoLayoutHome,
}

export function resolveDeliveryLayoutHome(layoutId: DeliveryLayoutId): DeliveryLayoutHomeComponent {
  return REGISTRY[layoutId] ?? BasicoLayoutHome
}
