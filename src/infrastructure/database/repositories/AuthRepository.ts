import { IAuthRepository } from '@/src/domain/repositories/IAuthRepository'
import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { decodeToken } from '@/src/shared/utils/validateToken'

type AuthFlow = 'legacy' | 'multi_empresa'

type ApiRecord = Record<string, unknown>

const LEGACY_LOGIN_ENDPOINT = '/api/v1/auth/login/usuario-gestor'
const MULTI_EMPRESA_LOGIN_ENDPOINT = '/api/v1/auth/login'
const MULTI_EMPRESA_ESCOLHER_EMPRESA_ENDPOINT = '/api/v1/auth/escolher-empresa'

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
}

function getByPath(source: unknown, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined
    return current[key]
  }, source)
}

function getFirstString(source: unknown, paths: string[][]): string | undefined {
  for (const path of paths) {
    const value = getString(getByPath(source, path))
    if (value) return value
  }

  return undefined
}

/**
 * Implementação do repositório de autenticação
 * Comunica com a API externa
 */
export class AuthRepository implements IAuthRepository {
  private apiClient: ApiClient

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient()
  }

  async login(username: string, password: string): Promise<Auth> {
    try {
      return this.getAuthFlow() === 'multi_empresa'
        ? await this.loginMultiEmpresa(username, password)
        : await this.loginLegacy(username, password)
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message || 'Erro ao realizar login')
      }
      throw error
    }
  }

  private getAuthFlow(): AuthFlow {
    const rawFlow = (process.env.AUTH_FLOW || process.env.NEXT_PUBLIC_AUTH_FLOW || 'legacy')
      .trim()
      .toLowerCase()

    return ['multi_empresa', 'multi-empresa', 'multiempresa', 'multi_company', 'new'].includes(rawFlow)
      ? 'multi_empresa'
      : 'legacy'
  }

  private async loginLegacy(username: string, password: string): Promise<Auth> {
    const response = await this.apiClient.post<ApiRecord>(LEGACY_LOGIN_ENDPOINT, {
      username,
      password,
    })

    return this.createAuthFromResponse(response.data, username)
  }

  private async loginMultiEmpresa(username: string, password: string): Promise<Auth> {
    const loginResponse = await this.apiClient.post<ApiRecord>(MULTI_EMPRESA_LOGIN_ENDPOINT, {
      username,
      password,
    })

    const loginData = loginResponse.data
    const identityToken = this.extractAccessToken(loginData)
    const empresaId = this.resolveEmpresaId(loginData)

    if (!empresaId) {
      if (identityToken) {
        return this.createAuthFromResponse(loginData, username, identityToken)
      }

      throw new Error('Empresa não encontrada na resposta de login')
    }

    const escolherEmpresaResponse = await this.apiClient.request<ApiRecord>(
      MULTI_EMPRESA_ESCOLHER_EMPRESA_ENDPOINT,
      {
        method: 'POST',
        headers: identityToken
          ? {
              Authorization: `Bearer ${identityToken}`,
            }
          : undefined,
        body: JSON.stringify({ empresaId }),
      }
    )

    const escolherEmpresaData = escolherEmpresaResponse.data
    const accessToken = this.extractAccessToken(escolherEmpresaData) || identityToken

    if (!accessToken) {
      throw new Error('Token de acesso não recebido ao escolher empresa')
    }

    return this.createAuthFromResponse(
      this.mergeAuthResponses(loginData, escolherEmpresaData),
      username,
      accessToken
    )
  }

  private createAuthFromResponse(data: unknown, username: string, tokenOverride?: string): Auth {
    const accessToken = tokenOverride || this.extractAccessToken(data)

    if (!accessToken) {
      throw new Error('Token de acesso não recebido')
    }

    const decoded = decodeToken(accessToken)
    const expiresAt = this.resolveExpiresAt(data, decoded?.exp)
    const userEntity = this.createUser(data, username, decoded)

    return Auth.createWithExpiration(accessToken, userEntity, expiresAt)
  }

  private extractAccessToken(data: unknown): string | undefined {
    return getFirstString(data, [
      ['accessToken'],
      ['access_token'],
      ['identityToken'],
      ['identity_token'],
      ['token'],
      ['jwt'],
      ['bearerToken'],
      ['data', 'accessToken'],
      ['data', 'access_token'],
      ['data', 'identityToken'],
      ['data', 'identity_token'],
      ['data', 'token'],
      ['data', 'jwt'],
      ['auth', 'accessToken'],
      ['auth', 'token'],
      ['session', 'accessToken'],
      ['session', 'token'],
    ])
  }

  private resolveEmpresaId(data: unknown): string | undefined {
    const configuredEmpresaId = getString(
      process.env.AUTH_EMPRESA_ID || process.env.AUTH_COMPANY_ID || process.env.NEXT_PUBLIC_AUTH_EMPRESA_ID
    )
    const companies = this.extractCompanies(data)

    if (configuredEmpresaId) {
      return configuredEmpresaId
    }

    const explicitEmpresaId = getFirstString(data, [
      ['empresaId'],
      ['companyId'],
      ['tenantId'],
      ['data', 'empresaId'],
      ['data', 'companyId'],
      ['data', 'tenantId'],
      ['empresa', 'id'],
      ['company', 'id'],
      ['tenant', 'id'],
      ['data', 'empresa', 'id'],
      ['data', 'company', 'id'],
      ['data', 'tenant', 'id'],
    ])
    if (explicitEmpresaId) return explicitEmpresaId

    const preferredCompany = companies.find(company => {
      const markers = [
        company.default,
        company.padrao,
        company.principal,
        company.selected,
        company.selecionada,
        company.atual,
      ]
      return markers.some(Boolean)
    })

    if (preferredCompany) return this.getCompanyId(preferredCompany)

    if (companies.length === 1) return this.getCompanyId(companies[0])

    if (companies.length > 1) {
      console.warn(
        '[AuthRepository] Login multiempresa retornou várias empresas sem padrão. ' +
          'Usando a primeira empresa disponível. Configure AUTH_EMPRESA_ID para fixar uma empresa.'
      )
      return this.getCompanyId(companies[0])
    }

    return undefined
  }

  private extractCompanies(data: unknown): ApiRecord[] {
    const candidates = [
      getByPath(data, ['empresas']),
      getByPath(data, ['companies']),
      getByPath(data, ['tenants']),
      getByPath(data, ['data', 'empresas']),
      getByPath(data, ['data', 'companies']),
      getByPath(data, ['data', 'tenants']),
      getByPath(data, ['usuario', 'empresas']),
      getByPath(data, ['user', 'empresas']),
      getByPath(data, ['data', 'usuario', 'empresas']),
      getByPath(data, ['data', 'user', 'empresas']),
    ]

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(isRecord)
      }
    }

    return []
  }

  private getCompanyId(company: ApiRecord): string | undefined {
    return getFirstString(company, [
      ['id'],
      ['empresaId'],
      ['companyId'],
      ['tenantId'],
      ['empresa', 'id'],
      ['company', 'id'],
      ['tenant', 'id'],
    ])
  }

  private resolveExpiresAt(data: unknown, tokenExp?: number): Date {
    if (tokenExp) {
      return new Date(tokenExp * 1000)
    }

    const expiresAtRaw = getFirstString(data, [
      ['expiresAt'],
      ['expires_at'],
      ['expiration'],
      ['data', 'expiresAt'],
      ['data', 'expires_at'],
      ['session', 'expiresAt'],
    ])
    if (expiresAtRaw) {
      const expiresAt = new Date(expiresAtRaw)
      if (!Number.isNaN(expiresAt.getTime())) return expiresAt
    }

    const expiresIn = getByPath(data, ['expiresIn']) || getByPath(data, ['data', 'expiresIn'])
    const expiresInSeconds =
      typeof expiresIn === 'number'
        ? expiresIn
        : typeof expiresIn === 'string'
          ? Number(expiresIn)
          : undefined

    const fallback = new Date()
    fallback.setSeconds(
      fallback.getSeconds() + (expiresInSeconds && Number.isFinite(expiresInSeconds) ? expiresInSeconds : 86400)
    )
    return fallback
  }

  private createUser(
    data: unknown,
    username: string,
    decoded: ReturnType<typeof decodeToken>
  ): User {
    const userId =
      getFirstString(data, [
        ['user', 'id'],
        ['usuario', 'id'],
        ['data', 'user', 'id'],
        ['data', 'usuario', 'id'],
        ['userId'],
        ['usuarioId'],
        ['data', 'userId'],
        ['data', 'usuarioId'],
      ]) ||
      getString(decoded?.userId) ||
      getString(decoded?.sub) ||
      'unknown'

    const email =
      getFirstString(data, [
        ['user', 'email'],
        ['usuario', 'email'],
        ['data', 'user', 'email'],
        ['data', 'usuario', 'email'],
        ['email'],
        ['data', 'email'],
      ]) ||
      getString(decoded?.email) ||
      (this.isValidEmail(username) ? username : `${userId}@jiffy.local`)

    const name =
      getFirstString(data, [
        ['user', 'name'],
        ['user', 'nome'],
        ['user', 'nomeCompleto'],
        ['usuario', 'name'],
        ['usuario', 'nome'],
        ['usuario', 'nomeCompleto'],
        ['data', 'user', 'name'],
        ['data', 'user', 'nome'],
        ['data', 'usuario', 'name'],
        ['data', 'usuario', 'nome'],
        ['name'],
        ['nome'],
      ]) || getString(decoded?.name)

    return User.create(userId, email, name || undefined)
  }

  private mergeAuthResponses(loginData: unknown, escolherEmpresaData: unknown): ApiRecord {
    return {
      ...(isRecord(loginData) ? loginData : {}),
      ...(isRecord(escolherEmpresaData) ? escolherEmpresaData : {}),
      data: {
        ...(isRecord(getByPath(loginData, ['data'])) ? (getByPath(loginData, ['data']) as ApiRecord) : {}),
        ...(isRecord(getByPath(escolherEmpresaData, ['data']))
          ? (getByPath(escolherEmpresaData, ['data']) as ApiRecord)
          : {}),
      },
    }
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }
}

