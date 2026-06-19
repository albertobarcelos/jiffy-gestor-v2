import type {
  ModoImpressaoDelivery,
  TipoCupomDelivery,
  VendaGestorCupomDTO,
} from '@/src/shared/types/deliveryImpressao'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtBrl(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function tituloCupom(
  modo: ModoImpressaoDelivery,
  tipo: TipoCupomDelivery
): string {
  if (tipo === 'expedicao') return 'EXPEDIÇÃO / RETIRADA'
  if (tipo === 'producao_cozinha') return 'PRODUÇÃO'
  if (modo === 'separado' && tipo === 'producao_completa') return 'PEDIDO'
  return 'PEDIDO — DELIVERY'
}

export interface BuildCupomDeliveryOptions {
  nomeEmpresa?: string
  larguraPx?: number
  /** Ex.: setor cozinha / bar — modo separado agrupado por impressora. */
  rotuloImpressora?: string
}

/**
 * Monta HTML para impressão térmica (QZ pixel/html). Largura ~80mm em px (~302px a 96dpi); pode reduzir para 58mm.
 */
export function buildCupomDelivery(
  venda: VendaGestorCupomDTO,
  modo: ModoImpressaoDelivery,
  tipoCupom: TipoCupomDelivery,
  options?: BuildCupomDeliveryOptions
): string {
  const nomeEmpresa = options?.nomeEmpresa?.trim() || 'Jiffy Gestor'
  const w = options?.larguraPx ?? 280
  const titulo = tituloCupom(modo, tipoCupom)
  const rotuloImp = options?.rotuloImpressora?.trim()
  const cliente = venda.cliente?.nome?.trim() || '—'
  const tel = venda.cliente?.telefone?.trim()
  const codigo = venda.codigoVenda ? `#${venda.codigoVenda}` : ''

  const linhasProd = venda.produtos.map(p => {
    const q = p.quantidade
    const nome = escapeHtml(p.descricao)
    const sub = p.valorFinal != null ? fmtBrl(p.valorFinal) : ''
    const obs = p.observacao?.trim() ? `<div style="font-size:11px;color:#555;">${escapeHtml(p.observacao)}</div>` : ''
    return `<tr><td style="padding:4px 0;border-bottom:1px dashed #ccc;">
      <div style="font-weight:600;">${q}× ${nome}</div>
      ${obs}
      ${sub ? `<div style="font-size:11px;">${sub}</div>` : ''}
    </td></tr>`
  })

  const obsGeral = venda.observacaoGeral?.trim()
    ? `<p style="margin:8px 0;font-size:11px;"><strong>Obs.:</strong> ${escapeHtml(venda.observacaoGeral)}</p>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin:0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; color:#111; }
</style>
</head><body>
<div style="width:${w}px;max-width:${w}px;margin:0 auto;padding:8px;font-size:13px;line-height:1.35;">
  <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
    <div style="font-weight:700;font-size:15px;">${escapeHtml(nomeEmpresa)}</div>
    <div style="font-size:12px;margin-top:4px;font-weight:700;">${escapeHtml(titulo)}</div>
    ${rotuloImp ? `<div style="font-size:11px;margin-top:2px;color:#444;">${escapeHtml(rotuloImp)}</div>` : ''}
  </div>
  <div style="margin-bottom:8px;">
    <div><strong>Pedido</strong> ${venda.numeroVenda} ${escapeHtml(codigo)}</div>
    <div><strong>Cliente</strong> ${escapeHtml(cliente)}</div>
    ${tel ? `<div><strong>Tel.</strong> ${escapeHtml(tel)}</div>` : ''}
    <div><strong>Total</strong> ${fmtBrl(venda.valorFinal)}</div>
  </div>
  <table style="width:100%;border-collapse:collapse;">${linhasProd.join('')}</table>
  ${obsGeral}
  <div style="margin-top:12px;font-size:11px;color:#555;text-align:center;">
    ${escapeHtml(new Date().toLocaleString('pt-BR'))}
  </div>
</div>
</body></html>`
}
