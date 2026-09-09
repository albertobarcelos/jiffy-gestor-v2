import { describe, expect, it } from 'vitest'
import { calcularDeliveryHubProgresso } from '@/src/presentation/components/features/delivery/hub/deliveryHubProgresso'
import { EMPRESA_DELIVERY_PENDENCIA_TYPES } from '@/src/shared/constants/empresaDeliveryPendencias'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'

describe('calcularDeliveryHubProgresso', () => {
  it('sem empresa, nome/agenda/cobertura ficam incompletos', () => {
    const semEmpresa = calcularDeliveryHubProgresso([], false)
    const ids = semEmpresa.passosObrigatorios
      .filter(passo => !passo.concluido)
      .map(passo => passo.id)
    expect(ids).toEqual(
      expect.arrayContaining(['delivery-nome-cardapio', 'delivery-agenda', 'delivery-cobertura'])
    )
  })

  it('marca só o passo com pendência explícita', () => {
    const progresso = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.COBERTURA_NAO_CONFIGURADA,
          message: 'Cobertura ausente',
        },
      ],
      true,
      { possuiGeolocalizacao: true, timezoneConfigurado: true }
    )

    const geo = progresso.passos.find(passo => passo.id === 'delivery-geolocalizacao')
    const cobertura = progresso.passos.find(passo => passo.id === 'delivery-cobertura')
    expect(geo?.concluido).toBe(true)
    expect(cobertura?.concluido).toBe(false)
  })

  it('marca geo incompleta quando a pendência é de pin', () => {
    const progresso = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA,
          message: 'Pin ausente',
        },
      ],
      true,
      { possuiGeolocalizacao: false, timezoneConfigurado: true }
    )
    const geo = progresso.passos.find(passo => passo.id === 'delivery-geolocalizacao')
    const cobertura = progresso.passos.find(passo => passo.id === 'delivery-cobertura')
    expect(geo?.concluido).toBe(false)
    expect(cobertura?.concluido).toBe(true)
    expect(geo?.href).toBe(`${configuracoesTabPath('empresa')}#geolocalizacao-empresa`)
  })
})
