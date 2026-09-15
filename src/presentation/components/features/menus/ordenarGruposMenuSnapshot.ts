import type { MenuGrupoProduto } from '@/src/shared/types/menus'

export function ordemSnapshotCategoria(grupo: MenuGrupoProduto): number {
  const raw = grupo.ordem as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw)
    if (Number.isFinite(n)) return n
  }
  return Number.MAX_SAFE_INTEGER
}

/**
 * Categorias do cardápio na ordem do snapshot (`MenuGrupoProduto.ordem`).
 * Não usa `grupoBase.ordem` (cadastro).
 */
export function coletarGruposMenuPorSnapshot(
  pages: Array<{ items: MenuGrupoProduto[] }> | undefined
): MenuGrupoProduto[] {
  const map = new Map<string, MenuGrupoProduto>()
  for (const page of pages ?? []) {
    for (const grupo of page.items) {
      const key = grupo.grupoBase?.id || grupo.id
      const atual = map.get(key)
      if (!atual || ordemSnapshotCategoria(grupo) < ordemSnapshotCategoria(atual)) {
        map.set(key, grupo)
      }
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => ordemSnapshotCategoria(a) - ordemSnapshotCategoria(b)
  )
}
