'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MdDeleteOutline } from 'react-icons/md'
import { CoberturaBotaoSalvarTaxasLote } from '@/src/presentation/components/features/configuracoes/CoberturaBotaoSalvarTaxasLote'
import { parseTaxaDraftCobertura } from '@/src/presentation/components/features/configuracoes/coberturaPainelAbas'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { Taxa } from '@/src/domain/entities/Taxa'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTaxasInfinite } from '@/src/presentation/hooks/useTaxas'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'

const COLUNAS_LISTA =
  'grid-cols-[minmax(0,2fr)_minmax(3.5rem,1fr)_1.4rem_2.75rem]'

type DraftLinha = { nome: string; valor: string }

function terminaisConfigDoDetalhe(detalhe: Record<string, unknown>) {
  const raw = detalhe.terminaisConfig
  if (!Array.isArray(raw)) return undefined
  const items = raw
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const terminalId = o.terminalId != null ? String(o.terminalId) : ''
      if (!terminalId) return null
      return {
        terminalId,
        ativo: o.ativo === true || o.ativo === 'true',
        automatico: o.automatico === true || o.automatico === 'true',
        mesa: o.mesa === true || o.mesa === 'true',
        balcao: o.balcao === true || o.balcao === 'true',
      }
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
  return items.length > 0 ? items : undefined
}

function valorTextoDaTaxa(taxa: Taxa): string {
  const v = taxa.getValor()
  if (!Number.isFinite(v)) return ''
  return String(v).replace('.', ',')
}

function linhaTaxaManualPendente(taxa: Taxa, draft: DraftLinha | undefined): boolean {
  const nomeDraft = (draft?.nome ?? taxa.getNome()).trim()
  const valorBruto = draft?.valor ?? valorTextoDaTaxa(taxa)
  const valorDraft = parseTaxaDraftCobertura(valorBruto)
  if (valorDraft === null) return valorBruto.trim() !== ''
  return nomeDraft !== taxa.getNome().trim() || valorDraft !== taxa.getValor()
}

async function patchTaxaEntrega(args: {
  token: string
  taxa: Taxa
  nome: string
  valor: number
  ativo: boolean
}): Promise<void> {
  const { token, taxa, nome, valor, ativo } = args
  const getRes = await fetchGestorApi(`/api/taxas/${encodeURIComponent(taxa.getId())}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!getRes.ok) {
    const err = await getRes.json().catch(() => ({}))
    throw new Error(
      (typeof err.error === 'string' && err.error) ||
        (typeof err.message === 'string' && err.message) ||
        'Não foi possível carregar a taxa.'
    )
  }

  const detalhe = (await getRes.json()) as Record<string, unknown>
  const dataAtualizacao =
    typeof detalhe.dataAtualizacao === 'string' && detalhe.dataAtualizacao
      ? detalhe.dataAtualizacao
      : new Date().toISOString()
  const ncmRaw = detalhe.ncm
  const ncm =
    ncmRaw === null || ncmRaw === undefined || ncmRaw === '' ? null : String(ncmRaw)

  const patchRes = await fetchGestorApi(`/api/taxas/${encodeURIComponent(taxa.getId())}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      nome,
      valor,
      tipo: 'entrega',
      ativo,
      tributado: detalhe.tributado === true || detalhe.tributado === 'true',
      ncm,
      dataAtualizacao,
      terminaisConfig: terminaisConfigDoDetalhe(detalhe),
    }),
  })

  if (!patchRes.ok) {
    const err = await patchRes.json().catch(() => ({}))
    throw new Error(
      (typeof err.error === 'string' && err.error) ||
        (typeof err.message === 'string' && err.message) ||
        'Erro ao atualizar taxa.'
    )
  }
}

/**
 * Aba Taxas Manuais do painel de cobertura: cria taxas do catálogo com `tipo: "entrega"`.
 */
export function CoberturaTaxasManuaisPainel() {
  const invalidate = useInvalidateTenantQueries()
  const taxasQuery = useTaxasInfinite({ limit: 50, staleTime: 15_000 })
  const [nome, setNome] = useState('')
  const [valorTexto, setValorTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [salvandoLista, setSalvandoLista] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, DraftLinha>>({})
  const [savingAtivoParaId, setSavingAtivoParaId] = useState<string | null>(null)
  const savingAtivoLockRef = useRef(false)
  const [taxaExcluindo, setTaxaExcluindo] = useState<Taxa | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const excluirLockRef = useRef(false)

  const taxasEntrega = useMemo(() => {
    const pages = taxasQuery.data?.pages ?? []
    return pages
      .flatMap(page => page.taxas)
      .filter(taxa => taxa.getTipo().toLowerCase() === 'entrega')
  }, [taxasQuery.data])

  const assinaturaTaxas = useMemo(
    () =>
      taxasEntrega
        .map(taxa => `${taxa.getId()}:${taxa.getNome()}:${taxa.getValor()}:${taxa.isAtivo() ? 1 : 0}`)
        .join('|'),
    [taxasEntrega]
  )

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        taxasEntrega.map(taxa => [
          taxa.getId(),
          { nome: taxa.getNome(), valor: valorTextoDaTaxa(taxa) },
        ])
      )
    )
    // Só ressincroniza quando a API muda — não enquanto o operador edita.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- assinaturaTaxas cobre o snapshot
  }, [assinaturaTaxas])

  const edicoesPendentes = useMemo(
    () => taxasEntrega.some(taxa => linhaTaxaManualPendente(taxa, drafts[taxa.getId()])),
    [drafts, taxasEntrega]
  )

  const podeCarregarMais =
    taxasQuery.hasNextPage && !taxasQuery.isFetchingNextPage && !taxasQuery.isPending

  const handleCriar = useCallback(async () => {
    const nomeTrim = nome.trim()
    const valor = parseTaxaDraftCobertura(valorTexto)
    if (!nomeTrim) {
      showToast.error('Informe o nome da taxa.')
      return
    }
    if (valor === null) {
      showToast.error('Informe um valor válido.')
      return
    }

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão inválida. Faça login novamente.')
      return
    }

    setEnviando(true)
    try {
      const response = await fetchGestorApi('/api/taxas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: nomeTrim,
          valor,
          tipo: 'entrega',
          ativo: true,
          tributado: false,
          ncm: null,
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        const msg =
          (typeof err.error === 'string' && err.error) ||
          (typeof err.message === 'string' && err.message) ||
          'Erro ao criar taxa'
        throw new Error(msg)
      }
      showToast.success('Taxa manual criada.')
      setNome('')
      setValorTexto('')
      await invalidate(['taxas'], { refetchType: 'all' })
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao criar taxa')
    } finally {
      setEnviando(false)
    }
  }, [invalidate, nome, valorTexto])

  const handleToggleAtivo = useCallback(
    async (taxa: Taxa, novoAtivo: boolean) => {
      if (savingAtivoLockRef.current || salvandoLista) return
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Sessão inválida. Faça login novamente.')
        return
      }

      savingAtivoLockRef.current = true
      setSavingAtivoParaId(taxa.getId())
      try {
        const draft = drafts[taxa.getId()]
        const nomeAtual = (draft?.nome ?? taxa.getNome()).trim() || taxa.getNome()
        const valorAtual =
          parseTaxaDraftCobertura(draft?.valor ?? valorTextoDaTaxa(taxa)) ?? taxa.getValor()
        await patchTaxaEntrega({
          token,
          taxa,
          nome: nomeAtual,
          valor: valorAtual,
          ativo: novoAtivo,
        })
        showToast.success(novoAtivo ? 'Taxa ativada.' : 'Taxa desativada.')
        await invalidate(['taxas'], { refetchType: 'all' })
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar taxa.')
      } finally {
        savingAtivoLockRef.current = false
        setSavingAtivoParaId(null)
      }
    },
    [drafts, invalidate, salvandoLista]
  )

  const handleSalvarEdicoesLista = useCallback(async () => {
    if (!edicoesPendentes || salvandoLista) return
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão inválida. Faça login novamente.')
      return
    }

    const pendentes = taxasEntrega.filter(taxa =>
      linhaTaxaManualPendente(taxa, drafts[taxa.getId()])
    )
    if (pendentes.length === 0) return

    for (const taxa of pendentes) {
      const draft = drafts[taxa.getId()]
      const nomeTrim = (draft?.nome ?? taxa.getNome()).trim()
      const valor = parseTaxaDraftCobertura(draft?.valor ?? valorTextoDaTaxa(taxa))
      if (!nomeTrim) {
        showToast.error(`Informe o nome da taxa "${taxa.getNome()}".`)
        return
      }
      if (valor === null) {
        showToast.error(`Informe um valor válido para "${taxa.getNome()}".`)
        return
      }
    }

    setSalvandoLista(true)
    let ok = 0
    try {
      for (const taxa of pendentes) {
        const draft = drafts[taxa.getId()]
        const nomeTrim = (draft?.nome ?? taxa.getNome()).trim()
        const valor = parseTaxaDraftCobertura(draft?.valor ?? valorTextoDaTaxa(taxa))
        if (valor === null) continue
        await patchTaxaEntrega({
          token,
          taxa,
          nome: nomeTrim,
          valor,
          ativo: taxa.isAtivo(),
        })
        ok += 1
      }
      await invalidate(['taxas'], { refetchType: 'all' })
      showToast.success(
        ok === 1 ? 'Taxa atualizada.' : `${ok} taxas atualizadas.`
      )
    } catch (error) {
      await invalidate(['taxas'], { refetchType: 'all' })
      showToast.error(
        error instanceof Error
          ? ok > 0
            ? `Salvamos ${ok} de ${pendentes.length}. ${error.message}`
            : error.message
          : 'Não foi possível salvar as taxas.'
      )
    } finally {
      setSalvandoLista(false)
    }
  }, [drafts, edicoesPendentes, invalidate, salvandoLista, taxasEntrega])

  const handleConfirmarExclusao = useCallback(async () => {
    const taxa = taxaExcluindo
    if (!taxa || excluirLockRef.current) return

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão inválida. Faça login novamente.')
      return
    }

    excluirLockRef.current = true
    setExcluindo(true)
    try {
      const res = await fetchGestorApi(`/api/taxas/${encodeURIComponent(taxa.getId())}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 204 || res.ok) {
        showToast.success('Taxa removida.')
        setDrafts(prev => {
          const { [taxa.getId()]: _, ...rest } = prev
          return rest
        })
        await invalidate(['taxas'], { refetchType: 'all' })
        setTaxaExcluindo(null)
        return
      }

      const err = await res.json().catch(() => ({}))
      const msg =
        (typeof err.error === 'string' && err.error) ||
        (typeof err.message === 'string' && err.message) ||
        'Erro ao excluir taxa.'
      throw new Error(msg)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao excluir taxa.')
    } finally {
      excluirLockRef.current = false
      setExcluindo(false)
    }
  }, [invalidate, taxaExcluindo])

  const ocupado = enviando || salvandoLista || excluindo

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="shrink-0 px-4 pt-2 text-[11px] leading-snug text-secondary-text">
        Crie taxas especiais para seu Catálogo. Edite, ative/desative ou remova suas taxas manuais.
      </p>

      <form
        className="shrink-0 space-y-2 px-3 py-3"
        onSubmit={event => {
          event.preventDefault()
          void handleCriar()
        }}
      >
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
              Nome
            </span>
            <input
              type="text"
              value={nome}
              onChange={event => setNome(event.target.value)}
              disabled={ocupado}
              placeholder="Ex.: Entrega especial"
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-primary-text outline-none focus:border-primary disabled:opacity-50"
            />
          </label>
          <label className="w-[7.5rem] shrink-0">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
              Valor
            </span>
            <div className="flex items-center rounded-lg border border-gray-200 bg-white">
              <span className="shrink-0 pl-2 pr-0.5 text-xs text-secondary-text">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={valorTexto}
                onChange={event => setValorTexto(event.target.value)}
                disabled={ocupado}
                placeholder="0,00"
                className="w-full min-w-0 bg-transparent py-2 pr-2 text-left text-sm text-primary-text outline-none disabled:opacity-50"
              />
            </div>
          </label>
        </div>
        <button
          type="submit"
          disabled={ocupado}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? 'Salvando…' : 'Criar taxa'}
        </button>
      </form>

      <div
        className={`grid shrink-0 ${COLUNAS_LISTA} items-center gap-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-secondary-text`}
      >
        <span>Nome</span>
        <span>Valor</span>
        <span className="sr-only">Status</span>
        <span className="text-right">Ações</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto border-t border-gray-100">
        {taxasQuery.isPending ? (
          <div className="flex justify-center p-6">
            <JiffyLoading />
          </div>
        ) : taxasEntrega.length === 0 ? (
          <p className="p-4 text-center text-xs text-secondary-text">
            Nenhuma taxa de entrega manual cadastrada.
          </p>
        ) : (
          <div>
            {taxasEntrega.map(taxa => {
              const draft = drafts[taxa.getId()] ?? {
                nome: taxa.getNome(),
                valor: valorTextoDaTaxa(taxa),
              }
              return (
                <div
                  key={taxa.getId()}
                  className={`grid ${COLUNAS_LISTA} items-center gap-1 px-3 py-2 text-sm hover:bg-gray-50`}
                >
                  <input
                    type="text"
                    aria-label={`Nome ${taxa.getNome()}`}
                    value={draft.nome}
                    disabled={ocupado}
                    onChange={event =>
                      setDrafts(prev => ({
                        ...prev,
                        [taxa.getId()]: { ...draft, nome: event.target.value },
                      }))
                    }
                    className="min-w-0 truncate rounded-md border border-gray-200 bg-white px-1.5 py-1 text-sm font-medium text-primary-text outline-none focus:border-primary disabled:opacity-50"
                  />
                  <div className="flex items-center rounded-md border border-gray-200 bg-white">
                    <span className="shrink-0 pl-1.5 pr-0.5 text-[10px] text-secondary-text">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Valor ${taxa.getNome()}`}
                      value={draft.valor}
                      disabled={ocupado}
                      onChange={event =>
                        setDrafts(prev => ({
                          ...prev,
                          [taxa.getId()]: { ...draft, valor: event.target.value },
                        }))
                      }
                      onFocus={event => event.currentTarget.select()}
                      className="w-full min-w-0 bg-transparent py-1 pr-1.5 text-left text-sm tabular-nums text-primary-text outline-none disabled:opacity-50"
                    />
                  </div>
                  <JiffyIconSwitch
                    checked={taxa.isAtivo()}
                    onChange={e => void handleToggleAtivo(taxa, e.target.checked)}
                    disabled={ocupado || savingAtivoParaId === taxa.getId()}
                    size="xs"
                    inputProps={{
                      'aria-label': `Ativar taxa ${taxa.getNome()}`,
                    }}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setTaxaExcluindo(taxa)}
                      disabled={ocupado}
                      className="rounded-lg p-1.5 text-secondary-text hover:bg-red-50 hover:text-red-600"
                      aria-label={`Excluir taxa ${taxa.getNome()}`}
                      title="Excluir taxa"
                    >
                      <MdDeleteOutline className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )
            })}
            {podeCarregarMais ? (
              <button
                type="button"
                onClick={() => void taxasQuery.fetchNextPage()}
                disabled={ocupado}
                className="w-full px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-gray-50 disabled:opacity-50"
              >
                Carregar mais
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-gray-100 px-3 py-2">
        <CoberturaBotaoSalvarTaxasLote
          pendente={edicoesPendentes}
          disabled={ocupado || taxasEntrega.length === 0 || !edicoesPendentes}
          salvando={salvandoLista}
          onClick={() => void handleSalvarEdicoesLista()}
        />
      </div>

      <Dialog
        open={taxaExcluindo != null}
        onOpenChange={open => {
          if (!open && !excluindo) setTaxaExcluindo(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir taxa manual?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-secondary-text">
            A taxa{' '}
            <span className="font-semibold text-primary-text">
              {taxaExcluindo?.getNome().trim() || 'sem nome'}
            </span>{' '}
            será removida do catálogo.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setTaxaExcluindo(null)}
              disabled={excluindo}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-secondary-text"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmarExclusao()}
              disabled={excluindo}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {excluindo ? 'Excluindo…' : 'Excluir'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
