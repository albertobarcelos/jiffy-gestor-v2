export type CodigoBarrasExpedicao =
  | { tipo: 'entregador'; senha: string }
  | { tipo: 'pedido'; codigoVenda: string }

const SENHA = /^\d{4}$/
const CODIGO_VENDA = /^[A-Z0-9]{4,16}$/

/**
 * Interpreta o que o leitor (ou o teclado) mandou.
 * `M1842` / `1842` → entregador. `PTBIMLFJA` / `TBIMLFJA` → pedido.
 */
export function parseCodigoBarrasExpedicao(bruto: string): CodigoBarrasExpedicao | null {
  const valor = String(bruto ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (!valor) return null

  if (valor.startsWith('M') && SENHA.test(valor.slice(1))) {
    return { tipo: 'entregador', senha: valor.slice(1) }
  }
  if (SENHA.test(valor)) {
    return { tipo: 'entregador', senha: valor }
  }
  if (valor.startsWith('P') && CODIGO_VENDA.test(valor.slice(1))) {
    return { tipo: 'pedido', codigoVenda: valor.slice(1) }
  }
  if (CODIGO_VENDA.test(valor)) {
    return { tipo: 'pedido', codigoVenda: valor }
  }
  return null
}

export function montarCodigoBarrasPedido(codigoVenda: string): string {
  const codigo = String(codigoVenda ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  return codigo ? `P${codigo}` : ''
}

export function montarCodigoBarrasEntregador(senha: string): string {
  const digits = String(senha ?? '').replace(/\D/g, '').slice(0, 4)
  return SENHA.test(digits) ? `M${digits}` : ''
}
