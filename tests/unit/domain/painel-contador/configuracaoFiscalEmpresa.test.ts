import { describe, it, expect } from 'vitest'
import { ConfiguracaoFiscalEmpresa } from '@/src/domain/entities/painel-contador/ConfiguracaoFiscalEmpresa'

describe('ConfiguracaoFiscalEmpresa.fromApiResponse', () => {
  it('mapeia rodapeNota das informações complementares', () => {
    const fiscal = ConfiguracaoFiscalEmpresa.fromApiResponse({
      inscricaoEstadual: 'ISENTO',
      codigoRegimeTributario: 1,
      rodapeNota: '  Ouvidoria Procon MT 151  ',
    })

    expect(fiscal?.rodapeNota).toBe('Ouvidoria Procon MT 151')
  })

  it('usa string vazia quando rodapeNota não vem na API', () => {
    const fiscal = ConfiguracaoFiscalEmpresa.fromApiResponse({
      codigoRegimeTributario: 1,
    })

    expect(fiscal?.rodapeNota).toBe('')
  })
})
