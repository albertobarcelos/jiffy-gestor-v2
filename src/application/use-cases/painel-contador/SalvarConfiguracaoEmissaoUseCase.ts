import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import { SalvarEmissaoSchema } from '@/src/application/dto/painel-contador/PainelContadorDTO'
import { ConfiguracaoEmissao } from '@/src/domain/entities/painel-contador/ConfiguracaoEmissao'

export class SalvarConfiguracaoEmissaoUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async listar(): Promise<ConfiguracaoEmissao[]> {
    return this.repository.listarConfiguracoesEmissao()
  }

  async salvar(modelo: 55 | 65, input: unknown): Promise<ConfiguracaoEmissao> {
    const dto = SalvarEmissaoSchema.parse({
      ...(typeof input === 'object' && input !== null ? input : {}),
      modelo,
    })
    return this.repository.salvarConfiguracaoEmissao(modelo, dto)
  }
}
