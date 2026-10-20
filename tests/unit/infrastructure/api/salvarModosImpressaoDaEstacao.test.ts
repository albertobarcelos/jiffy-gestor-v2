import { describe, expect, it } from 'vitest'
import { montarTerminaisComModoDaEstacao } from '@/src/infrastructure/api/salvarModosImpressaoDaEstacao'

describe('montarTerminaisComModoDaEstacao', () => {
  it('atualiza o modo da estação e preserva os outros terminais', () => {
    const result = montarTerminaisComModoDaEstacao(
      {
        terminaisConfig: [
          { terminalId: 'pdv-1', modoImpressao: 'agrupado', modelo: 'epson' },
          { terminalId: 'est-gestor', modoImpressao: 'normal' },
        ],
      },
      'est-gestor',
      'porUnidade'
    )

    expect(result.changed).toBe(true)
    expect(result.terminais).toEqual([
      expect.objectContaining({
        terminalId: 'pdv-1',
        config: expect.objectContaining({ modoImpressao: 'agrupado', modoFicha: false }),
      }),
      expect.objectContaining({
        terminalId: 'est-gestor',
        config: expect.objectContaining({ modoImpressao: 'porUnidade', modoFicha: false }),
      }),
    ])
  })

  it('não marca changed quando o modo já está gravado', () => {
    const result = montarTerminaisComModoDaEstacao(
      { terminais: [{ terminalId: 'est-1', modoImpressao: 'ficha' }] },
      'est-1',
      'ficha'
    )
    expect(result.changed).toBe(false)
    expect(result.terminais[0].config.modoFicha).toBe(true)
  })

  it('insere a estação quando o modo não é normal', () => {
    const result = montarTerminaisComModoDaEstacao(
      { terminaisConfig: [{ terminalId: 'pdv-1', modoImpressao: 'normal' }] },
      'est-gestor',
      'agrupado'
    )
    expect(result.changed).toBe(true)
    expect(result.terminais.map(t => t.terminalId)).toEqual(['pdv-1', 'est-gestor'])
    expect(result.terminais[1].config.modoImpressao).toBe('agrupado')
  })

  it('não cria terminal só para gravar normal', () => {
    const result = montarTerminaisComModoDaEstacao({ terminais: [] }, 'est-gestor', 'normal')
    expect(result.changed).toBe(false)
    expect(result.terminais).toEqual([])
  })

  it('lê config aninhada do PATCH', () => {
    const result = montarTerminaisComModoDaEstacao(
      {
        terminais: [
          {
            terminalId: 'est-gestor',
            config: { modoImpressao: 'normal', modelo: 'generico', ip: '10.0.0.8' },
          },
        ],
      },
      'est-gestor',
      'porUnidade'
    )
    expect(result.changed).toBe(true)
    expect(result.terminais[0].config.ip).toBe('10.0.0.8')
    expect(result.terminais[0].config.modoImpressao).toBe('porUnidade')
  })
})
