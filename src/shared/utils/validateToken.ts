import jwt from 'jsonwebtoken'

/**
 * Interface para o payload do token JWT
 * Baseado na análise do código Flutter e comportamento do sistema
 */
export interface TokenPayload {
  sub?: string // User ID
  email?: string
  empresaId?: string
  iat?: number // Issued at
  exp?: number // Expiration
  [key: string]: unknown // Permite campos adicionais
}

/**
 * Resultado da validação do token
 */
export interface TokenValidationResult {
  valid: boolean
  payload?: TokenPayload
  error?: string
  expired?: boolean
}

/**
 * Decodifica um token JWT sem validar assinatura
 * Útil para extrair informações do token quando não temos a secret key
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    // Decodifica sem verificar assinatura (útil para desenvolvimento)
    // Em produção, devemos validar a assinatura com a secret key
    const decoded = jwt.decode(token, { complete: false })
    
    if (typeof decoded === 'object' && decoded !== null) {
      return decoded as TokenPayload
    }
    
    return null
  } catch (error) {
    console.error('Erro ao decodificar token:', error)
    return null
  }
}

/**
 * Valida um token JWT
 * Tenta validar assinatura se JWT_SECRET estiver configurado
 * Caso contrário, apenas verifica expiração e estrutura (modo desenvolvimento)
 */
export function validateToken(token: string, secret?: string): TokenValidationResult {
  try {
    // Tenta obter secret do ambiente se não fornecido
    const jwtSecret = secret || process.env.JWT_SECRET
    
    // Se temos secret key, valida assinatura
    if (jwtSecret) {
      try {
        const decoded = jwt.verify(token, jwtSecret) as TokenPayload
        
        return {
          valid: true,
          payload: decoded,
        }
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return {
            valid: false,
            expired: true,
            error: 'Token expirado',
          }
        }
        
        if (error instanceof jwt.JsonWebTokenError) {
          return {
            valid: false,
            error: 'Token inválido',
          }
        }
        
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Erro ao validar token',
        }
      }
    }
    
    // Sem secret key, apenas decodifica e verifica expiração
    const decoded = decodeToken(token)
    
    if (!decoded) {
      return {
        valid: false,
        error: 'Não foi possível decodificar o token',
      }
    }
    
    // Verifica expiração
    if (decoded.exp) {
      const expirationDate = new Date(decoded.exp * 1000) // exp está em segundos
      const now = new Date()
      
      if (expirationDate < now) {
        return {
          valid: false,
          expired: true,
          payload: decoded,
          error: 'Token expirado',
        }
      }
    }
    
    return {
      valid: true,
      payload: decoded,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao validar token',
    }
  }
}

/**
 * Extrai informações específicas do token
 */
export function extractTokenInfo(token: string): {
  userId?: string
  email?: string
  empresaId?: string
  expiresAt?: Date
} {
  const decoded = decodeToken(token)
  
  if (!decoded) {
    return {}
  }
  
  return {
    userId: decoded.sub,
    email: decoded.email,
    empresaId: decoded.empresaId,
    expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : undefined,
  }
}

/**
 * Verifica se um token está expirado
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  
  if (!decoded || !decoded.exp) {
    return true // Se não tem exp, considera expirado por segurança
  }
  
  const expirationDate = new Date(decoded.exp * 1000)
  const now = new Date()
  
  return expirationDate < now
}

