import type { EntregadorIdentificado } from '@/src/presentation/expedicao/api/expedicaoApi'

const PREFIX = 'jiffy-expedicao-entregador-app'

function chave(empresaId: string): string {
  return `${PREFIX}:${empresaId}`
}

export function lerEntregadorApp(empresaId: string | null | undefined): EntregadorIdentificado | null {
  if (typeof window === 'undefined') return null
  const id = empresaId?.trim()
  if (!id) return null
  try {
    const raw = window.sessionStorage.getItem(chave(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as EntregadorIdentificado
    if (!parsed.id || !parsed.nome) return null
    return parsed
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
    window.sessionStorage.setItem(chave(id), JSON.stringify(entregador))
  } catch {
    /* storage cheio */
  }
}

export function limparEntregadorApp(empresaId: string | null | undefined): void {
  if (typeof window === 'undefined') return
  const id = empresaId?.trim()
  if (!id) return
  try {
    window.sessionStorage.removeItem(chave(id))
  } catch {
    /* ignore */
  }
}
