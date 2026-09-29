'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { IntegracaoCatalogoItem } from '@/src/presentation/components/features/delivery/integracoes/catalogoIntegracoes'
import {
  AIQFOME_CARDAPIO_PATH,
  AIQFOME_CARDAPIO_TAB_ID,
  AIQFOME_CARDAPIO_TAB_LABEL,
} from '@/src/presentation/components/features/delivery/integracoes/cardapioAiqfomeRoutes'
import { useConectarMarketplace } from '@/src/presentation/hooks/useConectarMarketplace'
import { useConexaoMarketplace } from '@/src/presentation/hooks/useConexaoMarketplace'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'

export function MarketplaceIntegracaoCard({ item }: { item: IntegracaoCatalogoItem }) {
  const router = useRouter()
  const { toGestao } = useGestaoPath()
  const addTab = useTabsStore(s => s.addTab)
  const [merchantIdOd, setMerchantIdOd] = useState('')
  const [abrindo, setAbrindo] = useState(false)
  const { conectar, enviando } = useConectarMarketplace()
  const status = useConexaoMarketplace(item.marketplace)
  const campoId = `marketplace-merchant-${item.marketplace.toLowerCase()}`
  const conectada = status.data?.conectada === true
  const lojaId = status.data?.merchantIdOd
  const podeSincronizar = conectada && item.marketplace === 'AIQFOME'
  const destinoSincronizar = toGestao(AIQFOME_CARDAPIO_PATH)

  useEffect(() => {
    if (!podeSincronizar) return
    void router.prefetch(destinoSincronizar)
  }, [destinoSincronizar, podeSincronizar, router])

  const abrirSincronizacao = () => {
    if (abrindo) return
    setAbrindo(true)
    addTab({
      id: AIQFOME_CARDAPIO_TAB_ID,
      label: AIQFOME_CARDAPIO_TAB_LABEL,
      path: AIQFOME_CARDAPIO_PATH,
    })
    router.push(destinoSincronizar)
  }

  return (
    <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
          style={{ background: item.corMarca }}
          aria-hidden
        >
          {item.marca}
        </span>
        <div>
          <h2 className="text-base font-semibold text-primary-text">{item.nome}</h2>
          <p className="mt-1 text-sm text-secondary-text">{item.descricao}</p>
        </div>
      </div>

      {conectada ? (
        <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Loja conectada{lojaId ? ` · ${lojaId}` : ''}.
        </p>
      ) : (
        <>
          <label htmlFor={campoId} className="mb-1 text-sm font-medium text-primary-text">
            {item.rotuloIdLoja}
          </label>
          <input
            id={campoId}
            type="text"
            autoComplete="off"
            value={merchantIdOd}
            onChange={event => setMerchantIdOd(event.target.value)}
            placeholder={item.placeholderIdLoja}
            className="mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-primary-text outline-none ring-primary/20 focus:border-primary focus:ring-2"
          />
        </>
      )}

      {podeSincronizar ? (
        <button
          type="button"
          onClick={abrirSincronizacao}
          disabled={abrindo}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
        >
          {abrindo ? 'Abrindo…' : 'Sincronizar'}
        </button>
      ) : !conectada ? (
        <button
          type="button"
          onClick={() => void conectar({ marketplace: item.marketplace, merchantIdOd })}
          disabled={enviando}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? 'Conectando…' : item.cta}
        </button>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-secondary-text">{item.ajuda}</p>
    </article>
  )
}
