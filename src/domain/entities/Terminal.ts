/**
 * Entidade de domínio representando um Terminal
 */
import { MeioPagamento } from './MeioPagamento'

export class Terminal {
  private constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly sincronizado: boolean,
    private readonly ativo: boolean,
    private readonly enderecoMac: string,
    private readonly metodoPagamento: MeioPagamento[] = []
  ) {}

  static create(
    id: string,
    name: string,
    sincronizado: boolean,
    ativo: boolean,
    enderecoMac: string,
    metodoPagamento: MeioPagamento[] = []
  ): Terminal {
    // Validação mais flexível - permite valores padrão
    const validId = id || `temp-${Date.now()}-${Math.random()}`
    const validName = name || 'Terminal sem nome'

    return new Terminal(validId, validName, sincronizado, ativo, enderecoMac, metodoPagamento)
  }

  static fromJSON(data: any): Terminal {
    // Valores padrão se id ou name estiverem ausentes
    // Tenta múltiplas variações de nomes de campos
    const id = data.id?.toString() || 
               data._id?.toString() || 
               data.terminalId?.toString() ||
               `temp-${Date.now()}-${Math.random()}`
    
    const name = data.name?.toString() || 
                 data.nome?.toString() || 
                 data.terminalName?.toString() ||
                 'Terminal sem nome'
    
    return Terminal.create(
      id,
      name,
      data.sincronizado ?? false,
      data.ativo ?? false,
      data.enderecoMac?.toString() || 
      data.endereco_mac?.toString() || 
      data.macAddress?.toString() || 
      '',
      (data.metodoPagamento || data.metodo_pagamento || data.metodosPagamento || [])
        .map((mp: any) => {
          try {
            return MeioPagamento.fromJSON(mp)
          } catch (error) {
            console.warn('Erro ao criar MeioPagamento:', error, mp)
            return null
          }
        })
        .filter((mp: MeioPagamento | null): mp is MeioPagamento => mp !== null)
    )
  }

  getId(): string {
    return this.id
  }

  getName(): string {
    return this.name
  }

  getSincronizado(): boolean {
    return this.sincronizado
  }

  getAtivo(): boolean {
    return this.ativo
  }

  getEnderecoMac(): string {
    return this.enderecoMac
  }

  getMetodoPagamento(): MeioPagamento[] {
    return this.metodoPagamento
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      sincronizado: this.sincronizado,
      ativo: this.ativo,
      enderecoMac: this.enderecoMac,
      metodoPagamento: this.metodoPagamento.map((mp) => mp.toJSON()),
    }
  }
}

