import { describe, expect, it } from 'vitest'
import { calcularDeliveryHubProgresso } from '@/src/presentation/components/features/delivery/hub/deliveryHubProgresso'
import { EMPRESA_DELIVERY_PENDENCIA_TYPES } from '@/src/shared/constants/empresaDeliveryPendencias'

const IDS_OBRIGATORIOS = [
  'delivery-geolocalizacao',
  'delivery-nome-cardapio',
  'delivery-agenda',
  'delivery-cobertura',
] as const

describe('calcularDeliveryHubProgresso', () => {
  it('trata as quatro obrigatórias iguais quando a API não envia pendências', () => {
    const semEmpresa = calcularDeliveryHubProgresso([], false)
    expect(semEmpresa.passos.map(passo => passo.id)).toEqual([...IDS_OBRIGATORIOS])
    expect(semEmpresa.passos.every(passo => passo.concluido === false)).toBe(true)
    expect(semEmpresa.totalObrigatorios).toBe(4)
    expect(semEmpresa.concluidosObrigatorios).toBe(0)

    const comEmpresa = calcularDeliveryHubProgresso([], true)
    expect(comEmpresa.passos.every(passo => passo.concluido === true)).toBe(true)
    expect(comEmpresa.concluidosObrigatorios).toBe(4)
    expect(comEmpresa.porcentagemObrigatorias).toBe(100)
  })

  it('marca só o passo com pendência obrigatória explícita', () => {
    const progresso = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.COBERTURA_NAO_CONFIGURADA,
          message: 'Cobertura ausente',
        },
      ],
      true
    )

    expect(
      progresso.passos.filter(passo => passo.concluido).map(passo => passo.id)
    ).toEqual(['delivery-geolocalizacao', 'delivery-nome-cardapio', 'delivery-agenda'])
    expect(progresso.passos.find(passo => passo.id === 'delivery-cobertura')?.concluido).toBe(
      false
    )
    expect(progresso.concluidosObrigatorios).toBe(3)
    expect(progresso.totalObrigatorios).toBe(4)
    expect(progresso.porcentagemObrigatorias).toBe(75)
  })

  it('marca empresa incompleta com pendência de pin ou timezone', () => {
    const comPin = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA,
          message: 'Pin ausente',
        },
      ],
      true
    )
    expect(comPin.passos.find(passo => passo.id === 'delivery-geolocalizacao')?.concluido).toBe(
      false
    )
    expect(comPin.passos.find(passo => passo.id === 'delivery-cobertura')?.concluido).toBe(true)
    expect(comPin.passos.find(passo => passo.id === 'delivery-geolocalizacao')?.href).toBe(
      '/config/delivery/empresa'
    )

    const comTimezone = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.TIMEZONE_NAO_CONFIGURADO,
          message: 'Fuso ausente',
        },
      ],
      true
    )
    expect(
      comTimezone.passos.find(passo => passo.id === 'delivery-geolocalizacao')?.concluido
    ).toBe(false)
    expect(comTimezone.concluidosObrigatorios).toBe(3)
  })

  it('conta nome/cardápio e agenda como obrigatórias', () => {
    const progresso = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.CARDAPIO_DELIVERY_NAO_CONFIGURADO,
          message: 'Cardápio',
        },
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.FUNCIONAMENTO_AGENDA_NAO_CONFIGURADA,
          message: 'Agenda',
        },
      ],
      true
    )
    expect(progresso.passos.find(passo => passo.id === 'delivery-nome-cardapio')?.concluido).toBe(
      false
    )
    expect(progresso.passos.find(passo => passo.id === 'delivery-agenda')?.concluido).toBe(false)
    expect(progresso.concluidosObrigatorios).toBe(2)
    expect(progresso.porcentagemObrigatorias).toBe(50)
  })

  it('ignora orientação (obrigatoria false) no progresso', () => {
    const progresso = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.CANAL_WHATSAPP_NAO_CONECTADO,
          message: 'WhatsApp',
          obrigatoria: false,
        },
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.TIMEZONE_NAO_CONFIGURADO,
          message: 'Fuso só como dica',
          obrigatoria: false,
        },
      ],
      true
    )
    expect(progresso.concluidosObrigatorios).toBe(4)
    expect(progresso.passos.every(passo => passo.concluido)).toBe(true)
  })
})
