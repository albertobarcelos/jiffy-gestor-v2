import {
  indicadoresProducao,
  origensMercadoria,
  tiposProduto,
} from '@/src/presentation/components/features/produtos/NovoProduto/fiscalSelectOptions'
import type { Produto } from '@/src/domain/entities/Produto'
import { textoOuNenhum } from './produtosLoteUi'

/** Largura compartilhada das colunas fiscais com texto descritivo (Origem, Tipo, Ind. Escala). */
export const LARGURA_COLUNA_FISCAL_DESCRITIVA = 'w-[180px]'

/** Larguras das colunas fixas da grid na aba Fiscal (código, nome, valor). */
export const LAYOUT_GRID_FISCAL = {
  minWidth: 'min-w-[1180px]',
  codigo: 'w-[52px] shrink-0 pr-2',
  nome: 'flex-1 min-w-[140px]',
  valor: 'w-[96px] shrink-0',
} as const

/** Colunas fiscais exibidas na listagem da aba Fiscal. */
export const COLUNAS_FISCAL_GRID = [
  { id: 'ncm' as const, label: 'NCM', className: 'w-[100px]', align: 'center' as const },
  { id: 'cest' as const, label: 'CEST', className: 'w-[92px]', align: 'center' as const },
  { id: 'origem' as const, label: 'Origem', className: LARGURA_COLUNA_FISCAL_DESCRITIVA, align: 'left' as const },
  { id: 'tipo' as const, label: 'Tipo', className: LARGURA_COLUNA_FISCAL_DESCRITIVA, align: 'left' as const },
  { id: 'indicador' as const, label: 'Ind. Escala', className: LARGURA_COLUNA_FISCAL_DESCRITIVA, align: 'left' as const },
]

function labelPorValor(
  codigo: string,
  opcoes: { value: string; label: string }[]
): string | undefined {
  const t = codigo.trim()
  if (!t) return undefined
  return opcoes.find((o) => o.value === t)?.label
}

export function tituloOrigemMercadoria(codigo: string): string | undefined {
  return labelPorValor(codigo, origensMercadoria)
}

export function tituloTipoProduto(codigo: string): string | undefined {
  return labelPorValor(codigo, tiposProduto)
}

export function tituloIndicadorProducao(codigo: string | null): string | undefined {
  if (codigo === null || codigo.trim() === '') return undefined
  return labelPorValor(codigo, indicadoresProducao)
}

/** Texto de exibição com código + descrição (label completo da opção fiscal). */
function textoExibicaoOpcaoFiscal(
  codigo: string,
  opcoes: { value: string; label: string }[],
  prefixarCodigo = false
): { texto: string; titulo?: string } {
  const t = codigo.trim()
  if (!t) return { texto: 'Nenhum' }

  const opcao = opcoes.find((o) => o.value === t)
  if (!opcao) return { texto: t, titulo: t }

  const texto =
    prefixarCodigo && !opcao.label.startsWith(`${t} -`)
      ? `${t} - ${opcao.label}`
      : opcao.label

  return { texto, titulo: texto }
}

export function valoresFiscaisProduto(produto: Produto) {
  const ncm = produto.getNcm()
  const cest = produto.getCest()
  const origem = produto.getOrigemMercadoria()
  const tipo = produto.getTipoProduto()
  const indicador = produto.getIndicadorProducaoEscala()

  return {
    ncm: { texto: textoOuNenhum(ncm), titulo: ncm.trim() || undefined },
    cest: { texto: textoOuNenhum(cest), titulo: cest.trim() || undefined },
    origem: textoExibicaoOpcaoFiscal(origem, origensMercadoria),
    tipo: textoExibicaoOpcaoFiscal(tipo, tiposProduto),
    indicador: textoExibicaoOpcaoFiscal(indicador ?? '', indicadoresProducao, true),
  }
}
