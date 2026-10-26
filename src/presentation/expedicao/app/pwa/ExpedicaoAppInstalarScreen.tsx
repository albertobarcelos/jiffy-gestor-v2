'use client'

import Image from 'next/image'
import type { PwaInstallPrompt } from '@/src/presentation/expedicao/app/pwa/usePwaInstallPrompt'

type ExpedicaoAppInstalarScreenProps = {
  pwa: Pick<PwaInstallPrompt, 'podeInstalar' | 'acabouDeInstalar' | 'instalar'>
}

export function ExpedicaoAppInstalarScreen({ pwa }: ExpedicaoAppInstalarScreenProps) {
  return (
    <div className="expedicao-app-shell flex h-dvh flex-col overflow-hidden bg-secondary text-white">
      <div className="shrink-0 px-6 pb-8 pt-[max(2.25rem,env(safe-area-inset-top))]">
        <Image
          src="/images/expedicao/logo_app.png"
          alt="JiffyGO"
          width={96}
          height={96}
          className="h-24 w-24 rounded-[1.5rem] bg-white shadow-sm"
          priority
        />
        <h1 className="mt-6 text-[1.75rem] font-semibold leading-tight">
          Coloque o JiffyGO na tela inicial
        </h1>
        <p className="mt-2 max-w-[22rem] text-[15px] leading-6 text-white/85">
          Não precisa baixar na loja de apps. É só criar o atalho no celular.
        </p>
      </div>
      <div
        data-expedicao-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain rounded-t-3xl bg-zinc-50 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-zinc-900"
      >
        {pwa.acabouDeInstalar ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5">
            <p className="text-base font-semibold text-emerald-900">Pronto — ícone criado</p>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              Feche esta aba e abra o <strong>JiffyGO</strong> na tela inicial do
              celular. É lá que você entra na loja.
            </p>
          </div>
        ) : (
          <>
            {pwa.podeInstalar ? (
              <button
                type="button"
                onClick={() => void pwa.instalar()}
                className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-violet-700 text-base font-semibold text-white"
              >
                Adicionar à tela inicial
              </button>
            ) : null}

            <div className={`space-y-3 ${pwa.podeInstalar ? 'mt-5' : ''}`}>
              <p className="text-sm font-semibold text-zinc-900">
                {pwa.podeInstalar
                  ? 'Ou faça pelo menu do celular:'
                  : 'Siga o passo do seu celular:'}
              </p>

              <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
                <h2 className="text-base font-semibold text-zinc-900">Android</h2>
                <p className="mt-1 text-sm text-zinc-500">Chrome</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-700">
                  <li>
                    Toque no menu <span className="font-semibold text-zinc-900">⋮</span> no
                    canto superior.
                  </li>
                  <li>
                    Escolha <span className="font-semibold text-zinc-900">Instalar app</span>{' '}
                    ou <span className="font-semibold text-zinc-900">Adicionar à tela inicial</span>.
                  </li>
                  <li>Confirme e abra o ícone JiffyGO que aparecer na tela.</li>
                </ol>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
                <h2 className="text-base font-semibold text-zinc-900">iPhone</h2>
                <p className="mt-1 text-sm text-zinc-500">Safari</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-700">
                  <li>
                    Toque em <span className="font-semibold text-zinc-900">Compartilhar</span>{' '}
                    (quadrado com a seta para cima).
                  </li>
                  <li>
                    Role e toque em{' '}
                    <span className="font-semibold text-zinc-900">Adicionar à Tela de Início</span>.
                  </li>
                  <li>Confirme e abra o ícone JiffyGO na tela inicial.</li>
                </ol>
              </section>

              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                <span className="font-semibold">Abriu pelo WhatsApp ou Instagram?</span> Copie
                o link, cole no <strong>Chrome</strong> (Android) ou no{' '}
                <strong>Safari</strong> (iPhone) e faça os passos acima. Esses apps não criam o
                atalho.
              </p>
            </div>

          </>
        )}
      </div>
    </div>
  )
}
