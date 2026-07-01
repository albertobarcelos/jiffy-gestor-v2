'use client'

import { Button } from '@/src/presentation/components/ui/button'
import {
  footerBarPrimaryMutedSx,
  footerSavePrimaryBarSx,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MdCheck, MdClose } from 'react-icons/md'

export interface EdicaoProdutosFooterProps {
  salvando: boolean
  onCancelar: () => void
  onSalvar: () => void | Promise<void>
}

/** Rodapé do modo "Editar produtos" de um pedido delivery: Cancelar + Salvar alterações. */
export function EdicaoProdutosFooter({ salvando, onCancelar, onSalvar }: EdicaoProdutosFooterProps) {
  const painelRaioEsqInf = '0.75rem'

  return (
    <div className="shrink-0 bg-white">
      <div className="grid w-full" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div className="min-w-0 border-r border-gray-200">
          <Button
            type="button"
            variant="outlined"
            color="inherit"
            disabled={salvando}
            onClick={onCancelar}
            fullWidth
            className="h-12 min-h-12 w-full font-semibold shadow-none"
            sx={footerBarPrimaryMutedSx(true)}
          >
            <span className="inline-flex w-full items-center justify-center gap-1.5">
              <MdClose className="h-5 w-5 shrink-0" aria-hidden />
              Cancelar
            </span>
          </Button>
        </div>

        <div className="min-w-0">
          <Button
            type="button"
            variant="contained"
            color="primary"
            disabled={salvando}
            onClick={() => {
              if (salvando) return
              void onSalvar()
            }}
            fullWidth
            className="h-12 min-h-12 w-full font-semibold shadow-none"
            sx={{
              ...footerSavePrimaryBarSx(false),
              borderBottomRightRadius: painelRaioEsqInf,
            }}
          >
            <span className="inline-flex w-full items-center justify-center gap-1.5">
              {!salvando && <MdCheck className="h-5 w-5 shrink-0" aria-hidden />}
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
