import { describe, expect, it } from 'vitest'
import { calcularTotalComplementos } from '@/src/domain/services/pedido/CalculadoraPedido'
import { sincronizarComplementosQuantidadeProduto } from '@/src/domain/policies/pedido/SincronizarComplementosQuantidadeProduto'
import { normalizeTipoImpactoPreco } from '@/src/shared/utils/normalizeTipoImpactoPreco'
import {
  normalizarItemCarrinho,
  recalcularLinhaCarrinho,
  valorUnitarioBaseProduto,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/deliveryCarrinhoItemUtils'
import type { DeliveryCarrinhoItem } from '@/src/presentation/components/features/delivery-publico/shared/stores/deliveryCarrinhoStore'
import { useDeliveryCarrinhoStore } from '@/src/presentation/components/features/delivery-publico/shared/stores/deliveryCarrinhoStore'
import { beforeEach } from 'vitest'

describe('normalizeTipoImpactoPreco', () => {
  it('aceita aliases usados no catálogo/legado', () => {
    expect(normalizeTipoImpactoPreco('soma')).toBe('aumenta')
    expect(normalizeTipoImpactoPreco('acrescimo')).toBe('aumenta')
    expect(normalizeTipoImpactoPreco('subtrai')).toBe('diminui')
    expect(normalizeTipoImpactoPreco('desconto')).toBe('diminui')
    expect(normalizeTipoImpactoPreco('diminui')).toBe('diminui')
  })
})

describe('calcularTotalComplementos', () => {
  it('aplica diminui com magnitude mesmo se valor vier negativo', () => {
    const total = calcularTotalComplementos({
      produtoId: 'p1',
      nome: 'Burger',
      quantidade: 1,
      valorUnitario: 40,
      complementos: [
        {
          id: 'c1',
          grupoId: 'g1',
          nome: 'Farinha',
          valor: -10,
          quantidade: 2,
          tipoImpactoPreco: 'diminui',
        },
      ],
    })
    expect(total).toBe(-20)
  })
})

describe('sincronizarComplementosQuantidadeProduto', () => {
  it('iguala complementos à qtd do produto quando > 1', () => {
    const comps = sincronizarComplementosQuantidadeProduto(
      [{ id: 'c1', quantidade: 1 }],
      2
    )
    expect(comps[0].quantidade).toBe(2)
  })

  it('não altera quando produto qtd = 1', () => {
    const comps = sincronizarComplementosQuantidadeProduto(
      [{ id: 'c1', quantidade: 2 }],
      1
    )
    expect(comps[0].quantidade).toBe(2)
  })
})

describe('recalcularLinhaCarrinho / legado', () => {
  it('migra linha legada per-unit e mantém total com diminui', () => {
    const legado: DeliveryCarrinhoItem = {
      id: '1',
      produtoId: 'prod-1',
      produtoNome: 'BIG GOMES',
      produtoImagemUrl: null,
      quantidade: 2,
      valorUnitario: 29.9,
      valorTotal: 59.8,
      observacoes: [],
      complementos: [
        {
          complementoId: 'farinha',
          grupoComplementoId: 'g1',
          quantidade: 1,
          nome: 'Farinha',
          valor: 10,
          tipoImpactoPreco: 'diminui',
        },
      ],
      adicionadoEm: '2026-01-01T00:00:00.000Z',
    }

    expect(valorUnitarioBaseProduto(legado)).toBeCloseTo(39.9, 5)
    const normalizado = normalizarItemCarrinho(legado)
    expect(normalizado.valorUnitario).toBeCloseTo(39.9, 5)
    expect(normalizado.complementos[0].quantidade).toBe(2)
    expect(normalizado.valorTotal).toBeCloseTo(59.8, 5)
  })

  it('monta linha nova com valor base e complemento absoluto', () => {
    const linha = recalcularLinhaCarrinho({
      produtoId: 'prod-1',
      produtoNome: 'BIG GOMES',
      produtoImagemUrl: null,
      quantidade: 2,
      observacoes: [],
      complementos: [
        {
          complementoId: 'farinha',
          grupoComplementoId: 'g1',
          quantidade: 1,
          nome: 'Farinha',
          valor: 10,
          tipoImpactoPreco: 'diminui',
        },
      ],
      valorUnitarioBase: 39.9,
    })
    expect(linha.complementos[0].quantidade).toBe(2)
    expect(linha.valorTotal).toBeCloseTo(59.8, 5)
  })
})

describe('deliveryCarrinhoStore atualizarQuantidade', () => {
  const slug = 'loja-qtd-comp'

  beforeEach(() => {
    const memory = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value)
        },
        removeItem: (key: string) => {
          memory.delete(key)
        },
        clear: () => memory.clear(),
      },
    })
    useDeliveryCarrinhoStore.setState({ carrinhos: {} })
  })

  it('ao aumentar qtd sincroniza complemento e mantém diminui no total', () => {
    const store = useDeliveryCarrinhoStore.getState()
    store.adicionarItem(slug, {
      produtoId: 'prod-1',
      produtoNome: 'BIG GOMES',
      produtoImagemUrl: null,
      quantidade: 1,
      valorUnitario: 39.9,
      valorTotal: 29.9,
      observacoes: [],
      complementos: [
        {
          complementoId: 'farinha',
          grupoComplementoId: 'g1',
          quantidade: 1,
          nome: 'Farinha',
          valor: 10,
          tipoImpactoPreco: 'diminui',
        },
      ],
    })

    const [item] = useDeliveryCarrinhoStore.getState().getItens(slug)
    store.atualizarQuantidade(slug, item.id, 2)

    const [atualizado] = useDeliveryCarrinhoStore.getState().getItens(slug)
    expect(atualizado.quantidade).toBe(2)
    expect(atualizado.complementos[0].quantidade).toBe(2)
    expect(atualizado.valorTotal).toBeCloseTo(59.8, 5)
  })
})
