import type { ReactNode } from 'react'
import {
  CupomBordaPicotadaInferior,
  CupomBordaPicotadaSuperior,
} from './CupomBordaPicotadaSuperior'

type CupomPublicoShellProps = {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

/**
 * Card do cupom público: picotado no topo e na base + laterais com a mesma borda cinza.
 */
export function CupomPublicoShell({ children, className, style }: CupomPublicoShellProps) {
  return (
    <div
      className={`w-full overflow-hidden border-x border-slate-200/90 shadow-lg shadow-slate-200/60 ${className ?? ''}`}
      style={style}
    >
      <CupomBordaPicotadaSuperior />
      <div className="bg-white">{children}</div>
      <CupomBordaPicotadaInferior />
    </div>
  )
}
