'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MdMenuBook, MdStorefront, type IconType } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import {
  useAtualizarEmpresaDelivery,
  useEmpresaDeliveryMe,
} from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useMenuDeliveryId } from '@/src/presentation/hooks/useMenuDeliveryId'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { MenuParametroEmpresaSelect } from '@/src/presentation/components/features/configuracoes/MenuParametroEmpresaSelect'
import { DeliveryPendenciasAlert } from '@/src/presentation/components/features/delivery/configuracoes/DeliveryPendenciasAlert'
import { EMPRESA_DELIVERY_PENDENCIA_TYPES } from '@/src/shared/constants/empresaDeliveryPendencias'
import {
  filtrarPendenciasObrigatorias,
  lojaDeliveryDisponivel,
} from '@/src/shared/constants/empresaDeliveryPendencias'
import { deliveryHubDesignSectionPath } from '@/src/presentation/components/features/delivery-publico/shared/constants/designTabs'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import Link from 'next/link'

function CardapioOpcaoCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: IconType
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex w-24 shrink-0 items-center justify-center bg-alternate/20 text-alternate sm:w-28">
        <Icon className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-3 p-4 md:p-5">
        <div>
          <h2 className="text-base font-bold text-primary-text">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-secondary-text">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  )
}

export function DeliveryNomeCardapioView({ embedded = false }: { embedded?: boolean }) {
  const { toGestao } = useGestaoPath()
  const { menuDeliveryId: menuDeliveryIdSalvo } = useMenuDeliveryId()
  const { data: menusData, isPending: menusPending } = useMenus({ limit: 2 })
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const atualizarMutation = useAtualizarEmpresaDelivery()

  const [menuDeliveryId, setMenuDeliveryId] = useState<string | null>(null)

  const empresaDelivery = empresaDeliveryQuery.data
  const pendencias = empresaDelivery?.pendencias ?? []
  const pendenciasDestePasso = useMemo(() => {
    const tipos = new Set<string>([
      EMPRESA_DELIVERY_PENDENCIA_TYPES.EMPRESA_DELIVERY_NAO_CONFIGURADA,
      EMPRESA_DELIVERY_PENDENCIA_TYPES.CARDAPIO_DELIVERY_NAO_CONFIGURADO,
    ])
    return filtrarPendenciasObrigatorias(pendencias).filter(p => tipos.has(p.type))
  }, [pendencias])
  const configurado = empresaDelivery != null
  const carregando = empresaDeliveryQuery.isPending || atualizarMutation.isPending

  useEffect(() => {
    if (menuDeliveryIdSalvo) {
      setMenuDeliveryId(menuDeliveryIdSalvo)
      return
    }

    if (menusPending) return

    const items = menusData?.items ?? []
    const total = menusData?.count ?? items.length
    if (total !== 1) return

    const principal = items.find(m => m.tipo === 'principal')
    const unicoId = principal?.id ?? items[0]?.id
    if (unicoId) setMenuDeliveryId(unicoId)
  }, [menuDeliveryIdSalvo, menusData, menusPending])

  const handleSalvar = useCallback(async () => {
    if (!configurado) {
      showToast.error('Defina o link público da loja em Cabeçalho antes de salvar o cardápio.')
      return
    }

    try {
      await atualizarMutation.mutateAsync({
        parametroDelivery: { menuDeliveryId },
      })
      showToast.success('Cardápio do delivery atualizado.')
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível salvar as configurações.'
      showToast.error(msg)
    }
  }, [atualizarMutation, configurado, menuDeliveryId])

  if (empresaDeliveryQuery.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <JiffyLoading />
      </div>
    )
  }

  if (empresaDeliveryQuery.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-semibold text-primary-text">
          Não foi possível carregar os dados do Delivery.
        </p>
        <p className="text-sm text-secondary-text">{empresaDeliveryQuery.error.message}</p>
        <button
          type="button"
          onClick={() => void empresaDeliveryQuery.refetch()}
          className="mt-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className={embedded ? 'mx-auto w-full max-w-[720px] space-y-6' : 'flex min-h-0 flex-1 flex-col overflow-y-auto'}>
      <div className={embedded ? 'space-y-6' : 'mx-auto w-full max-w-[720px] space-y-6 p-4 md:p-6'}>
        {embedded ? (
          <p className="text-sm text-secondary-text">
            Escolha o cardápio (menu) publicado na loja online e no delivery do Gestor.
          </p>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <MdStorefront className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-text">Cardápio do delivery</h1>
              <p className="mt-1 text-sm text-secondary-text">
                Escolha o cardápio (menu) publicado na loja online e no delivery do Gestor.
              </p>
            </div>
          </div>
        )}

        {configurado &&
        !lojaDeliveryDisponivel(empresaDelivery ?? undefined) &&
        pendenciasDestePasso.length > 0 ? (
          <DeliveryPendenciasAlert variant="bloqueante" pendencias={pendenciasDestePasso} />
        ) : null}

        {!configurado ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Ative o Delivery pelo{' '}
            <Link
              href={toGestao(deliveryHubDesignSectionPath('cabecalho'))}
              className="font-semibold underline"
            >
              link público em Cabeçalho
            </Link>{' '}
            antes de definir o cardápio.
          </p>
        ) : null}

        <CardapioOpcaoCard
          icon={MdMenuBook}
          title="Cardápio publicado no delivery"
          description="Produtos, preços e fotos do app público e do delivery manual no Gestor saem deste menu."
        >
          <MenuParametroEmpresaSelect
            id="delivery-hub-menu"
            label="Cardápio"
            value={menuDeliveryId}
            onChange={setMenuDeliveryId}
            disabled={carregando || !configurado}
          />
        </CardapioOpcaoCard>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSalvar()}
            disabled={carregando || !configurado}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-secondary px-6 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
