import type { Produto } from '@/src/domain/entities/Produto'
import {
  indicadoresProducao,
  origensMercadoria,
  tiposProduto,
} from '@/src/presentation/components/features/produtos/NovoProduto/fiscalSelectOptions'
import type { FiscalCampoChave, FiscalColunaGridId } from '../types'

export type ValidacaoFiscalInlineResult =
  | { ok: true; valorNormalizado: string | null }
  | { ok: false; mensagem: string }

/** Mapeia coluna da grid para chave fiscal da API. */
export function mapColunaGridParaCampoFiscal(coluna: FiscalColunaGridId): FiscalCampoChave {
  switch (coluna) {
    case 'ncm':
      return 'ncm'
    case 'cest':
      return 'cest'
    case 'origem':
      return 'origemMercadoria'
    case 'tipo':
      return 'tipoProduto'
    case 'indicador':
      return 'indicadorProducaoEscala'
  }
}

/** Valor bruto do produto para a coluna da grid. */
export function valorColunaFiscalProduto(produto: Produto, coluna: FiscalColunaGridId): string {
  switch (coluna) {
    case 'ncm':
      return produto.getNcm().trim()
    case 'cest':
      return produto.getCest().trim()
    case 'origem':
      return produto.getOrigemMercadoria().trim()
    case 'tipo':
      return produto.getTipoProduto().trim()
    case 'indicador':
      return produto.getIndicadorProducaoEscala()?.trim() ?? ''
  }
}

export function chaveCelulaFiscal(produtoId: string, coluna: FiscalColunaGridId): string {
  return `${produtoId}:${coluna}`
}

/** Validação local antes do PATCH/remoto (por célula). */
export function validarCampoFiscalInlineLocal(
  produto: Produto,
  coluna: FiscalColunaGridId,
  valorBruto: string
): ValidacaoFiscalInlineResult {
  const trimmed = valorBruto.trim()

  if (coluna === 'ncm') {
    if (trimmed === '') {
      if (produto.getNcm().trim() !== '') {
        return {
          ok: false,
          mensagem: 'NCM cadastrado não pode ser removido.',
        }
      }
      return { ok: true, valorNormalizado: null }
    }
    const ncmT = trimmed.replace(/\D/g, '').slice(0, 8)
    if (ncmT.length !== 8) {
      return { ok: false, mensagem: 'O código NCM deve conter exatamente 8 dígitos numéricos.' }
    }
    return { ok: true, valorNormalizado: ncmT }
  }

  if (coluna === 'cest') {
    if (trimmed === '') return { ok: true, valorNormalizado: null }
    const cestT = trimmed.replace(/\D/g, '').slice(0, 7)
    if (cestT.length !== 7) {
      return { ok: false, mensagem: 'O código CEST deve conter exatamente 7 dígitos numéricos.' }
    }
    return { ok: true, valorNormalizado: cestT }
  }

  if (coluna === 'origem') {
    if (trimmed === '') return { ok: true, valorNormalizado: null }
    if (!origensMercadoria.some((o) => o.value === trimmed)) {
      return { ok: false, mensagem: 'Origem da mercadoria inválida.' }
    }
    return { ok: true, valorNormalizado: trimmed }
  }

  if (coluna === 'tipo') {
    if (trimmed === '') return { ok: true, valorNormalizado: null }
    if (!tiposProduto.some((o) => o.value === trimmed)) {
      return { ok: false, mensagem: 'Tipo de produto inválido.' }
    }
    return { ok: true, valorNormalizado: trimmed }
  }

  if (coluna === 'indicador') {
    if (trimmed === '') return { ok: true, valorNormalizado: null }
    if (!indicadoresProducao.some((o) => o.value === trimmed)) {
      return { ok: false, mensagem: 'Indicador de produção em escala inválido.' }
    }
    const cestProduto = produto.getCest().trim()
    if (cestProduto === '') {
      return {
        ok: false,
        mensagem: 'Indicador de Produção em Escala exige CEST cadastrado no produto.',
      }
    }
    return { ok: true, valorNormalizado: trimmed }
  }

  return { ok: false, mensagem: 'Campo fiscal inválido.' }
}

/** Monta body PATCH mínimo para edição inline de um campo fiscal. */
export function montarPatchFiscalInline(
  coluna: FiscalColunaGridId,
  valorNormalizado: string | null
): Record<string, unknown> {
  const fiscal: Record<string, unknown> = {}

  switch (coluna) {
    case 'ncm':
      fiscal.ncm = valorNormalizado
      return { fiscal, ncm: valorNormalizado }
    case 'cest':
      fiscal.cest = valorNormalizado
      return { fiscal }
    case 'origem':
      fiscal.origemMercadoria =
        valorNormalizado === null ? null : parseInt(valorNormalizado, 10)
      return { fiscal }
    case 'tipo':
      fiscal.tipoProduto = valorNormalizado
      return { fiscal }
    case 'indicador':
      fiscal.indicadorProducaoEscala = valorNormalizado
      return { fiscal }
  }
}

/** Verifica se o valor editado difere do cadastro atual. */
export function valorColunaAlterado(
  produto: Produto,
  coluna: FiscalColunaGridId,
  valorNormalizado: string | null
): boolean {
  const atual = valorColunaFiscalProduto(produto, coluna)
  const novo = valorNormalizado ?? ''
  return atual !== novo
}
