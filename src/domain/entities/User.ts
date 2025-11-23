/**
 * Entidade de domínio representando um Usuário
 */
export class User {
  private constructor(
    private readonly id: string,
    private readonly email: string,
    private readonly name?: string
  ) {}

  static create(id: string, email: string, name?: string): User {
    if (!id || !email) {
      throw new Error('ID e email são obrigatórios')
    }

    if (!this.isValidEmail(email)) {
      throw new Error('Email inválido')
    }

    return new User(id, email, name)
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  getId(): string {
    return this.id
  }

  getEmail(): string {
    return this.email
  }

  getName(): string | undefined {
    return this.name
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
    }
  }
}

