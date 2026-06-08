export interface EmpresaPainelEndereco {
  cep?: string
  rua?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  uf?: string
}

export class EmpresaPainelResumo {
  private constructor(
    readonly id: string,
    readonly cnpj: string,
    readonly razaoSocial: string,
    readonly nomeFantasia: string,
    readonly nomeExibicao: string,
    readonly email: string,
    readonly telefone: string,
    readonly endereco: EmpresaPainelEndereco
  ) {}

  static fromApiResponse(data: Record<string, unknown> | null | undefined): EmpresaPainelResumo | null {
    if (!data?.id) return null

    const enderecoRaw = (data.endereco as EmpresaPainelEndereco | undefined) ?? {}
    const razaoSocial = String(data.razaoSocial ?? data.nome ?? '').trim()
    const nomeFantasia = String(data.nomeFantasia ?? '').trim()
    const nomeExibicao =
      razaoSocial || nomeFantasia || String(data.nome ?? data.empresa ?? 'Empresa').trim()

    return new EmpresaPainelResumo(
      String(data.id),
      String(data.cnpj ?? '').trim(),
      razaoSocial,
      nomeFantasia,
      nomeExibicao,
      String(data.email ?? '').trim(),
      String(data.telefone ?? '').trim(),
      enderecoRaw
    )
  }

  getUf(): string {
    return (this.endereco.estado ?? this.endereco.uf ?? '').trim()
  }

  temCnpjValido(): boolean {
    return this.cnpj.replace(/\D/g, '').length >= 14
  }

  temRazaoSocial(): boolean {
    return this.razaoSocial.length > 0 || this.nomeExibicao.length > 0
  }

  temUf(): boolean {
    return this.getUf().length > 0
  }
}
