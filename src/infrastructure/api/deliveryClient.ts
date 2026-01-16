import { ApiError } from './apiClient'

/**
 * Cliente HTTP específico para a API de Delivery
 * Utiliza autenticação com Bearer token e integrador-token
 */
export class DeliveryClient {
  private baseUrl: string
  private token?: string
  private integradorToken?: string

  constructor(
    baseUrl?: string,
    token?: string,
    integradorToken?: string
  ) {
    // A API Delivery usa um host diferente, pode ser configurado via env
    this.baseUrl =
      baseUrl ||
      process.env.NEXT_PUBLIC_DELIVERY_API_BASE_URL ||
      'https://api.{{host}}'
    this.token = token
    this.integradorToken = integradorToken
  }

  /**
   * Define o token de autenticação
   */
  setToken(token: string) {
    this.token = token
  }

  /**
   * Define o token do integrador
   */
  setIntegradorToken(token: string) {
    this.integradorToken = token
  }

  /**
   * Realiza uma requisição HTTP
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; status: number }> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    // Adiciona Bearer token se disponível
    // Nota: A API Delivery usa "Bearer" como nome do header (não "Authorization: Bearer")
    if (this.token) {
      headers['Bearer'] = this.token
    }

    // Adiciona integrador-token se disponível
    if (this.integradorToken) {
      headers['integrador-token'] = this.integradorToken
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })

    // Tratamento de erros específicos da API Delivery
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // Mapeia códigos de erro conhecidos
      let errorMessage = 'Erro na requisição'
      switch (response.status) {
        case 400:
          errorMessage = 'Erro nas informações enviadas'
          break
        case 401:
          errorMessage = 'Autenticação falhou'
          break
        case 429:
          errorMessage = 'Limite de requisições excedido'
          break
        default:
          errorMessage = errorData.message || errorMessage
      }

      throw new DeliveryApiError(errorMessage, response.status, errorData)
    }

    const data = await response.json()
    return { data, status: response.status }
  }

  /**
   * Realiza uma requisição GET
   */
  async get<T>(endpoint: string): Promise<{ data: T; status: number }> {
    return this.request<T>(endpoint, {
      method: 'GET',
    })
  }

  /**
   * Realiza uma requisição POST
   */
  async post<T>(
    endpoint: string,
    body?: unknown
  ): Promise<{ data: T; status: number }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }
}

/**
 * Classe de erro customizada para erros da API Delivery
 */
export class DeliveryApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'DeliveryApiError'
  }
}

