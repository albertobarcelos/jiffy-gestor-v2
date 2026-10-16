import { describe, expect, it } from 'vitest'
import { montarPassosHubDelivery } from '@/src/presentation/components/features/delivery/hub/deliveryHubPassosUi'
import { calcularDeliveryHubProgresso } from '@/src/presentation/components/features/delivery/hub/deliveryHubProgresso'
import { resumirCoberturaHub } from '@/src/presentation/components/features/delivery/hub/deliveryHubResumoCobertura'
import {
  DELIVERY_HUB_ETAPAS,
  DELIVERY_HUB_TAB_ID,
  getDeliveryEtapaById,
  isDeliveryTabId,
} from '@/src/presentation/components/features/delivery/hub/deliveryHubEtapas'
import { contarItensListaHub } from '@/src/presentation/components/features/delivery/hub/deliveryHubCadastros'
import { isDeliveryEtapaId } from '@/src/shared/constants/configuracoesRoutes'

const IDS_HUB = [
  'delivery-design',
  'delivery-geolocalizacao',
  'delivery-agenda',
  'delivery-cobertura',
  'delivery-entregadores',
  'delivery-meios',
  'delivery-impressoras',
] as const

describe('resumirCoberturaHub', () => {
  it('conta áreas ativas, km do raio e a menor taxa só para exibir', () => {
    const resumo = resumirCoberturaHub(
      [
        { ativo: true, valorTaxa: 8, distanciaMaximaEmMetros: 3000 },
        { ativo: true, valorTaxa: 12, distanciaMaximaEmMetros: 8000 },
        { ativo: false, valorTaxa: 1, distanciaMaximaEmMetros: 9000 },
      ],
      [
        { ativo: true, valorTaxa: 4 },
        { ativo: false, valorTaxa: 0 },
      ]
    )
    expect(resumo.qtdAreas).toBe(1)
    expect(resumo.raioMaximoKm).toBe(8)
    expect(resumo.taxaMinima).toBe(4)
  })

  it('não inventa km nem taxa quando a cobertura está vazia', () => {
    expect(resumirCoberturaHub([], [])).toEqual({
      qtdAreas: 0,
      raioMaximoKm: null,
      taxaMinima: null,
    })
  })

  it('ignora raios e áreas inativos', () => {
    expect(
      resumirCoberturaHub(
        [{ ativo: false, valorTaxa: 9, distanciaMaximaEmMetros: 5000 }],
        [{ ativo: false, valorTaxa: 2 }]
      )
    ).toEqual({
      qtdAreas: 0,
      raioMaximoKm: null,
      taxaMinima: null,
    })
  })
})

describe('contarItensListaHub', () => {
  it('usa count da API e cai para items quando o total não vem', () => {
    expect(contarItensListaHub({ count: 4, items: [{}] })).toBe(4)
    expect(contarItensListaHub({ items: [{}, {}] })).toBe(2)
    expect(contarItensListaHub([])).toBe(0)
    expect(contarItensListaHub(null)).toBe(0)
  })
})

describe('montarPassosHubDelivery', () => {
  it('lista as etapas do hub sem nome/cardápio nem notificações', () => {
    const progresso = calcularDeliveryHubProgresso([], true, {
      agendaConfigurada: true,
      coberturaConfigurada: true,
    })
    const passos = montarPassosHubDelivery(progresso)
    expect(passos.map(passo => passo.id)).toEqual([...IDS_HUB])
    expect(passos.map(passo => passo.numero)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(passos.filter(passo => passo.obrigatoria).map(passo => passo.id)).toEqual([
      'delivery-design',
      'delivery-geolocalizacao',
      'delivery-agenda',
      'delivery-cobertura',
    ])
    expect(passos[0]?.href).toBe('/config/delivery/design')
    expect(passos[1]?.href).toBe('/config/delivery/empresa')
    expect(passos[2]?.href).toBe('/config/delivery/agenda')
    expect(passos[3]?.href).toBe('/config/delivery/cobertura')
    expect(passos.every(passo => passo.etapaId === passo.id)).toBe(true)
  })

  it('não marca etapas recomendadas como concluídas pelo progresso obrigatório', () => {
    const passos = montarPassosHubDelivery(
      calcularDeliveryHubProgresso([], true, {
        agendaConfigurada: true,
        coberturaConfigurada: true,
      }),
      {
        empresaDeliveryConfigurada: true,
      }
    )
    const recomendados = passos.filter(passo => !passo.obrigatoria)
    expect(recomendados.map(passo => passo.id)).toEqual([
      'delivery-entregadores',
      'delivery-meios',
      'delivery-impressoras',
    ])
    expect(recomendados.every(passo => passo.concluido === false)).toBe(true)
  })

  it('marca Personalizar loja pelo mesmo critério de Nome da loja e cardápio', () => {
    const comPendencia = montarPassosHubDelivery(
      calcularDeliveryHubProgresso(
        [{ type: 'CARDAPIO_DELIVERY_NAO_CONFIGURADO', message: 'Cardápio' }],
        true,
        { agendaConfigurada: true, coberturaConfigurada: true }
      )
    )
    expect(comPendencia.find(passo => passo.id === 'delivery-design')?.obrigatoria).toBe(true)
    expect(comPendencia.find(passo => passo.id === 'delivery-design')?.concluido).toBe(false)

    const semPendencia = montarPassosHubDelivery(
      calcularDeliveryHubProgresso([], true, {
        agendaConfigurada: true,
        coberturaConfigurada: true,
      })
    )
    expect(semPendencia.find(passo => passo.id === 'delivery-design')?.concluido).toBe(true)
  })

  it('marca etapas recomendadas como concluídas só quando há cadastro', () => {
    const progresso = calcularDeliveryHubProgresso([], true, {
      agendaConfigurada: true,
      coberturaConfigurada: true,
    })
    const preenchidos = montarPassosHubDelivery(progresso, {
      qtdEntregadores: 2,
      qtdMeiosPagamento: 1,
      qtdImpressoras: 3,
      empresaDeliveryConfigurada: true,
    })
    const entregadores = preenchidos.find(passo => passo.id === 'delivery-entregadores')
    const meios = preenchidos.find(passo => passo.id === 'delivery-meios')
    const impressoras = preenchidos.find(passo => passo.id === 'delivery-impressoras')
    expect(entregadores?.concluido).toBe(true)
    expect(meios?.concluido).toBe(true)
    expect(impressoras?.concluido).toBe(true)
    expect([entregadores, meios, impressoras].every(passo => passo?.cta === 'Editar')).toBe(true)
  })

  it('alinha badges das obrigatórias ao progresso expandido', () => {
    const progresso = calcularDeliveryHubProgresso(
      [
        {
          type: 'FUNCIONAMENTO_AGENDA_NAO_CONFIGURADA',
          message: 'Agenda',
          obrigatoria: false,
        },
      ],
      true,
      { coberturaConfigurada: true }
    )
    const passos = montarPassosHubDelivery(progresso)
    expect(passos.find(passo => passo.id === 'delivery-agenda')?.concluido).toBe(false)
    expect(passos.find(passo => passo.id === 'delivery-cobertura')?.concluido).toBe(true)
  })

  it('mantém agenda e cobertura pendentes sem sinais locais', () => {
    const passos = montarPassosHubDelivery(calcularDeliveryHubProgresso([], true))
    expect(passos.find(passo => passo.id === 'delivery-agenda')?.concluido).toBe(false)
    expect(passos.find(passo => passo.id === 'delivery-cobertura')?.concluido).toBe(false)
  })
})

describe('DELIVERY_HUB_ETAPAS', () => {
  it('expõe sete etapas do hub (nome/cardápio e WhatsApp em Personalizar loja)', () => {
    expect(DELIVERY_HUB_ETAPAS.map(etapa => etapa.step)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(getDeliveryEtapaById('delivery-design')?.step).toBe(1)
    expect(getDeliveryEtapaById('delivery-meios')?.label).toBe('Pagamento')
    expect(getDeliveryEtapaById('delivery-impressoras')?.component).toBeTypeOf('function')
    expect(getDeliveryEtapaById('delivery-nome-cardapio')).toBeUndefined()
    expect(getDeliveryEtapaById('delivery-notificacoes')).toBeUndefined()
    expect(getDeliveryEtapaById('delivery-hub')).toBeUndefined()
  })

  it('reconhece o hub e as etapas internas como abas do Delivery', () => {
    expect(isDeliveryTabId(DELIVERY_HUB_TAB_ID)).toBe(true)
    expect(isDeliveryTabId('delivery-entregadores')).toBe(true)
    expect(isDeliveryEtapaId('delivery-impressoras')).toBe(true)
    expect(isDeliveryEtapaId('delivery-nome-cardapio')).toBe(true)
    expect(isDeliveryEtapaId('delivery-notificacoes')).toBe(true)
    expect(isDeliveryTabId(null)).toBe(false)
    expect(isDeliveryTabId('empresa')).toBe(false)
    expect(isDeliveryEtapaId('delivery-hub')).toBe(false)
  })
})
