import { StatusPedido } from './StatusPedido'

/**
 * Entidade representando um usuário/cliente do pedido
 */
export class UsuarioPedido {
  constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly telefone?: string,
    public readonly email?: string
  ) {}

  static fromJSON(data: any): UsuarioPedido {
    return new UsuarioPedido(
      data.id || data.id_usuario || '',
      data.nome || '',
      data.telefone,
      data.email
    )
  }
}

/**
 * Entidade representando um complemento do item
 */
export class ComplementoItem {
  constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly preco: number
  ) {}

  static fromJSON(data: any): ComplementoItem {
    return new ComplementoItem(
      data.id || '',
      data.nome || '',
      data.preco || 0
    )
  }
}

/**
 * Entidade representando um item do pedido
 */
export class ItemPedido {
  constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly quantidade: number,
    public readonly preco: number,
    public readonly observacoes?: string,
    public readonly complementos: ComplementoItem[] = []
  ) {}

  static fromJSON(data: any): ItemPedido {
    const complementos = (data.complementos || data.Complemento || []).map(
      (comp: any) => ComplementoItem.fromJSON(comp)
    )

    return new ItemPedido(
      data.id || data.id_item || '',
      data.nome || '',
      data.quantidade || 0,
      data.preco || 0,
      data.observacoes,
      complementos
    )
  }

  /**
   * Calcula o valor total do item (preço * quantidade + complementos)
   */
  getValorTotal(): number {
    const valorComplementos = this.complementos.reduce(
      (sum, comp) => sum + comp.preco,
      0
    )
    return (this.preco + valorComplementos) * this.quantidade
  }
}

/**
 * Entidade representando um endereço de entrega
 */
export class EnderecoEntrega {
  constructor(
    public readonly rua: string,
    public readonly numero: string,
    public readonly bairro: string,
    public readonly cidade: string,
    public readonly estado: string,
    public readonly cep?: string,
    public readonly complemento?: string,
    public readonly referencia?: string
  ) {}

  static fromJSON(data: any): EnderecoEntrega {
    return new EnderecoEntrega(
      data.rua || '',
      data.numero || '',
      data.bairro || '',
      data.cidade || '',
      data.estado || '',
      data.cep,
      data.complemento,
      data.referencia
    )
  }

  /**
   * Retorna o endereço formatado
   */
  getEnderecoCompleto(): string {
    const partes = [
      `${this.rua}, ${this.numero}`,
      this.bairro,
      `${this.cidade} - ${this.estado}`,
      this.cep,
    ].filter(Boolean)

    return partes.join(', ')
  }
}

/**
 * Entidade principal representando um pedido de delivery
 */
export class PedidoDelivery {
  constructor(
    public readonly pedidoRef: string,
    public readonly status: StatusPedido,
    public readonly usuario: UsuarioPedido,
    public readonly itens: ItemPedido[],
    public readonly endereco?: EnderecoEntrega,
    public readonly valorTotal: number = 0,
    public readonly metodoPagamento?: string,
    public readonly observacoes?: string,
    public readonly dataCriacao?: Date,
    public readonly dataAtualizacao?: Date
  ) {}

  /**
   * Cria uma instância a partir de dados JSON da API
   */
  static fromJSON(data: any): PedidoDelivery {
    const usuario = UsuarioPedido.fromJSON(data.usuario || data.Usuario || {})
    const itens = (data.itens || data.Item || []).map((item: any) =>
      ItemPedido.fromJSON(item)
    )

    const endereco = data.endereco
      ? EnderecoEntrega.fromJSON(data.endereco)
      : undefined

    // Calcula valor total se não fornecido
    const valorTotal =
      data.valorTotal ||
      data.valor_total ||
      itens.reduce((sum: number, item: ItemPedido) => sum + item.getValorTotal(), 0)

    return new PedidoDelivery(
      data.pedido_ref || data.pedidoRef || data.id || '',
      data.status || data.status_pedido || StatusPedido.PENDENTE,
      usuario,
      itens,
      endereco,
      valorTotal,
      data.metodo_pagamento || data.metodoPagamento,
      data.observacoes,
      data.data_criacao ? new Date(data.data_criacao) : undefined,
      data.data_atualizacao ? new Date(data.data_atualizacao) : undefined
    )
  }

  /**
   * Verifica se o pedido pode ser cancelado
   */
  podeCancelar(): boolean {
    return (
      this.status === StatusPedido.PENDENTE ||
      this.status === StatusPedido.AGENDAMENTO_ACEITO ||
      this.status === StatusPedido.EM_PRODUCAO
    )
  }

  /**
   * Verifica se o pedido pode avançar de status
   */
  podeAvançarStatus(): boolean {
    return (
      this.status !== StatusPedido.FINALIZADO &&
      this.status !== StatusPedido.CANCELADO
    )
  }
}

