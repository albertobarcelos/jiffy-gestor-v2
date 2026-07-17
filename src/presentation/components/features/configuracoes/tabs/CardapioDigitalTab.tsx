'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { MdOpenInNew, MdPalette, MdSchedule, MdShare, MdStorefront } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import {
  useAtualizarEmpresaDelivery,
  useCriarEmpresaDelivery,
  useEmpresaDeliveryMe,
} from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import {
  normalizeDeliverySlug,
  validateDeliverySlug,
} from '@/src/shared/utils/slugDelivery'
import { compartilharLinkDelivery } from '@/src/presentation/components/features/delivery-publico/shared/utils/compartilharProdutoDelivery'

export function CardapioDigitalTab() {
  const { empresa } = useEmpresaMe()
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const criarMutation = useCriarEmpresaDelivery()
  const atualizarMutation = useAtualizarEmpresaDelivery()

  const [slug, setSlug] = useState('')
  const [slugErro, setSlugErro] = useState<string | null>(null)

  const formularioHidratadoRef = useRef(false)

  const empresaDelivery = empresaDeliveryQuery.data
  const configurado = empresaDelivery != null
  const carregando =
    empresaDeliveryQuery.isPending || criarMutation.isPending || atualizarMutation.isPending

  const linkPublico = useMemo(() => {
    if (!slug.trim()) return ''
    if (typeof window === 'undefined') return `/cardapio/${slug.trim()}`
    return `${window.location.origin}/cardapio/${slug.trim()}`
  }, [slug])

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

  const handleSlugBlur = useCallback(() => {
    const normalizado = normalizeDeliverySlug(slug)
    setSlug(normalizado)
    setSlugErro(validateDeliverySlug(normalizado))
  }, [slug])

  const compartilharLink = useCallback(async () => {
    if (!linkPublico) {
      showToast.error('Informe um slug válido antes de compartilhar o link.')
      return
    }
    await compartilharLinkDelivery({
      title: 'Cardápio digital',
      text: 'Confira nosso cardápio online',
      url: linkPublico,
    })
  }, [linkPublico])

  const handleSalvar = useCallback(async () => {
    const slugNormalizado = normalizeDeliverySlug(slug)
    const erroSlug = validateDeliverySlug(slugNormalizado)
    if (erroSlug) {
      setSlugErro(erroSlug)
      showToast.error(erroSlug)
      return
    }

    try {
      if (configurado) {
        await atualizarMutation.mutateAsync({ slug: slugNormalizado })
        showToast.success('Empresa Delivery atualizada.')
      } else {
        await criarMutation.mutateAsync({ slug: slugNormalizado })
        formularioHidratadoRef.current = false
        showToast.success('Empresa Delivery ativada! O catálogo foi espelhado do ERP.')
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível salvar as configurações.'
      showToast.error(msg)
    }
  }, [atualizarMutation, configurado, criarMutation, slug])

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
          Não foi possível carregar os dados da Empresa Delivery.
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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <MdStorefront className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-text">Empresa Delivery</h1>
            <p className="mt-1 text-sm text-secondary-text">
              Configure o link público da loja online.
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="empresa-delivery-slug" className="text-sm font-semibold text-primary-text">
                Link público da loja
              </label>
              <p className="mt-0.5 text-xs text-secondary-text">
                Apenas letras minúsculas, números e hífens (mínimo 3 caracteres).
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center rounded-lg border border-gray-200 bg-gray-50">
                  <span className="shrink-0 pl-3 text-sm text-secondary-text">/cardapio/</span>
                  <input
                    id="empresa-delivery-slug"
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
              </div>
              {slugErro ? <p className="mt-1 text-xs text-red-600">{slugErro}</p> : null}
            </div>

            {configurado && linkPublico ? (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary-text">
                  Seu link completo
                </p>
                <p className="mt-1 break-all text-sm font-medium text-primary-text">
                  {linkPublico}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void compartilharLink()}
                    disabled={carregando}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-secondary px-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <MdShare className="h-4 w-4" aria-hidden />
                    Compartilhar link
                  </button>
                  <a
                    href={linkPublico}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-secondary px-3 text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
                  >
                    <MdOpenInNew className="h-4 w-4" aria-hidden />
                    Abrir loja online
                  </a>
                </div>
              </div>
            ) : null}

            {configurado ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        Personalizar loja online
                      </p>
                      <p className="mt-0.5 text-xs text-secondary-text">
                        Ajuste layout, cores, tipografia e categorias do app público.
                      </p>
                    </div>
                    <Link
                      href="/configuracoes/empresa-delivery/design"
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-secondary px-4 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10"
                    >
                      <MdPalette className="h-4 w-4" aria-hidden />
                      Design
                    </Link>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        Horários e agendamento
                      </p>
                      <p className="mt-0.5 text-xs text-secondary-text">
                        Defina turnos de funcionamento, lead time e janelas para pedidos
                        agendados.
                      </p>
                    </div>
                    <Link
                      href="/configuracoes/empresa-delivery/agendamento"
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-secondary px-4 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10"
                    >
                      <MdSchedule className="h-4 w-4" aria-hidden />
                      Configurar
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            {!configurado ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Escolha um slug e clique em &quot;Ativar Empresa Delivery&quot; para publicar sua
                loja online.
              </p>
            ) : null}
          </div>
        </section>

        <div className="flex justify-end pb-4">
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
                : 'Ativar Empresa Delivery'}
          </button>
        </div>
      </div>
    </div>
  )
}
