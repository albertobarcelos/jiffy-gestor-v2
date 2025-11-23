/**
 * Entidade de domínio representando um Faturamento
 */
import { Venda } from './Venda'

export class Faturamento {
  private constructor(
    private readonly id: string,
    private readonly valorMedio: number,
    private readonly valorFaturamento: number,
    private readonly dataInicio: Date,
    private readonly dataFim: Date,
    private readonly quantidadeVendas: number,
    private readonly vendas: Venda[] = []
  ) {}

  static create(
    id: string,
    valorMedio: number,
    valorFaturamento: number,
    dataInicio: Date,
    dataFim: Date,
    quantidadeVendas: number,
    vendas: Venda[] = []
  ): Faturamento {
    if (!id || !dataInicio || !dataFim) {
      throw new Error('ID, data de início e data de fim são obrigatórios')
    }

    return new Faturamento(
      id,
      valorMedio,
      valorFaturamento,
      dataInicio,
      dataFim,
      quantidadeVendas,
      vendas
    )
  }

  static fromJSON(data: any): Faturamento {
    return Faturamento.create(
      data.id?.toString() || '',
      typeof data.valorMedio === 'number' ? data.valorMedio : parseFloat(data.valorMedio) || 0,
      typeof data.valorFaturamento === 'number' ? data.valorFaturamento : parseFloat(data.valorFaturamento) || 0,
      data.dataInicio ? new Date(data.dataInicio) : new Date(),
      data.dataFim ? new Date(data.dataFim) : new Date(),
      typeof data.quantidadeVendas === 'number' ? data.quantidadeVendas : parseInt(data.quantidadeVendas) || 0,
      (data.vendas || []).map((v: any) => Venda.fromJSON(v))
    )
  }

  getId(): string {
    return this.id
  }

  getValorMedio(): number {
    return this.valorMedio
  }

  getValorFaturamento(): number {
    return this.valorFaturamento
  }

  getDataInicio(): Date {
    return this.dataInicio
  }

  getDataFim(): Date {
    return this.dataFim
  }

  getQuantidadeVendas(): number {
    return this.quantidadeVendas
  }

  getVendas(): Venda[] {
    return this.vendas
  }

  toJSON() {
    return {
      id: this.id,
      valorMedio: this.valorMedio,
      valorFaturamento: this.valorFaturamento,
      dataInicio: this.dataInicio.toISOString(),
      dataFim: this.dataFim.toISOString(),
      quantidadeVendas: this.quantidadeVendas,
      vendas: this.vendas.map((v) => v.toJSON()),
    }
  }
}

