/**
 * Entidade de domínio representando uma Nota Fiscal Eletrônica (NFe)
 */
export type NFeStatus = 'PENDENTE' | 'EM_PROCESSAMENTO' | 'AUTORIZADA' | 'REJEITADA' | 'CANCELADA'

export interface NFeItem {
  produtoId: string
  produtoNome: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  ncm?: string
  cfop?: string
  unidade?: string
}

export class NFe {
  private constructor(
    private readonly id: string,
    private readonly numero: string,
    private readonly serie: string,
    private readonly clienteId: string,
    private readonly clienteNome: string,
    private readonly clienteCpfCnpj: string,
    private readonly dataEmissao: Date,
    private readonly status: NFeStatus,
    private readonly valorTotal: number,
    private readonly itens: NFeItem[],
    private readonly chaveAcesso?: string,
    private readonly protocolo?: string,
    private readonly motivoRejeicao?: string,
    private readonly dataAutorizacao?: Date,
    private readonly observacoes?: string
  ) {}

  static create(
    id: string,
    numero: string,
    serie: string,
    clienteId: string,
    clienteNome: string,
    clienteCpfCnpj: string,
    dataEmissao: Date,
    status: NFeStatus,
    valorTotal: number,
    itens: NFeItem[],
    chaveAcesso?: string,
    protocolo?: string,
    motivoRejeicao?: string,
    dataAutorizacao?: Date,
    observacoes?: string
  ): NFe {
    if (!id || !numero || !clienteId) {
      throw new Error('ID, número e cliente são obrigatórios')
    }

    return new NFe(
      id,
      numero,
      serie,
      clienteId,
      clienteNome,
      clienteCpfCnpj,
      dataEmissao,
      status,
      valorTotal,
      itens,
      chaveAcesso,
      protocolo,
      motivoRejeicao,
      dataAutorizacao,
      observacoes
    )
  }

  static fromJSON(data: any): NFe {
    return NFe.create(
      data.id?.toString() || '',
      data.numero?.toString() || '',
      data.serie?.toString() || '1',
      data.clienteId?.toString() || '',
      data.clienteNome?.toString() || '',
      data.clienteCpfCnpj?.toString() || '',
      data.dataEmissao ? new Date(data.dataEmissao) : new Date(),
      (data.status || 'PENDENTE') as NFeStatus,
      typeof data.valorTotal === 'number' ? data.valorTotal : parseFloat(data.valorTotal) || 0,
      (data.itens || []).map((item: any) => ({
        produtoId: item.produtoId?.toString() || '',
        produtoNome: item.produtoNome?.toString() || '',
        quantidade: typeof item.quantidade === 'number' ? item.quantidade : parseFloat(item.quantidade) || 0,
        valorUnitario: typeof item.valorUnitario === 'number' ? item.valorUnitario : parseFloat(item.valorUnitario) || 0,
        valorTotal: typeof item.valorTotal === 'number' ? item.valorTotal : parseFloat(item.valorTotal) || 0,
        ncm: item.ncm?.toString(),
        cfop: item.cfop?.toString(),
        unidade: item.unidade?.toString() || 'UN',
      })),
      data.chaveAcesso?.toString(),
      data.protocolo?.toString(),
      data.motivoRejeicao?.toString(),
      data.dataAutorizacao ? new Date(data.dataAutorizacao) : undefined,
      data.observacoes?.toString()
    )
  }

  getId(): string {
    return this.id
  }

  getNumero(): string {
    return this.numero
  }

  getSerie(): string {
    return this.serie
  }

  getClienteId(): string {
    return this.clienteId
  }

  getClienteNome(): string {
    return this.clienteNome
  }

  getClienteCpfCnpj(): string {
    return this.clienteCpfCnpj
  }

  getDataEmissao(): Date {
    return this.dataEmissao
  }

  getStatus(): NFeStatus {
    return this.status
  }

  getValorTotal(): number {
    return this.valorTotal
  }

  getItens(): NFeItem[] {
    return this.itens
  }

  getChaveAcesso(): string | undefined {
    return this.chaveAcesso
  }

  getProtocolo(): string | undefined {
    return this.protocolo
  }

  getMotivoRejeicao(): string | undefined {
    return this.motivoRejeicao
  }

  getDataAutorizacao(): Date | undefined {
    return this.dataAutorizacao
  }

  getObservacoes(): string | undefined {
    return this.observacoes
  }

  toJSON() {
    return {
      id: this.id,
      numero: this.numero,
      serie: this.serie,
      clienteId: this.clienteId,
      clienteNome: this.clienteNome,
      clienteCpfCnpj: this.clienteCpfCnpj,
      dataEmissao: this.dataEmissao.toISOString(),
      status: this.status,
      valorTotal: this.valorTotal,
      itens: this.itens,
      chaveAcesso: this.chaveAcesso,
      protocolo: this.protocolo,
      motivoRejeicao: this.motivoRejeicao,
      dataAutorizacao: this.dataAutorizacao?.toISOString(),
      observacoes: this.observacoes,
    }
  }
}

