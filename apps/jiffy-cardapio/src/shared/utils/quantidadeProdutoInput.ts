import {
  normalizarUnidadeMedidaProduto,
  produtoPermiteQuantidadeDecimal,
  type UnidadeMedidaProduto,
} from '@/src/shared/types/unidadeMedidaProduto'

const QTD_DECIMAL_MIN = 0.001
const QTD_DECIMAL_STEP = 0.1

/** Quantidade persistida com fração (ex.: 2,4 kg) mesmo sem unidadeMedida na linha. */
export function quantidadeTemParteFracionaria(quantidade: number): boolean {
  if (!Number.isFinite(quantidade)) return false
  const arredondada = Math.round(quantidade * 1000) / 1000
  return Math.abs(arredondada - Math.trunc(arredondada)) > 1e-9
}

export function formatarQuantidadeProdutoExibicao(
  quantidade: number,
  unidadeMedida?: unknown
): string {
  const unidade = normalizarUnidadeMedidaProduto(unidadeMedida)
  const exibirComoDecimal =
    produtoPermiteQuantidadeDecimal(unidade) || quantidadeTemParteFracionaria(quantidade)

  if (!exibirComoDecimal) {
    return String(Math.max(1, Math.floor(quantidade)))
  }

  const arredondada = Math.round(quantidade * 1000) / 1000
  return arredondada.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })
}

export function sanitizarTextoQuantidadeProdutoEmEdicao(
  texto: string,
  unidadeMedida?: unknown
): string {
  const unidade = normalizarUnidadeMedidaProduto(unidadeMedida)
  if (!produtoPermiteQuantidadeDecimal(unidade)) {
    return texto.replace(/\D/g, '')
  }

  let sanitizado = texto.replace(/[^\d,]/g, '')
  const indiceVirgula = sanitizado.indexOf(',')
  if (indiceVirgula >= 0) {
    const antes = sanitizado.slice(0, indiceVirgula + 1)
    const depois = sanitizado.slice(indiceVirgula + 1).replace(/,/g, '')
    sanitizado = `${antes}${depois}`
  }
  return sanitizado
}

export function parseQuantidadeProdutoInput(
  texto: string,
  unidadeMedida?: unknown
): number | null {
  const unidade = normalizarUnidadeMedidaProduto(unidadeMedida)
  const trimmed = texto.trim()
  if (trimmed === '') return null

  if (!produtoPermiteQuantidadeDecimal(unidade)) {
    const digits = trimmed.replace(/\D/g, '')
    if (digits === '') return null
    const valor = parseInt(digits, 10)
    return Number.isFinite(valor) ? valor : null
  }

  const normalizado = trimmed.replace(/\./g, '').replace(',', '.')
  const valor = parseFloat(normalizado)
  return Number.isFinite(valor) ? valor : null
}

export function normalizarQuantidadeProduto(
  quantidade: number,
  unidadeMedida?: unknown
): number {
  const unidade = normalizarUnidadeMedidaProduto(unidadeMedida)
  if (!produtoPermiteQuantidadeDecimal(unidade)) {
    return Math.max(1, Math.floor(quantidade))
  }

  const arredondada = Math.round(Math.max(QTD_DECIMAL_MIN, quantidade) * 1000) / 1000
  return arredondada
}

export function incrementarQuantidadeProduto(
  quantidadeAtual: number,
  delta: number,
  unidadeMedida?: unknown
): number {
  const unidade = normalizarUnidadeMedidaProduto(unidadeMedida)
  if (!produtoPermiteQuantidadeDecimal(unidade)) {
    const atual = Math.max(1, Math.floor(quantidadeAtual))
    return Math.max(1, atual + delta)
  }

  const atual = normalizarQuantidadeProduto(quantidadeAtual, unidade)
  const proxima = Math.round((atual + delta * QTD_DECIMAL_STEP) * 1000) / 1000
  return normalizarQuantidadeProduto(proxima, unidade)
}

export function quantidadeProdutoPodeDiminuir(
  quantidade: number,
  unidadeMedida?: unknown
): boolean {
  const unidade = normalizarUnidadeMedidaProduto(unidadeMedida)
  if (!produtoPermiteQuantidadeDecimal(unidade)) {
    return Math.floor(quantidade) > 1
  }
  return quantidade > QTD_DECIMAL_MIN + 1e-9
}

export function obterStepQuantidadeProduto(unidadeMedida?: unknown): number {
  const unidade = normalizarUnidadeMedidaProduto(unidadeMedida)
  return produtoPermiteQuantidadeDecimal(unidade) ? QTD_DECIMAL_STEP : 1
}

export type { UnidadeMedidaProduto }
