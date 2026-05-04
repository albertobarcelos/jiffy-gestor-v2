'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { TaxasNovaModal } from '@/src/presentation/components/features/taxas/TaxasNovaModal'
import { Taxa } from '@/src/domain/entities/Taxa'
import { MdDeleteOutline, MdSearch } from 'react-icons/md'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useTaxasInfinite } from '@/src/presentation/hooks/useTaxas'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'

/**
 * Exibe valor conforme tipo (percentual em decimal na API → porcentagem na UI).
 */
function formatValorTaxaDisplay(taxa: Taxa): string {
  const tipo = taxa.getTipo().toLowerCase()
  const v = taxa.getValor()
  if (tipo === 'percentual') {
    return `${new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(v * 100)}%`
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(v)
}

function formatTipoLabel(tipo: string): string {
  const t = tipo.toLowerCase()
  if (t === 'percentual') return 'Percentual'
  if (t === 'fixo' || t === 'valor_fixo') return 'Valor fixo'
  if (t === 'entrega') return 'Entrega'
  if (!tipo) return '—'
  return tipo.charAt(0).toLocaleUpperCase('pt-BR') + tipo.slice(1)
}

/** Normaliza tipo da API para o payload PATCH (schema restrito). */
function tipoTaxaParaPatch(raw: unknown): 'percentual' | 'fixo' | 'entrega' {
  const t = String(raw ?? '').toLowerCase()
  if (t === 'fixo' || t === 'valor_fixo') return 'fixo'
  if (t === 'entrega') return 'entrega'
  return 'percentual'
}

type TerminalTaxaCfgPayload = {
  terminalId: string
  ativo: boolean
  automatico: boolean
  mesa: boolean
  balcao: boolean
}

/** Monta `terminaisConfig` a partir da resposta GET /api/taxas/:id. */
function terminaisConfigDoDetalhe(detalhe: Record<string, unknown>): TerminalTaxaCfgPayload[] | undefined {
  const tcRaw = detalhe.terminaisConfig
  if (!Array.isArray(tcRaw)) return undefined
  const out: TerminalTaxaCfgPayload[] = []
  for (const item of tcRaw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const tid = o.terminalId != null ? String(o.terminalId) : ''
    if (!tid) continue
    out.push({
      terminalId: tid,
      ativo: o.ativo === true || o.ativo === 'true',
      automatico: o.automatico === true || o.automatico === 'true',
      mesa: o.mesa === true || o.mesa === 'true',
      balcao: o.balcao === true || o.balcao === 'true',
    })
  }
  return out.length > 0 ? out : undefined
}

const TaxaRow = memo(function TaxaRow({
  taxa,
  index,
  onEdit,
  onToggleAtivo,
  salvandoAtivo,
  onExcluir,
  excluindo,
}: {
  taxa: Taxa
  index: number
  onEdit?: (taxaId: string) => void
  onToggleAtivo?: (taxaId: string, novoAtivo: boolean) => void
  salvandoAtivo?: boolean
  onExcluir?: (taxa: Taxa) => void
  excluindo?: boolean
}) {
  const isZebraEven = index % 2 === 0
  const bgClass = isZebraEven ? 'bg-gray-50' : 'bg-white'
  const ncm = taxa.getNcm()

  return (
    <div
      role={onEdit ? 'button' : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onClick={() => onEdit?.(taxa.getId())}
      onKeyDown={e => {
        if (!onEdit) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(taxa.getId())
        }
      }}
      className={`${bgClass} rounded-lg md:px-4 px-1 py-3 flex items-center md:gap-[10px] gap-1 hover:bg-secondary-bg/15 ${onEdit ? 'cursor-pointer' : ''}`}
    >
      <div className="md:flex-[3] flex-[2] font-normal md:text-sm text-[10px] text-primary-text flex items-center gap-1 min-w-0">
        <span className="truncate"># {taxa.getNome()}</span>
      </div>

      <div className="flex-[2] md:text-sm text-[10px] font-medium tabular-nums text-primary-text">
        {formatValorTaxaDisplay(taxa)}
      </div>

      <div className="hidden flex-[2] sm:flex sm:text-[10px] md:text-sm text-secondary-text truncate">
        {formatTipoLabel(taxa.getTipo())}
      </div>

      <div className="hidden lg:flex lg:flex-[2] text-sm text-secondary-text truncate" title={ncm ?? undefined}>
        {ncm ?? '—'}
      </div>

      <div className="hidden md:flex flex-[1] justify-center md:text-sm text-[10px] text-secondary-text">
        {taxa.isTributado() ? 'Sim' : 'Não'}
      </div>

      <div
        className="md:flex-[2] flex-[1] flex justify-end"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        title={taxa.isAtivo() ? 'Taxa ativa — clique para desativar' : 'Taxa inativa — clique para ativar'}
      >
        <JiffyIconSwitch
          checked={taxa.isAtivo()}
          onChange={e => {
            e.stopPropagation()
            onToggleAtivo?.(taxa.getId(), e.target.checked)
          }}
          disabled={salvandoAtivo}
          bordered={false}
          size="sm"
          className={cn('shrink-0', salvandoAtivo && 'opacity-70')}
          inputProps={{
            'aria-label': taxa.isAtivo() ? 'Taxa ativa' : 'Taxa inativa',
            onClick: e => e.stopPropagation(),
          }}
        />
      </div>

      <div
        className="shrink-0 flex w-10 items-center justify-center"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onExcluir?.(taxa)
          }}
          disabled={excluindo}
          title="Remover taxa"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-secondary-text transition-colors hover:bg-red-500/15 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40'
          )}
          aria-label={`Remover taxa ${taxa.getNome()}`}
        >
          {excluindo ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <MdDeleteOutline className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  )
})

/**
 * Lista de taxas — layout alinhado a ComplementosList (cores, zebra, busca, scroll infinito).
 * Clique na linha abre edição; o switch de status persiste via GET + PATCH /api/taxas/:id.
 */
export function TaxasList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()

  /** Evita PATCH concorrentes (ref); estado só para feedback visual na linha. */
  const savingAtivoLockRef = useRef(false)
  const [savingAtivoParaId, setSavingAtivoParaId] = useState<string | null>(null)

  const excluirTaxaLockRef = useRef(false)
  const [excluindoTaxaId, setExcluindoTaxaId] = useState<string | null>(null)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [taxaParaExcluir, setTaxaParaExcluir] = useState<Taxa | null>(null)
  const [isDeletingTaxa, setIsDeletingTaxa] = useState(false)

  const modalNovaTaxaAberto = searchParams.get('modalNovaTaxaOpen') === 'true'
  const taxaEditId = searchParams.get('taxaEditId')

  const abrirModalNovaTaxa = useCallback(() => {
    const q = new URLSearchParams(searchParams.toString())
    q.set('modalNovaTaxaOpen', 'true')
    q.delete('taxaEditId')
    router.replace(`${pathname}?${q.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  const abrirModalEditarTaxa = useCallback(
    (id: string) => {
      const q = new URLSearchParams(searchParams.toString())
      q.set('modalNovaTaxaOpen', 'true')
      q.set('taxaEditId', id)
      router.replace(`${pathname}?${q.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const fecharModalNovaTaxa = useCallback(() => {
    const q = new URLSearchParams(searchParams.toString())
    q.delete('modalNovaTaxaOpen')
    q.delete('taxaEditId')
    const qs = q.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  const salvarToggleAtivoTaxa = useCallback(
    async (taxaId: string, novoAtivo: boolean) => {
      if (savingAtivoLockRef.current) return
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Sessão inválida. Faça login novamente.')
        return
      }

      savingAtivoLockRef.current = true
      setSavingAtivoParaId(taxaId)
      try {
        const getRes = await fetch(`/api/taxas/${encodeURIComponent(taxaId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!getRes.ok) {
          const err = await getRes.json().catch(() => ({}))
          const msg =
            (typeof err.error === 'string' && err.error) ||
            (typeof err.message === 'string' && err.message) ||
            'Não foi possível carregar a taxa.'
          throw new Error(msg)
        }

        const detalhe = (await getRes.json()) as Record<string, unknown>

        const vr = detalhe.valor
        const valorNum =
          typeof vr === 'number' ? vr : parseFloat(vr != null ? String(vr) : '0')

        const dataAtualizacao =
          typeof detalhe.dataAtualizacao === 'string' && detalhe.dataAtualizacao
            ? detalhe.dataAtualizacao
            : new Date().toISOString()

        const ncmRaw = detalhe.ncm
        const ncm =
          ncmRaw === null || ncmRaw === undefined || ncmRaw === ''
            ? null
            : String(ncmRaw)

        const patchRes = await fetch(`/api/taxas/${encodeURIComponent(taxaId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nome: String(detalhe.nome ?? ''),
            valor: Number.isFinite(valorNum) ? valorNum : 0,
            tipo: tipoTaxaParaPatch(detalhe.tipo),
            ativo: novoAtivo,
            tributado: detalhe.tributado === true || detalhe.tributado === 'true',
            ncm,
            dataAtualizacao,
            terminaisConfig: terminaisConfigDoDetalhe(detalhe),
          }),
        })

        if (!patchRes.ok) {
          const err = await patchRes.json().catch(() => ({}))
          const msg =
            (typeof err.error === 'string' && err.error) ||
            (typeof err.message === 'string' && err.message) ||
            'Erro ao atualizar status.'
          throw new Error(msg)
        }

        showToast.success(novoAtivo ? 'Taxa ativada.' : 'Taxa desativada.')
        await queryClient.invalidateQueries({ queryKey: ['taxas'], exact: false })
      } catch (e) {
        console.error('salvarToggleAtivoTaxa:', e)
        showToast.error(e instanceof Error ? e.message : 'Erro ao atualizar taxa.')
      } finally {
        savingAtivoLockRef.current = false
        setSavingAtivoParaId(null)
      }
    },
    [auth, queryClient]
  )

  const abrirConfirmacaoExclusaoTaxa = useCallback((taxa: Taxa) => {
    setTaxaParaExcluir(taxa)
    setConfirmDeleteOpen(true)
  }, [])

  const fecharConfirmacaoExclusaoTaxa = useCallback(() => {
    if (isDeletingTaxa) return
    setConfirmDeleteOpen(false)
    setTaxaParaExcluir(null)
  }, [isDeletingTaxa])

  const confirmarExclusaoTaxa = useCallback(async () => {
    const taxa = taxaParaExcluir
    if (!taxa || excluirTaxaLockRef.current) return

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão inválida. Faça login novamente.')
      return
    }

    excluirTaxaLockRef.current = true
    setIsDeletingTaxa(true)
    setExcluindoTaxaId(taxa.getId())
    try {
      const res = await fetch(`/api/taxas/${encodeURIComponent(taxa.getId())}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 204 || res.ok) {
        showToast.success('Taxa removida.')
        await queryClient.invalidateQueries({ queryKey: ['taxas'], exact: false })
        setConfirmDeleteOpen(false)
        setTaxaParaExcluir(null)
        return
      }

      const err = await res.json().catch(() => ({}))
      const msg =
        (typeof err.error === 'string' && err.error) ||
        (typeof err.message === 'string' && err.message) ||
        'Erro ao excluir taxa.'
      throw new Error(msg)
    } catch (e) {
      console.error('confirmarExclusaoTaxa:', e)
      showToast.error(e instanceof Error ? e.message : 'Erro ao excluir taxa.')
    } finally {
      excluirTaxaLockRef.current = false
      setIsDeletingTaxa(false)
      setExcluindoTaxaId(null)
    }
  }, [taxaParaExcluir, auth, queryClient])

  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
  } = useTaxasInfinite({
    q: debouncedSearch || undefined,
    limit: 10,
  })

  useEffect(() => {
    if (!isLoading && !isFetching) {
      setHasLoadedOnce(true)
    }
  }, [isLoading, isFetching])

  const taxas = useMemo(() => {
    return data?.pages.flatMap(page => page.taxas) || []
  }, [data])

  const totalTaxas = useMemo(() => data?.pages[0]?.count ?? 0, [data])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 500)
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText])

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      return
    }
    scrollTimeoutRef.current = setTimeout(() => {
      const container = scrollContainerRef.current
      if (!container) {
        scrollTimeoutRef.current = null
        return
      }
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
      if (distanceFromBottom < 400) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
      scrollTimeoutRef.current = null
    }, 100)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll])

  useEffect(() => {
    if (!hasNextPage) return
    if (!isFetching && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetching, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar taxas:', error)
    }
  }, [error])

  return (
    <>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="md:px-[30px] flex-shrink-0 py-[4px]">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col md:pl-5">
            <p className="text-primary text-lg font-semibold">Taxas cadastradas</p>
            <p className="text-tertiary md:text-[22px] text-sm font-normal">
              Total {taxas.length} de {totalTaxas}
            </p>
          </div>
          <button
            type="button"
            onClick={abrirModalNovaTaxa}
            className="font-exo flex h-8 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-info transition-colors hover:bg-primary/90 md:px-[30px]"
          >
            Novo
            <span className="text-lg leading-none">+</span>
          </button>
        </div>
      </div>

      <div className="h-[2px] border-t-2 border-primary/70 flex-shrink-0" />

      <div className="flex flex-shrink-0 gap-3 md:px-[20px] px-2 py-2">
        <div className="max-w-[360px] min-w-[180px] flex-1">
          <div className="relative h-8">
            <MdSearch
              className="text-secondary-text absolute left-4 top-1/2 -translate-y-1/2"
              size={18}
            />
            <input
              id="taxas-search"
              type="text"
              placeholder="Pesquisar taxa..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="focus:border-primary h-full w-full rounded-lg border border-gray-200 bg-info pl-12 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="md:px-[30px] mt-0 flex-shrink-0 px-1">
        <div className="bg-custom-2 flex h-10 items-center gap-[10px] rounded-lg px-1 md:px-4">
          <div className="md:flex-[3] flex-[2] font-semibold text-xs text-primary-text md:text-sm">Nome</div>
          <div className="flex-[2] font-semibold text-xs text-primary-text md:text-sm">Valor</div>
          <div className="hidden flex-[2] font-semibold text-xs text-primary-text sm:flex sm:text-sm">Tipo</div>
          <div className="hidden lg:flex lg:flex-[2] font-semibold text-xs text-primary-text lg:text-sm">NCM</div>
          <div className="hidden md:flex flex-[1] justify-center font-semibold text-xs text-primary-text md:text-sm">
            Tributado
          </div>
          <div className="md:flex-[2] flex-[1] text-end font-semibold text-xs text-primary-text md:mt-0 md:text-end md:text-sm">
            Status
          </div>
          <div
            className="flex w-10 shrink-0 items-center justify-center text-primary-text"
            title="Excluir taxa"
          >
            <MdDeleteOutline className="h-4 w-4" aria-hidden />
            <span className="sr-only">Excluir</span>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-2 pt-2 scrollbar-hide md:px-[30px]"
      >
        {(isLoading || (taxas.length === 0 && isFetching)) && (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <JiffyLoading />
          </div>
        )}

        {taxas.length === 0 && !isLoading && !isFetching && hasLoadedOnce && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhuma taxa encontrada.</p>
          </div>
        )}

        {taxas.map((taxa, index) => (
          <TaxaRow
            key={taxa.getId()}
            taxa={taxa}
            index={index}
            onEdit={abrirModalEditarTaxa}
            onToggleAtivo={salvarToggleAtivoTaxa}
            salvandoAtivo={savingAtivoParaId === taxa.getId()}
            onExcluir={abrirConfirmacaoExclusaoTaxa}
            excluindo={excluindoTaxaId === taxa.getId()}
          />
        ))}

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>

    <TaxasNovaModal
      open={modalNovaTaxaAberto}
      taxaEditId={taxaEditId || undefined}
      onClose={fecharModalNovaTaxa}
      onReload={() => {
        void queryClient.invalidateQueries({ queryKey: ['taxas'], exact: false })
      }}
    />

    <Dialog
      open={confirmDeleteOpen}
      onOpenChange={open => {
        if (!open && !isDeletingTaxa) {
          setConfirmDeleteOpen(false)
          setTaxaParaExcluir(null)
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary-text">
            Confirmar exclusão
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-primary-text">Tem certeza que deseja excluir esta taxa?</p>
          <p className="mt-2 text-sm text-secondary-text">Esta ação não pode ser desfeita.</p>
        </div>
        <DialogFooter className="flex justify-end gap-3">
          <button
            type="button"
            onClick={fecharConfirmacaoExclusaoTaxa}
            disabled={isDeletingTaxa}
            className="h-10 rounded-lg border border-gray-300 px-6 text-primary-text transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmarExclusaoTaxa()}
            disabled={isDeletingTaxa}
            className="h-10 rounded-lg bg-error px-6 font-semibold text-white transition-colors hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeletingTaxa ? 'Excluindo...' : 'Deletar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
