import { describe, expect, it } from 'vitest'
import {
  configuracoesTabPath,
  DELIVERY_HUB_PATH,
  deliveryEtapaIdFromSlug,
  deliveryHubEtapaPath,
  isConfiguracoesModulePath,
} from '@/src/shared/constants/configuracoesRoutes'

describe('configuracoesRoutes — Delivery', () => {
  it('usa /config/delivery no hub e /config/delivery/cobertura na etapa', () => {
    expect(configuracoesTabPath('empresa-delivery')).toBe('/config/delivery')
    expect(DELIVERY_HUB_PATH).toBe('/config/delivery')
    expect(deliveryHubEtapaPath('delivery-cobertura')).toBe('/config/delivery/cobertura')
    expect(deliveryEtapaIdFromSlug('cobertura')).toBe('delivery-cobertura')
    expect(deliveryEtapaIdFromSlug('foo')).toBeNull()
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
