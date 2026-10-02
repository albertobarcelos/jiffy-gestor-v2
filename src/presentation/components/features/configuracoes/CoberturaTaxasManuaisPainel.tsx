'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Taxa } from '@/src/domain/entities/Taxa'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTaxasInfinite } from '@/src/presentation/hooks/useTaxas'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'
import { parseTaxaDraftCobertura } from '@/src/presentation/components/features/configuracoes/coberturaPainelAbas'

function formatarValorTaxaEntrega(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

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

/**
 * Aba Taxas Manuais do painel de cobertura: cria taxas do catálogo com `tipo: "entrega"`.
 */
export function CoberturaTaxasManuaisPainel() {
  const invalidate = useInvalidateTenantQueries()
  const taxasQuery = useTaxasInfinite({ limit: 50, staleTime: 15_000 })
  const [nome, setNome] = useState('')
  const [valorTexto, setValorTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [savingAtivoParaId, setSavingAtivoParaId] = useState<string | null>(null)
  const savingAtivoLockRef = useRef(false)

  const taxasEntrega = useMemo(() => {
    const pages = taxasQuery.data?.pages ?? []
    return pages
      .flatMap(page => page.taxas)
      .filter(taxa => taxa.getTipo().toLowerCase() === 'entrega')
  }, [taxasQuery.data])

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
      if (savingAtivoLockRef.current) return
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Sessão inválida. Faça login novamente.')
        return
      }

      savingAtivoLockRef.current = true
      setSavingAtivoParaId(taxa.getId())
      try {
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
        const vr = detalhe.valor
        const valorNum =
          typeof vr === 'number' ? vr : parseFloat(vr != null ? String(vr) : '0')
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
            nome: String(detalhe.nome ?? taxa.getNome()),
            valor: Number.isFinite(valorNum) ? valorNum : taxa.getValor(),
            tipo: 'entrega',
            ativo: novoAtivo,
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
              'Erro ao atualizar status.'
          )
        }

        showToast.success(novoAtivo ? 'Taxa ativada.' : 'Taxa desativada.')
        await invalidate(['taxas'], { refetchType: 'all' })
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar taxa.')
      } finally {
        savingAtivoLockRef.current = false
        setSavingAtivoParaId(null)
      }
    },
    [invalidate]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form
        className="space-y-2 border-b border-gray-100 px-3 py-3"
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
              disabled={enviando}
              placeholder="Ex.: Entrega especial"
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-primary-text outline-none focus:border-primary disabled:opacity-50"
            />
          </label>
          <label className="w-[7.5rem] shrink-0">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
              Valor
            </span>
            <div className="flex items-center rounded-lg border border-gray-200 bg-white">
              <span className="pl-2 text-xs text-secondary-text">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={valorTexto}
                onChange={event => setValorTexto(event.target.value)}
                disabled={enviando}
                placeholder="0,00"
                className="w-full min-w-0 bg-transparent px-1.5 py-2 text-sm text-primary-text outline-none disabled:opacity-50"
              />
            </div>
          </label>
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? 'Salvando…' : 'Criar taxa'}
        </button>
      </form>

      <div className="grid grid-cols-[2fr_1fr_1fr] items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
        <span>Nome</span>
        <span className="text-center">Valor</span>
        <span className="text-center">Status</span>
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
            {taxasEntrega.map(taxa => (
              <div
                key={taxa.getId()}
                className="grid grid-cols-[2fr_1fr_1fr] items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="min-w-0 truncate font-medium text-primary-text">
                  {taxa.getNome()}
                </span>
                <span className="text-center tabular-nums text-secondary-text">
                  {formatarValorTaxaEntrega(taxa.getValor())}
                </span>
                <div className="flex justify-center">
                  <JiffyIconSwitch
                    checked={taxa.isAtivo()}
                    onChange={e => void handleToggleAtivo(taxa, e.target.checked)}
                    disabled={savingAtivoParaId === taxa.getId()}
                    size="xs"
                    inputProps={{
                      'aria-label': `Ativar taxa ${taxa.getNome()}`,
                    }}
                  />
                </div>
              </div>
            ))}
            {podeCarregarMais ? (
              <button
                type="button"
                onClick={() => void taxasQuery.fetchNextPage()}
                className="w-full px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-gray-50"
              >
                Carregar mais
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
