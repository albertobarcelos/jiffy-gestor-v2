/**
 * Cliente HTTP para comunicação com APIs externas
 */
export class ApiClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || ''
  }

  /**
   * Verifica se estamos em modo de build
   */
  private isBuildTime(): boolean {
    // Durante o build do Next.js, não devemos fazer requisições HTTP
    // Verifica várias condições que indicam que estamos em modo de build
    if (typeof window !== 'undefined') {
      return false // Estamos no cliente, não é build
    }

    // Verifica se estamos em uma fase de build do Next.js
    const nextPhase = process.env.NEXT_PHASE
    if (nextPhase && (
      nextPhase.includes('build') || 
      nextPhase.includes('export') ||
      nextPhase === 'phase-production-build' ||
      nextPhase === 'phase-development-build'
    )) {
      return true
    }

    // Verifica se estamos executando next build
    const nodeEnv = process.env.NODE_ENV
    const isProductionBuild = (nodeEnv === 'production' && 
                             process.argv.includes('build')) ||
                             process.argv.some(arg => arg.includes('next') && arg.includes('build'))

    return isProductionBuild
  }

  /**
   * Realiza uma requisição HTTP
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; status: number }> {
    // Se não houver baseUrl configurada, lança erro (mas não durante build)
    if (!this.baseUrl && !this.isBuildTime()) {
      throw new Error('NEXT_PUBLIC_EXTERNAL_API_BASE_URL não está configurada')
    }

    // Durante o build, não faz requisições reais
    if (this.isBuildTime()) {
      // Retorna uma resposta mockada durante o build para evitar erros
      // Isso permite que o código seja analisado sem fazer conexões reais
      return {
        data: {} as T,
        status: 200,
      }
    }

    const url = `${this.baseUrl}${endpoint}`

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      const errorData = errorBody ? JSON.parse(errorBody) : {}
      throw new ApiError(
        errorData.message || 'Erro na requisição',
        response.status,
        errorData
      )
    }

    const raw = await response.text()
    const data = raw ? (JSON.parse(raw) as T) : ({} as T)
    return { data, status: response.status }
  }

  /**
   * Realiza uma requisição POST
   */
  async post<T>(endpoint: string, body: unknown): Promise<{ data: T; status: number }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }
}

/**
 * Classe de erro customizada para erros de API
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

