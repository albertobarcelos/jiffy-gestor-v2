/**
 * Entidade de domínio representando um Cliente
 */
export interface Endereco {
  rua?: string
  numero?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  complemento?: string
}

export class Cliente {
  private constructor(
    private readonly id: string,
    private readonly nome: string,
    private readonly razaoSocial?: string,
    private readonly cpf?: string,
    private readonly cnpj?: string,
    private readonly telefone?: string,
    private readonly email?: string,
    private readonly nomeFantasia?: string,
    private readonly ativo: boolean = true,
    private readonly empresaId?: string,
    private readonly endereco?: Endereco
  ) {}

  static create(
    id: string,
    nome: string,
    razaoSocial?: string,
    cpf?: string,
    cnpj?: string,
    telefone?: string,
    email?: string,
    nomeFantasia?: string,
    ativo: boolean = true,
    empresaId?: string,
    endereco?: Endereco
  ): Cliente {
    // Validação mais flexível - permite valores padrão
    const validId = id || `temp-${Date.now()}-${Math.random()}`
    const validNome = nome || razaoSocial || nomeFantasia || 'Empresa sem nome'

    return new Cliente(
      validId,
      validNome,
      razaoSocial,
      cpf,
      cnpj,
      telefone,
      email,
      nomeFantasia,
      ativo,
      empresaId,
      endereco
    )
  }

  static fromJSON(data: any): Cliente {
    // Valores padrão se id ou nome estiverem ausentes
    // Tenta múltiplas variações de nomes de campos
    const id = data.id?.toString() || 
               data._id?.toString() || 
               data.empresaId?.toString() ||
               data.clienteId?.toString() ||
               `temp-${Date.now()}-${Math.random()}`
    
    const nome = data.nome?.toString() || 
                 data.name?.toString() || 
                 data.razaoSocial?.toString() ||
                 data.nomeFantasia?.toString() ||
                 data.empresaNome?.toString() ||
                 'Empresa sem nome'
    
    return Cliente.create(
      id,
      nome,
      data.razaoSocial?.toString() || data.razao_social?.toString(),
      data.cpf?.toString(),
      data.cnpj?.toString(),
      data.telefone?.toString() || data.phone?.toString(),
      data.email?.toString(),
      data.nomeFantasia?.toString() || data.nome_fantasia?.toString(),
      data.ativo === true || data.ativo === 'true',
      data.empresaId?.toString() || data.empresa_id?.toString(),
      data.endereco || data.endereco_data
        ? {
            rua: (data.endereco?.rua || data.endereco_data?.rua)?.toString(),
            numero: (data.endereco?.numero || data.endereco_data?.numero)?.toString(),
            bairro: (data.endereco?.bairro || data.endereco_data?.bairro)?.toString(),
            cidade: (data.endereco?.cidade || data.endereco_data?.cidade)?.toString(),
            estado: (data.endereco?.estado || data.endereco_data?.estado)?.toString(),
            cep: (data.endereco?.cep || data.endereco_data?.cep)?.toString(),
            complemento: (data.endereco?.complemento || data.endereco_data?.complemento)?.toString(),
          }
        : undefined
    )
  }

  getId(): string {
    return this.id
  }

  getNome(): string {
    return this.nome
  }

  getRazaoSocial(): string | undefined {
    return this.razaoSocial
  }

  getCpf(): string | undefined {
    return this.cpf
  }

  getCnpj(): string | undefined {
    return this.cnpj
  }

  getTelefone(): string | undefined {
    return this.telefone
  }

  getEmail(): string | undefined {
    return this.email
  }

  getNomeFantasia(): string | undefined {
    return this.nomeFantasia
  }

  isAtivo(): boolean {
    return this.ativo
  }

  getEmpresaId(): string | undefined {
    return this.empresaId
  }

  getEndereco(): Endereco | undefined {
    return this.endereco
  }

  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      razaoSocial: this.razaoSocial,
      cpf: this.cpf,
      cnpj: this.cnpj,
      telefone: this.telefone,
      email: this.email,
      nomeFantasia: this.nomeFantasia,
      ativo: this.ativo,
      empresaId: this.empresaId,
      endereco: this.endereco,
    }
  }
}

