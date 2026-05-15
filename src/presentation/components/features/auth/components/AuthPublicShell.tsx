'use client'

import Image from 'next/image'
import { type ReactNode, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  JiffySidePanelModal,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { authFluid } from '@/src/presentation/components/features/auth/components/auth-input-fluid'
import { LoginVideoPlayer } from '@/src/presentation/components/features/auth/components/LoginVideoPlayer'

export type AuthPublicShellProps = {
  /** Rótulo do fluxo para leitores de tela / painel (`sr-only`). */
  title: string
  subtitle?: string
  /** Substitui o bloco padrão (título + subtítulo) dentro do card — ex.: hero da página de login. */
  headingSlot?: ReactNode
  children: ReactNode
  /**
   * Permite fechar o painel (clique fora ou ESC). Ao terminar a animação, navega para `/login`.
   * Sem botão X no canto — fluxos dispensáveis usam só overlay/teclado.
   * Na página de login deve ser `false` (não fecha ao clicar fora).
   * @default true
   */
  panelDismissible?: boolean
}

/**
 * Layout público de auth: fundo + vídeo à esquerda (desktop) + formulário no painel lateral (`JiffySidePanelModal`).
 * Rotas permanecem iguais; apenas o conteúdo do painel muda por página.
 */
export function AuthPublicShell({
  title,
  subtitle,
  headingSlot,
  children,
  panelDismissible = true,
}: AuthPublicShellProps) {
  const router = useRouter()
  const [panelOpen, setPanelOpen] = useState(true)

  const handleClose = useCallback(() => {
    setPanelOpen(false)
  }, [])

  const handleAfterClose = useCallback(() => {
    if (panelDismissible) {
      router.push('/login')
    }
  }, [panelDismissible, router])

  return (
    <div className="min-h-screen flex">
      <div
        className="w-full flex relative min-h-[100dvh]"
        style={{
          background: `linear-gradient(to bottom right, 
            var(--color-secondary-background), 
            var(--color-alternate), 
            var(--color-accent3))`,
        }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 z-0"
          style={{
            backgroundImage: "url('/images/fundo-login.jpeg')",
          }}
        />

        {/* Vídeo: escala com vmin/vw — adapta a DPI/escala do SO sem depender só de breakpoints fixos */}
        <div className="hidden md:flex md:w-1/2 md:max-lg:py-5 lg:py-8 items-center justify-center p-3 sm:p-5 md:p-6 relative z-10 min-h-0">
          <div className="w-full max-w-[min(360px,min(42vw,85vmin))] h-fit">
            <div className="bg-black/50 backdrop-blur-sm rounded-[20px] p-2 sm:p-3 border-[5px] border-accent1">
              <div className="aspect-[10/16] rounded-xl overflow-hidden w-full max-h-[min(78dvh,560px)]">
                <LoginVideoPlayer />
              </div>
            </div>
          </div>
        </div>

        <JiffySidePanelModal
          open={panelOpen}
          onClose={handleClose}
          onAfterClose={panelDismissible ? handleAfterClose : undefined}
          title={title}
          minimalHeader
          showCloseButton={false}
          closeOnOverlay={panelDismissible}
          closeOnEscape={panelDismissible}
          transparentBackdrop
          panelSurface="glass"
          panelClassName="w-[min(28rem,calc(100vw-1rem))] max-w-[100vw] sm:w-[min(28rem,min(92vw,calc(100vw-1.5rem)))]"
          scrollableBody
          zIndex={1300}
        >
          <div className="mx-auto w-full max-w-[min(28rem,100%)] [@media(max-height:720px)]:max-w-[min(26rem,100%)]">
            <div className={authFluid.logoOuter}>
              <div className={authFluid.logoBox}>
                <Image
                  src="/images/jiffy-login.png"
                  alt="Jiffy Gestor"
                  fill
                  sizes="(max-width: 640px) 96vw, (max-height: 720px) 52vmin, min(480px, 54vmin)"
                  className="object-contain object-center"
                  priority
                />
              </div>
            </div>

            {headingSlot ?? (
              <>
                <h1 className="text-[clamp(1.125rem,3.8vmin,1.5rem)] font-semibold text-primary-text text-center mb-1 font-heading leading-snug [@media(max-height:720px)]:mb-0.5">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="text-secondary text-[clamp(0.8125rem,2.8vmin,0.875rem)] text-center mb-3 [@media(max-height:720px)]:mb-2 leading-snug">
                    {subtitle}
                  </p>
                ) : (
                  <div className="mb-4 [@media(max-height:720px)]:mb-3" />
                )}
              </>
            )}

            {children}
          </div>
        </JiffySidePanelModal>
      </div>
    </div>
  )
}
