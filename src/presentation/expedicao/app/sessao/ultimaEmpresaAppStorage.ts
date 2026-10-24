import {
  parseUltimaEmpresaAppEntregador,
  STORAGE_ULTIMA_EMPRESA_APP,
  type UltimaEmpresaAppEntregador,
} from '@/src/application/expedicao/app/ultimaEmpresaAppEntregador'

function storageLocal(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function lerUltimaEmpresaApp(): UltimaEmpresaAppEntregador | null {
  const storage = storageLocal()
  if (!storage) return null
  try {
    return parseUltimaEmpresaAppEntregador(storage.getItem(STORAGE_ULTIMA_EMPRESA_APP))
  } catch {
    return null
  }
}

export function gravarUltimaEmpresaApp(input: UltimaEmpresaAppEntregador): void {
  const storage = storageLocal()
  if (!storage) return
  try {
    storage.setItem(STORAGE_ULTIMA_EMPRESA_APP, JSON.stringify(input))
  } catch {
    /* quota / modo privado */
  }
}

export function limparUltimaEmpresaApp(): void {
  const storage = storageLocal()
  if (!storage) return
  try {
    storage.removeItem(STORAGE_ULTIMA_EMPRESA_APP)
  } catch {
    /* ignore */
  }
}
