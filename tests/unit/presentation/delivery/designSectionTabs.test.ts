import { describe, expect, it } from 'vitest'
import {
  DESIGN_MODELOS_ABA_QUERY_KEY,
  DESIGN_SECTION_QUERY_KEY,
  DESIGN_TABS,
  designSectionFromTabId,
  designSectionTabId,
  deliveryHubDesignModelosPath,
  deliveryHubDesignPath,
  deliveryHubDesignSectionPath,
  isDeliveryDesignSectionTabId,
  isDesignModelosAbaId,
  isDesignNavSectionId,
  isDesignTabId,
} from '@/src/presentation/components/features/delivery-publico/shared/constants/designTabs'
import {
  getDeliveryEtapaById,
  isDeliveryTabId,
} from '@/src/presentation/components/features/delivery/hub/deliveryHubEtapas'

describe('designTabs — lobby de cards e seções', () => {
  it('expõe as 3 seções do lobby/submenu (Cores/Tipografias/Categorias em Modelos)', () => {
    expect(DESIGN_TABS).toHaveLength(3)
    expect(DESIGN_TABS.map(tab => tab.id)).toEqual([
      'cardapio',
      'cabecalho',
      'modelos',
    ])
    expect(DESIGN_TABS.map(tab => tab.label)).toEqual([
      'Cardápio',
      'Link e Cabeçalho da Loja',
      'Modelos de Layout do App Delivery',
    ])
    expect(DESIGN_TABS.find(tab => tab.id === 'cabecalho')?.labelMenu).toBe(
      'Link e Cabeçalho'
    )
    expect(DESIGN_TABS.find(tab => tab.id === 'modelos')?.labelMenu).toBe(
      'Modelos de Layout'
    )
    expect(isDesignNavSectionId('categorias')).toBe(false)
    expect(isDesignTabId('categorias')).toBe(true)
    expect(isDesignTabId('cores')).toBe(true)
  })

  it('lobby sem secao e seção com query secao', () => {
    expect(deliveryHubDesignPath()).toBe('/config/delivery/design')
    expect(deliveryHubDesignPath()).not.toContain(`${DESIGN_SECTION_QUERY_KEY}=`)
    expect(deliveryHubDesignSectionPath('cabecalho')).toBe(
      `/config/delivery/design?${DESIGN_SECTION_QUERY_KEY}=cabecalho`
    )
    expect(deliveryHubDesignSectionPath('modelos')).toBe(
      `/config/delivery/design?${DESIGN_SECTION_QUERY_KEY}=modelos`
    )
  })

  it('mapeia Cores/Tipografias/Categorias legadas para Modelos + aba', () => {
    expect(deliveryHubDesignSectionPath('cores')).toBe(
      `/config/delivery/design?${DESIGN_SECTION_QUERY_KEY}=modelos&${DESIGN_MODELOS_ABA_QUERY_KEY}=cores`
    )
    expect(deliveryHubDesignSectionPath('categorias')).toBe(
      `/config/delivery/design?${DESIGN_SECTION_QUERY_KEY}=modelos&${DESIGN_MODELOS_ABA_QUERY_KEY}=categorias`
    )
    expect(deliveryHubDesignModelosPath('tipografias')).toBe(
      `/config/delivery/design?${DESIGN_SECTION_QUERY_KEY}=modelos&${DESIGN_MODELOS_ABA_QUERY_KEY}=tipografias`
    )
    expect(deliveryHubDesignModelosPath('layout')).toBe(
      `/config/delivery/design?${DESIGN_SECTION_QUERY_KEY}=modelos`
    )
    expect(isDesignModelosAbaId('categorias')).toBe(true)
    expect(isDesignModelosAbaId('foo')).toBe(false)
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
    expect(etapa?.label).toBe('Link e Cabeçalho da Loja')
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
