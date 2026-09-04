import { User } from './User'

/**
 * Entidade de domínio representando uma sessão de autenticação
 */
export class Auth {
  private constructor(
    private readonly accessToken: string,
    private readonly user: User,
    private readonly expiresAt: Date
  ) {}

  /**
   * Cria uma instância de Auth calculando expiração baseada em horas
   * @deprecated Prefira usar createWithExpiration para usar exp do token JWT
   */
  static create(accessToken: string, user: User, expiresInHours: number = 24): Auth {
    if (!accessToken) {
      throw new Error('Token de acesso é obrigatório')
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

    return new Auth(accessToken, user, expiresAt)
  }

  /**
   * Cria uma instância de Auth com data de expiração específica
   * Recomendado para usar a expiração real do token JWT (campo exp)
   */
  static createWithExpiration(accessToken: string, user: User, expiresAt: Date): Auth {
    if (!accessToken) {
      throw new Error('Token de acesso é obrigatório')
    }

    if (!expiresAt || isNaN(expiresAt.getTime())) {
      throw new Error('Data de expiração inválida')
    }

    return new Auth(accessToken, user, expiresAt)
  }

  getAccessToken(): string {
    return this.accessToken
  }

  getUser(): User {
    return this.user
  }

  getExpiresAt(): Date {
    return this.expiresAt
  }

  isExpired(): boolean {
    return new Date() >= this.expiresAt
  }

  toJSON() {
    return {
      accessToken: this.accessToken,
      user: this.user.toJSON(),
      expiresAt: this.expiresAt.toISOString(),
    }
  }
}

