import { describe, expect, it } from 'vitest'
import {
  aplicarQuantidadeComplementoNaLinha,
  aplicarQuantidadeProdutoNaLinha,
  normalizarComplementosLinha,
  quantidadeComplementoValidaParaLinha,
  quantidadeMaximaComplementoNaLinha,
} from '@/src/domain/policies/pedido/ComplementoQuantidadeLinhaPolicy'
import type { ProdutoSelecionado } from '@/src/domain/types/pedido'

const linhaBase = (unidadeMedida: ProdutoSelecionado['unidadeMedida'] = 'UN'): ProdutoSelecionado => ({
  produtoId: 'p1',
  nome: 'Burger',
  quantidade: 1,
  valorUnitario: 24,
  unidadeMedida,
  complementos: [
    {
      id: 'c1',
      grupoId: 'g1',
      nome: 'Ovo',
      valor: 5,
      quantidade: 1,
      tipoImpactoPreco: 'aumenta',
    },
  ],
})

describe('quantidadeComplementoValidaParaLinha — UN', () => {
  it('permite complemento > produto quando produto qtd = 1', () => {
    expect(quantidadeComplementoValidaParaLinha(1, 3, 'UN')).toBe(true)
  })

  it('exige igualdade quando produto qtd > 1', () => {
    expect(quantidadeComplementoValidaParaLinha(2, 2, 'UN')).toBe(true)
    expect(quantidadeComplementoValidaParaLinha(2, 1, 'UN')).toBe(false)
    expect(quantidadeComplementoValidaParaLinha(2, 3, 'UN')).toBe(false)
  })
})

describe('quantidadeComplementoValidaParaLinha — KG/LT', () => {
  it('permite complemento livre com produto fracionário', () => {
    expect(quantidadeComplementoValidaParaLinha(1.3, 1, 'KG')).toBe(true)
    expect(quantidadeComplementoValidaParaLinha(2.5, 1, 'KG')).toBe(true)
    expect(quantidadeComplementoValidaParaLinha(2.5, 2, 'LT')).toBe(true)
  })

  it('permite complemento livre com qtd fracionária mesmo sem unidadeMedida na linha', () => {
    expect(quantidadeComplementoValidaParaLinha(2.4, 1, undefined)).toBe(true)
    expect(quantidadeComplementoValidaParaLinha(2.4, 3, undefined)).toBe(true)
  })
})

describe('aplicarQuantidadeProdutoNaLinha — UN', () => {
  it('iguala complementos ao aumentar produto para qtd > 1', () => {
    const linha = linhaBase('UN')
    const result = aplicarQuantidadeProdutoNaLinha(linha, 2)
    expect(result.quantidade).toBe(2)
    expect(result.complementos[0].quantidade).toBe(2)
  })

  it('mantém complementos ao reduzir produto para qtd 1', () => {
    const linha = aplicarQuantidadeProdutoNaLinha(linhaBase('UN'), 2)
    const result = aplicarQuantidadeProdutoNaLinha(linha, 1)
    expect(result.quantidade).toBe(1)
    expect(result.complementos[0].quantidade).toBe(2)
  })
})

describe('aplicarQuantidadeProdutoNaLinha — KG', () => {
  it('aceita quantidade fracionária sem sincronizar complementos', () => {
    const linha = linhaBase('KG')
    const result = aplicarQuantidadeProdutoNaLinha(linha, 2.5)
    expect(result.quantidade).toBe(2.5)
    expect(result.complementos[0].quantidade).toBe(1)
  })
})

describe('aplicarQuantidadeComplementoNaLinha', () => {
  it('rejeita complemento diferente da qtd produto quando produto UN > 1', () => {
    const linha = aplicarQuantidadeProdutoNaLinha(linhaBase('UN'), 2)
    const result = aplicarQuantidadeComplementoNaLinha(linha, 0, 3)
    expect(result.aceito).toBe(false)
  })

  it('aceita complemento diferente quando produto é KG', () => {
    const linha = aplicarQuantidadeProdutoNaLinha(linhaBase('KG'), 2.5)
    const result = aplicarQuantidadeComplementoNaLinha(linha, 0, 1)
    expect(result.aceito).toBe(true)
    expect(result.produto.complementos[0].quantidade).toBe(1)
  })
})

describe('normalizarComplementosLinha', () => {
  it('ajusta complementos ao confirmar painel com produto UN qtd > 1', () => {
    const produto = { ...linhaBase('UN'), quantidade: 2 }
    const complementos = [{ ...produto.complementos[0], quantidade: 1 }]
    const normalizados = normalizarComplementosLinha(produto, complementos)
    expect(normalizados[0].quantidade).toBe(2)
  })

  it('não ajusta complementos para produto KG', () => {
    const produto = { ...linhaBase('KG'), quantidade: 2.5 }
    const complementos = [{ ...produto.complementos[0], quantidade: 1 }]
    const normalizados = normalizarComplementosLinha(produto, complementos)
    expect(normalizados[0].quantidade).toBe(1)
  })
})

describe('quantidadeMaximaComplementoNaLinha', () => {
  it('trava complemento em UN com produto > 1', () => {
    expect(quantidadeMaximaComplementoNaLinha(2, 'UN')).toBe(2)
  })

  it('não trava complemento em KG', () => {
    expect(quantidadeMaximaComplementoNaLinha(2.5, 'KG')).toBeNull()
  })
})

describe('CalculadoraPedido alinhada ao backend', () => {
  it('calcula complemento por linha (sem multiplicar pela qtd produto)', async () => {
    const { calcularTotalProduto } = await import('@/src/domain/services/pedido/CalculadoraPedido')
    const linha = aplicarQuantidadeProdutoNaLinha(linhaBase('UN'), 2)
    const total = calcularTotalProduto(linha)
    expect(total).toBe(24 * 2 + 5 * 2)
  })

  it('calcula sorvete KG + calda sem multiplicar complemento pelo peso', async () => {
    const { calcularTotalProduto } = await import('@/src/domain/services/pedido/CalculadoraPedido')
    const linha = aplicarQuantidadeProdutoNaLinha(linhaBase('KG'), 2.5)
    linha.valorUnitario = 10
    linha.complementos[0].valor = 2
    const total = calcularTotalProduto(linha)
    expect(total).toBe(10 * 2.5 + 2 * 1)
  })

  it('calcularTotalComplementos soma aumenta, subtrai diminui e ignora nenhum', async () => {
    const { calcularTotalComplementos } = await import('@/src/domain/services/pedido/CalculadoraPedido')
    const total = calcularTotalComplementos({
      produtoId: 'p1',
      nome: 'Item',
      quantidade: 1,
      valorUnitario: 24,
      complementos: [
        { id: 'c1', grupoId: 'g1', nome: 'Extra', valor: 10, quantidade: 1, tipoImpactoPreco: 'aumenta' },
        { id: 'c2', grupoId: 'g1', nome: 'Sem', valor: 10, quantidade: 1, tipoImpactoPreco: 'diminui' },
        { id: 'c3', grupoId: 'g1', nome: 'Opcional', valor: 5, quantidade: 2, tipoImpactoPreco: 'nenhum' },
      ],
    })
    expect(total).toBe(0)
  })

  it('obterTotalComplemento retorna valor negativo para diminui', async () => {
    const { obterTotalComplemento } = await import('@/src/domain/services/pedido/CalculadoraPedido')
    expect(
      obterTotalComplemento({
        id: 'c1',
        grupoId: 'g1',
        nome: 'Sem',
        valor: 10,
        quantidade: 2,
        tipoImpactoPreco: 'diminui',
      })
    ).toBe(-20)
  })

  it('obterTotalComplemento retorna zero para nenhum mesmo com valor', async () => {
    const { obterTotalComplemento } = await import('@/src/domain/services/pedido/CalculadoraPedido')
    expect(
      obterTotalComplemento({
        id: 'c1',
        grupoId: 'g1',
        nome: 'Opcional',
        valor: 5,
        quantidade: 3,
        tipoImpactoPreco: 'nenhum',
      })
    ).toBe(0)
  })
})
