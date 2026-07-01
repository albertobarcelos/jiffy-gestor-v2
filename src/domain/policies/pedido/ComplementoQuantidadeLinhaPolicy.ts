import type { ProdutoSelecionado } from '@/src/domain/types/pedido'
import {
  normalizarUnidadeMedidaProduto,
  produtoUsaRegraComplementoUnitario,
} from '@/src/shared/types/unidadeMedidaProduto'
import {
  normalizarQuantidadeProduto,
  quantidadeTemParteFracionaria,
} from '@/src/shared/utils/quantidadeProdutoInput'

export const MENSAGEM_COMPLEMENTO_QTD_INVALIDA =
  'Com quantidade do produto maior que 1, cada complemento deve ter a mesma quantidade do produto. Para combinações diferentes, lance linhas separadas.'

export function linhaPossuiComplementos(produto: Pick<ProdutoSelecionado, 'complementos'>): boolean {
  return (produto.complementos?.length ?? 0) > 0
}

function unidadeDaLinha(produto: Pick<ProdutoSelecionado, 'unidadeMedida'>): ReturnType<
  typeof normalizarUnidadeMedidaProduto
> {
  return normalizarUnidadeMedidaProduto(produto.unidadeMedida)
}

/** UN inteiro: regra 1:1. KG/LT ou qtd fracionária (ex.: 2,4 kg): complemento livre. */
function complementoUsaRegraUnitaria(
  quantidadeProduto: number,
  unidadeMedida?: ProdutoSelecionado['unidadeMedida']
): boolean {
  const unidade = normalizarUnidadeMedidaProduto(unidadeMedida)
  if (!produtoUsaRegraComplementoUnitario(unidade)) return false
  if (quantidadeTemParteFracionaria(quantidadeProduto)) return false
  return true
}

/** UN: qtd=1 → complemento livre (≥1); qtd>1 → complemento === qtd produto. KG/LT: complemento livre. */
export function quantidadeComplementoValidaParaLinha(
  quantidadeProduto: number,
  quantidadeComplemento: number,
  unidadeMedida?: ProdutoSelecionado['unidadeMedida']
): boolean {
  const qtdComp = Math.max(0, Math.floor(quantidadeComplemento))
  if (qtdComp < 1) return false

  if (!complementoUsaRegraUnitaria(quantidadeProduto, unidadeMedida)) {
    return true
  }

  const qtdProd = Math.max(1, Math.floor(quantidadeProduto))
  if (qtdProd <= 1) return true
  return qtdComp === qtdProd
}

export function validarQuantidadesComplementosLinha(
  produto: ProdutoSelecionado
): { valido: boolean; mensagem?: string } {
  if (!linhaPossuiComplementos(produto)) {
    return { valido: true }
  }

  for (const comp of produto.complementos) {
    if (
      !quantidadeComplementoValidaParaLinha(
        produto.quantidade,
        comp.quantidade,
        produto.unidadeMedida
      )
    ) {
      return { valido: false, mensagem: MENSAGEM_COMPLEMENTO_QTD_INVALIDA }
    }
  }

  return { valido: true }
}

export function sincronizarComplementosComQuantidadeProduto(
  complementos: ProdutoSelecionado['complementos'],
  quantidadeProduto: number,
  unidadeMedida?: ProdutoSelecionado['unidadeMedida']
): ProdutoSelecionado['complementos'] {
  if (!complementoUsaRegraUnitaria(quantidadeProduto, unidadeMedida) || complementos.length === 0) {
    return complementos
  }

  const qtdProd = Math.max(1, Math.floor(quantidadeProduto))
  if (qtdProd <= 1) {
    return complementos
  }

  return complementos.map(comp => ({
    ...comp,
    quantidade: qtdProd,
  }))
}

/** Aplica nova qtd do produto; em UN com complementos e qtd > 1, iguala qtd de cada complemento. */
export function aplicarQuantidadeProdutoNaLinha(
  produto: ProdutoSelecionado,
  novaQuantidade: number
): ProdutoSelecionado {
  const qtd = normalizarQuantidadeProduto(novaQuantidade, produto.unidadeMedida)
  const complementos = linhaPossuiComplementos(produto)
    ? sincronizarComplementosComQuantidadeProduto(
        produto.complementos,
        qtd,
        produto.unidadeMedida
      )
    : produto.complementos

  return {
    ...produto,
    quantidade: qtd,
    complementos,
  }
}

export function aplicarQuantidadeComplementoNaLinha(
  produto: ProdutoSelecionado,
  complementoIndex: number,
  novaQuantidade: number
): { produto: ProdutoSelecionado; aceito: boolean; mensagem?: string } {
  const qtd = Math.max(1, Math.floor(novaQuantidade))
  const complementos = [...produto.complementos]
  const alvo = complementos[complementoIndex]
  if (!alvo) {
    return { produto, aceito: false }
  }

  if (
    !quantidadeComplementoValidaParaLinha(
      produto.quantidade,
      qtd,
      produto.unidadeMedida
    )
  ) {
    return { produto, aceito: false, mensagem: MENSAGEM_COMPLEMENTO_QTD_INVALIDA }
  }

  complementos[complementoIndex] = { ...alvo, quantidade: qtd }
  return {
    produto: { ...produto, complementos },
    aceito: true,
  }
}

/** Após confirmar complementos no painel, normaliza qtd quando produto UN > 1. */
export function normalizarComplementosLinha(
  produto: ProdutoSelecionado,
  complementos: ProdutoSelecionado['complementos']
): ProdutoSelecionado['complementos'] {
  if (complementos.length === 0) return complementos
  return sincronizarComplementosComQuantidadeProduto(
    complementos,
    produto.quantidade,
    produto.unidadeMedida
  )
}

export function quantidadeMaximaComplementoNaLinha(
  quantidadeProduto: number,
  unidadeMedida?: ProdutoSelecionado['unidadeMedida']
): number | null {
  if (!complementoUsaRegraUnitaria(quantidadeProduto, unidadeMedida)) {
    return null
  }

  const qtdProd = Math.max(1, Math.floor(quantidadeProduto))
  if (qtdProd <= 1) return null
  return qtdProd
}

export function complementoQuantidadeTravadaNaLinha(produto: Pick<
  ProdutoSelecionado,
  'quantidade' | 'unidadeMedida'
>): boolean {
  return quantidadeMaximaComplementoNaLinha(produto.quantidade, produto.unidadeMedida) !== null
}

export function unidadeMedidaEfetivaLinha(
  produto: Pick<ProdutoSelecionado, 'unidadeMedida'>
): ReturnType<typeof normalizarUnidadeMedidaProduto> {
  return unidadeDaLinha(produto)
}
