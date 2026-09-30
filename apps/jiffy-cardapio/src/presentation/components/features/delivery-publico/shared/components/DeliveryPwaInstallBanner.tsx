'use client'

import { Download, Share, SquarePlus, X } from 'lucide-react'

type DeliveryPwaInstallBannerProps = {
  nomeLoja: string | null
  variante?: 'flutuante' | 'embutido'
  onInstalar: () => void
  onAgoraNao: () => void
  onNaoMostrarDeNovo: () => void
}

export function DeliveryPwaInstallBanner({
  nomeLoja,
  variante = 'flutuante',
  onInstalar,
  onAgoraNao,
  onNaoMostrarDeNovo,
}: DeliveryPwaInstallBannerProps) {
  const titulo = nomeLoja?.trim()
    ? `Adicione ${nomeLoja.trim()} à tela inicial`
    : 'Adicione o cardápio à tela inicial'
  const subtitulo =
    'Acesse mais rápido, como um app — sem ocupar espaço da loja de aplicativos.'

  const card = (
    <div
      className="w-full rounded-2xl border p-3 text-left shadow-lg"
      style={{
        borderColor: 'var(--delivery-border)',
        backgroundColor: 'var(--delivery-surface, #fff)',
      }}
      role="dialog"
      aria-label={titulo}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
        >
          <Download
            className="h-5 w-5"
            style={{ color: 'var(--delivery-primary)' }}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold delivery-text-primary">{titulo}</p>
          <p className="mt-0.5 text-xs leading-relaxed delivery-text-secondary">{subtitulo}</p>
        </div>
        <button
          type="button"
          onClick={onAgoraNao}
          className="shrink-0 rounded-lg p-1 delivery-text-secondary"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onInstalar}
          className="h-10 w-full rounded-xl bg-black text-sm font-semibold text-white"
        >
          Adicionar à tela inicial
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAgoraNao}
            className="h-9 flex-1 rounded-xl text-xs font-semibold delivery-text-secondary"
            style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={onNaoMostrarDeNovo}
            className="h-9 flex-1 rounded-xl text-xs font-medium delivery-text-secondary underline-offset-2 hover:underline"
          >
            Não mostrar de novo
          </button>
        </div>
      </div>
    </div>
  )

  if (variante === 'embutido') {
    return <div className="mt-4 w-full">{card}</div>
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-md">{card}</div>
    </div>
  )
}

type DeliveryPwaInstallGuideProps = {
  open: boolean
  onClose: () => void
}

export function DeliveryPwaInstallIosGuide({ open, onClose }: DeliveryPwaInstallGuideProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-ios-guide-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="pwa-ios-guide-title" className="text-base font-semibold text-gray-900">
          Como adicionar no iPhone
        </h2>
        <ol className="mt-3 space-y-3 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <Share className="h-4 w-4" aria-hidden />
            </span>
            <span>
              Toque em <strong>Compartilhar</strong> na barra do Safari.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <SquarePlus className="h-4 w-4" aria-hidden />
            </span>
            <span>
              Escolha <strong>Adicionar à Tela de Início</strong> e confirme.
            </span>
          </li>
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-10 w-full rounded-xl bg-gray-900 text-sm font-semibold text-white"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}

export function DeliveryPwaInstallAndroidGuide({ open, onClose }: DeliveryPwaInstallGuideProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-android-guide-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="pwa-android-guide-title" className="text-base font-semibold text-gray-900">
          Como adicionar no Android
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
          <li>
            Toque no menu <strong>⋮</strong> do Chrome (canto superior).
          </li>
          <li>
            Escolha <strong>Instalar app</strong> ou{' '}
            <strong>Adicionar à tela inicial</strong>.
          </li>
          <li>Confirme para criar o atalho.</li>
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-10 w-full rounded-xl bg-gray-900 text-sm font-semibold text-white"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}
