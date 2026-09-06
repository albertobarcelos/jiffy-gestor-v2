import { describe, expect, it } from 'vitest'
import {
  configuracoesTabPath,
  DELIVERY_HUB_PATH,
  deliveryEtapaIdFromSlug,
  deliveryHubEtapaPath,
  isConfiguracoesModulePath,
  resolverRedirectHubDeliveryLegado,
} from '@/src/shared/constants/configuracoesRoutes'

describe('configuracoesRoutes — Delivery', () => {
  it('usa /config/delivery no hub e /config/delivery/cobertura na etapa', () => {
    expect(configuracoesTabPath('empresa-delivery')).toBe('/config/delivery')
    expect(DELIVERY_HUB_PATH).toBe('/config/delivery')
    expect(deliveryHubEtapaPath('delivery-cobertura')).toBe('/config/delivery/cobertura')
    expect(deliveryHubEtapaPath('delivery-geolocalizacao')).toBe('/config/delivery/empresa')
    expect(deliveryHubEtapaPath('delivery-entregadores')).toBe('/config/delivery/entregadores')
    expect(deliveryHubEtapaPath('delivery-meios')).toBe('/config/delivery/meios')
    expect(deliveryHubEtapaPath('delivery-impressoras')).toBe('/config/delivery/impressoras')
    expect(deliveryEtapaIdFromSlug('cobertura')).toBe('delivery-cobertura')
    expect(deliveryEtapaIdFromSlug('empresa')).toBe('delivery-geolocalizacao')
    expect(deliveryEtapaIdFromSlug('entregadores')).toBe('delivery-entregadores')
    expect(deliveryEtapaIdFromSlug('meios')).toBe('delivery-meios')
    expect(deliveryEtapaIdFromSlug('impressoras')).toBe('delivery-impressoras')
    expect(deliveryEtapaIdFromSlug('foo')).toBeNull()
  })

  it('redireciona rotas legadas do Delivery para o hub ou a etapa pedida', () => {
    expect(resolverRedirectHubDeliveryLegado('cobertura-delivery', null)).toBe(
      '/config/delivery/cobertura'
    )
    expect(resolverRedirectHubDeliveryLegado('empresa-delivery', null)).toBe('/config/delivery')
    expect(
      resolverRedirectHubDeliveryLegado('empresa-delivery', 'delivery-meios')
    ).toBe('/config/delivery/meios')
    expect(resolverRedirectHubDeliveryLegado('impressoras', 'delivery-meios')).toBeNull()
  })

  it('reconhece o módulo Configurações no prefixo curto e no legado', () => {
    expect(isConfiguracoesModulePath('/config/delivery/cobertura')).toBe(true)
    expect(isConfiguracoesModulePath('/gestao/loja-abc12345/config/delivery')).toBe(true)
    expect(isConfiguracoesModulePath('/configuracoes/empresa')).toBe(true)
    expect(isConfiguracoesModulePath('/pedidos')).toBe(false)
  })

  it('mantém as demais abas em /configuracoes/:aba', () => {
    expect(configuracoesTabPath('empresa')).toBe('/configuracoes/empresa')
    expect(configuracoesTabPath('taxas')).toBe('/configuracoes/taxas')
  })
})
