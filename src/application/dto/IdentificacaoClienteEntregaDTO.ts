import type { MoradaTelefone } from '@/src/domain/types/moradaEntrega'

export interface ClienteEntregaIdentificadoDTO {
  id: string
  nome: string
}

export interface IdentificacaoClienteEntregaDTO {
  cliente: ClienteEntregaIdentificadoDTO | null
  moradas: MoradaTelefone[]
}
