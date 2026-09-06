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
    ])
    expect(passos.filter(passo => passo.obrigatoria)).toHaveLength(2)
    expect(passos[0]?.href).toBe('/config/delivery/empresa')
    expect(passos[1]?.href).toBe('/config/delivery/cobertura')
    expect(passos[2]?.href).toBe('/config/delivery/entregadores')
    expect(passos[3]?.href).toBe('/config/delivery/meios')
    expect(passos[4]?.href).toBe('/config/delivery/impressoras')
    expect(passos.every(passo => passo.etapaId === passo.id)).toBe(true)
  })

  it('não marca etapas recomendadas como concluídas pelo progresso obrigatório', () => {
    const passos = montarPassosHubDelivery(calcularDeliveryHubProgresso([], true))
    const recomendados = passos.filter(passo => !passo.obrigatoria)
    expect(recomendados).toHaveLength(3)
    expect(recomendados.every(passo => passo.concluido === false)).toBe(true)
    expect(passos.filter(passo => passo.obrigatoria).every(passo => passo.concluido)).toBe(true)
  })
})

describe('DELIVERY_HUB_ETAPAS', () => {
  it('expõe cinco etapas com componente e slug alinhados', () => {
    expect(DELIVERY_HUB_ETAPAS.map(etapa => etapa.step)).toEqual([1, 2, 3, 4, 5])
    expect(getDeliveryEtapaById('delivery-meios')?.label).toBe('Pagamento')
    expect(getDeliveryEtapaById('delivery-impressoras')?.component).toBeTypeOf('function')
    expect(getDeliveryEtapaById('delivery-hub')).toBeUndefined()
  })

  it('reconhece o hub e as etapas internas como abas do Delivery', () => {
    expect(isDeliveryTabId(DELIVERY_HUB_TAB_ID)).toBe(true)
    expect(isDeliveryTabId('delivery-entregadores')).toBe(true)
    expect(isDeliveryEtapaId('delivery-impressoras')).toBe(true)
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

  it('usa descrição da etapa recomendada no cartão', () => {
    const meios = montarPassosHubDelivery(calcularDeliveryHubProgresso([], false)).find(
      passo => passo.id === 'delivery-meios'
    )
    expect(meios).toBeDefined()
    expect(fatosPreviewHub(meios!, { qtdAreas: 0, raioMaximoKm: null, taxaMinima: null }, null, null)).toEqual([
      { id: 'descricao', texto: 'Formas usadas no pedido gestor.' },
    ])
    expect(ctaPrimarioPreviewHub(meios!)).toBe('Ver e editar')
  })
})
