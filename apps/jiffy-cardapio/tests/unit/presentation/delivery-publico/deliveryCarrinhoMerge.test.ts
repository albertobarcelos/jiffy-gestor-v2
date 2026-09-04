import { beforeEach, describe, expect, it } from 'vitest'
import {
  chaveLinhaCarrinho,
  encontrarItemIgual,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/deliveryCarrinhoItemUtils'
import type {
  DeliveryCarrinhoComplemento,
  DeliveryCarrinhoItem,
} from '@/src/presentation/components/features/delivery-publico/shared/stores/deliveryCarrinhoStore'
import { useDeliveryCarrinhoStore } from '@/src/presentation/components/features/delivery-publico/shared/stores/deliveryCarrinhoStore'

const bacon: DeliveryCarrinhoComplemento = {
  complementoId: 'comp-bacon',
  grupoComplementoId: 'grupo-extras',
  quantidade: 1,
  nome: 'Bacon',
  valor: 3,
  tipoImpactoPreco: 'soma',
}

const queijo: DeliveryCarrinhoComplemento = {
  complementoId: 'comp-queijo',
  grupoComplementoId: 'grupo-extras',
  quantidade: 1,
  nome: 'Queijo',
  valor: 2,
  tipoImpactoPreco: 'soma',
}

function itemBase(
  overrides: Partial<DeliveryCarrinhoItem> & Pick<DeliveryCarrinhoItem, 'id'>
): DeliveryCarrinhoItem {
  return {
    produtoId: 'prod-1',
    produtoNome: 'X-Burger',
    produtoImagemUrl: null,
    quantidade: 1,
    valorUnitario: 20,
    valorTotal: 20,
    observacoes: [],
    complementos: [],
    adicionadoEm: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('chaveLinhaCarrinho / encontrarItemIgual', () => {
  it('gera a mesma chave independente da ordem dos complementos', () => {
    const a = chaveLinhaCarrinho({
      produtoId: 'prod-1',
      observacoes: [],
      complementos: [bacon, queijo],
    })
    const b = chaveLinhaCarrinho({
      produtoId: 'prod-1',
      observacoes: [],
      complementos: [queijo, bacon],
    })
    expect(a).toBe(b)
  })

  it('diferencia complementos distintos', () => {
    const sem = chaveLinhaCarrinho({
      produtoId: 'prod-1',
      observacoes: [],
      complementos: [],
    })
    const comBacon = chaveLinhaCarrinho({
      produtoId: 'prod-1',
      observacoes: [],
      complementos: [bacon],
    })
    expect(sem).not.toBe(comBacon)
  })

  it('diferencia observações distintas', () => {
    const semObs = chaveLinhaCarrinho({
      produtoId: 'prod-1',
      observacoes: [],
      complementos: [],
    })
    const comObs = chaveLinhaCarrinho({
      produtoId: 'prod-1',
      observacoes: ['sem cebola'],
      complementos: [],
    })
    expect(semObs).not.toBe(comObs)
  })

  it('normaliza observação com trim', () => {
    const a = chaveLinhaCarrinho({
      produtoId: 'prod-1',
      observacoes: ['  sem cebola  '],
      complementos: [],
    })
    const b = chaveLinhaCarrinho({
      produtoId: 'prod-1',
      observacoes: ['sem cebola'],
      complementos: [],
    })
    expect(a).toBe(b)
  })

  it('encontrarItemIgual ignora o id em edição', () => {
    const itens = [
      itemBase({ id: 'a', complementos: [bacon] }),
      itemBase({ id: 'b', complementos: [bacon] }),
    ]
    const encontrado = encontrarItemIgual(itens, itens[0], 'a')
    expect(encontrado?.id).toBe('b')
  })
})

describe('deliveryCarrinhoStore merge', () => {
  const slug = 'loja-teste-merge'

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
    useDeliveryCarrinhoStore.getState().limpar(slug)
  })

  it('une produtos iguais sem complemento somando quantidade', () => {
    const store = useDeliveryCarrinhoStore.getState()
    const payload = {
      produtoId: 'prod-1',
      produtoNome: 'X-Burger',
      produtoImagemUrl: null as string | null,
      quantidade: 1,
      valorUnitario: 20,
      valorTotal: 20,
      observacoes: [] as string[],
      complementos: [] as DeliveryCarrinhoComplemento[],
    }

    store.adicionarItem(slug, payload)
    store.adicionarItem(slug, { ...payload, quantidade: 2, valorTotal: 40 })

    const itens = useDeliveryCarrinhoStore.getState().getItens(slug)
    expect(itens).toHaveLength(1)
    expect(itens[0].quantidade).toBe(3)
    expect(itens[0].valorTotal).toBe(60)
  })

  it('não une o mesmo produto com complementos diferentes', () => {
    const store = useDeliveryCarrinhoStore.getState()
    const base = {
      produtoId: 'prod-1',
      produtoNome: 'X-Burger',
      produtoImagemUrl: null as string | null,
      quantidade: 1,
      valorUnitario: 23,
      valorTotal: 23,
      observacoes: [] as string[],
    }

    store.adicionarItem(slug, { ...base, complementos: [bacon] })
    store.adicionarItem(slug, { ...base, complementos: [queijo], valorUnitario: 22, valorTotal: 22 })

    const itens = useDeliveryCarrinhoStore.getState().getItens(slug)
    expect(itens).toHaveLength(2)
  })

  it('não une quando a observação é diferente', () => {
    const store = useDeliveryCarrinhoStore.getState()
    const base = {
      produtoId: 'prod-1',
      produtoNome: 'X-Burger',
      produtoImagemUrl: null as string | null,
      quantidade: 1,
      valorUnitario: 20,
      valorTotal: 20,
      complementos: [] as DeliveryCarrinhoComplemento[],
    }

    store.adicionarItem(slug, { ...base, observacoes: [] })
    store.adicionarItem(slug, { ...base, observacoes: ['sem cebola'] })

    expect(useDeliveryCarrinhoStore.getState().getItens(slug)).toHaveLength(2)
  })

  it('une ao substituir se o resultado ficar igual a outra linha', () => {
    const store = useDeliveryCarrinhoStore.getState()
    const semComplemento = {
      produtoId: 'prod-1',
      produtoNome: 'X-Burger',
      produtoImagemUrl: null as string | null,
      quantidade: 1,
      valorUnitario: 20,
      valorTotal: 20,
      observacoes: [] as string[],
      complementos: [] as DeliveryCarrinhoComplemento[],
    }

    store.adicionarItem(slug, semComplemento)
    store.adicionarItem(slug, {
      ...semComplemento,
      valorUnitario: 23,
      valorTotal: 23,
      complementos: [bacon],
    })

    const [linhaSimples, linhaComBacon] = useDeliveryCarrinhoStore.getState().getItens(slug)
    expect(linhaSimples).toBeDefined()
    expect(linhaComBacon).toBeDefined()

    store.substituirItem(slug, linhaComBacon.id, {
      ...semComplemento,
      quantidade: 2,
      valorTotal: 40,
    })

    const itens = useDeliveryCarrinhoStore.getState().getItens(slug)
    expect(itens).toHaveLength(1)
    expect(itens[0].id).toBe(linhaSimples.id)
    expect(itens[0].quantidade).toBe(3)
    expect(itens[0].valorTotal).toBe(60)
  })
})
