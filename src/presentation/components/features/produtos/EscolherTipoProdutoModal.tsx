'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MENU_SIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { cn } from '@/src/shared/utils/cn'

export type TipoCadastroProduto = 'preparado' | 'pizza'

const OPCOES: Array<{
  id: TipoCadastroProduto
  titulo: string
  descricao: string
  disponivel: boolean
  iconName: string
}> = [
  {
    id: 'preparado',
    titulo: 'Produto Preparado',
    descricao: 'Produtos produzidos pela sua loja, como marmitas, bolos, lanches e etc.',
    disponivel: true,
    iconName: 'potMix',
  },
  {
    id: 'pizza',
    titulo: 'Pizza',
    descricao: 'Defina tamanho, tipos de massa, borda e sabores.',
    disponivel: true,
    iconName: 'pizza',
  },
]

interface EscolherTipoProdutoModalProps {
  open: boolean
  onClose: () => void
  onContinuar: (tipo: TipoCadastroProduto) => void
}

export function EscolherTipoProdutoModal({
  open,
  onClose,
  onContinuar,
}: EscolherTipoProdutoModalProps) {
  const [tipo, setTipo] = useState<TipoCadastroProduto>('preparado')

  useEffect(() => {
    if (open) setTipo('preparado')
  }, [open])

  const podeContinuar = OPCOES.some(o => o.id === tipo && o.disponivel)

  const handleContinuar = useCallback(() => {
    if (!podeContinuar) return
    onContinuar(tipo)
  }, [podeContinuar, onContinuar, tipo])

  const footerActions = useMemo(
    (): JiffySidePanelFooterActions => ({
      showCancel: true,
      cancelLabel: 'Cancelar',
      cancelVariant: 'primaryTint10',
      onCancel: onClose,
      showSave: true,
      saveLabel: 'Continuar',
      saveDisabled: !podeContinuar,
      onSave: handleContinuar,
      barActionOrder: ['cancel', 'save'],
    }),
    [onClose, podeContinuar, handleContinuar]
  )

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Escolha um tipo de produto"
      panelClassName={MENU_SIDE_PANEL_CLASS}
      footerVariant="bar"
      footerActions={footerActions}
    >
      <div role="radiogroup" aria-label="Tipo de produto" className="flex flex-col gap-3 p-4 md:p-6">
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
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary-text">{opcao.titulo}</span>
                  {!opcao.disponivel ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                      Em breve
                    </span>
                  ) : null}
                </span>
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

export function useEscolherTipoProdutoCadastro(options?: { onPizza?: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const pendingRef = useRef<(() => void) | null>(null)

  const pedirTipo = useCallback((onPreparado: () => void) => {
    pendingRef.current = onPreparado
    setOpen(true)
  }, [])

  const fechar = useCallback(() => {
    pendingRef.current = null
    setOpen(false)
  }, [])

  const continuar = useCallback(
    (tipo: TipoCadastroProduto) => {
      if (tipo === 'pizza') {
        pendingRef.current = null
        setOpen(false)
        if (options?.onPizza) {
          options.onPizza()
          return
        }
        router.push('/produtos/pizzas')
        return
      }
      if (tipo !== 'preparado') return
      const seguir = pendingRef.current
      pendingRef.current = null
      setOpen(false)
      seguir?.()
    },
    [options?.onPizza, router]
  )

  return { open, pedirTipo, fechar, continuar }
}
