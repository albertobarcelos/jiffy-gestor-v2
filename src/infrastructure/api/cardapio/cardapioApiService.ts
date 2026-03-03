/**
 * Serviço de API do Cardápio Digital
 * Camada de abstração que pode usar mock ou API real
 */

// Tipos
export interface QRCodeValidationResponse {
  valid: boolean
  sessionToken?: string
  mesaId?: string
  numeroMesa?: number
  empresaId?: string
  error?: string
}

export interface CardapioData {
  grupos: GrupoProduto[]
  produtos: Produto[]
}

export interface GrupoProduto {
  id: string
  nome: string
  corHex: string
  iconName: string
  ordem?: number
  ativo: boolean
  ativoLocal: boolean
  produtosCount?: number
}

export interface Produto {
  id: string
  nome: string
  descricao?: string
  valor: number
  imagemUrl?: string
  grupoId: string
  grupoNome: string
  ativo: boolean
  ativoLocal: boolean
  favorito?: boolean
  abreComplementos?: boolean
  permiteAcrescimo?: boolean
  permiteDesconto?: boolean
  gruposComplementos?: any[]
  estoque?: number | null
}

export interface CarrinhoItem {
  id: string
  produtoId: string
  produtoNome: string
  produtoImagemUrl?: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  complementos?: any[] // Complementos adicionados
  complementosRemovidos?: any[] // Complementos removidos
  observacoes?: string
  adicionadoEm: string
}

export interface Carrinho {
  itens: CarrinhoItem[]
  subtotal: number
  total: number
  totalItens: number
}

// Interface do serviço
export interface ICardapioApiService {
  validarQRCode(token: string): Promise<QRCodeValidationResponse>
  buscarCardapio(sessionId: string): Promise<CardapioData>
  obterCarrinho(sessionId: string): Promise<Carrinho>
  adicionarItemCarrinho(
    sessionId: string,
    produtoId: string,
    quantidade: number,
    complementos?: any[],
    observacoes?: string,
    complementosRemovidos?: any[]
  ): Promise<Carrinho>
  modificarItemCarrinho(
    sessionId: string,
    itemId: string,
    quantidade?: number,
    complementos?: any[],
    observacoes?: string
  ): Promise<Carrinho>
  removerItemCarrinho(sessionId: string, itemId: string): Promise<Carrinho>
  enviarPedido(sessionId: string): Promise<{ success: boolean; pedidoId?: string; mensagem: string }>
  chamarGarcom(sessionId: string, motivo?: string, mensagem?: string): Promise<{ success: boolean }>
  fecharConta(sessionId: string): Promise<{ success: boolean; mensagem: string }>
}

// Implementação Mock (para desenvolvimento)
class CardapioApiServiceMock implements ICardapioApiService {
  async validarQRCode(token: string): Promise<QRCodeValidationResponse> {
    // Simula delay de rede
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock: sempre retorna válido
    return {
      valid: true,
      sessionToken: `mock-session-token-${Date.now()}`,
      mesaId: 'mock-mesa-id',
      numeroMesa: 1,
      empresaId: 'mock-empresa-id',
    }
  }

  async buscarCardapio(sessionId: string): Promise<CardapioData> {
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Retornar dados vazios por enquanto
    // Será preenchido com dados reais de produtos/grupos
    return {
      grupos: [],
      produtos: [],
    }
  }

  async obterCarrinho(sessionId: string): Promise<Carrinho> {
    // Buscar do localStorage
    const carrinhoStr = localStorage.getItem(`carrinho_${sessionId}`)
    if (carrinhoStr) {
      return JSON.parse(carrinhoStr)
    }

    return {
      itens: [],
      subtotal: 0,
      total: 0,
      totalItens: 0,
    }
  }

  async adicionarItemCarrinho(
    sessionId: string,
    produtoId: string,
    quantidade: number,
    complementos?: any[],
    observacoes?: string,
    complementosRemovidos?: any[]
  ): Promise<Carrinho> {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const carrinho = await this.obterCarrinho(sessionId)

    // Buscar informações do produto do localStorage (cache) ou criar mock
    // Em produção, isso virá do backend
    const produtoCacheKey = `produto_cache_${produtoId}`
    const produtoCache = localStorage.getItem(produtoCacheKey)
    let produtoData: any = null

    if (produtoCache) {
      produtoData = JSON.parse(produtoCache)
    } else {
      // Se não tiver cache, criar dados mock básicos
      // Em produção, buscar do backend
      produtoData = {
        nome: `Produto ${produtoId.substring(0, 8)}`,
        valor: 10.0,
        imagemUrl: undefined,
      }
    }

    // Calcular valor dos complementos (mock)
    // valorAdicional já vem calculado como (valorComplemento * quantidadeComplemento) do frontend
    // Então é o valor total dos complementos por unidade do produto
    const valorComplementosPorItem = (complementos || []).reduce((sum: number, comp: any) => {
      return sum + (comp.valorAdicional || 0)
    }, 0)

    const valorUnitario = produtoData.valor + valorComplementosPorItem
    const valorTotal = valorUnitario * quantidade

    const novoItem: CarrinhoItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      produtoId,
      produtoNome: produtoData.nome || `Produto ${produtoId.substring(0, 8)}`,
      produtoImagemUrl: produtoData.imagemUrl,
      quantidade,
      valorUnitario,
      valorTotal,
      complementos: complementos || [],
      complementosRemovidos: complementosRemovidos || [],
      observacoes: observacoes || undefined,
      adicionadoEm: new Date().toISOString(),
    }

    // Adicionar item ao carrinho
    carrinho.itens.push(novoItem)
    
    // Recalcular totais
    this.recalcularTotais(carrinho)
    
    localStorage.setItem(`carrinho_${sessionId}`, JSON.stringify(carrinho))
    return carrinho
  }

  async modificarItemCarrinho(
    sessionId: string,
    itemId: string,
    quantidade?: number,
    complementos?: any[],
    observacoes?: string
  ): Promise<Carrinho> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const carrinho = await this.obterCarrinho(sessionId)
    
    const item = carrinho.itens.find((i) => i.id === itemId)
    if (!item) {
      return carrinho
    }

    // Atualizar campos
    if (quantidade !== undefined) {
      item.quantidade = quantidade
    }
    if (complementos !== undefined) {
      item.complementos = complementos
    }
    if (observacoes !== undefined) {
      item.observacoes = observacoes
    }

    // Recalcular valor total do item
    item.valorTotal = item.valorUnitario * item.quantidade
    
    // Recalcular totais do carrinho
    this.recalcularTotais(carrinho)
    
    localStorage.setItem(`carrinho_${sessionId}`, JSON.stringify(carrinho))
    return carrinho
  }

  async removerItemCarrinho(sessionId: string, itemId: string): Promise<Carrinho> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const carrinho = await this.obterCarrinho(sessionId)
    
    // Remover item
    carrinho.itens = carrinho.itens.filter((i) => i.id !== itemId)
    
    // Recalcular totais
    this.recalcularTotais(carrinho)
    
    localStorage.setItem(`carrinho_${sessionId}`, JSON.stringify(carrinho))
    return carrinho
  }

  // Método auxiliar para recalcular totais
  private recalcularTotais(carrinho: Carrinho): void {
    carrinho.subtotal = carrinho.itens.reduce((sum, item) => sum + item.valorTotal, 0)
    carrinho.total = carrinho.subtotal // Por enquanto, sem taxas
    carrinho.totalItens = carrinho.itens.reduce((sum, item) => sum + item.quantidade, 0)
  }

  async enviarPedido(sessionId: string): Promise<{ success: boolean; pedidoId?: string; mensagem: string }> {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    // Limpar carrinho após envio
    const carrinhoVazio: Carrinho = {
      itens: [],
      subtotal: 0,
      total: 0,
      totalItens: 0,
    }
    localStorage.setItem(`carrinho_${sessionId}`, JSON.stringify(carrinhoVazio))
    
    return {
      success: true,
      pedidoId: `mock-pedido-${Date.now()}`,
      mensagem: 'Pedido enviado para cozinha com sucesso!',
    }
  }

  async chamarGarcom(sessionId: string, motivo?: string, mensagem?: string): Promise<{ success: boolean }> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return { success: true }
  }

  async fecharConta(sessionId: string): Promise<{ success: boolean; mensagem: string }> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      success: true,
      mensagem: 'Solicitação enviada! Um garçom virá para finalizar o pagamento.',
    }
  }
}

// Implementação Real (para produção - será implementada quando backend estiver pronto)
class CardapioApiService implements ICardapioApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_CARDAPIO_API_URL || '/api/cardapio'
  }

  async validarQRCode(token: string): Promise<QRCodeValidationResponse> {
    const response = await fetch(`${this.baseUrl}/qr/${token}/validar`, {
      method: 'POST',
    })

    if (!response.ok) {
      return {
        valid: false,
        error: 'Erro ao validar QR Code',
      }
    }

    return response.json()
  }

  async buscarCardapio(sessionId: string): Promise<CardapioData> {
    const sessionToken = sessionStorage.getItem('cardapio_session_token')
    const response = await fetch(`${this.baseUrl}/sessao/${sessionId}/cardapio`, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Erro ao buscar cardápio')
    }

    return response.json()
  }

  // Implementar outros métodos quando backend estiver pronto
  async obterCarrinho(sessionId: string): Promise<Carrinho> {
    throw new Error('Not implemented')
  }

  async adicionarItemCarrinho(): Promise<Carrinho> {
    throw new Error('Not implemented')
  }

  async modificarItemCarrinho(): Promise<Carrinho> {
    throw new Error('Not implemented')
  }

  async removerItemCarrinho(): Promise<Carrinho> {
    throw new Error('Not implemented')
  }

  async enviarPedido(): Promise<{ success: boolean; pedidoId?: string; mensagem: string }> {
    throw new Error('Not implemented')
  }

  async chamarGarcom(): Promise<{ success: boolean }> {
    throw new Error('Not implemented')
  }

  async fecharConta(): Promise<{ success: boolean; mensagem: string }> {
    throw new Error('Not implemented')
  }
}

// Factory: retorna mock ou real baseado em variável de ambiente
const getApiService = (): ICardapioApiService => {
  const mode = process.env.NEXT_PUBLIC_CARDAPIO_MODE || 'mock'
  return mode === 'mock' ? new CardapioApiServiceMock() : new CardapioApiService()
}

// Exportar instância única
export const cardapioApiService = getApiService()

// Exportar funções de conveniência
export const validarQRCode = (token: string) => cardapioApiService.validarQRCode(token)
export const buscarCardapio = (sessionId: string) => cardapioApiService.buscarCardapio(sessionId)
export const obterCarrinho = (sessionId: string) => cardapioApiService.obterCarrinho(sessionId)
export const adicionarItemCarrinho = (
  sessionId: string,
  produtoId: string,
  quantidade: number,
  complementos?: any[],
  observacoes?: string,
  complementosRemovidos?: any[]
) => cardapioApiService.adicionarItemCarrinho(sessionId, produtoId, quantidade, complementos, observacoes, complementosRemovidos)
export const modificarItemCarrinho = (
  sessionId: string,
  itemId: string,
  quantidade?: number,
  complementos?: any[],
  observacoes?: string
) => cardapioApiService.modificarItemCarrinho(sessionId, itemId, quantidade, complementos, observacoes)
export const removerItemCarrinho = (sessionId: string, itemId: string) =>
  cardapioApiService.removerItemCarrinho(sessionId, itemId)
export const enviarPedido = (sessionId: string) => cardapioApiService.enviarPedido(sessionId)
export const chamarGarcom = (sessionId: string, motivo?: string, mensagem?: string) =>
  cardapioApiService.chamarGarcom(sessionId, motivo, mensagem)
export const fecharConta = (sessionId: string) => cardapioApiService.fecharConta(sessionId)
