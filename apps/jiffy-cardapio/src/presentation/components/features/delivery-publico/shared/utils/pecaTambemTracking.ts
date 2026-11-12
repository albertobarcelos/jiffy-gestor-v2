'use client'

import { generateUuid } from '@/src/shared/utils/generateUuid'

const SESSION_STORAGE_KEY = 'jiffy:peca-tambem-session-id'
const IMPRESSAO_DEDUPE_PREFIX = 'jiffy:peca-tambem-impressao:'

export type PecaTambemEventoTipo = 'IMPRESSAO' | 'CLIQUE' | 'ADD_TO_CART'

export type PecaTambemEventoPayload = {
  tipoEvento: PecaTambemEventoTipo
  sessionId: string
  produtoId?: string | null
  grupoProdutoId?: string | null
  grupoProdutoOrigemId?: string | null
  quantidade?: number | null
  valorEstimado?: number | null
}

let queue: PecaTambemEventoPayload[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let currentSlug: string | null = null

export function getPecaTambemSessionId(): string {
  if (typeof window === 'undefined') {
    return generateUuid()
  }
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (existing?.trim()) return existing.trim()
    const created = generateUuid()
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created)
    return created
  } catch {
    return generateUuid()
  }
}

function impressaoDedupeKey(slug: string, produtoIds: string[]): string {
  return `${IMPRESSAO_DEDUPE_PREFIX}${slug}:${[...produtoIds].sort().join(',')}`
}

export function jaRegistrouImpressaoPecaTambem(
  slug: string,
  produtoIds: string[]
): boolean {
  if (typeof window === 'undefined' || produtoIds.length === 0) return true
  try {
    return window.sessionStorage.getItem(impressaoDedupeKey(slug, produtoIds)) === '1'
  } catch {
    return false
  }
}

function marcarImpressaoRegistrada(slug: string, produtoIds: string[]) {
  if (typeof window === 'undefined' || produtoIds.length === 0) return
  try {
    window.sessionStorage.setItem(impressaoDedupeKey(slug, produtoIds), '1')
  } catch {
    // ignore
  }
}

async function flushQueue() {
  const slug = currentSlug
  const batch = queue
  queue = []
  flushTimer = null
  if (!slug || batch.length === 0) return

  try {
    const res = await fetch(
      `/api/public/delivery/catalogo/${encodeURIComponent(slug)}/peca-tambem/eventos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      }
    )
    // Tracking nunca bloqueia UX.
    void res
  } catch {
    // ignore
  }
}

function scheduleFlush(slug: string) {
  currentSlug = slug
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    void flushQueue()
  }, 400)
}

export function trackPecaTambemEvent(
  slug: string,
  event: Omit<PecaTambemEventoPayload, 'sessionId'> & { sessionId?: string }
) {
  const payload: PecaTambemEventoPayload = {
    ...event,
    sessionId: event.sessionId ?? getPecaTambemSessionId(),
  }
  queue.push(payload)
  scheduleFlush(slug)
}

export function trackPecaTambemImpressao(
  slug: string,
  produtos: Array<{
    id: string
    grupoId?: string | null
    grupoIdOrigem?: string | null
  }>
) {
  const produtoIds = produtos.map(p => p.id)
  if (jaRegistrouImpressaoPecaTambem(slug, produtoIds)) return

  const sessionId = getPecaTambemSessionId()
  for (const produto of produtos) {
    trackPecaTambemEvent(slug, {
      tipoEvento: 'IMPRESSAO',
      sessionId,
      produtoId: produto.id,
      grupoProdutoId: produto.grupoId ?? null,
      grupoProdutoOrigemId: produto.grupoIdOrigem ?? null,
    })
  }
  marcarImpressaoRegistrada(slug, produtoIds)
}

export function trackPecaTambemClique(
  slug: string,
  produto: {
    id: string
    grupoId?: string | null
    grupoIdOrigem?: string | null
  }
) {
  trackPecaTambemEvent(slug, {
    tipoEvento: 'CLIQUE',
    produtoId: produto.id,
    grupoProdutoId: produto.grupoId ?? null,
    grupoProdutoOrigemId: produto.grupoIdOrigem ?? null,
  })
}

export function trackPecaTambemAddToCart(
  slug: string,
  params: {
    produtoId: string
    grupoProdutoId?: string | null
    grupoProdutoOrigemId?: string | null
    quantidade?: number
    valorEstimado?: number
  }
) {
  trackPecaTambemEvent(slug, {
    tipoEvento: 'ADD_TO_CART',
    produtoId: params.produtoId,
    grupoProdutoId: params.grupoProdutoId ?? null,
    grupoProdutoOrigemId: params.grupoProdutoOrigemId ?? null,
    quantidade: params.quantidade ?? 1,
    valorEstimado: params.valorEstimado ?? null,
  })
}
