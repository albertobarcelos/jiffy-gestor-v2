import { IPerfilUsuarioRepository, BuscarPerfisUsuariosParams, CriarPerfilUsuarioDTO, AtualizarPerfilUsuarioDTO } from '@/src/domain/repositories/IPerfilUsuarioRepository'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Implementação do repositório de perfis de usuários
 * Comunica com a API externa
 */
export class PerfilUsuarioRepository implements IPerfilUsuarioRepository {
  private apiClient: ApiClient
  private token?: string

  constructor(apiClient?: ApiClient, token?: string) {
    this.apiClient = apiClient || new ApiClient()
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  async buscarPerfisUsuarios(params: BuscarPerfisUsuariosParams): Promise<{
    perfis: PerfilUsuario[]
    total: number
  }> {
    try {
      const { limit, offset, q = '', ativo } = params

      let url = `/api/v1/pessoas/perfis-pdv?limit=${limit}&offset=${offset}`
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

      const perfis = (response.data.items || []).map((item) =>
        PerfilUsuario.fromJSON(item)
      )

      return {
        perfis,
        total: response.data.count || 0,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao buscar perfis de usuários: ${error.message}`)
      }
      throw error
    }
  }

  async buscarPerfilUsuarioPorId(id: string): Promise<PerfilUsuario | null> {
    try {
      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/perfis-pdv/${id}`,
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

      return PerfilUsuario.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          return null
        }
        throw new Error(`Erro ao buscar perfil de usuário: ${error.message}`)
      }
      throw error
    }
  }

  async criarPerfilUsuario(data: CriarPerfilUsuarioDTO): Promise<PerfilUsuario> {
    try {
      const body = {
        role: data.role,
        acessoMeiosPagamento: data.acessoMeiosPagamento || [],
        cancelarVenda: data.cancelarVenda !== undefined ? data.cancelarVenda : false,
        cancelarProduto: data.cancelarProduto !== undefined ? data.cancelarProduto : false,
        aplicarDescontoProduto: data.aplicarDescontoProduto !== undefined ? data.aplicarDescontoProduto : false,
        aplicarDescontoVenda: data.aplicarDescontoVenda !== undefined ? data.aplicarDescontoVenda : false,
        aplicarAcrescimoProduto: data.aplicarAcrescimoProduto !== undefined ? data.aplicarAcrescimoProduto : false,
        aplicarAcrescimoVenda: data.aplicarAcrescimoVenda !== undefined ? data.aplicarAcrescimoVenda : false,
        removerProdutoLancado: data.removerProdutoLancado !== undefined ? data.removerProdutoLancado : false,
        removerPagamento: data.removerPagamento !== undefined ? data.removerPagamento : false,
        reimprimir: data.reimprimir !== undefined ? data.reimprimir : false,
        acessoVisaoGeral: data.acessoVisaoGeral !== undefined ? data.acessoVisaoGeral : false,
        acessoHistorico: data.acessoHistorico !== undefined ? data.acessoHistorico : false,
        acessoMesa: data.acessoMesa !== undefined ? data.acessoMesa : false,
        acessoBalcao: data.acessoBalcao !== undefined ? data.acessoBalcao : false,
        acessoConfiguracoes: data.acessoConfiguracoes !== undefined ? data.acessoConfiguracoes : false,
        crudCardapio: data.crudCardapio !== undefined ? data.crudCardapio : false,
        crudUsuario: data.crudUsuario !== undefined ? data.crudUsuario : false,
        crudCliente: data.crudCliente !== undefined ? data.crudCliente : false,
        encerrarCaixa: data.encerrarCaixa !== undefined ? data.encerrarCaixa : false,
        lancarTaxa: data.lancarTaxa !== undefined ? data.lancarTaxa : false,
        removerTaxa: data.removerTaxa !== undefined ? data.removerTaxa : false,
        removerLicenca: data.removerLicenca !== undefined ? data.removerLicenca : false,
      }

      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/perfis-pdv`,
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
          body: JSON.stringify(body),
        }
      )

      return PerfilUsuario.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao criar perfil de usuário: ${error.message}`)
      }
      throw error
    }
  }

  async atualizarPerfilUsuario(id: string, data: AtualizarPerfilUsuarioDTO): Promise<PerfilUsuario> {
    try {
      const requestBody: any = {}

      if (data.role) requestBody.role = data.role
      // Sempre inclui acessoMeiosPagamento se estiver definido, mesmo que seja array vazio
      // Isso garante que arrays vazios sejam enviados explicitamente para limpar os meios de pagamento
      if (data.acessoMeiosPagamento !== undefined) {
        requestBody.acessoMeiosPagamento = Array.isArray(data.acessoMeiosPagamento) 
          ? data.acessoMeiosPagamento 
          : []
      }
      if (data.cancelarVenda !== undefined) requestBody.cancelarVenda = data.cancelarVenda
      if (data.cancelarProduto !== undefined) requestBody.cancelarProduto = data.cancelarProduto
      if (data.aplicarDescontoProduto !== undefined) requestBody.aplicarDescontoProduto = data.aplicarDescontoProduto
      if (data.aplicarDescontoVenda !== undefined) requestBody.aplicarDescontoVenda = data.aplicarDescontoVenda
      if (data.aplicarAcrescimoProduto !== undefined) requestBody.aplicarAcrescimoProduto = data.aplicarAcrescimoProduto
      if (data.aplicarAcrescimoVenda !== undefined) requestBody.aplicarAcrescimoVenda = data.aplicarAcrescimoVenda
      if (data.removerProdutoLancado !== undefined) requestBody.removerProdutoLancado = data.removerProdutoLancado
      if (data.removerPagamento !== undefined) requestBody.removerPagamento = data.removerPagamento
      if (data.reimprimir !== undefined) requestBody.reimprimir = data.reimprimir
      if (data.acessoVisaoGeral !== undefined) requestBody.acessoVisaoGeral = data.acessoVisaoGeral
      if (data.acessoHistorico !== undefined) requestBody.acessoHistorico = data.acessoHistorico
      if (data.acessoMesa !== undefined) requestBody.acessoMesa = data.acessoMesa
      if (data.acessoBalcao !== undefined) requestBody.acessoBalcao = data.acessoBalcao
      if (data.acessoConfiguracoes !== undefined) requestBody.acessoConfiguracoes = data.acessoConfiguracoes
      if (data.crudCardapio !== undefined) requestBody.crudCardapio = data.crudCardapio
      if (data.crudUsuario !== undefined) requestBody.crudUsuario = data.crudUsuario
      if (data.crudCliente !== undefined) requestBody.crudCliente = data.crudCliente
      if (data.encerrarCaixa !== undefined) requestBody.encerrarCaixa = data.encerrarCaixa
      if (data.lancarTaxa !== undefined) requestBody.lancarTaxa = data.lancarTaxa
      if (data.removerTaxa !== undefined) requestBody.removerTaxa = data.removerTaxa
      if (data.removerLicenca !== undefined) requestBody.removerLicenca = data.removerLicenca

      // Log para debug
      console.log('📤 [PerfilUsuarioRepository] Enviando para API externa:', {
        id,
        requestBody,
        acessoMeiosPagamento: requestBody.acessoMeiosPagamento,
        acessoMeiosPagamentoIsArray: Array.isArray(requestBody.acessoMeiosPagamento),
        acessoMeiosPagamentoLength: Array.isArray(requestBody.acessoMeiosPagamento) ? requestBody.acessoMeiosPagamento.length : 'N/A',
      })

      const response = await this.apiClient.request<any>(
        `/api/v1/pessoas/perfis-pdv/${id}`,
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
          body: JSON.stringify(requestBody),
        }
      )

      // Log da resposta
      console.log('📥 [PerfilUsuarioRepository] Resposta da API externa:', {
        responseData: response.data,
        acessoMeiosPagamento: response.data?.acessoMeiosPagamento || [],
        acessoMeiosPagamentoLength: (response.data?.acessoMeiosPagamento || []).length,
      })

      return PerfilUsuario.fromJSON(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao atualizar perfil de usuário: ${error.message}`)
      }
      throw error
    }
  }

  async deletarPerfilUsuario(id: string): Promise<void> {
    try {
      await this.apiClient.request(
        `/api/v1/pessoas/perfis-pdv/${id}`,
        {
          method: 'DELETE',
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
        }
      )
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Erro ao deletar perfil de usuário: ${error.message}`)
      }
      throw error
    }
  }
}

