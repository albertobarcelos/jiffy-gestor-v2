import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import type {
  CbenefItemDTO,
  ImportarCbenefResultadoDTO,
  ValidarCbenefDTO,
} from '@/src/application/dto/painel-contador/PainelContadorDTO'
import {
  codigoCbenefTemTamanhoValido,
  normalizarCodigoCbenefParaValidacao,
  normalizarUf,
} from '@/src/domain/entities/painel-contador/cbenefRegras'

export class GerenciarCbenefUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async validar(codigo: string): Promise<ValidarCbenefDTO> {
    const normalizado = normalizarCodigoCbenefParaValidacao(codigo)
    if (!codigoCbenefTemTamanhoValido(normalizado)) {
      return {
        valido: false,
        codigo: normalizado,
        descricao: null,
        uf: null,
        vigente: false,
        mensagem: 'Formato de código inválido. Use 8 ou 10 caracteres, ou SEM CBENEF.',
      }
    }
    return this.repository.validarCbenef(normalizado)
  }

  async listar(uf: string, cst?: string): Promise<CbenefItemDTO[]> {
    const ufNorm = normalizarUf(uf)
    if (ufNorm.length !== 2) return []
    return this.repository.listarCbenef(ufNorm, cst || undefined)
  }

  async importar(arquivo: File): Promise<ImportarCbenefResultadoDTO> {
    return this.repository.importarCbenef(arquivo)
  }
}
