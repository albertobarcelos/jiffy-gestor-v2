import Image from 'next/image'
import type { ReactNode } from 'react'

type AuthPublicShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

/**
 * Layout visual alinhado à página de login (gradiente + card).
 */
export function AuthPublicShell({ title, subtitle, children }: AuthPublicShellProps) {
  return (
    <div className="min-h-screen flex">
      <div
        className="w-full flex relative items-center justify-center p-6 md:p-12"
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

        <div className="w-full max-w-[450px] relative z-10">
          <div className="backdrop-blur-md bg-white/30 border-white border-2 rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
            <div className="flex justify-center mb-4">
              <div className="relative w-full h-[100px]">
                <Image
                  src="/images/jiffy-login.png"
                  alt="Jiffy Gestor"
                  fill
                  sizes="100%"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-primary-text text-center mb-2 font-heading">{title}</h1>
            {subtitle ? (
              <p className="text-secondary text-sm text-center mb-6">{subtitle}</p>
            ) : (
              <div className="mb-6" />
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
