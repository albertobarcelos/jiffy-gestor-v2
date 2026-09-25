'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MdLink, MdMenuBook, MdShare, MdStorefront, type IconType } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import {
  useAtualizarEmpresaDelivery,
  useCriarEmpresaDelivery,
  useEmpresaDeliveryMe,
} from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useMenuDeliveryId } from '@/src/presentation/hooks/useMenuDeliveryId'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import {
  normalizeDeliverySlug,
  validateDeliverySlug,
} from '@/src/shared/utils/slugDelivery'
import { MenuParametroEmpresaSelect } from '@/src/presentation/components/features/configuracoes/MenuParametroEmpresaSelect'
import { DeliveryPendenciasAlert } from '@/src/presentation/components/features/delivery/configuracoes/DeliveryPendenciasAlert'
import { EMPRESA_DELIVERY_PENDENCIA_TYPES } from '@/src/shared/constants/empresaDeliveryPendencias'
import {
  filtrarPendenciasObrigatorias,
  lojaDeliveryDisponivel,
} from '@/src/shared/constants/empresaDeliveryPendencias'
import { getCardapioSlugInputPrefix, buildCardapioLojaUrl } from '@/src/shared/utils/cardapioPublicUrl'
import { compartilharLinkDelivery } from '@/src/presentation/components/features/delivery-publico/shared/utils/compartilharProdutoDelivery'

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
  const slugInputPrefix = getCardapioSlugInputPrefix()
  const { empresa } = useEmpresaMe()
  const { menuDeliveryId: menuDeliveryIdSalvo } = useMenuDeliveryId()
  const { data: menusData, isPending: menusPending } = useMenus({ limit: 2 })
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const criarMutation = useCriarEmpresaDelivery()
  const atualizarMutation = useAtualizarEmpresaDelivery()

  const [slug, setSlug] = useState('')
  const [slugErro, setSlugErro] = useState<string | null>(null)
  const [menuDeliveryId, setMenuDeliveryId] = useState<string | null>(null)
  const formularioHidratadoRef = useRef(false)

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
  const carregando =
    empresaDeliveryQuery.isPending || criarMutation.isPending || atualizarMutation.isPending

  useEffect(() => {
    if (formularioHidratadoRef.current || empresaDeliveryQuery.isPending) return

    if (empresaDelivery) {
      formularioHidratadoRef.current = true
      setSlug(empresaDelivery.slug)
      return
    }

    if (empresaDeliveryQuery.isSuccess && !empresaDelivery) {
      formularioHidratadoRef.current = true
      const sugestao = empresa?.nomeExibicao
        ? normalizeDeliverySlug(empresa.nomeExibicao)
        : ''
      if (sugestao.length >= 3) {
        setSlug(sugestao)
      }
    }
  }, [
    empresa?.nomeExibicao,
    empresaDelivery,
    empresaDeliveryQuery.isPending,
    empresaDeliveryQuery.isSuccess,
  ])

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

  const handleSlugBlur = useCallback(() => {
    const normalizado = normalizeDeliverySlug(slug)
    setSlug(normalizado)
    setSlugErro(validateDeliverySlug(normalizado))
  }, [slug])

  const handleCompartilharLink = useCallback(async () => {
    const slugNormalizado = normalizeDeliverySlug(slug)
    const erroSlug = validateDeliverySlug(slugNormalizado)
    if (erroSlug) {
      setSlugErro(erroSlug)
      showToast.error(erroSlug)
      return
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : undefined
    const url = buildCardapioLojaUrl(slugNormalizado, origin)
    if (!url) {
      showToast.error('Informe o link da loja para compartilhar.')
      return
    }

    const nomeLoja = empresa?.nomeExibicao?.trim()
    await compartilharLinkDelivery({
      title: nomeLoja ? `Cardápio — ${nomeLoja}` : 'Cardápio da loja',
      text: nomeLoja
        ? `Peça pelo cardápio da ${nomeLoja}`
        : 'Peça pelo nosso cardápio',
      url,
    })
  }, [empresa?.nomeExibicao, slug])

  const handleSalvar = useCallback(async () => {
    const slugNormalizado = normalizeDeliverySlug(slug)
    const erroSlug = validateDeliverySlug(slugNormalizado)
    if (erroSlug) {
      setSlugErro(erroSlug)
      showToast.error(erroSlug)
      return
    }

    const payload = {
      slug: slugNormalizado,
      parametroDelivery: { menuDeliveryId },
    }

    try {
      if (configurado) {
        await atualizarMutation.mutateAsync(payload)
      } else {
        await criarMutation.mutateAsync(payload)
        formularioHidratadoRef.current = false
      }

      showToast.success(
        configurado ? 'Delivery atualizado.' : 'Delivery ativado! O catálogo foi espelhado do ERP.'
      )
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível salvar as configurações.'
      showToast.error(msg)
    }
  }, [atualizarMutation, configurado, criarMutation, menuDeliveryId, slug])

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
            Defina o slug do link público e o cardápio (menu) publicado na loja online.
          </p>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <MdStorefront className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-text">Nome da loja e cardápio</h1>
              <p className="mt-1 text-sm text-secondary-text">
                Defina o slug do link público e o cardápio (menu) publicado na loja online.
              </p>
            </div>
          </div>
        )}

        {configurado &&
        !lojaDeliveryDisponivel(empresaDelivery ?? undefined) &&
        pendenciasDestePasso.length > 0 ? (
          <DeliveryPendenciasAlert variant="bloqueante" pendencias={pendenciasDestePasso} />
        ) : null}

        <div className="space-y-4">
          <CardapioOpcaoCard
            icon={MdLink}
            title="Link público da loja"
            description="Apenas letras minúsculas, números e hífens (mínimo 3 caracteres)."
          >
            <div className="flex min-w-0 flex-1 items-center rounded-lg border border-gray-200 bg-gray-50">
              <span className="shrink-0 pl-3 text-sm text-secondary-text">
                {slugInputPrefix}
              </span>
              <input
                id="delivery-hub-slug"
                type="text"
                value={slug}
                disabled={carregando}
                onChange={e => {
                  setSlug(e.target.value.toLowerCase())
                  setSlugErro(null)
                }}
                onBlur={handleSlugBlur}
                placeholder="minha-loja"
                className="h-10 min-w-0 flex-1 rounded-r-lg bg-transparent px-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            {slugErro ? <p className="text-xs text-red-600">{slugErro}</p> : null}
            <button
              type="button"
              onClick={() => void handleCompartilharLink()}
              disabled={carregando || !normalizeDeliverySlug(slug)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-alternate/30 bg-alternate/10 px-4 text-sm font-semibold text-alternate transition-colors hover:bg-alternate/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MdShare className="h-4 w-4" aria-hidden />
              Compartilhar link
            </button>
          </CardapioOpcaoCard>

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
              disabled={carregando}
            />
          </CardapioOpcaoCard>
        </div>

        {!configurado ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Escolha um slug e clique em &quot;Ativar Delivery&quot; para publicar sua loja online.
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSalvar()}
            disabled={carregando}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-secondary px-6 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando
              ? 'Salvando...'
              : configurado
                ? 'Salvar alterações'
                : 'Ativar Delivery'}
          </button>
        </div>
      </div>
    </div>
  )
}
