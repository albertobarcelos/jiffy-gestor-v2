/**
 * API mock do cardápio mesa (QR) — V1.
 * Pedido / garçom / conta / QR simulados; catálogo vem do Menu balcão no FE.
 */

export type QRCodeValidationResponse = {
  valid: boolean
  sessionToken?: string
  mesaId?: string
  numeroMesa?: number
  empresaId?: string
  menuId?: string | null
  error?: string
}

export type CarrinhoItem = {
  id: string
  produtoId: string
  produtoNome: string
  produtoImagemUrl?: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  complementos?: unknown[]
  complementosRemovidos?: unknown[]
  observacoes?: string
  adicionadoEm: string
}

export type Carrinho = {
  itens: CarrinhoItem[]
  subtotal: number
  total: number
  totalItens: number
}

const carrinhoKey = (sessionId: string) => `mesa_qr_carrinho_${sessionId}`

function recalcularTotais(carrinho: Carrinho): void {
  carrinho.subtotal = carrinho.itens.reduce((sum, item) => sum + item.valorTotal, 0)
  carrinho.total = carrinho.subtotal
  carrinho.totalItens = carrinho.itens.reduce((sum, item) => sum + item.quantidade, 0)
}

export async function validarQRCode(token: string): Promise<QRCodeValidationResponse> {
  await new Promise(resolve => setTimeout(resolve, 600))
  if (!token?.trim()) {
    return { valid: false, error: 'Token não encontrado' }
  }
  return {
    valid: true,
    sessionToken: `mesa-qr-session-${Date.now()}`,
    mesaId: 'mock-mesa-id',
    numeroMesa: 1,
    empresaId: 'mock-empresa-id',
    menuId: null,
  }
}

export async function obterCarrinho(sessionId: string): Promise<Carrinho> {
  if (typeof window === 'undefined') {
    return { itens: [], subtotal: 0, total: 0, totalItens: 0 }
  }
  const raw = localStorage.getItem(carrinhoKey(sessionId))
  if (raw) return JSON.parse(raw) as Carrinho
  return { itens: [], subtotal: 0, total: 0, totalItens: 0 }
}

export async function adicionarItemCarrinho(
  sessionId: string,
  input: {
    produtoId: string
    produtoNome: string
    produtoImagemUrl?: string
    quantidade: number
    valorUnitario: number
    valorTotal: number
    complementos?: unknown[]
    complementosRemovidos?: unknown[]
    observacoes?: string
  }
): Promise<Carrinho> {
  await new Promise(resolve => setTimeout(resolve, 200))
  const carrinho = await obterCarrinho(sessionId)
  carrinho.itens.push({
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    produtoId: input.produtoId,
    produtoNome: input.produtoNome,
    produtoImagemUrl: input.produtoImagemUrl,
    quantidade: input.quantidade,
    valorUnitario: input.valorUnitario,
    valorTotal: input.valorTotal,
    complementos: input.complementos || [],
    complementosRemovidos: input.complementosRemovidos || [],
    observacoes: input.observacoes,
    adicionadoEm: new Date().toISOString(),
  })
  recalcularTotais(carrinho)
  localStorage.setItem(carrinhoKey(sessionId), JSON.stringify(carrinho))
  return carrinho
}

export async function modificarItemCarrinho(
  sessionId: string,
  itemId: string,
  patch: { quantidade?: number; observacoes?: string }
): Promise<Carrinho> {
  await new Promise(resolve => setTimeout(resolve, 150))
  const carrinho = await obterCarrinho(sessionId)
  const item = carrinho.itens.find(i => i.id === itemId)
  if (!item) return carrinho
  if (patch.quantidade !== undefined) {
    item.quantidade = patch.quantidade
    item.valorTotal = item.valorUnitario * item.quantidade
  }
  if (patch.observacoes !== undefined) item.observacoes = patch.observacoes
  recalcularTotais(carrinho)
  localStorage.setItem(carrinhoKey(sessionId), JSON.stringify(carrinho))
  return carrinho
}

export async function removerItemCarrinho(sessionId: string, itemId: string): Promise<Carrinho> {
  await new Promise(resolve => setTimeout(resolve, 150))
  const carrinho = await obterCarrinho(sessionId)
  carrinho.itens = carrinho.itens.filter(i => i.id !== itemId)
  recalcularTotais(carrinho)
  localStorage.setItem(carrinhoKey(sessionId), JSON.stringify(carrinho))
  return carrinho
}

export async function enviarPedido(
  sessionId: string
): Promise<{ success: boolean; pedidoId?: string; mensagem: string }> {
  await new Promise(resolve => setTimeout(resolve, 500))
  const vazio: Carrinho = { itens: [], subtotal: 0, total: 0, totalItens: 0 }
  localStorage.setItem(carrinhoKey(sessionId), JSON.stringify(vazio))
  return {
    success: true,
    pedidoId: `mock-pedido-${Date.now()}`,
    mensagem: 'Pedido enviado para cozinha com sucesso! (mock)',
  }
}

export async function chamarGarcom(
  _sessionId: string,
  _motivo?: string,
  _mensagem?: string
): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return { success: true }
}

export async function fecharConta(
  _sessionId: string
): Promise<{ success: boolean; mensagem: string }> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return {
    success: true,
    mensagem: 'Solicitação enviada! Um garçom virá para finalizar o pagamento. (mock)',
  }
}
