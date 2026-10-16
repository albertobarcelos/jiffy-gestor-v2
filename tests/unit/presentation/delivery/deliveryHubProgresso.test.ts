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
  it('não conclui agenda/cobertura só porque a empresa delivery existe', () => {
    const semEmpresa = calcularDeliveryHubProgresso([], false)
    expect(semEmpresa.passos.map(passo => passo.id)).toEqual([...IDS_OBRIGATORIOS])
    expect(semEmpresa.passos.every(passo => passo.concluido === false)).toBe(true)
    expect(semEmpresa.totalObrigatorios).toBe(4)
    expect(semEmpresa.concluidosObrigatorios).toBe(0)

    const comEmpresa = calcularDeliveryHubProgresso([], true)
    expect(
      comEmpresa.passos.filter(passo => passo.concluido).map(passo => passo.id)
    ).toEqual(['delivery-geolocalizacao', 'delivery-nome-cardapio'])
    expect(comEmpresa.passos.find(passo => passo.id === 'delivery-agenda')?.concluido).toBe(false)
    expect(comEmpresa.passos.find(passo => passo.id === 'delivery-cobertura')?.concluido).toBe(
      false
    )
    expect(comEmpresa.concluidosObrigatorios).toBe(2)
    expect(comEmpresa.porcentagemObrigatorias).toBe(50)
  })

  it('conclui agenda e cobertura só com sinais locais positivos', () => {
    const progresso = calcularDeliveryHubProgresso([], true, {
      agendaConfigurada: true,
      coberturaConfigurada: true,
    })
    expect(progresso.passos.every(passo => passo.concluido === true)).toBe(true)
    expect(progresso.concluidosObrigatorios).toBe(4)
    expect(progresso.porcentagemObrigatorias).toBe(100)
  })

  it('respeita sinal local de cobertura mesmo sem pendência da API', () => {
    const progresso = calcularDeliveryHubProgresso([], true, {
      agendaConfigurada: true,
      coberturaConfigurada: false,
    })

    expect(
      progresso.passos.filter(passo => passo.concluido).map(passo => passo.id)
    ).toEqual(['delivery-geolocalizacao', 'delivery-nome-cardapio', 'delivery-agenda'])
    expect(progresso.passos.find(passo => passo.id === 'delivery-cobertura')?.concluido).toBe(
      false
    )
    expect(progresso.concluidosObrigatorios).toBe(3)
    expect(progresso.porcentagemObrigatorias).toBe(75)
  })

  it('marca empresa incompleta só com timezone; pin bloqueia áreas de entrega', () => {
    const comPin = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA,
          message: 'Pin ausente',
        },
      ],
      true,
      { agendaConfigurada: true, coberturaConfigurada: true }
    )
    expect(comPin.passos.find(passo => passo.id === 'delivery-geolocalizacao')?.concluido).toBe(
      true
    )
    expect(comPin.passos.find(passo => passo.id === 'delivery-cobertura')?.concluido).toBe(false)
    expect(comPin.passos.find(passo => passo.id === 'delivery-cobertura')?.href).toBe(
      '/config/delivery/cobertura'
    )
    expect(comPin.passos.find(passo => passo.id === 'delivery-cobertura')?.label).toBe(
      'Áreas de entrega e Geo da Empresa'
    )

    const comTimezone = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.TIMEZONE_NAO_CONFIGURADO,
          message: 'Fuso ausente',
        },
      ],
      true,
      { agendaConfigurada: true, coberturaConfigurada: true }
    )
    expect(
      comTimezone.passos.find(passo => passo.id === 'delivery-geolocalizacao')?.concluido
    ).toBe(false)
    expect(comTimezone.passos.find(passo => passo.id === 'delivery-cobertura')?.concluido).toBe(
      true
    )
    expect(comTimezone.concluidosObrigatorios).toBe(3)
  })

  it('conta nome/cardápio e agenda como pendentes', () => {
    const progresso = calcularDeliveryHubProgresso(
      [
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.CARDAPIO_DELIVERY_NAO_CONFIGURADO,
          message: 'Cardápio',
        },
        {
          type: EMPRESA_DELIVERY_PENDENCIA_TYPES.FUNCIONAMENTO_AGENDA_NAO_CONFIGURADA,
          message: 'Agenda',
          obrigatoria: false,
        },
      ],
      true,
      { coberturaConfigurada: true }
    )
    expect(progresso.passos.find(passo => passo.id === 'delivery-nome-cardapio')?.concluido).toBe(
      false
    )
    expect(progresso.passos.find(passo => passo.id === 'delivery-agenda')?.concluido).toBe(false)
    expect(progresso.concluidosObrigatorios).toBe(2)
    expect(progresso.porcentagemObrigatorias).toBe(50)
  })

  it('ignora orientação de WhatsApp/timezone no progresso de geo/nome', () => {
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
      true,
      { agendaConfigurada: true, coberturaConfigurada: true }
    )
    expect(progresso.concluidosObrigatorios).toBe(4)
    expect(progresso.passos.every(passo => passo.concluido)).toBe(true)
  })

  it('prioriza sinal local de agenda sobre ausência de pendência', () => {
    const progresso = calcularDeliveryHubProgresso([], true, {
      agendaConfigurada: false,
      coberturaConfigurada: true,
    })
    expect(progresso.passos.find(passo => passo.id === 'delivery-agenda')?.concluido).toBe(false)
    expect(progresso.passos.find(passo => passo.id === 'delivery-cobertura')?.concluido).toBe(true)
  })
})
