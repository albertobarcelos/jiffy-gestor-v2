import {
  normalizarTipoImpactoPreco,
  type ComplementoCompleto,
  type ComplementoNoGrupo,
  type ComplementoUsoNoMenu,
} from '@/src/domain/complemento/tipos'

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function texto(value: unknown): string {
  return value != null ? String(value).trim() : ''
}

function booleano(value: unknown, padrao: boolean): boolean {
  if (value === true || value === 'true' || value === 1 || value === '1') return true
  if (value === false || value === 'false' || value === 0 || value === '0') return false
  return padrao
}

function numero(value: unknown, padrao: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return padrao
}

function nomeId(value: unknown, nomePadrao: string): { id: string; nome: string; ativo: boolean } {
  const rec = asRecord(value)
  return {
    id: texto(rec.id),
    nome: texto(rec.nome) || nomePadrao,
    ativo: booleano(rec.ativo, true),
  }
}

function mapUso(raw: unknown): ComplementoUsoNoMenu | null {
  const rec = asRecord(raw)
  const menuProdutoId = texto(rec.menuProdutoId)
  const menu = nomeId(rec.menu, 'Cardápio')
  const produto = nomeId(rec.produto, 'Produto')
  const grupoProduto = nomeId(rec.grupoProduto, 'Categoria')
  const grupoComplementos = nomeId(rec.grupoComplementos, 'Grupo')
  if (!menuProdutoId || !menu.id || !produto.id || !grupoComplementos.id) return null

  const config = asRecord(rec.complementoConfig)
  return {
    menuProdutoId,
    menu: { id: menu.id, nome: menu.nome, ativo: menu.ativo },
    produto: { id: produto.id, nome: produto.nome, ativo: produto.ativo },
    grupoProduto: { id: grupoProduto.id, nome: grupoProduto.nome },
    grupoComplementos: { id: grupoComplementos.id, nome: grupoComplementos.nome },
    complementoConfig: {
      ordem: numero(config.ordem, 1),
      valor: numero(config.valor, 0),
      ativo: booleano(config.ativo, true),
    },
  }
}

function mapGrupo(raw: unknown): ComplementoNoGrupo | null {
  const rec = asRecord(raw)
  const id = texto(rec.id)
  if (!id) return null
  return {
    id,
    nome: texto(rec.nome) || 'Grupo',
    tipoImpactoPreco: normalizarTipoImpactoPreco(rec.tipoImpactoPreco),
  }
}

/** JSON de `GET complemento?retorno=completo` para a projeção de domínio. */
export function mapComplementoCompletoFromApi(payload: unknown): ComplementoCompleto | null {
  const root = asRecord(payload)
  const nested = asRecord(root.data)
  const body =
    texto(nested.id) || Array.isArray(nested.vinculos) || Array.isArray(nested.grupos)
      ? nested
      : root

  const id = texto(body.id)
  if (!id) return null

  const vinculos = Array.isArray(body.vinculos)
    ? body.vinculos
        .map(mapUso)
        .filter((item): item is ComplementoUsoNoMenu => item != null)
    : []
  const grupos = Array.isArray(body.grupos)
    ? body.grupos.map(mapGrupo).filter((item): item is ComplementoNoGrupo => item != null)
    : []

  return {
    id,
    nome: texto(body.nome) || 'Complemento',
    vinculos,
    grupos,
  }
}
