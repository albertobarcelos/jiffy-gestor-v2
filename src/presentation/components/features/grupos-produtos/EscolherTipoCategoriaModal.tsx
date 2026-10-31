'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MENU_SIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { cn } from '@/src/shared/utils/cn'

export type TipoCadastroCategoria = 'produtos' | 'pizza'

const OPCOES: Array<{
  id: TipoCadastroCategoria
  titulo: string
  descricao: string
  iconName: string
}> = [
  {
    id: 'produtos',
    titulo: 'Nova categoria Produtos',
    descricao:
      'Agrupe produtos do cardápio (industrializados ou preparados) em uma categoria padrão.',
    iconName: 'potMix',
  },
  {
    id: 'pizza',
    titulo: 'Nova categoria Pizzas',
    descricao: 'Configure tamanhos, massas, bordas, regras de preço e sabores da pizza.',
    iconName: 'pizza',
  },
]

interface EscolherTipoCategoriaModalProps {
  open: boolean
  onClose: () => void
  onContinuar: (tipo: TipoCadastroCategoria) => void
  cancelVariant?: JiffySidePanelFooterActions['cancelVariant']
}

export function EscolherTipoCategoriaModal({
  open,
  onClose,
  onContinuar,
  cancelVariant = 'primaryTint10',
}: EscolherTipoCategoriaModalProps) {
  const [tipo, setTipo] = useState<TipoCadastroCategoria>('produtos')

  useEffect(() => {
    if (open) setTipo('produtos')
  }, [open])

  const handleContinuar = useCallback(() => {
    onContinuar(tipo)
  }, [onContinuar, tipo])

  const footerActions = useMemo(
    (): JiffySidePanelFooterActions => ({
      showCancel: true,
      cancelLabel: 'Cancelar',
      cancelVariant,
      onCancel: onClose,
      showSave: true,
      saveLabel: 'Continuar',
      onSave: handleContinuar,
      barActionOrder: ['cancel', 'save'],
    }),
    [onClose, handleContinuar, cancelVariant]
  )

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Escolha um tipo de categoria"
      panelClassName={MENU_SIDE_PANEL_CLASS}
      footerVariant="bar"
      footerActions={footerActions}
    >
      <div role="radiogroup" aria-label="Tipo de categoria" className="flex flex-col gap-3 p-4 md:p-6">
        {OPCOES.map(opcao => {
          const selecionado = tipo === opcao.id
          return (
            <button
              key={opcao.id}
              type="button"
              role="radio"
              aria-checked={selecionado}
              onClick={() => setTipo(opcao.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                selecionado
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-primary/40'
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border',
                  selecionado
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-gray-200 bg-gray-50 text-secondary-text'
                )}
              >
                <DinamicIcon iconName={opcao.iconName} size={22} color="currentColor" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-primary-text">{opcao.titulo}</span>
                <span className="mt-0.5 block text-xs leading-snug text-secondary-text">
                  {opcao.descricao}
                </span>
              </span>
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                  selecionado ? 'border-primary' : 'border-gray-300'
                )}
                aria-hidden
              >
                {selecionado ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
              </span>
            </button>
          )
        })}
      </div>
    </JiffySidePanelModal>
  )
}
