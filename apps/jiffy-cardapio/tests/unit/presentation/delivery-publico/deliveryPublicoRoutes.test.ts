import { describe, expect, it } from 'vitest'
import {
  deliveryPublicoComandaPath,
  deliveryPublicoHomePath,
  deliveryPublicoMesaPath,
  deliveryPublicoTabletMesaPath,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/deliveryPublicoRoutes'

describe('deliveryPublicoRoutes — canais', () => {
  it('monta home e mesa/comanda no mesmo app', () => {
    expect(deliveryPublicoHomePath('loja')).toBe('/loja')
    expect(deliveryPublicoMesaPath('loja', '12')).toBe('/loja/mesa/12')
    expect(deliveryPublicoComandaPath('loja', 'A-1')).toBe('/loja/comanda/A-1')
    expect(deliveryPublicoTabletMesaPath('loja', '12')).toBe('/loja/mesa/12?tablet=1')
  })
})
