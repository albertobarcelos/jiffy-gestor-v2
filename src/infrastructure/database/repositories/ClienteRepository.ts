import { IClienteRepository, BuscarClientesParams, CriarClienteDTO, AtualizarClienteDTO } from '@/src/domain/repositories/IClienteRepository'
import { Cliente } from '@/src/domain/entities/Cliente'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Implementação do repositório de clientes
 * Comunica com a API externa
 */
export class ClienteRepository implements IClienteRepository {
  private apiClient: ApiClient
  private token?: string

  constructor(apiClient?: ApiClient, token?: string) {
    this.apiClient = apiClient || new ApiClient()
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  async buscarClientes(params: BuscarClientesParams): Promise<{
    clientes: Cliente[]
    total: number
  }> {
    try {
      const { limit, offset, q = '', ativo } = params

      // Constrói a URL exatamente como no Flutter
      let url = `/api/v1/pessoas/clientes/?limit=${limit}&offset=${offset}`
      if (q) {
        url += `&q=${encodeURIComponent(q)}`
      }
      if (ativo !== null && ativo !== undefined) {
        url += `&ativo=${ativo}`
      }

      const response = await this.apiClient.request<{
        items: any[]
        count: number
      }>(url, {
        method: 'GET',
        headers: this.token
          ? {
              Authorization: `Bearer ${this.token}`,
            }
          : {},
      })

      const clientes = (response.data.items || []).map((item) =>
        Cliente.fromJSON(item)
      )

      return {
        clientes,
        total: response.data.count || 0,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao buscar clientes: ${error.message}`)
      }
      throw error
    }
  }

  async buscarClientePorId(id: string): Promise<Cliente | null> {
    try {
      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/clientes/${id}`,
        {
          method: 'GET',
          headers: this.token
            ? {
                Authorization: `Bearer ${this.token}`,
              }
            : {},
        }
      )

      if (!response.data) {
        return null
      }

      return Cliente.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          return null
        }
        throw new Error(`Erro ao buscar cliente: ${error.message}`)
      }
      throw error
    }
  }

  async criarCliente(data: CriarClienteDTO): Promise<Cliente> {
    try {
      const bodyMap: any = {
        nome: data.nome,
        razaoSocial: data.razaoSocial || '',
        cpf: data.cpf || '',
        cnpj: data.cnpj || '',
        telefone: data.telefone || '',
        email: data.email || '',
        nomeFantasia: data.nomeFantasia || '',
        ativo: data.ativo !== undefined ? data.ativo : true,
      }

      if (data.endereco) {
        bodyMap.endereco = {
          rua: data.endereco.rua || '',
          numero: data.endereco.numero || '',
          bairro: data.endereco.bairro || '',
          cidade: data.endereco.cidade || '',
          estado: data.endereco.estado || '',
          cep: data.endereco.cep || '',
          complemento: data.endereco.complemento || '',
        }
      }

      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/clientes`,
        {
          method: 'POST',
          headers: this.token
            ? {
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                accept: 'application/json',
              }
            : {
                'Content-Type': 'application/json',
                accept: 'application/json',
              },
          body: JSON.stringify(bodyMap),
        }
      )

      return Cliente.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao criar cliente: ${error.message}`)
      }
      throw error
    }
  }

  async atualizarCliente(id: string, data: AtualizarClienteDTO): Promise<Cliente> {
    try {
      const requestBody: any = {}

      if (data.nome) requestBody.nome = data.nome
      if (data.razaoSocial !== undefined) requestBody.razaoSocial = data.razaoSocial || ''
      
      // CPF e CNPJ: sempre envia (mesmo que vazio) para garantir atualização
      // IMPORTANTE: Envia da mesma forma que criarCliente para manter consistência
      // Se estiver presente no DTO, envia o valor; se não, envia string vazia
      requestBody.cpf = data.cpf !== undefined && data.cpf !== null ? data.cpf : ''
      requestBody.cnpj = data.cnpj !== undefined && data.cnpj !== null ? data.cnpj : ''
      
      if (data.telefone !== undefined) requestBody.telefone = data.telefone || ''
      if (data.email !== undefined) requestBody.email = data.email || ''
      if (data.nomeFantasia !== undefined) requestBody.nomeFantasia = data.nomeFantasia || ''
      if (data.ativo !== undefined) requestBody.ativo = data.ativo
      
      console.log('📤 Repository - Processamento CPF/CNPJ:', {
        id,
        cpfInData: data.cpf,
        cpfType: typeof data.cpf,
        cpfInObject: 'cpf' in data,
        cpfEnviado: requestBody.cpf,
        cpfEnviadoType: typeof requestBody.cpf,
        cnpjInData: data.cnpj,
        cnpjType: typeof data.cnpj,
        cnpjInObject: 'cnpj' in data,
        cnpjEnviado: requestBody.cnpj,
        requestBodyCompleto: JSON.stringify(requestBody, null, 2),
      })

      if (data.endereco) {
        requestBody.endereco = {
          rua: data.endereco.rua || '',
          numero: data.endereco.numero || '',
          bairro: data.endereco.bairro || '',
          cidade: data.endereco.cidade || '',
          estado: data.endereco.estado || '',
          cep: data.endereco.cep || '',
          complemento: data.endereco.complemento || '',
        }
      }

      // Log do body final que será enviado
      const bodyString = JSON.stringify(requestBody)
      console.log('📤 Repository - Body final sendo enviado para API externa:', {
        url: `/api/v1/pessoas/clientes/${id}`,
        method: 'PATCH',
        bodyString,
        cpfNoBodyString: bodyString.includes('"cpf"'),
        bodyParsed: JSON.parse(bodyString),
      })

      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/clientes/${id}`,
        {
          method: 'PATCH',
          headers: this.token
            ? {
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                accept: 'application/json',
              }
            : {
                'Content-Type': 'application/json',
                accept: 'application/json',
              },
          body: bodyString,
        }
      )

      console.log('📥 Repository - Resposta da API externa:', {
        status: response.status,
        cpfNaResposta: response.data?.cpf,
        dataCompleta: JSON.stringify(response.data, null, 2),
      })

      return Cliente.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao atualizar cliente: ${error.message}`)
      }
      throw error
    }
  }
}

