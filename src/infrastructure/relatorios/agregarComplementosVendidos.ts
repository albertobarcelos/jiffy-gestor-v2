import type { VendaDetalheProdutos } from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'
import type { RelatorioComplementoImpacto } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'

export type ComplementoLancadoNaVenda = {
  id?: string
  complementoId?: string
  nomeComplemento?: string
  quantidade?: number
  valorUnitario?: number
  grupoComplementoId?: string
  tipoImpactoPreco?: string
  tipoComplemento?: string
}

export type LinhaComplementoVendidoInterna = {
  complementoId: string
  nome: string
  grupoComplementoId: string | null
  grupoNome: string | null
  quantidade: number
  /** Soma assinada: aumenta (+), diminui (−), nenhum (0). */
  valorLiquido: number
  /** Soma |valor| só de linhas `aumenta`. */
  valorAumenta: number
  /** Soma |valor| só de linhas `diminui`. */
  valorDiminui: number
  qtdAumenta: number
  qtdDiminui: number
  qtdNenhum: number
  impactoPredominante: RelatorioComplementoImpacto
}

function parseImpacto(raw: unknown): RelatorioComplementoImpacto {
  if (raw === 'aumenta' || raw === 'diminui' || raw === 'nenhum') return raw
  return 'nenhum'
}

function valorAssinado(
  impacto: RelatorioComplementoImpacto,
  valorUnitario: number,
  quantidade: number
): number {
  const bruto = Math.abs(valorUnitario) * Math.abs(quantidade)
  if (impacto === 'aumenta') return bruto
  if (impacto === 'diminui') return -bruto
  return 0
}

/**
 * Agrega complementos lançados nas vendas do período.
 * - Ignora produto removido e linhas de pizza (`tipoItem === 'pizza'` ou sem `produtoId`).
 * - Chave: `complementoId` (cadastro).
 */
export function agregarComplementosVendidos(
  detalhes: VendaDetalheProdutos[]
): LinhaComplementoVendidoInterna[] {
  type Acc = {
    nome: string
    grupoComplementoId: string | null
    quantidade: number
    valorLiquido: number
    valorAumenta: number
    valorDiminui: number
    qtdAumenta: number
    qtdDiminui: number
    qtdNenhum: number
  }

  const map = new Map<string, Acc>()

  for (const venda of detalhes) {
    if (!venda?.produtosLancados) continue
    for (const produto of venda.produtosLancados) {
      if (!produto || produto.removido === true) continue
      const tipoItem =
        typeof produto.tipoItem === 'string' ? produto.tipoItem.trim().toLowerCase() : ''
      if (tipoItem === 'pizza') continue
      if (!produto.produtoId) continue

      const complementos = Array.isArray(produto.complementos) ? produto.complementos : []
      for (const raw of complementos) {
        if (!raw || typeof raw !== 'object') continue
        const c = raw as ComplementoLancadoNaVenda
        const complementoId =
          typeof c.complementoId === 'string' && c.complementoId.trim() !== ''
            ? c.complementoId.trim()
            : ''
        if (!complementoId) continue

        const quantidade = typeof c.quantidade === 'number' && Number.isFinite(c.quantidade)
          ? c.quantidade
          : 0
        const valorUnitario =
          typeof c.valorUnitario === 'number' && Number.isFinite(c.valorUnitario)
            ? c.valorUnitario
            : 0
        const impacto = parseImpacto(c.tipoImpactoPreco)
        const delta = valorAssinado(impacto, valorUnitario, quantidade)
        const nome =
          typeof c.nomeComplemento === 'string' && c.nomeComplemento.trim() !== ''
            ? c.nomeComplemento.trim()
            : 'Complemento'
        const grupoComplementoId =
          typeof c.grupoComplementoId === 'string' && c.grupoComplementoId.trim() !== ''
            ? c.grupoComplementoId.trim()
            : typeof (c as { grupoId?: unknown }).grupoId === 'string' &&
                (c as { grupoId: string }).grupoId.trim() !== ''
              ? (c as { grupoId: string }).grupoId.trim()
              : null

        const prev = map.get(complementoId)
        if (!prev) {
          map.set(complementoId, {
            nome,
            grupoComplementoId,
            quantidade,
            valorLiquido: delta,
            valorAumenta: impacto === 'aumenta' ? Math.abs(delta) : 0,
            valorDiminui: impacto === 'diminui' ? Math.abs(delta) : 0,
            qtdAumenta: impacto === 'aumenta' ? quantidade : 0,
            qtdDiminui: impacto === 'diminui' ? quantidade : 0,
            qtdNenhum: impacto === 'nenhum' ? quantidade : 0,
          })
        } else {
          prev.quantidade += quantidade
          prev.valorLiquido += delta
          if (impacto === 'aumenta') {
            prev.valorAumenta += Math.abs(delta)
            prev.qtdAumenta += quantidade
          } else if (impacto === 'diminui') {
            prev.valorDiminui += Math.abs(delta)
            prev.qtdDiminui += quantidade
          } else {
            prev.qtdNenhum += quantidade
          }
          if (nome && prev.nome === 'Complemento') prev.nome = nome
          if (!prev.grupoComplementoId && grupoComplementoId) {
            prev.grupoComplementoId = grupoComplementoId
          }
        }
      }
    }
  }

  return Array.from(map.entries()).map(([complementoId, acc]) => {
    let impactoPredominante: RelatorioComplementoImpacto = 'nenhum'
    if (acc.valorAumenta >= acc.valorDiminui && acc.valorAumenta > 0) {
      impactoPredominante = 'aumenta'
    } else if (acc.valorDiminui > acc.valorAumenta) {
      impactoPredominante = 'diminui'
    } else if (acc.qtdNenhum > 0 && acc.valorAumenta === 0 && acc.valorDiminui === 0) {
      impactoPredominante = 'nenhum'
    } else if (acc.qtdAumenta > 0) {
      impactoPredominante = 'aumenta'
    } else if (acc.qtdDiminui > 0) {
      impactoPredominante = 'diminui'
    }

    return {
      complementoId,
      nome: acc.nome,
      grupoComplementoId: acc.grupoComplementoId,
      grupoNome: null,
      quantidade: acc.quantidade,
      valorLiquido: acc.valorLiquido,
      valorAumenta: acc.valorAumenta,
      valorDiminui: acc.valorDiminui,
      qtdAumenta: acc.qtdAumenta,
      qtdDiminui: acc.qtdDiminui,
      qtdNenhum: acc.qtdNenhum,
      impactoPredominante,
    }
  })
}

export function filtrarEOrdenarComplementos(
  linhas: LinhaComplementoVendidoInterna[],
  opts: {
    qBusca?: string | null
    impacto?: RelatorioComplementoImpacto | 'todos' | null
    sort?: string
    /** Filtra por `grupoComplementoId` (não confundir com grupo de produto). */
    grupoComplementoIdSet?: Set<string> | null
    valorMin?: number | null
    valorMax?: number | null
    qtdMin?: number | null
    qtdMax?: number | null
  }
): LinhaComplementoVendidoInterna[] {
  let out = linhas

  const grupos = opts.grupoComplementoIdSet
  if (grupos && grupos.size > 0) {
    out = out.filter(r => r.grupoComplementoId != null && grupos.has(r.grupoComplementoId))
  }

  const impacto = opts.impacto && opts.impacto !== 'todos' ? opts.impacto : null
  if (impacto) {
    // Alinhado à coluna Impacto da grade (badge = impactoPredominante).
    out = out.filter(r => r.impactoPredominante === impacto)
  }

  if (opts.valorMin != null) {
    out = out.filter(r => r.valorLiquido >= opts.valorMin!)
  }
  if (opts.valorMax != null) {
    out = out.filter(r => r.valorLiquido <= opts.valorMax!)
  }
  if (opts.qtdMin != null) {
    out = out.filter(r => r.quantidade >= opts.qtdMin!)
  }
  if (opts.qtdMax != null) {
    out = out.filter(r => r.quantidade <= opts.qtdMax!)
  }

  const q = opts.qBusca?.trim().toLowerCase()
  if (q) {
    out = out.filter(
      r =>
        r.nome.toLowerCase().includes(q) ||
        (r.grupoNome?.toLowerCase().includes(q) ?? false)
    )
  }

  const sort = opts.sort || 'quantidade_desc'
  const sorted = [...out]
  sorted.sort((a, b) => {
    switch (sort) {
      case 'quantidade_asc':
        return a.quantidade - b.quantidade
      case 'valor_asc':
        return a.valorLiquido - b.valorLiquido
      case 'valor_desc':
        return b.valorLiquido - a.valorLiquido
      case 'nome_asc':
        return a.nome.localeCompare(b.nome, 'pt-BR')
      case 'nome_desc':
        return b.nome.localeCompare(a.nome, 'pt-BR')
      case 'quantidade_desc':
      default:
        return b.quantidade - a.quantidade
    }
  })
  return sorted
}

export function montarKpisComplementos(linhas: LinhaComplementoVendidoInterna[]) {
  let valorAumenta = 0
  let valorDiminui = 0
  let quantidadeTotal = 0
  let liderNome = ''
  let liderQtd = 0

  for (const r of linhas) {
    valorAumenta += r.valorAumenta
    valorDiminui += r.valorDiminui
    quantidadeTotal += r.quantidade
    if (r.quantidade > liderQtd) {
      liderQtd = r.quantidade
      liderNome = r.nome
    }
  }

  return {
    skusDistintos: linhas.length,
    quantidadeTotal,
    valorAumenta,
    valorDiminui,
    valorLiquido: valorAumenta - valorDiminui,
    complementoLiderNome: liderNome || null,
    complementoLiderQuantidade: liderQtd,
  }
}
