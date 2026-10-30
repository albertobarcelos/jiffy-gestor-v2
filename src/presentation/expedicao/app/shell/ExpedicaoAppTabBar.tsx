'use client'

import { MdAssignment, MdAttachMoney, MdPerson, MdQrCodeScanner, MdSettings } from 'react-icons/md'
import type { AbaExpedicaoApp } from '@/src/presentation/expedicao/app/tipos'

const ABAS_ESQ: Array<{ id: AbaExpedicaoApp; label: string; icon: typeof MdAssignment }> = [
  { id: 'pedidos', label: 'Pedidos', icon: MdAssignment },
  { id: 'comissoes', label: 'Comissões', icon: MdAttachMoney },
]

const ABAS_DIR: Array<{ id: AbaExpedicaoApp; label: string; icon: typeof MdAssignment }> = [
  { id: 'perfil', label: 'Perfil', icon: MdPerson },
  { id: 'config', label: 'Config', icon: MdSettings },
]

function AbaBotao(props: {
  id: AbaExpedicaoApp
  label: string
  icon: typeof MdAssignment
  ativo: boolean
  onAba: (aba: AbaExpedicaoApp) => void
}) {
  const Icon = props.icon
  return (
    <button
      type="button"
      onClick={() => props.onAba(props.id)}
      className={`flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium ${
        props.ativo ? 'text-secondary' : 'text-gray-400'
      }`}
      aria-current={props.ativo ? 'page' : undefined}
    >
      <Icon className="h-6 w-6" aria-hidden />
      {props.label}
    </button>
  )
}

export function ExpedicaoAppTabBar(props: {
  aba: AbaExpedicaoApp
  ocupado?: boolean
  onAba: (aba: AbaExpedicaoApp) => void
  onColetar: () => void
}) {
  return (
    <nav
      className="relative z-40 grid shrink-0 grid-cols-5 items-end overflow-visible border-t border-black/[0.06] bg-white px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Navegação do entregador"
    >
      {ABAS_ESQ.map(item => (
        <AbaBotao
          key={item.id}
          id={item.id}
          label={item.label}
          icon={item.icon}
          ativo={props.aba === item.id}
          onAba={props.onAba}
        />
      ))}

      <div className="flex flex-col items-center pb-1">
        <button
          type="button"
          onClick={props.onColetar}
          disabled={props.ocupado}
          aria-label="Coletar pedido"
          className="relative z-10 -mt-8 mb-0.5 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-white shadow-[0_8px_20px_rgba(91,33,182,0.35)] transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
        >
          <MdQrCodeScanner className="h-7 w-7" aria-hidden />
        </button>
        <span className="text-[10px] font-semibold text-secondary">Coletar</span>
      </div>

      {ABAS_DIR.map(item => (
        <AbaBotao
          key={item.id}
          id={item.id}
          label={item.label}
          icon={item.icon}
          ativo={props.aba === item.id}
          onAba={props.onAba}
        />
      ))}
    </nav>
  )
}
