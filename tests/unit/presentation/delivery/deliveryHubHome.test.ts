import { describe, expect, it } from 'vitest'
import {
  ctaPrimarioPreviewHub,
  fatosPreviewHub,
  linhaEnderecoHub,
} from '@/src/presentation/components/features/delivery/hub/deliveryHubPreview'
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
  it('lista as etapas do hub de cardápio com cobertura e WhatsApp', () => {
    const progresso = calcularDeliveryHubProgresso([], true, {
      possuiGeolocalizacao: true,
      timezoneConfigurado: true,
    })
    const passos = montarPassosHubDelivery(progresso)
    expect(passos.map(passo => passo.id)).toEqual([
      'delivery-nome-cardapio',
      'delivery-design',
      'delivery-agenda',
      'delivery-cobertura',
      'delivery-notificacoes',
    ])
    expect(passos.filter(passo => passo.obrigatoria).map(passo => passo.id)).toEqual([
      'delivery-nome-cardapio',
      'delivery-agenda',
      'delivery-cobertura',
    ])
    expect(passos.every(passo => passo.href === '/configuracoes/empresa-delivery')).toBe(true)
    expect(passos.every(passo => passo.etapaId === passo.id)).toBe(true)
  })

  it('marca WhatsApp concluído só quando o canal está conectado', () => {
    const progresso = calcularDeliveryHubProgresso([], true, {
      possuiGeolocalizacao: true,
      timezoneConfigurado: true,
    })
    const desconectado = montarPassosHubDelivery(progresso).find(
      passo => passo.id === 'delivery-notificacoes'
    )
    const conectado = montarPassosHubDelivery(progresso, { whatsappConectado: true }).find(
      passo => passo.id === 'delivery-notificacoes'
    )
    expect(desconectado?.concluido).toBe(false)
    expect(conectado?.concluido).toBe(true)
    expect(conectado?.cta).toBe('Editar')
  })
})

describe('DELIVERY_HUB_ETAPAS', () => {
  it('expõe cinco etapas do cardápio, cobertura e WhatsApp', () => {
    expect(DELIVERY_HUB_ETAPAS.map(etapa => etapa.step)).toEqual([1, 2, 3, 4, 5])
    expect(getDeliveryEtapaById('delivery-nome-cardapio')?.label).toBe('Nome e cardápio')
    expect(getDeliveryEtapaById('delivery-cobertura')?.component).toBeTypeOf('function')
    expect(getDeliveryEtapaById('delivery-notificacoes')?.label).toBe('WhatsApp')
    expect(getDeliveryEtapaById('delivery-notificacoes')?.obrigatoria).toBe(false)
    expect(getDeliveryEtapaById('delivery-hub')).toBeUndefined()
  })

  it('reconhece o hub e as etapas internas como abas do Delivery', () => {
    expect(isDeliveryTabId(DELIVERY_HUB_TAB_ID)).toBe(true)
    expect(isDeliveryTabId('delivery-cobertura')).toBe(true)
    expect(isDeliveryEtapaId('delivery-notificacoes')).toBe(true)
    expect(isDeliveryTabId('delivery-notificacoes')).toBe(true)
    expect(isDeliveryTabId(null)).toBe(false)
    expect(isDeliveryTabId('empresa')).toBe(false)
    expect(isDeliveryEtapaId('delivery-hub')).toBe(false)
  })
})

describe('preview do hub', () => {
  it('formata o endereço da empresa para o cartão', () => {
    expect(linhaEnderecoHub(null)).toBe('Endereço ainda não preenchido.')
    expect(linhaEnderecoHub({})).toBe('Endereço ainda não preenchido.')
    expect(
      linhaEnderecoHub({
        rua: 'Rua das Flores',
        numero: '10',
        bairro: 'Centro',
        cidade: 'Vitória',
        estado: 'ES',
      })
    ).toBe('Rua das Flores, 10 · Centro · Vitória / ES')
  })

  it('mostra áreas, raio e menor taxa só para leitura', () => {
    const progresso = calcularDeliveryHubProgresso([], true)
    const cobertura = montarPassosHubDelivery(progresso).find(
      passo => passo.id === 'delivery-cobertura'
    )
    expect(cobertura).toBeDefined()
    const fatos = fatosPreviewHub(
      cobertura!,
      { qtdAreas: 1, raioMaximoKm: 8, taxaMinima: 4 },
      null,
      null
    )
    expect(fatos.map(fato => fato.texto)).toEqual([
      '1 área configurada',
      'Raio máximo: 8 km',
      expect.stringMatching(/^Taxa a partir de R\$\s*4,00$/),
    ])
    expect(
      fatosPreviewHub(
        cobertura!,
        { qtdAreas: 0, raioMaximoKm: null, taxaMinima: null },
        null,
        null
      ).map(fato => fato.texto)
    ).toEqual(['0 áreas configuradas', 'Raio ainda não definido'])
    expect(ctaPrimarioPreviewHub(cobertura!)).toBe('Editar áreas de entrega')
  })

  it('mostra no cartão se o WhatsApp está conectado e o CTA correspondente', () => {
    const progresso = calcularDeliveryHubProgresso([], false)
    const desconectado = montarPassosHubDelivery(progresso).find(
      passo => passo.id === 'delivery-notificacoes'
    )
    const conectado = montarPassosHubDelivery(progresso, { whatsappConectado: true }).find(
      passo => passo.id === 'delivery-notificacoes'
    )
    expect(desconectado).toBeDefined()
    expect(conectado).toBeDefined()
    expect(
      fatosPreviewHub(
        desconectado!,
        { qtdAreas: 0, raioMaximoKm: null, taxaMinima: null },
        null,
        null
      )
    ).toEqual([{ id: 'whatsapp', texto: 'WhatsApp desconectado' }])
    expect(ctaPrimarioPreviewHub(desconectado!)).toBe('Conectar WhatsApp')
    expect(
      fatosPreviewHub(
        conectado!,
        { qtdAreas: 0, raioMaximoKm: null, taxaMinima: null },
        null,
        null
      )
    ).toEqual([{ id: 'whatsapp', texto: 'WhatsApp conectado' }])
    expect(ctaPrimarioPreviewHub(conectado!)).toBe('Editar notificações')
  })
})
