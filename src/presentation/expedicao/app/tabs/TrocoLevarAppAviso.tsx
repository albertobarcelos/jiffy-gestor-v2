import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'

export function TrocoLevarAppAviso(props: { valor: number; className?: string }) {
  if (!(props.valor > 0)) return null
  return (
    <div
      className={`rounded-2xl bg-sky-50 px-3 py-2.5 ring-1 ring-sky-100 ${props.className ?? ''}`}
      role="status"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800/80">Levar troco</p>
      <p className="text-lg font-extrabold text-sky-950">{formatarMoedaApp(props.valor)}</p>
      <p className="text-xs font-medium text-sky-800/90">Leve este valor em dinheiro</p>
    </div>
  )
}
