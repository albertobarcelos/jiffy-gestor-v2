import { describe, expect, it } from 'vitest'
import { Impressora } from '@/src/domain/entities/Impressora'

describe('Impressora.fromJSON', () => {
  it('preserva imprimirSenha desligado vindo de terminaisConfig', () => {
    const impressora = Impressora.fromJSON({
      id: 'imp-1',
      nome: 'PDV CIELO',
      terminaisConfig: [
        {
          terminalId: 't-1',
          modelo: 'generico',
          ativo: true,
          modoImpressao: 'normal',
          imprimirSenha: false,
          ip: '192.168.1.100',
          porta: '9100',
        },
      ],
    })

    expect(impressora.toJSON().terminais?.[0]?.imprimirSenha).toBe(false)
  })

  it('lê imprimirSenha desligado também dentro de config aninhada', () => {
    const impressora = Impressora.fromJSON({
      id: 'imp-1',
      nome: 'PDV CIELO',
      terminais: [
        {
          terminalId: 't-1',
          config: { imprimirSenha: false },
        },
      ],
    })

    expect(impressora.toJSON().terminais?.[0]?.imprimirSenha).toBe(false)
  })

  it('trata ausência de imprimirSenha como ligado', () => {
    const impressora = Impressora.fromJSON({
      id: 'imp-1',
      nome: 'PDV',
      terminais: [{ terminalId: 't-1', ativo: true }],
    })

    expect(impressora.toJSON().terminais?.[0]?.imprimirSenha).toBe(true)
  })
})
