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
  indicadorInscricaoEstadual?: string
  inscricaoEstadual?: string
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
  /** null ou string vazia tratados no repositório conforme a API externa */
  razaoSocial?: string | null
  /** null limpa o valor na API (alinhado ao schema Zod e ao repositório) */
  cpf?: string | null
  cnpj?: string | null
  telefone?: string | null
  email?: string | null
  nomeFantasia?: string | null
  indicadorInscricaoEstadual?: string
  /** null limpa a IE na API */
  inscricaoEstadual?: string | null
  ativo?: boolean
  endereco?: {
    rua?: string | null
    numero?: string | null
    bairro?: string | null
    cidade?: string | null
    estado?: string | null
    cep?: string | null
    complemento?: string | null
    codigoCidadeIbge?: string | null
    codigoEstadoIbge?: string | null
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

