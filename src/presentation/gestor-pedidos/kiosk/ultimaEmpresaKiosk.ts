import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'

/** Persiste no PC (localStorage). Não é token — só a última empresa do casco Windows. */
export const STORAGE_ULTIMA_EMPRESA_KIOSK = 'jiffy.flow.ultima-empresa'

export type UltimaEmpresaKiosk = {
  userId: string
  empresaId: string
  empParam: string
}

function storageLocal(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function lerUltimaEmpresaKiosk(): UltimaEmpresaKiosk | null {
  const storage = storageLocal()
  if (!storage) return null
  try {
    const raw = storage.getItem(STORAGE_ULTIMA_EMPRESA_KIOSK)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<UltimaEmpresaKiosk>
    if (
      typeof parsed.empresaId !== 'string' ||
      !parsed.empresaId ||
      typeof parsed.empParam !== 'string' ||
      !parsed.empParam
    ) {
      return null
    }
    return {
      userId: typeof parsed.userId === 'string' ? parsed.userId : '',
      empresaId: parsed.empresaId,
      empParam: parsed.empParam,
    }
  } catch {
    return null
  }
}

export function gravarUltimaEmpresaKiosk(input: UltimaEmpresaKiosk): void {
  const storage = storageLocal()
  if (!storage) return
  try {
    storage.setItem(STORAGE_ULTIMA_EMPRESA_KIOSK, JSON.stringify(input))
  } catch {
    /* quota / modo privado */
  }
}

/**
 * Última empresa deste utilizador, se ainda existir na lista; senão a primeira ativa.
 */
export function resolverEmpresaInicialKiosk(
  opcoes: readonly LoginEmpresaSnapshot[],
  userId: string | null
): LoginEmpresaSnapshot | null {
  if (opcoes.length === 0) return null
  const last = lerUltimaEmpresaKiosk()
  if (last && (!userId || !last.userId || last.userId === userId)) {
    const match = opcoes.find(e => e.id === last.empresaId)
    if (match) return match
  }
  return opcoes[0] ?? null
}
