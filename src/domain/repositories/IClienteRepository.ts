import { Cliente } from '../entities/Cliente'

export interface BuscarClientesParams {
  limit: number
  offset: number
  q?: string
  ativo?: boolean | null
}

export interface CriarClienteDTO {
  nome: string
  razaoSocial?: string
  cpf?: string
  cnpj?: string
  telefone?: string
  email?: string
  nomeFantasia?: string
  ativo?: boolean
  endereco?: {
    rua?: string
    numero?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
    complemento?: string
  }
}

export interface AtualizarClienteDTO {
  nome?: string
  razaoSocial?: string
  cpf?: string
  cnpj?: string
  telefone?: string
  email?: string
  nomeFantasia?: string
  ativo?: boolean
  endereco?: {
    rua?: string
    numero?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
    complemento?: string
  }
}

/**
 * Interface do repositório de clientes
 */
export interface IClienteRepository {
  buscarClientes(params: BuscarClientesParams): Promise<{
    clientes: Cliente[]
    total: number
  }>
  buscarClientePorId(id: string): Promise<Cliente | null>
  criarCliente(data: CriarClienteDTO): Promise<Cliente>
  atualizarCliente(id: string, data: AtualizarClienteDTO): Promise<Cliente>
}

