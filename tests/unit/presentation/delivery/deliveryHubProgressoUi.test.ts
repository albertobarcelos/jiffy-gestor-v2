import { describe, expect, it } from 'vitest'
import { vestirPassoHubProgresso } from '@/src/presentation/components/features/delivery/hub/deliveryHubProgressoUi'

describe('vestirPassoHubProgresso', () => {
  it('veste href e label na presentation', () => {
    const cobertura = vestirPassoHubProgresso('delivery-cobertura')
    expect(cobertura.href).toBe('/config/delivery/cobertura')
    expect(cobertura.label).toBe('Áreas de entrega e Geo da Empresa')
    expect(cobertura.etapaId).toBe('delivery-cobertura')
  })
})
