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
  it('mantém empresa e cobertura obrigatórias e aponta o restante para telas existentes', () => {
    const progresso = calcularDeliveryHubProgresso([], true)
    const passos = montarPassosHubDelivery(progresso)
    expect(passos.map(passo => passo.id)).toEqual([
      'delivery-geolocalizacao',
      'delivery-cobertura',
      'delivery-entregadores',
      'delivery-meios',
      'delivery-impressoras',
      'delivery-notificacoes',
    ])
    expect(passos.filter(passo => passo.obrigatoria)).toHaveLength(2)
    expect(passos[0]?.href).toBe('/config/delivery/empresa')
    expect(passos[1]?.href).toBe('/config/delivery/cobertura')
    expect(passos[2]?.href).toBe('/config/delivery/entregadores')
    expect(passos[3]?.href).toBe('/config/delivery/meios')
    expect(passos[4]?.href).toBe('/config/delivery/impressoras')
    expect(passos[5]?.href).toBe('/config/delivery/notificacoes')
    expect(passos.every(passo => passo.etapaId === passo.id)).toBe(true)
  })

  it('não marca etapas recomendadas como concluídas pelo progresso obrigatório', () => {
    const passos = montarPassosHubDelivery(calcularDeliveryHubProgresso([], true))
    const recomendados = passos.filter(passo => !passo.obrigatoria)
    expect(recomendados).toHaveLength(4)
    expect(recomendados.every(passo => passo.concluido === false)).toBe(true)
    expect(passos.filter(passo => passo.obrigatoria).every(passo => passo.concluido)).toBe(true)
  })

  it('marca etapas recomendadas como concluídas só quando há cadastro ou WhatsApp conectado', () => {
    const progresso = calcularDeliveryHubProgresso([], true)
    const vazios = montarPassosHubDelivery(progresso)
    expect(vazios.filter(passo => !passo.obrigatoria).every(passo => passo.concluido === false)).toBe(true)

    const preenchidos = montarPassosHubDelivery(progresso, {
      qtdEntregadores: 2,
      qtdMeiosPagamento: 1,
      qtdImpressoras: 3,
      whatsappConectado: true,
    })
    const entregadores = preenchidos.find(passo => passo.id === 'delivery-entregadores')
    const meios = preenchidos.find(passo => passo.id === 'delivery-meios')
    const impressoras = preenchidos.find(passo => passo.id === 'delivery-impressoras')
    const notificacoes = preenchidos.find(passo => passo.id === 'delivery-notificacoes')
    expect(entregadores?.concluido).toBe(true)
    expect(meios?.concluido).toBe(true)
    expect(impressoras?.concluido).toBe(true)
    expect(notificacoes?.concluido).toBe(true)
    expect(preenchidos.filter(passo => passo.obrigatoria)).toHaveLength(2)
    expect([entregadores, meios, impressoras, notificacoes].every(passo => passo?.cta === 'Editar')).toBe(true)
  })
})

describe('DELIVERY_HUB_ETAPAS', () => {
  it('expõe seis etapas com componente e slug alinhados', () => {
    expect(DELIVERY_HUB_ETAPAS.map(etapa => etapa.step)).toEqual([1, 2, 3, 4, 5, 6])
    expect(getDeliveryEtapaById('delivery-meios')?.label).toBe('Pagamento')
    expect(getDeliveryEtapaById('delivery-impressoras')?.component).toBeTypeOf('function')
    expect(getDeliveryEtapaById('delivery-notificacoes')?.label).toBe('WhatsApp')
    expect(getDeliveryEtapaById('delivery-notificacoes')?.obrigatoria).toBe(false)
    expect(getDeliveryEtapaById('delivery-notificacoes')?.component).toBeTypeOf('function')
    expect(getDeliveryEtapaById('delivery-hub')).toBeUndefined()
  })

  it('reconhece o hub e as etapas internas como abas do Delivery', () => {
    expect(isDeliveryTabId(DELIVERY_HUB_TAB_ID)).toBe(true)
    expect(isDeliveryTabId('delivery-entregadores')).toBe(true)
    expect(isDeliveryEtapaId('delivery-impressoras')).toBe(true)
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

  it('mostra no cartão a quantidade cadastrada das etapas recomendadas', () => {
    const progresso = calcularDeliveryHubProgresso([], false)
    const extras = { qtdEntregadores: 2, qtdMeiosPagamento: 1, qtdImpressoras: 0 }
    const passos = montarPassosHubDelivery(progresso, extras)
    const entregadores = passos.find(passo => passo.id === 'delivery-entregadores')
    const meios = passos.find(passo => passo.id === 'delivery-meios')
    const impressoras = passos.find(passo => passo.id === 'delivery-impressoras')
    const resumoVazio = { qtdAreas: 0, raioMaximoKm: null, taxaMinima: null }
    expect(fatosPreviewHub(entregadores!, resumoVazio, null, null, extras)).toEqual([
      { id: 'entregadores', texto: '2 entregadores cadastrados' },
    ])
    expect(ctaPrimarioPreviewHub(entregadores!)).toBe('Editar entregadores')
    expect(fatosPreviewHub(meios!, resumoVazio, null, null, extras)).toEqual([
      { id: 'meios', texto: '1 meio de pagamento cadastrado' },
    ])
    expect(ctaPrimarioPreviewHub(meios!)).toBe('Editar meios de pagamento')
    expect(fatosPreviewHub(impressoras!, resumoVazio, null, null, extras)).toEqual([
      { id: 'impressoras', texto: 'Nenhuma impressora cadastrada' },
    ])
    expect(ctaPrimarioPreviewHub(impressoras!)).toBe('Ver e editar')
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
