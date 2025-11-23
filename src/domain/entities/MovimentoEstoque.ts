/**
 * Entidade de domínio representando um Movimento de Estoque
 */
export interface ProdutoMovimento {
  produtoId: string
  produtoNome: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  estoqueAnterior?: number
  estoqueNovo?: number
}

export class MovimentoEstoque {
  private constructor(
    private readonly id: string,
    private readonly tipo: 'ENTRADA' | 'SAIDA' | 'INVENTARIO',
    private readonly dataLancamento: Date,
    private readonly numeroDocumento: string,
    private readonly fornecedorClienteId?: string,
    private readonly fornecedorClienteNome?: string,
    private readonly observacoes?: string,
    private readonly produtos: ProdutoMovimento[] = []
  ) {}

  static create(
    id: string,
    tipo: 'ENTRADA' | 'SAIDA' | 'INVENTARIO',
    dataLancamento: Date,
    numeroDocumento: string,
    fornecedorClienteId?: string,
    fornecedorClienteNome?: string,
    observacoes?: string,
    produtos: ProdutoMovimento[] = []
  ): MovimentoEstoque {
    if (!id || !tipo || !dataLancamento || !numeroDocumento) {
      throw new Error('ID, tipo, data de lançamento e número do documento são obrigatórios')
    }

    return new MovimentoEstoque(
      id,
      tipo,
      dataLancamento,
      numeroDocumento,
      fornecedorClienteId,
      fornecedorClienteNome,
      observacoes,
      produtos
    )
  }

  static fromJSON(data: any): MovimentoEstoque {
    return MovimentoEstoque.create(
      data.id?.toString() || '',
      data.tipo || 'ENTRADA',
      data.dataLancamento ? new Date(data.dataLancamento) : new Date(),
      data.numeroDocumento?.toString() || '',
      data.fornecedorClienteId?.toString(),
      data.fornecedorClienteNome?.toString(),
      data.observacoes?.toString(),
      (data.produtos || []).map((p: any) => ({
        produtoId: p.produtoId?.toString() || '',
        produtoNome: p.produtoNome?.toString() || '',
        quantidade: typeof p.quantidade === 'number' ? p.quantidade : parseFloat(p.quantidade) || 0,
        valorUnitario: typeof p.valorUnitario === 'number' ? p.valorUnitario : parseFloat(p.valorUnitario) || 0,
        valorTotal: typeof p.valorTotal === 'number' ? p.valorTotal : parseFloat(p.valorTotal) || 0,
        estoqueAnterior: p.estoqueAnterior ? (typeof p.estoqueAnterior === 'number' ? p.estoqueAnterior : parseFloat(p.estoqueAnterior)) : undefined,
        estoqueNovo: p.estoqueNovo ? (typeof p.estoqueNovo === 'number' ? p.estoqueNovo : parseFloat(p.estoqueNovo)) : undefined,
      }))
    )
  }

  getId(): string {
    return this.id
  }

  getTipo(): 'ENTRADA' | 'SAIDA' | 'INVENTARIO' {
    return this.tipo
  }

  getDataLancamento(): Date {
    return this.dataLancamento
  }

  getNumeroDocumento(): string {
    return this.numeroDocumento
  }

  getFornecedorClienteId(): string | undefined {
    return this.fornecedorClienteId
  }

  getFornecedorClienteNome(): string | undefined {
    return this.fornecedorClienteNome
  }

  getObservacoes(): string | undefined {
    return this.observacoes
  }

  getProdutos(): ProdutoMovimento[] {
    return this.produtos
  }

  getValorTotal(): number {
    return this.produtos.reduce((total, produto) => total + produto.valorTotal, 0)
  }

  toJSON() {
    return {
      id: this.id,
      tipo: this.tipo,
      dataLancamento: this.dataLancamento.toISOString(),
      numeroDocumento: this.numeroDocumento,
      fornecedorClienteId: this.fornecedorClienteId,
      fornecedorClienteNome: this.fornecedorClienteNome,
      observacoes: this.observacoes,
      produtos: this.produtos,
      valorTotal: this.getValorTotal(),
    }
  }
}

