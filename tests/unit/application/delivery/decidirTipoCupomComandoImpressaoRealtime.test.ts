import { describe, expect, it } from 'vitest'
import { decidirTipoCupomComandoImpressaoRealtime } from '@/src/application/delivery/decidirTipoCupomComandoImpressaoRealtime'

describe('decidirTipoCupomComandoImpressaoRealtime', () => {
  it('mapeia modo unificado para producao_completa', () => {
    expect(decidirTipoCupomComandoImpressaoRealtime('unificado')).toBe('producao_completa')
  })

  it('mapeia modo separado para producao_cozinha', () => {
    expect(decidirTipoCupomComandoImpressaoRealtime('separado')).toBe('producao_cozinha')
  })
})
