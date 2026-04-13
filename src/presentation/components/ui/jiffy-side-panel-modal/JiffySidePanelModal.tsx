'use client'

import Modal from '@mui/material/Modal'
import Slide from '@mui/material/Slide'
import type { TransitionProps } from '@mui/material/transitions'
import {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { MdArrowBack, MdArrowForward, MdClose } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { PainelPedidoBackdrop } from './PainelPedidoBackdrop'

const PANEL_MS = { enter: 420, exit: 380 } as const

/** Raio dos cantos superiores/inferiores esquerdos do painel e do 1º botão da barra (Tailwind `rounded-xl`) */
const PANEL_RADIUS_LEFT = '0.75rem'

const PainelSlide = forwardRef(function PainelSlide(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>
) {
  return <Slide ref={ref} direction="left" {...props} />
})
PainelSlide.displayName = 'PainelSlide'

/** Chaves dos botões do rodapé em modo `bar` — usado em `barActionOrder` */
export type JiffyFooterBarKey = 'prev' | 'next' | 'cancel' | 'save'

export interface JiffySidePanelFooterActions {
  showPrevious?: boolean
  previousLabel?: string
  onPrevious?: () => void
  previousDisabled?: boolean
  showNext?: boolean
  nextLabel?: string
  onNext?: () => void
  nextDisabled?: boolean
  showCancel?: boolean
  cancelLabel?: string
  onCancel?: () => void
  cancelDisabled?: boolean
  showSave?: boolean
  saveLabel?: string
  onSave?: () => void | Promise<void>
  saveLoading?: boolean
  saveDisabled?: boolean
  /** Quando definido, o botão Salvar vira `type="submit"` associado ao `<form id="...">` do conteúdo */
  saveFormId?: string
  /**
   * Rodapé `footerVariant="bar"`: estilo de Anterior / Próximo.
   * `primaryMuted` = fundo primary ~15% (alinhado a `bg-primary/15`) e texto na cor primária.
   */
  barSecondaryTone?: 'gray' | 'primaryMuted'
  /**
   * Rodapé `footerVariant="bar"`: estilo do botão de cancelar (ex.: "Salvar e fechar").
   * `primary` = mesmo visual do Salvar (fundo primário, texto branco).
   */
  cancelVariant?: 'secondary' | 'primary'
  /**
   * Rodapé `footerVariant="bar"`: ordem dos botões visíveis.
   * Padrão: Anterior → Próximo → Cancelar → Salvar (apenas os habilitados entram na grade).
   */
  barActionOrder?: JiffyFooterBarKey[]
  /** Rodapé `footerVariant="bar"`: exibe seta em Anterior (voltar) e Próximo (avançar) */
  barShowPrevNextIcons?: boolean
}

function hasFooterActions(fa?: JiffySidePanelFooterActions): boolean {
  if (!fa) return false
  return Boolean(
    fa.showCancel || fa.showSave || fa.showPrevious || fa.showNext
  )
}

/** Mesma cor primária dos formulários de cadastro (`globals.css` / NovoComplemento) */
const footerSavePrimarySx = {
  borderRadius: 0,
  backgroundColor: 'var(--color-primary)',
  color: '#fff',
  boxShadow: 'none',
  '&:hover': {
    backgroundColor: 'var(--color-primary)',
    filter: 'brightness(1.08)',
    boxShadow: 'none',
  },
  '&.Mui-disabled': {
    backgroundColor: 'rgba(0, 51, 102, 0.38)',
    color: 'rgba(255, 255, 255, 0.9)',
  },
} as const

function footerSavePrimaryBarSx(isFirstColumn: boolean) {
  const bl =
    isFirstColumn ?
      ({ borderBottomLeftRadius: PANEL_RADIUS_LEFT } as const)
    : {}
  return {
    ...footerSavePrimarySx,
    ...bl,
    '&:hover': { ...footerSavePrimarySx['&:hover'], ...bl },
    '&.Mui-disabled': { ...footerSavePrimarySx['&.Mui-disabled'], ...bl },
  }
}

/** Botão Salvar do rodapé — submit externo ao form ou onClick */
function FooterSaveButton({ fa }: { fa: JiffySidePanelFooterActions }) {
  if (fa.saveFormId) {
    return (
      <Button
        type="submit"
        form={fa.saveFormId}
        variant="contained"
        color="primary"
        disabled={fa.saveDisabled}
        isLoading={fa.saveLoading}
        sx={footerSavePrimarySx}
      >
        {fa.saveLabel ?? 'Salvar'}
      </Button>
    )
  }
  return (
    <Button
      type="button"
      variant="contained"
      color="primary"
      disabled={fa.saveDisabled}
      isLoading={fa.saveLoading}
      sx={footerSavePrimarySx}
      onClick={() => void fa.onSave?.()}
    >
      {fa.saveLabel ?? 'Salvar'}
    </Button>
  )
}

function footerBarSecondarySx(isFirstColumn: boolean) {
  const bl =
    isFirstColumn ?
      ({ borderBottomLeftRadius: PANEL_RADIUS_LEFT } as const)
    : {}
  return {
    borderRadius: 0,
    ...bl,
    boxShadow: 'none',
    borderWidth: 0,
    backgroundColor: '#f9fafb',
    color: 'var(--color-primary-text, #171A1C)',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: '#f3f4f6',
      boxShadow: 'none',
      ...bl,
    },
  }
}

/** Anterior / Próximo com tom primary/15 (equivalente visual a `bg-primary/15`) */
function footerBarPrimaryMutedSx(isFirstColumn: boolean) {
  const bl =
    isFirstColumn ?
      ({ borderBottomLeftRadius: PANEL_RADIUS_LEFT } as const)
    : {}
  return {
    borderRadius: 0,
    ...bl,
    boxShadow: 'none',
    borderWidth: 0,
    backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
    color: 'var(--color-primary)',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: 'color-mix(in srgb, var(--color-primary) 22%, transparent)',
      boxShadow: 'none',
      ...bl,
    },
  }
}

function footerBarPrevNextSx(
  isFirstColumn: boolean,
  tone: 'gray' | 'primaryMuted' | undefined
) {
  return tone === 'primaryMuted' ?
      footerBarPrimaryMutedSx(isFirstColumn)
    : footerBarSecondarySx(isFirstColumn)
}

function footerBarCancelSx(
  isFirstColumn: boolean,
  variant: 'secondary' | 'primary' | undefined
) {
  return variant === 'primary' ?
      footerSavePrimaryBarSx(isFirstColumn)
    : footerBarSecondarySx(isFirstColumn)
}

const DEFAULT_BAR_ACTION_ORDER: readonly JiffyFooterBarKey[] = [
  'prev',
  'next',
  'cancel',
  'save',
]

/** Monta a sequência de colunas respeitando `barActionOrder` e os flags visíveis */
function buildFooterBarKeys(fa: JiffySidePanelFooterActions): JiffyFooterBarKey[] {
  const visible = new Set<JiffyFooterBarKey>()
  if (fa.showPrevious) visible.add('prev')
  if (fa.showNext) visible.add('next')
  if (fa.showCancel) visible.add('cancel')
  if (fa.showSave) visible.add('save')

  const order = fa.barActionOrder ?? [...DEFAULT_BAR_ACTION_ORDER]
  const keys: JiffyFooterBarKey[] = []
  for (const k of order) {
    if (visible.has(k)) keys.push(k)
  }
  for (const k of DEFAULT_BAR_ACTION_ORDER) {
    if (visible.has(k) && !keys.includes(k)) keys.push(k)
  }
  return keys
}

/**
 * Rodapé em faixa: N colunas iguais; ordem padrão Anterior → Próximo → Cancelar → Salvar (customizável).
 * Em cadastros costuma omitir Cancelar (fechar pelo X) — um único Salvar ocupa 100% da largura.
 * Só a primeira coluna recebe canto inferior esquerdo arredondado (igual ao painel).
 */
function JiffyPanelFooterBar({
  fa,
  requestClose,
}: {
  fa: JiffySidePanelFooterActions
  requestClose: () => void
}) {
  const keys = buildFooterBarKeys(fa)

  const n = keys.length
  if (n === 0) return null

  function cell(key: JiffyFooterBarKey, isFirstColumn: boolean): ReactNode {
    const prevNextSx = footerBarPrevNextSx(isFirstColumn, fa.barSecondaryTone)
    const icons = fa.barShowPrevNextIcons
    switch (key) {
      case 'prev':
        return (
          <Button
            type="button"
            variant="outlined"
            color="inherit"
            disabled={fa.previousDisabled}
            onClick={fa.onPrevious}
            className="h-12 min-h-12 w-full font-semibold shadow-none"
            sx={prevNextSx}
          >
            <span className="inline-flex w-full items-center justify-center gap-1.5">
              {icons ? (
                <MdArrowBack className="h-5 w-5 shrink-0" aria-hidden />
              ) : null}
              {fa.previousLabel ?? 'Anterior'}
            </span>
          </Button>
        )
      case 'next':
        return (
          <Button
            type="button"
            variant="outlined"
            color="inherit"
            disabled={fa.nextDisabled}
            onClick={fa.onNext}
            className="h-12 min-h-12 w-full font-semibold shadow-none"
            sx={prevNextSx}
          >
            <span className="inline-flex w-full items-center justify-center gap-1.5">
              {fa.nextLabel ?? 'Próximo'}
              {icons ? (
                <MdArrowForward className="h-5 w-5 shrink-0" aria-hidden />
              ) : null}
            </span>
          </Button>
        )
      case 'cancel': {
        const cancelPrimary = fa.cancelVariant === 'primary'
        return (
          <Button
            type="button"
            variant={cancelPrimary ? 'contained' : 'outlined'}
            color={cancelPrimary ? 'primary' : 'inherit'}
            disabled={fa.cancelDisabled}
            onClick={fa.onCancel ?? requestClose}
            className="h-12 min-h-12 w-full font-semibold shadow-none"
            sx={footerBarCancelSx(isFirstColumn, fa.cancelVariant)}
          >
            {fa.cancelLabel ?? 'Cancelar'}
          </Button>
        )
      }
      case 'save':
        return (
          <Button
            type={fa.saveFormId ? 'submit' : 'button'}
            form={fa.saveFormId}
            variant="contained"
            color="primary"
            disabled={fa.saveDisabled}
            isLoading={fa.saveLoading}
            onClick={fa.saveFormId ? undefined : () => void fa.onSave?.()}
            className="h-12 min-h-12 w-full font-semibold shadow-none"
            sx={footerSavePrimaryBarSx(isFirstColumn)}
          >
            {fa.saveLabel ?? 'Salvar'}
          </Button>
        )
      default:
        return null
    }
  }

  return (
    <div
      className="grid w-full"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {keys.map((key, i) => (
        <div
          key={key}
          className={
            i < n - 1 ? 'min-w-0 border-r border-gray-200' : 'min-w-0'
          }
        >
          {cell(key, i === 0)}
        </div>
      ))}
    </div>
  )
}

export interface JiffySidePanelModalProps {
  open: boolean
  onClose: () => void
  onAfterClose?: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Faixa de abas opcional — omitir quando o fluxo for uma única coluna de conteúdo */
  tabsSlot?: React.ReactNode
  children: React.ReactNode
  panelClassName?: string
  footerSlot?: React.ReactNode
  footerActions?: JiffySidePanelFooterActions
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  /**
   * Quando `false`, o corpo não rola — use `min-h-0 flex-1` no filho para scroll interno (ex.: formulários full-height).
   * @default true
   */
  scrollableBody?: boolean
  /**
   * `bar`: botões em linha única, largura igual (grid), colados na base do painel — Salvar por último (à direita). Só Salvar = largura total.
   * `default`: agrupamento compacto com espaçamento (Anterior/Próximo à esquerda; Cancelar/Salvar à direita).
   */
  footerVariant?: 'default' | 'bar'
}

/**
 * Painel lateral padrão (teste / base para padronizar modais tipo *TabsModal).
 *
 * - **Container**: `Modal` (MUI) em `div` fixo — não usa `Dialog` para evitar Backdrop com Fade na entrada.
 * - **Movimento**: `Slide` `direction="left"` (entra da direita; ao fechar, volta para a direita).
 * - **Overlay**: `PainelPedidoBackdrop` — sem transição de opacidade.
 * - **Abas**: opcionais via `tabsSlot`; formulários só passam `children` + `footerActions` ou `footerSlot`.
 */
export function JiffySidePanelModal({
  open,
  onClose,
  onAfterClose,
  title,
  subtitle,
  tabsSlot,
  children,
  panelClassName = 'w-[min(53rem,95vw)] max-w-[100vw] sm:w-[min(900px,60vw)]',
  footerSlot,
  footerActions,
  closeOnOverlay = true,
  closeOnEscape = true,
  scrollableBody = true,
  footerVariant = 'default',
}: JiffySidePanelModalProps) {
  const [internalOpen, setInternalOpen] = useState(open)

  useEffect(() => {
    if (open) setInternalOpen(true)
  }, [open])

  const handleSlideExited = useCallback(() => {
    setInternalOpen(false)
    onAfterClose?.()
  }, [onAfterClose])

  const requestClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleModalClose = useCallback(
    (_: object, reason: 'backdropClick' | 'escapeKeyDown') => {
      if (reason === 'backdropClick' && !closeOnOverlay) return
      if (reason === 'escapeKeyDown' && !closeOnEscape) return
      requestClose()
    },
    [closeOnEscape, closeOnOverlay, requestClose]
  )

  const showDefaultFooter = Boolean(footerSlot) || hasFooterActions(footerActions)
  const fa = footerActions

  if (!internalOpen) {
    return null
  }

  return (
    <Modal
      open={internalOpen}
      onClose={handleModalClose}
      closeAfterTransition
      slots={{ backdrop: PainelPedidoBackdrop }}
      sx={{
        zIndex: 1300,
        // Backdrop abaixo do painel — se ambos ficarem em 1300, o overlay cobre o conteúdo e qualquer clique vira backdropClick
        '& .MuiBackdrop-root': {
          zIndex: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          transition: 'none',
        },
      }}
    >
      <PainelSlide
        in={open}
        timeout={{ enter: PANEL_MS.enter, exit: PANEL_MS.exit }}
        onExited={handleSlideExited}
        appear
        mountOnEnter
        unmountOnExit={false}
      >
        <div
          className={`absolute right-0 top-0 z-[1] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-bl-xl rounded-tl-xl bg-white shadow-xl outline-none ${panelClassName}`}
          role="dialog"
          aria-modal
          aria-labelledby="jiffy-side-panel-title"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 md:px-6">
            <div className="min-w-0 flex-1 pr-2">
              <h2
                id="jiffy-side-panel-title"
                className="text-lg font-semibold tracking-wide text-primary-text md:text-2xl"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 font-['Nunito',sans-serif] text-sm font-medium uppercase tracking-wide text-primary-text">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-secondary-text hover:bg-gray-100 hover:text-primary-text"
              aria-label="Fechar"
              onClick={requestClose}
            >
              <MdClose className="h-6 w-6" />
            </Button>
          </div>

          {tabsSlot ? (
            <div className="shrink-0 border-b border-gray-200 bg-white px-2 pt-2 md:px-4">
              {tabsSlot}
            </div>
          ) : null}

          <div
            className={`min-h-0 flex-1 px-4 py-2 md:px-0 ${
              scrollableBody ? 'overflow-y-auto' : 'flex min-h-0 flex-col overflow-hidden'
            }`}
          >
            {children}
          </div>

          {showDefaultFooter ? (
            <div
              className={
                footerVariant === 'bar'
                  ? 'shrink-0 border-t border-gray-200 bg-white'
                  : 'shrink-0 border-t border-gray-200 bg-[#fafafa] h-14'
              }
            >
              {footerSlot ? (
                footerSlot
              ) : fa ? (
                footerVariant === 'bar' ? (
                  <JiffyPanelFooterBar fa={fa} requestClose={requestClose} />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {fa.showPrevious ? (
                        <Button
                          type="button"
                          variant="outlined"
                          color="primary"
                          disabled={fa.previousDisabled}
                          onClick={fa.onPrevious}
                        >
                          {fa.previousLabel ?? 'Anterior'}
                        </Button>
                      ) : null}
                      {fa.showNext ? (
                        <Button
                          type="button"
                          variant="outlined"
                          color="primary"
                          disabled={fa.nextDisabled}
                          onClick={fa.onNext}
                        >
                          {fa.nextLabel ?? 'Próximo'}
                        </Button>
                      ) : null}
                    </div>
                    <div className="ml-auto flex flex-wrap gap-2">
                      {fa.showCancel ? (
                        <Button
                          type="button"
                          variant="outlined"
                          color="inherit"
                          disabled={fa.cancelDisabled}
                          onClick={fa.onCancel ?? requestClose}
                        >
                          {fa.cancelLabel ?? 'Cancelar'}
                        </Button>
                      ) : null}
                      {fa.showSave ? (
                        <FooterSaveButton fa={fa} />
                      ) : null}
                    </div>
                  </div>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      </PainelSlide>
    </Modal>
  )
}
