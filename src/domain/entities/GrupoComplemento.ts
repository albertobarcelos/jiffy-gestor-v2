/**
 * Entidade de domínio representando um Grupo de Complementos
 */
export class GrupoComplemento {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly qtdMinima: number,
    private readonly qtdMaxima: number,
    private readonly ativo: boolean,
    private readonly ordem?: number,
    private readonly complementosIds?: string[],
    private readonly complementos?: any[]
  ) {}

  static create(
    id: string,
    nome: string,
    qtdMinima: number,
    qtdMaxima: number,
    ativo: boolean,
    ordem?: number,
    complementosIds?: string[],
    complementos?: any[]
  ): GrupoComplemento {
    if (!id || !nome) {
      throw new Error('ID e nome são obrigatórios')
    }

    if (qtdMinima < 0 || qtdMaxima < 0) {
      throw new Error('Quantidades não podem ser negativas')
    }

    if (qtdMinima > qtdMaxima) {
      throw new Error('Quantidade mínima não pode ser maior que máxima')
    }

    return new GrupoComplemento(
      id,
      nome,
      qtdMinima,
      qtdMaxima,
      ativo,
      ordem,
      complementosIds,
      complementos
    )
  }

  static fromJSON(data: any): GrupoComplemento {
    let qtdMinima = typeof data.qtdMinima === 'number' ? data.qtdMinima : parseFloat(data.qtdMinima) || 0
    let qtdMaxima = typeof data.qtdMaxima === 'number' ? data.qtdMaxima : parseFloat(data.qtdMaxima) || 0

    // Corrigir automaticamente se min > max (provavelmente estão invertidos)
    if (qtdMinima > qtdMaxima && qtdMinima > 0 && qtdMaxima > 0) {
      // Trocar os valores se ambos forem positivos
      const temp = qtdMinima
      qtdMinima = qtdMaxima
      qtdMaxima = temp
    } else if (qtdMinima > qtdMaxima) {
      // Se ainda estiver inválido após tentativa de correção, usar valores padrão seguros
      qtdMinima = 0
      qtdMaxima = Math.max(qtdMinima, qtdMaxima) || 1
    }

    return GrupoComplemento.create(
      data.id?.toString() || '',
      data.nome?.toString() || '',
      qtdMinima,
      qtdMaxima,
      data.ativo === true || data.ativo === 'true',
      data.complementosIds
        ? (Array.isArray(data.complementosIds)
            ? data.complementosIds.map((id: any) => id.toString())
            : [])
        : undefined,
      typeof data.ordem === 'number'
        ? data.ordem
        : typeof data.ordem === 'string'
          ? Number(data.ordem)
          : undefined,
      data.complementos
    )
  }

  getId(): string {
    return this.id
  }

  getNome(): string {
    return this.nome
  }

  getQtdMinima(): number {
    return this.qtdMinima
  }

  getQtdMaxima(): number {
    return this.qtdMaxima
  }

  isAtivo(): boolean {
    return this.ativo
  }

  getOrdem(): number | undefined {
    return this.ordem
  }

  getComplementosIds(): string[] | undefined {
    return this.complementosIds
  }

  getComplementos(): any[] | undefined {
    return this.complementos
  }

  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      qtdMinima: this.qtdMinima,
      qtdMaxima: this.qtdMaxima,
      ativo: this.ativo,
      ordem: this.ordem,
      complementosIds: this.complementosIds,
      complementos: this.complementos,
    }
  }
}

