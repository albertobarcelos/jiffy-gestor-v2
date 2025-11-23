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

  static create(accessToken: string, user: User, expiresInHours: number = 24): Auth {
    if (!accessToken) {
      throw new Error('Token de acesso é obrigatório')
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

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

