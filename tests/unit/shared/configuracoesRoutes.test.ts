import { describe, expect, it } from 'vitest'
import {
  CONFIGURACOES_DELIVERY_TAB,
  configuracoesTabPath,
  DELIVERY_HUB_PATH,
  deliveryEtapaIdFromSlug,
  deliveryHubEtapaPath,
  isConfiguracoesModulePath,
  isConfiguracoesTabSlug,
  isDeliveryEtapaId,
} from '@/src/shared/constants/configuracoesRoutes'

describe('configuracoesRoutes — Delivery', () => {
  it('usa /configuracoes/empresa-delivery no hub e ?abrir= nas etapas do cardápio', () => {
    expect(DELIVERY_HUB_PATH).toBe('/configuracoes/empresa-delivery')
    expect(CONFIGURACOES_DELIVERY_TAB).toBe('delivery')
    expect(isConfiguracoesTabSlug('empresa-delivery')).toBe(true)
    expect(isConfiguracoesTabSlug('cobertura-delivery')).toBe(false)
    expect(isDeliveryEtapaId('delivery-cobertura')).toBe(true)
    expect(isDeliveryEtapaId('empresa-delivery')).toBe(false)
    expect(deliveryHubEtapaPath('delivery-cobertura')).toBe(
      '/configuracoes/empresa-delivery?abrir=delivery-cobertura'
    )
    expect(deliveryHubEtapaPath('delivery-notificacoes')).toBe(
      '/configuracoes/empresa-delivery?abrir=delivery-notificacoes'
    )
    expect(deliveryHubEtapaPath('delivery-geolocalizacao')).toBe('/config/delivery/empresa')
    expect(deliveryHubEtapaPath('delivery-entregadores')).toBe('/config/delivery/entregadores')
    expect(deliveryEtapaIdFromSlug('cobertura')).toBe('delivery-cobertura')
    expect(deliveryEtapaIdFromSlug('notificacoes')).toBe('delivery-notificacoes')
    expect(deliveryEtapaIdFromSlug('empresa')).toBe('delivery-geolocalizacao')
    expect(deliveryEtapaIdFromSlug('cobertura-delivery')).toBeNull()
    expect(deliveryEtapaIdFromSlug('foo')).toBeNull()
  })

  it('reconhece o módulo Configurações em /config e /configuracoes', () => {
    expect(isConfiguracoesModulePath('/config/delivery/cobertura')).toBe(true)
    expect(isConfiguracoesModulePath('/gestao/loja-abc12345/config/delivery')).toBe(true)
    expect(isConfiguracoesModulePath('/configuracoes/empresa')).toBe(true)
    expect(isConfiguracoesModulePath('/pedidos')).toBe(false)
  })

  it('mantém as abas de Configurações em /configuracoes/:aba', () => {
    expect(configuracoesTabPath('empresa')).toBe('/configuracoes/empresa')
    expect(configuracoesTabPath('taxas')).toBe('/configuracoes/taxas')
    expect(configuracoesTabPath('meios-pagamentos')).toBe('/configuracoes/meios-pagamentos')
    expect(configuracoesTabPath('empresa-delivery')).toBe('/configuracoes/empresa-delivery')
    expect(configuracoesTabPath('menus')).toBe('/configuracoes/menus')
  })
})
