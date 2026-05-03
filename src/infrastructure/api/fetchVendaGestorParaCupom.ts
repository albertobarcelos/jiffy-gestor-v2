import type { ItemCupomDelivery, VendaGestorCupomDTO } from '@/src/shared/types/deliveryImpressao'

function mapProdutoLinha(p: Record<string, unknown>): ItemCupomDelivery {
  const produtoIdRaw = p.produtoId ?? p.produto_id
  const produtoId =
    produtoIdRaw != null && String(produtoIdRaw).trim() !== ''
      ? String(produtoIdRaw).trim()
      : undefined
  const descricao = String(p.nomeProduto ?? p.nome ?? p.descricao ?? 'Item').trim() || 'Item'
  const quantidade = Math.max(1, Number(p.quantidade ?? p.qtd ?? 1) || 1)
  const vf = p.valorFinal ?? p.total ?? p.valorTotal
  const valorFinal = vf != null && vf !== '' ? Number(vf) : undefined
  const vu = p.valorUnitario
  const valorUnitario = vu != null && vu !== '' ? Number(vu) : undefined
  const observacao =
    typeof p.observacao === 'string' && p.observacao.trim()
      ? p.observacao.trim()
      : undefined
  return {
    ...(produtoId ? { produtoId } : {}),
    descricao,
    quantidade,
    valorFinal: Number.isFinite(valorFinal) ? valorFinal : undefined,
    valorUnitario: Number.isFinite(valorUnitario) ? valorUnitario : undefined,
    observacao,
  }
}

export function mapGestorJsonParaCupomDto(raw: Record<string, unknown>): VendaGestorCupomDTO {
  const produtosRaw = raw.produtosLancados ?? raw.produtos
  const produtos = Array.isArray(produtosRaw)
    ? produtosRaw.map(p => mapProdutoLinha(p as Record<string, unknown>))
    : []

  const cr = raw.cliente as Record<string, unknown> | null | undefined
  let cliente: VendaGestorCupomDTO['cliente'] = null
  if (cr && typeof cr === 'object') {
    cliente = {
      nome: typeof cr.nome === 'string' ? cr.nome : undefined,
      telefone:
        typeof cr.telefone === 'string'
          ? cr.telefone
          : typeof cr.celular === 'string'
            ? cr.celular
            : typeof cr.telefoneContato === 'string'
              ? cr.telefoneContato
              : undefined,
    }
  }

  const obs =
    typeof raw.observacaoPedido === 'string'
      ? raw.observacaoPedido
      : typeof raw.observacao === 'string'
        ? raw.observacao
        : typeof raw.identificacao === 'string'
          ? raw.identificacao
          : undefined

  const valorFinal = Number(raw.valorFinal ?? 0) || 0

  return {
    id: String(raw.id ?? ''),
    numeroVenda: Number(raw.numeroVenda ?? 0) || 0,
    codigoVenda: raw.codigoVenda != null ? String(raw.codigoVenda) : undefined,
    valorFinal,
    tipoVenda: raw.tipoVenda != null ? String(raw.tipoVenda) : null,
    cliente,
    produtos,
    observacaoGeral: obs?.trim() || undefined,
  }
}

/**
 * Carrega o JSON completo da venda gestor para montar o cupom (itens, cliente).
 * Usa o mesmo BFF que o modal de pedido (`GET /api/vendas/gestor/:id`).
 *
 * A API não inclui impressoras por linha de produto (igual ao PDV); quem imprime resolve
 * `produtoId` → impressoras via cache de catálogo e/ou GET `/api/produtos/:id`.
 */
export async function fetchVendaGestorParaCupom(
  vendaId: string,
  accessToken: string | undefined
): Promise<VendaGestorCupomDTO | null> {
  if (!accessToken?.trim()) return null
  const res = await fetch(`/api/vendas/gestor/${encodeURIComponent(vendaId)}?incluirFiscal=false`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const raw = (await res.json()) as Record<string, unknown>
  if (!raw || typeof raw !== 'object') return null
  return mapGestorJsonParaCupomDto(raw)
}
