import { describe, expect, it } from 'vitest'
import {
  DESIGN_SECTION_QUERY_KEY,
  DESIGN_TABS,
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

describe('designTabs — lobby de cards e seções', () => {
  it('expõe as 6 seções do lobby/submenu com labels e paths', () => {
    expect(DESIGN_TABS).toHaveLength(6)
    expect(DESIGN_TABS.map(tab => tab.id)).toEqual([
      'cardapio',
      'cabecalho',
      'modelos',
      'cores',
      'tipografias',
      'categorias',
    ])
    expect(DESIGN_TABS.map(tab => tab.label)).toEqual([
      'Cardápio',
      'Cabeçalho',
      'Modelos',
      'Cores',
      'Tipografias',
      'Categorias',
    ])
  })

  it('lobby sem secao e seção com query secao', () => {
    expect(deliveryHubDesignPath()).toBe('/config/delivery/design')
    expect(deliveryHubDesignPath()).not.toContain(`${DESIGN_SECTION_QUERY_KEY}=`)
    expect(deliveryHubDesignSectionPath('cabecalho')).toBe(
      `/config/delivery/design?${DESIGN_SECTION_QUERY_KEY}=cabecalho`
    )
    expect(deliveryHubDesignSectionPath('categorias')).toBe(
      `/config/delivery/design?${DESIGN_SECTION_QUERY_KEY}=categorias`
    )
  })

  it('mapeia seção ↔ tab id virtual do hub', () => {
    expect(DESIGN_TABS[0]?.id).toBe('cardapio')
    expect(designSectionTabId('cardapio')).toBe('delivery-design-cardapio')
    expect(designSectionTabId('cabecalho')).toBe('delivery-design-cabecalho')
    expect(designSectionFromTabId('delivery-design-cores')).toBe('cores')
    expect(isDesignTabId('tipografias')).toBe(true)
    expect(isDesignTabId('foo')).toBe(false)
    expect(isDeliveryDesignSectionTabId('delivery-design-modelos')).toBe(true)
  })

  it('registra abas virtuais de design no hub (submenu → seção)', () => {
    expect(isDeliveryTabId('delivery-design-cabecalho')).toBe(true)
    const etapa = getDeliveryEtapaById('delivery-design-cabecalho')
    expect(etapa?.label).toBe('Cabeçalho')
    expect(etapa?.path).toBe('/config/delivery/design?secao=cabecalho')
    expect(etapa?.component).toBe(getDeliveryEtapaById('delivery-design')?.component)
  })

  it('etapa delivery-design aponta ao lobby (sem forçar cabecalho)', () => {
    const design = getDeliveryEtapaById('delivery-design')
    expect(design?.path).toBe('/config/delivery/design')
    expect(design?.path).not.toContain('secao=')
    expect(design?.title).toBe('Personalizar Loja')
  })
})
