/**
 * Ator do GET delivery (`abertoPor`, `lancadoPor`, etc.).
 * Pedido do cardápio costuma vir com `sourceReference` = telefone do cliente,
 * que não é ID de usuário gestor.
 */

/** CUID/UUID (ou id alfanumérico). Só dígitos (telefone) não é funcionário. */
export function idUsuarioGestorConsultavel(id: string | null | undefined): boolean {
  const v = String(id ?? '').trim()
  if (!v) return false
  if (/^\d{8,15}$/.test(v)) return false
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return true
  if (/^[cC][a-z0-9]{20,}$/i.test(v)) return true
  return /[a-zA-Z]/.test(v) && /^[a-zA-Z0-9_-]{16,}$/.test(v)
}

export function atorUsuarioId(ator: unknown): string | null {
  if (typeof ator === 'string') {
    const id = ator.trim()
    return id || null
  }
  if (!ator || typeof ator !== 'object') return null
  const a = ator as Record<string, unknown>
  const id = String(a.id ?? '').trim()
  const ref = String(a.sourceReference ?? '').trim()
  if (idUsuarioGestorConsultavel(id)) return id
  if (idUsuarioGestorConsultavel(ref)) return ref
  return id || ref || null
}

/** IDs de funcionário no ator (vinculo gestor, identidade, sourceReference). */
export function idsConsultaveisDoAtor(ator: unknown): string[] {
  if (typeof ator === 'string') {
    const id = ator.trim()
    return id && idUsuarioGestorConsultavel(id) ? [id] : []
  }
  if (!ator || typeof ator !== 'object') return []
  const a = ator as Record<string, unknown>
  const out: string[] = []
  for (const candidato of [a.id, a.sourceReference, a.usuarioId, a.userId, a.usuarioGestorId]) {
    const v = String(candidato ?? '').trim()
    if (!v || !idUsuarioGestorConsultavel(v) || out.includes(v)) continue
    out.push(v)
  }
  return out
}

export function nomeUsuarioDePayloadApi(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return ''
  let r = raw as Record<string, unknown>
  if (r.data && typeof r.data === 'object' && !Array.isArray(r.data)) {
    r = r.data as Record<string, unknown>
  }
  const nestedUsuario =
    r.usuario && typeof r.usuario === 'object' && !Array.isArray(r.usuario)
      ? (r.usuario as Record<string, unknown>)
      : null
  return String(
    r.nome ?? r.name ?? r.username ?? nestedUsuario?.nome ?? nestedUsuario?.name ?? ''
  ).trim()
}

/** Se um dos IDs do ator já tem nome, copia para os demais (pessoa ≠ identidade). */
export function copiarNomeEntreIdsDoAtor(
  map: Record<string, string>,
  ator: unknown
): void {
  const ids = idsConsultaveisDoAtor(ator)
  if (ids.length === 0) return
  const nome = rotuloAtorPedido(ator) || ids.map(id => map[id]).find(Boolean) || ''
  if (!nome) return
  for (const id of ids) map[id] = nome
}

export function nomeAtorPedido(ator: unknown): string {
  if (!ator || typeof ator !== 'object') return ''
  const a = ator as Record<string, unknown>
  return String(a.nome ?? a.name ?? '').trim()
}

/** Nome do payload, ou "Cliente" quando o ator é o comprador do cardápio (telefone). */
export function rotuloAtorPedido(ator: unknown): string {
  const nome = nomeAtorPedido(ator)
  if (nome) return nome
  const id = atorUsuarioId(ator)
  if (id && !idUsuarioGestorConsultavel(id)) return 'Cliente'
  return ''
}

export function origemPedidoDoCardapio(origem: string | null | undefined): boolean {
  const o = String(origem ?? '').trim().toUpperCase()
  return o === 'JIFFY_DELIVERY' || o === 'DELIVERY'
}

/**
 * Pedido do site não tem usuário gestor em `abertoPor`.
 * Só esses IDs de cliente recebem o nome do comprador — nunca um lançamento do operador.
 */
export function completarNomesAtoresPedidoDelivery(
  nomes: Record<string, string>,
  idsDoCliente: Iterable<string>,
  origem: string | null | undefined,
  clienteNome: string | null | undefined
): Record<string, string> {
  if (!origemPedidoDoCardapio(origem)) return nomes
  const rotulo = String(clienteNome ?? '').trim() || 'Cliente'
  const next = { ...nomes }
  for (const id of idsDoCliente) {
    const key = String(id ?? '').trim()
    if (!key || next[key]) continue
    next[key] = rotulo
  }
  return next
}
