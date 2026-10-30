'use client'

import { MdLogout } from 'react-icons/md'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { inicialNome } from '@/src/presentation/expedicao/app/format'

export function PerfilTab(props: {
  nome: string
  telefone: string | null
  email: string | null
  lojaAtiva: string
  lojas: LoginEmpresaSnapshot[]
  lojaAtivaId: string | null
  onTrocarLoja: (empresa: LoginEmpresaSnapshot) => void
  onSair: () => void
  onSairLoja: () => void
  trocandoLojaId: string | null
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <h1 className="text-[28px] font-semibold tracking-tight text-zinc-900">Perfil</h1>
      </header>
      <div
        data-expedicao-scroll
        className="relative z-0 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-4 pb-16"
      >
        <section className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-semibold text-white">
            {inicialNome(props.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-zinc-900">{props.nome}</p>
            <p className="truncate text-sm text-zinc-500">{props.telefone || 'Sem telefone'}</p>
            <p className="truncate text-sm text-zinc-500">{props.email || 'Sem e-mail'}</p>
          </div>
          <button
            type="button"
            onClick={props.onSair}
            className="rounded-full p-2 text-secondary"
            aria-label="Trocar entregador"
          >
            <MdLogout className="h-6 w-6" />
          </button>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Loja ativa</p>
          <p className="mt-2 text-base font-semibold text-zinc-900">{props.lojaAtiva}</p>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Lojas</p>
          <ul className="mt-2 divide-y divide-zinc-100">
            {props.lojas.map(loja => {
              const ativa = loja.id === props.lojaAtivaId
              return (
                <li key={loja.id}>
                  <button
                    type="button"
                    disabled={ativa || props.trocandoLojaId != null}
                    onClick={() => props.onTrocarLoja(loja)}
                    className="flex w-full items-center justify-between py-3 text-left disabled:cursor-default"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-zinc-900">{loja.nomeFantasia}</span>
                    </span>
                    {ativa ? (
                      <span className="text-lg text-zinc-800">✓</span>
                    ) : props.trocandoLojaId === loja.id ? (
                      <span className="text-sm font-semibold text-secondary">Abrindo…</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <button
          type="button"
          onClick={props.onSairLoja}
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-500 shadow-sm ring-1 ring-black/[0.04]"
        >
          Sair da loja
        </button>
      </div>
    </div>
  )
}
