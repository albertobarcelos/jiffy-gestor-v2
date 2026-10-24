export const STORAGE_ULTIMA_EMPRESA_APP = 'jiffy.expedicao.app.ultima-empresa'

export type UltimaEmpresaAppEntregador = {
  userId: string
  empresaId: string
  empresaNome: string
  empParam: string
  userEmail?: string
  userName?: string
}

export function parseUltimaEmpresaAppEntregador(
  raw: string | null | undefined
): UltimaEmpresaAppEntregador | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<UltimaEmpresaAppEntregador>
    if (
      typeof parsed.empresaId !== 'string' ||
      !parsed.empresaId.trim() ||
      typeof parsed.empresaNome !== 'string' ||
      !parsed.empresaNome.trim() ||
      typeof parsed.empParam !== 'string' ||
      !parsed.empParam.trim()
    ) {
      return null
    }
    const lida: UltimaEmpresaAppEntregador = {
      userId: typeof parsed.userId === 'string' ? parsed.userId : '',
      empresaId: parsed.empresaId.trim(),
      empresaNome: parsed.empresaNome.trim(),
      empParam: parsed.empParam.trim(),
    }
    if (typeof parsed.userEmail === 'string' && parsed.userEmail.trim()) {
      lida.userEmail = parsed.userEmail.trim()
    }
    if (typeof parsed.userName === 'string' && parsed.userName.trim()) {
      lida.userName = parsed.userName.trim()
    }
    return lida
  } catch {
    return null
  }
}

export function ultimaEmpresaCompativelComUsuarioApp(
  ultima: UltimaEmpresaAppEntregador | null,
  userIdAtual: string | null | undefined
): UltimaEmpresaAppEntregador | null {
  if (!ultima) return null
  const userId = userIdAtual?.trim() ?? ''
  if (userId && ultima.userId && ultima.userId !== userId) return null
  return ultima
}

export type DecisaoRestaurarSessaoEmpresaApp =
  | { tipo: 'ja-ativa' }
  | { tipo: 'restaurar'; ultima: UltimaEmpresaAppEntregador }
  | { tipo: 'escolher' }
  | { tipo: 'login' }

export function decidirRestaurarSessaoEmpresaApp(input: {
  tenantValido: boolean
  identityValida: boolean
  ultima: UltimaEmpresaAppEntregador | null
  userIdAtual: string | null | undefined
}): DecisaoRestaurarSessaoEmpresaApp {
  if (input.tenantValido) return { tipo: 'ja-ativa' }
  const ultima = ultimaEmpresaCompativelComUsuarioApp(input.ultima, input.userIdAtual)
  if (ultima) return { tipo: 'restaurar', ultima }
  if (input.identityValida) return { tipo: 'escolher' }
  return { tipo: 'login' }
}
