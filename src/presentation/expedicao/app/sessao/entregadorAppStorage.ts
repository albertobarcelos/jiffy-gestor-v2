import type { EntregadorIdentificado } from '@/src/presentation/expedicao/api/expedicaoApi'

const PREFIX = 'jiffy-expedicao-entregador-app'

function chave(empresaId: string): string {
  return `${PREFIX}:${empresaId}`
}

function parseEntregador(raw: string | null): EntregadorIdentificado | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as EntregadorIdentificado
    if (!parsed.id || !parsed.nome) return null
    return parsed
  } catch {
    return null
  }
}

export function lerEntregadorApp(empresaId: string | null | undefined): EntregadorIdentificado | null {
  if (typeof window === 'undefined') return null
  const id = empresaId?.trim()
  if (!id) return null
  const key = chave(id)
  try {
    const doLocal = parseEntregador(window.localStorage.getItem(key))
    if (doLocal) return doLocal
    const daSessao = parseEntregador(window.sessionStorage.getItem(key))
    if (!daSessao) return null
    gravarEntregadorApp(id, daSessao)
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      /* ignore */
    }
    return daSessao
  } catch {
    return null
  }
}

export function gravarEntregadorApp(
  empresaId: string | null | undefined,
  entregador: EntregadorIdentificado
): void {
  if (typeof window === 'undefined') return
  const id = empresaId?.trim()
  if (!id) return
  try {
    window.localStorage.setItem(chave(id), JSON.stringify(entregador))
  } catch {
    /* storage cheio */
  }
}

export function limparEntregadorApp(empresaId: string | null | undefined): void {
  if (typeof window === 'undefined') return
  const id = empresaId?.trim()
  if (!id) return
  const key = chave(id)
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
