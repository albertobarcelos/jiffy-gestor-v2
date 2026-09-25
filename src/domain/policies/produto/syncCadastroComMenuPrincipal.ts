/**
 * Ponte temporária: cadastro base ↔ menu principal.
 *
 * Por quê: máquinas em produção ainda leem o produto base (versão sem menu).
 *
 * - Editar o cadastro → atualiza só o menu principal (sem pergunta, sem outros menus).
 * - Editar o menu principal → atualiza o cadastro e pergunta se replica aos outros.
 *
 * Para desligar depois (grep: TEMP_SYNC_CADASTRO_MENU_PRINCIPAL):
 * 1. `SYNC_CADASTRO_COM_MENU_PRINCIPAL = false`
 * 2. Apagar este módulo, o ADR e os imports.
 */
export const SYNC_CADASTRO_COM_MENU_PRINCIPAL = true

export type OrigemSyncCadastroMenu = 'cadastroBase' | 'menu'
export type VarianteSyncCadastroMenu =
  | 'dados'
  | 'imagem'
  | 'vinculoMenus'
  | 'statusAtivo'

export type DestinosSyncCadastroMenu = {
  aplicarNoCadastroBase: boolean
  menuIds: string[]
}

function idsUnicos(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(Boolean))]
}

function syncAtivo(override?: boolean): boolean {
  return override ?? SYNC_CADASTRO_COM_MENU_PRINCIPAL
}

export function syncCadastroComMenuPrincipalAtivo(): boolean {
  return SYNC_CADASTRO_COM_MENU_PRINCIPAL
}

export function idMenuPrincipalDeLista(
  menus: ReadonlyArray<{ id: string; tipo?: string | null }>
): string | null {
  const comTipoPrincipal = menus.find(menu => menu.tipo === 'principal')
  if (comTipoPrincipal?.id) return comTipoPrincipal.id
  if (menus.length === 1 && menus[0]?.id) return menus[0].id
  return null
}

export function ehMenuPrincipal(
  menuId: string | null | undefined,
  principalId: string | null | undefined
): boolean {
  if (!menuId || !principalId) return false
  return menuId === principalId
}

/**
 * Destinos do snapshot após salvar o cadastro.
 * Edição: só os menus da política (principal, sem pergunta).
 * Criação: os menus do POST (principal já entra) — o backend vincula, mas o valor/nome
 * do snapshot precisa ser gravado de propósito.
 */
export function menuIdsParaEspelharAposSalvarCadastro(input: {
  isEdit: boolean
  destinosEdicao: readonly string[]
  menuIdsCriacao: readonly string[]
}): string[] {
  const daEdicao = idsUnicos(input.destinosEdicao)
  if (daEdicao.length > 0) return daEdicao
  if (input.isEdit) return []
  return idsUnicos(input.menuIdsCriacao)
}

/** Criação/cópia: o produto sempre entra no menu principal. */
export function garantirMenuPrincipalNosIds(
  menuIds: readonly string[],
  principalId: string | null | undefined,
  overrideSync?: boolean
): string[] {
  const ids = idsUnicos(menuIds)
  if (!syncAtivo(overrideSync) || !principalId) return ids
  return idsUnicos([principalId, ...ids])
}

/**
 * Descarta ids que não existem mais na empresa (vínculo stale na lista/cache).
 * Evita o POST de criação/cópia falhar em `ensureMenusExist`.
 */
export function filtrarMenuIdsExistentesNaEmpresa(
  candidatos: readonly string[],
  menusEmpresa: ReadonlyArray<{ id: string }>
): string[] {
  const existentes = new Set(
    menusEmpresa.map(menu => menu.id?.trim()).filter((id): id is string => Boolean(id))
  )
  if (existentes.size === 0) return []
  return idsUnicos(candidatos).filter(id => existentes.has(id))
}

/** Seed da aba Menus na cópia: só menus ainda existentes + principal. */
export function menuIdsParaSeedCopiaProduto(input: {
  candidatosDoProduto: readonly string[]
  menusEmpresa: ReadonlyArray<{ id: string }>
  principalId: string | null | undefined
}): string[] {
  return menuIdsProntosParaCriacaoProduto({
    candidatos: input.candidatosDoProduto,
    menusEmpresa: input.menusEmpresa,
    principalId: input.principalId,
  })
}

/** Criação/cópia: filtra órfãos e garante o principal (se existir na empresa) antes do POST. */
export function menuIdsProntosParaCriacaoProduto(input: {
  candidatos: readonly string[]
  menusEmpresa: ReadonlyArray<{ id: string }>
  principalId: string | null | undefined
}): string[] {
  const validos = filtrarMenuIdsExistentesNaEmpresa(input.candidatos, input.menusEmpresa)

  // Lista da empresa indisponível: mantém o comportamento anterior (principal + candidatos).
  if (input.menusEmpresa.length === 0) {
    return garantirMenuPrincipalNosIds(input.candidatos, input.principalId)
  }

  const principalExiste =
    Boolean(input.principalId) &&
    input.menusEmpresa.some(menu => menu.id === input.principalId)

  return garantirMenuPrincipalNosIds(
    validos,
    principalExiste ? input.principalId : null
  )
}

/** IDs que não podem ser desmarcados (principal + extras, ex.: menu de origem). */
export function idsMenuPrincipalTravados(
  principalId: string | null | undefined,
  extras: readonly string[] = [],
  overrideSync?: boolean
): string[] {
  const locked = extras.filter(Boolean)
  if (!syncAtivo(overrideSync) || !principalId) return idsUnicos(locked)
  return idsUnicos([principalId, ...locked])
}

export function podeDesvincularProdutoDoMenu(
  tipoMenu: string | null | undefined,
  overrideSync?: boolean
): boolean {
  if (!syncAtivo(overrideSync)) return true
  return tipoMenu !== 'principal'
}

/**
 * Menus a oferecer na pergunta de replicação.
 * Com a ponte ligada, o principal não aparece na lista: ou é automático
 * (cadastro/principal) ou vai junto do checkbox de cadastro (menu secundário).
 */
export function menusParaPerguntarReplicacao(input: {
  menus: ReadonlyArray<{ id: string; nome: string; tipo?: string | null }>
  origem: OrigemSyncCadastroMenu
  menuIdAtual?: string | null
  principalId?: string | null
  variante?: VarianteSyncCadastroMenu
  overrideSync?: boolean
}): Array<{ id: string; nome: string }> {
  const excluir = new Set<string>()
  if (input.menuIdAtual) excluir.add(input.menuIdAtual)

  const variante = input.variante ?? 'dados'
  const sync = syncAtivo(input.overrideSync)
  if (sync && input.principalId) {
    const origemEspelhaPrincipal =
      input.origem === 'cadastroBase' || input.menuIdAtual === input.principalId
    if (variante === 'vinculoMenus') {
      // Já salvo no principal na criação; a lista vem filtrada por excluirMenuIds.
    } else if (variante === 'imagem') {
      if (origemEspelhaPrincipal) excluir.add(input.principalId)
    } else {
      excluir.add(input.principalId)
    }
  }

  return input.menus
    .filter(menu => menu.id && !excluir.has(menu.id))
    .map(menu => ({ id: menu.id, nome: menu.nome }))
}

/**
 * Completa destinos depois da escolha do usuário (ou da ausência de diálogo).
 * Origem cadastro: só o menu principal (ignora outros ids; vínculo extra é outra variante).
 * Origem menu principal: sempre o cadastro; outros menus só os que o usuário marcou.
 * Origem menu secundário: só espelha cadastro+principal se o usuário marcou.
 */
export function completarDestinosSyncCadastroPrincipal(input: {
  destinos: DestinosSyncCadastroMenu
  origem: OrigemSyncCadastroMenu
  menuIdAtual?: string | null
  principalId?: string | null
  variante?: VarianteSyncCadastroMenu
  overrideSync?: boolean
}): DestinosSyncCadastroMenu {
  const menuIds = new Set(idsUnicos(input.destinos.menuIds))
  let aplicarNoCadastroBase = input.destinos.aplicarNoCadastroBase
  const variante = input.variante ?? 'dados'

  if (!syncAtivo(input.overrideSync) || !input.principalId) {
    if (input.menuIdAtual) menuIds.delete(input.menuIdAtual)
    return { aplicarNoCadastroBase, menuIds: [...menuIds] }
  }

  const principalId = input.principalId
  const origemNoPrincipal =
    input.origem === 'cadastroBase' || input.menuIdAtual === principalId

  if (variante === 'vinculoMenus') {
    if (input.menuIdAtual) menuIds.delete(input.menuIdAtual)
    return { aplicarNoCadastroBase: false, menuIds: [...menuIds] }
  }

  if (input.origem === 'cadastroBase') {
    if (variante === 'imagem' || variante === 'dados' || variante === 'statusAtivo') {
      return { aplicarNoCadastroBase: false, menuIds: idsUnicos([principalId]) }
    }
  }

  if (variante === 'imagem') {
    if (input.menuIdAtual) menuIds.delete(input.menuIdAtual)
    return { aplicarNoCadastroBase: false, menuIds: [...menuIds] }
  }

  if (origemNoPrincipal) {
    if (input.menuIdAtual === principalId) aplicarNoCadastroBase = true
  } else if (aplicarNoCadastroBase || menuIds.has(principalId)) {
    aplicarNoCadastroBase = true
    menuIds.add(principalId)
  }

  if (input.menuIdAtual) menuIds.delete(input.menuIdAtual)

  return { aplicarNoCadastroBase, menuIds: [...menuIds] }
}

export function descricaoVinculoMenusCriacao(origemMenu: boolean, overrideSync?: boolean): string {
  if (origemMenu) {
    return syncAtivo(overrideSync)
      ? 'Este cardápio e o menu principal já entram e não podem ser desmarcados. Marque outros se quiser o produto em mais menus.'
      : 'Este cardápio já entra e não pode ser desmarcado. Marque outros se quiser o produto em mais menus (incluindo o principal).'
  }
  return syncAtivo(overrideSync)
    ? 'O menu principal já entra e não pode ser desmarcado (fica igual ao cadastro do produto). Marque outros cardápios se quiser o produto neles também.'
    : 'O menu principal já vem marcado. Você pode desmarcá-lo e salvar só o produto base, ou incluir outros cardápios.'
}

export function labelCadastroNaPropagacao(params: {
  origem: OrigemSyncCadastroMenu
  menuIdAtual?: string | null
  principalId?: string | null
  overrideSync?: boolean
}): string {
  const sync = syncAtivo(params.overrideSync)
  const origemSecundaria =
    params.origem === 'menu' && !ehMenuPrincipal(params.menuIdAtual, params.principalId)
  if (sync && origemSecundaria) return 'Cadastro e menu principal'
  return 'Cadastro base'
}
