'use client'

import { useDeliveryThemeContext } from '../../../shared/components/DeliveryThemeScope'

type DeliveryCarrinhoEnderecoTopoProps = {
  /** Fallback se o design não tiver nome (ex.: API pública). */
  nomeEmpresaFallback?: string
  /** Fallback se o design não tiver logo. */
  logoUrlFallback?: string | null
  /** Fallback se o design não tiver capa. */
  capaUrlFallback?: string | null
  /**
   * Cola a faixa no topo do conteúdo (compensa padding do modal, ex.: revisão).
   * Só faz sentido com capa em full-bleed.
   */
  colarNoTopo?: boolean
}

/** Topo do carrinho: logo + nome da empresa Delivery. */
export function DeliveryCarrinhoEnderecoTopo({
  nomeEmpresaFallback = '',
  logoUrlFallback = null,
  capaUrlFallback = null,
  colarNoTopo = false,
}: DeliveryCarrinhoEnderecoTopoProps) {
  const { config } = useDeliveryThemeContext()
  const nomeLoja =
    config.cabecalho.nomeExibicao.trim() || nomeEmpresaFallback.trim() || 'Sua loja'
  const logoUrl = config.cabecalho.logoUrl || logoUrlFallback
  const capaUrl = config.cabecalho.capaUrl || capaUrlFallback
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '8px'
  const comCapa = Boolean(capaUrl)

  return (
    <div
      className="relative flex min-h-[5.5rem] items-center gap-3 overflow-hidden px-4 py-5"
      style={{
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        ...(colarNoTopo ? { marginTop: '-1rem' } : {}),
        backgroundColor: 'var(--delivery-primary-dark)',
        color: 'var(--delivery-btn-text, #ffffff)',
        backgroundImage: comCapa ? `url(${capaUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        className="relative z-[1] flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border-2 border-white bg-white/15"
        style={{ borderRadius: logoRadius }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="text-lg font-semibold text-white"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.55)' }}
          >
            {(nomeLoja[0] ?? '?').toUpperCase()}
          </span>
        )}
      </div>
      <p
        className="relative z-[1] min-w-0 flex-1 truncate text-base font-semibold text-white"
        style={{ textShadow: comCapa ? '0 1px 3px rgba(0,0,0,0.65)' : undefined }}
      >
        {nomeLoja}
      </p>
    </div>
  )
}
