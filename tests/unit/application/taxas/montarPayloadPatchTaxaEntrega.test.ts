import { describe, expect, it } from 'vitest'
import { montarPayloadPatchTaxaEntrega } from '@/src/application/taxas/montarPayloadPatchTaxaEntrega'

describe('montarPayloadPatchTaxaEntrega', () => {
  it('preserva tributado, NCM e terminais do detalhe', () => {
    const payload = montarPayloadPatchTaxaEntrega(
      {
        tributado: 'true',
        ncm: 2106,
        dataAtualizacao: '2026-01-01T12:00:00.000Z',
        terminaisConfig: [
          {
            terminalId: 't1',
            ativo: true,
            automatico: 'true',
            mesa: false,
            balcao: true,
          },
        ],
      },
      { nome: 'Especial', valor: 8.5, ativo: false }
    )

    expect(payload).toEqual({
      nome: 'Especial',
      valor: 8.5,
      tipo: 'entrega',
      ativo: false,
      tributado: true,
      ncm: '2106',
      dataAtualizacao: '2026-01-01T12:00:00.000Z',
      terminaisConfig: [
        {
          terminalId: 't1',
          ativo: true,
          automatico: true,
          mesa: false,
          balcao: true,
        },
      ],
    })
  })

  it('usa agora quando o detalhe não tem dataAtualizacao', () => {
    const agora = new Date('2026-10-20T15:00:00.000Z')
    const payload = montarPayloadPatchTaxaEntrega(
      { tributado: false },
      { nome: 'Padrão', valor: 5, ativo: true },
      agora
    )
    expect(payload.ncm).toBeNull()
    expect(payload.tributado).toBe(false)
    expect(payload.dataAtualizacao).toBe(agora.toISOString())
    expect(payload.terminaisConfig).toBeUndefined()
  })
})
