'use client'

import { MdNotificationsNone, MdChevronRight } from 'react-icons/md'

export function ConfigTab(props: {
  avisos: boolean
  onAvisos: (value: boolean) => void
  pedindoAviso?: boolean
  versao: string
  lojaId: string
  onCompartilharLogs: () => void
  compartilhandoLogs?: boolean
  pwaInstalado?: boolean
  pwaPodeInstalar?: boolean
  onInstalarPwa?: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <h1 className="text-[28px] font-semibold tracking-tight text-zinc-900">Configurações</h1>
      </header>
      <div
        data-expedicao-scroll
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-4 pb-4"
      >
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Notificações</p>
          <div className="mt-3 flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <MdNotificationsNone className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-900">Avisos de pedido novo</p>
                <span className="text-xs font-medium text-emerald-600">
                  {props.pedindoAviso ? 'Pedindo permissão…' : props.avisos ? 'Ativadas' : 'Desligadas'}
                </span>
              </div>
              <p className="mt-1 text-sm leading-5 text-zinc-500">
                Avisa neste celular quando a loja te despachar, com o app aberto ou em segundo plano no
                navegador.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={props.pedindoAviso}
            onClick={() => props.onAvisos(!props.avisos)}
            className="mt-3 text-sm font-semibold text-secondary disabled:opacity-50"
          >
            {props.pedindoAviso
              ? 'Pedindo permissão…'
              : props.avisos
                ? 'Desativar avisos'
                : 'Ativar avisos'}
          </button>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Tela inicial
          </p>
          <p className="mt-2 text-sm leading-5 text-zinc-500">
            {props.pwaInstalado
              ? 'Este aparelho já abriu o app pela tela inicial.'
              : 'No Chrome, use Adicionar à tela inicial. O atalho abre direto no /e.'}
          </p>
          {props.pwaPodeInstalar && props.onInstalarPwa ? (
            <button
              type="button"
              onClick={props.onInstalarPwa}
              className="mt-3 text-sm font-semibold text-secondary"
            >
              Instalar na tela inicial
            </button>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
          <p className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Sobre o app
          </p>
          <Linha rotulo="Versão" valor={props.versao} />
          <Linha rotulo="Build" valor="web" />
          <Linha rotulo="Bundle" valor="expedicao-app" />
          <Linha rotulo="Id da loja" valor={props.lojaId} />
          <button
            type="button"
            disabled={props.compartilhandoLogs}
            onClick={props.onCompartilharLogs}
            className="flex w-full items-center justify-between px-4 py-3 text-left disabled:opacity-50"
          >
            <span className="text-sm text-zinc-900">
              {props.compartilhandoLogs ? 'Preparando logs…' : 'Compartilhar logs'}
            </span>
            <MdChevronRight className="h-5 w-5 text-zinc-300" aria-hidden />
          </button>
        </section>
      </div>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-zinc-900">{rotulo}</span>
      <span className="max-w-[12rem] truncate text-sm text-zinc-400">{valor}</span>
    </div>
  )
}
