import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'

/** Sempre no card: valor a levar ou “Nenhum”. */
export function TrocoLevarAppAviso(props: { valor: number; className?: string }) {
  const tem = props.valor > 0
  return (
    <div
      className={`rounded-2xl px-3 py-2.5 ${
        tem ? 'bg-sky-50 ring-1 ring-sky-200' : 'bg-zinc-50 ring-1 ring-zinc-100'
      } ${props.className ?? ''}`}
      role="status"
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-wide ${
          tem ? 'text-sky-800/80' : 'text-zinc-400'
        }`}
      >
        Levar troco
      </p>
      <p className={`text-lg font-extrabold ${tem ? 'text-sky-950' : 'text-zinc-500'}`}>
        {tem ? formatarMoedaApp(props.valor) : 'Nenhum'}
      </p>
      {tem ? (
        <p className="text-xs font-medium text-sky-800/90">Leve este valor em dinheiro</p>
      ) : null}
    </div>
  )
}
