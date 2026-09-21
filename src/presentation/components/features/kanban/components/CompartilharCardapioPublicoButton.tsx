'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Popover } from '@mui/material'
import { FaWhatsapp } from 'react-icons/fa'
import { MdCheck, MdContentCopy, MdShare } from 'react-icons/md'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { deliveryHubDesignSectionPath } from '@/src/presentation/components/features/delivery-publico/shared/constants/designTabs'
import { showToast } from '@/src/shared/utils/toast'
import {
  textoWhatsappCardapioPublico,
  urlCardapioPublicoParaCompartilhar,
} from '@/src/shared/utils/compartilharCardapioPublico'
import { abrirWhatsappCompartilhar } from '@/src/shared/utils/whatsappLink'

const BOTAO_TOOLBAR =
  'rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary'

export function CompartilharCardapioPublicoButton() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [copiado, setCopiado] = useState(false)
  const aberto = Boolean(anchorEl)
  const { data: empresaDelivery, isPending } = useEmpresaDeliveryMe()
  const { empresa } = useEmpresaMe()
  const { toGestao } = useGestaoPath()

  const slug = empresaDelivery?.slug?.trim() ?? ''
  const url = useMemo(() => {
    if (!slug) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined
    return urlCardapioPublicoParaCompartilhar(slug, origin)
  }, [slug])

  const fechar = useCallback(() => {
    setAnchorEl(null)
    setCopiado(false)
  }, [])

  const copiarLink = useCallback(async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      showToast.success('Link copiado')
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      showToast.error('Não foi possível copiar o link')
    }
  }, [url])

  const compartilharWhatsapp = useCallback(() => {
    if (!url) return
    abrirWhatsappCompartilhar(
      textoWhatsappCardapioPublico(empresa?.nomeExibicao, url)
    )
  }, [empresa?.nomeExibicao, url])

  return (
    <>
      <button
        type="button"
        className={BOTAO_TOOLBAR}
        title="Compartilhar cardápio público"
        aria-label="Compartilhar cardápio público"
        aria-expanded={aberto}
        aria-haspopup="dialog"
        onClick={event => setAnchorEl(event.currentTarget)}
      >
        <MdShare className="h-5 w-5" aria-hidden />
      </button>

      <Popover
        open={aberto}
        anchorEl={anchorEl}
        onClose={fechar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              width: 320,
              maxWidth: 'calc(100vw - 24px)',
              borderRadius: 1.5,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            },
          },
        }}
      >
        <div className="flex flex-col gap-3 p-3" role="dialog" aria-label="Compartilhar cardápio público">
          <div>
            <p className="text-sm font-semibold text-primary-text">Cardápio público</p>
            <p className="mt-0.5 text-xs text-secondary-text">
              Copie o link ou envie direto no WhatsApp.
            </p>
          </div>

          {isPending ? (
            <div className="h-8 animate-pulse rounded-lg bg-gray-200/80" aria-hidden />
          ) : !url ? (
            <p className="text-xs text-secondary-text">
              Defina o nome da loja no Delivery para gerar o link.{' '}
              <Link
                href={toGestao(deliveryHubDesignSectionPath('cardapio'))}
                onClick={fechar}
                className="font-semibold text-primary hover:underline"
              >
                Configurar
              </Link>
            </p>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <input
                  readOnly
                  value={url}
                  onFocus={event => event.currentTarget.select()}
                  className="h-8 min-w-0 flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs text-primary-text"
                  aria-label="Link do cardápio público"
                />
                <button
                  type="button"
                  onClick={() => void copiarLink()}
                  className={BOTAO_TOOLBAR}
                  title={copiado ? 'Copiado' : 'Copiar link'}
                  aria-label={copiado ? 'Link copiado' : 'Copiar link do cardápio'}
                >
                  {copiado ? (
                    <MdCheck className="h-5 w-5 text-green-600" aria-hidden />
                  ) : (
                    <MdContentCopy className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={compartilharWhatsapp}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#1ebe5d]"
              >
                <FaWhatsapp className="h-4 w-4" aria-hidden />
                WhatsApp
              </button>
            </>
          )}
        </div>
      </Popover>
    </>
  )
}
