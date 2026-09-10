import { describe, expect, it } from 'vitest'
import { calcularDeliveryHubProgresso } from '@/src/presentation/components/features/delivery/hub/deliveryHubProgresso'
import { EMPRESA_DELIVERY_PENDENCIA_TYPES } from '@/src/shared/constants/empresaDeliveryPendencias'

describe('calcularDeliveryHubProgresso', () => {
  it('trata geo e cobertura iguais quando a API não envia pendências', () => {
    const semEmpresa = calcularDeliveryHubProgresso([], false)
    expect(semEmpresa.passos.every(passo => passo.concluido === false)).toBe(true)

    const comEmpresa = calcularDeliveryHubProgresso([], true)
    expect(comEmpresa.passos.every(passo => passo.concluido === true)).toBe(true)
  })

  it('marca só o passo com pendência explícita', () => {
    const progresso = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.COBERTURA_NAO_CONFIGURADA,
          message: 'Cobertura ausente',
        },
      ],
      true
    )

    const geo = progresso.passos.find(passo => passo.id === 'delivery-geolocalizacao')
    const cobertura = progresso.passos.find(passo => passo.id === 'delivery-cobertura')
    expect(geo?.concluido).toBe(true)
    expect(cobertura?.concluido).toBe(false)
    expect(progresso.concluidosObrigatorios).toBe(1)
    expect(progresso.totalObrigatorios).toBe(2)
    expect(progresso.porcentagemObrigatorias).toBe(50)
  })

  it('marca geo incompleta quando a pendência é de pin', () => {
    const progresso = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA,
          message: 'Pin ausente',
        },
      ],
      true
    )
    const geo = progresso.passos.find(passo => passo.id === 'delivery-geolocalizacao')
    const cobertura = progresso.passos.find(passo => passo.id === 'delivery-cobertura')
    expect(geo?.concluido).toBe(false)
    expect(cobertura?.concluido).toBe(true)
    expect(geo?.href).toBe('/config/delivery/empresa')
    expect(cobertura?.href).toBe('/config/delivery/cobertura')
  })
})
