import { describe, expect, it } from 'vitest'
import {
  DESIGN_SECTION_QUERY_KEY,
  designSectionFromTabId,
  designSectionTabId,
  deliveryHubDesignPath,
  deliveryHubDesignSectionPath,
  isDeliveryDesignSectionTabId,
  isDesignTabId,
} from '@/src/presentation/components/features/delivery-publico/shared/constants/designTabs'
import {
  getDeliveryEtapaById,
  isDeliveryTabId,
} from '@/src/presentation/components/features/delivery/hub/deliveryHubEtapas'

describe('designTabs — seções no TabBar', () => {
  it('mapeia seção ↔ tab id e path com query secao', () => {
    expect(designSectionTabId('cabecalho')).toBe('delivery-design-cabecalho')
    expect(designSectionFromTabId('delivery-design-cores')).toBe('cores')
    expect(isDesignTabId('tipografias')).toBe(true)
    expect(isDesignTabId('foo')).toBe(false)
    expect(isDeliveryDesignSectionTabId('delivery-design-modelos')).toBe(true)
    expect(deliveryHubDesignPath()).toBe('/config/delivery/design')
    expect(deliveryHubDesignSectionPath('categorias')).toBe(
      `/config/delivery/design?${DESIGN_SECTION_QUERY_KEY}=categorias`
    )
  })

  it('registra abas virtuais de design no hub', () => {
    expect(isDeliveryTabId('delivery-design-cabecalho')).toBe(true)
    const etapa = getDeliveryEtapaById('delivery-design-cabecalho')
    expect(etapa?.label).toBe('Cabeçalho')
    expect(etapa?.path).toBe('/config/delivery/design?secao=cabecalho')
    expect(etapa?.component).toBe(getDeliveryEtapaById('delivery-design')?.component)
  })
})
