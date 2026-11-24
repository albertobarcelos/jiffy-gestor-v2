'use client'

import {
  forwardRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactElement,
  type Ref,
} from 'react'
import Modal from '@mui/material/Modal'
import Slide from '@mui/material/Slide'
import type { TransitionProps } from '@mui/material/transitions'
import { MdClose } from 'react-icons/md'
import type { ResumoFiscalPainelDTO as ResumoFiscal } from '@/src/application/dto/VendaPainelDetalheDTO'
import {
  normalizarResumoFiscal,
  vendaPossuiResumoFiscalParaAba,
} from '@/src/application/mappers/VendaPainelDetalheMapper'
import { PainelPedidoBackdrop } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { TipoVendaIcon } from './TipoVendaIcon'
import { tipoVendaIconeRelatorio } from '@/src/presentation/utils/vendas/vendasListCalculos'
import { useCancelarVendaGestor } from '@/src/presentation/hooks/useVendas'
import { usePainelDetalheVenda } from '@/src/presentation/hooks/usePainelDetalheVenda'
import { linhasTransferencia } from '@/src/presentation/utils/vendas/detalhesVendaExibicao'
import {
  calcularAjustesTotaisVendaPainel,
  calcularResumoFinanceiroPainel,
  calcularTrocoPainel,
} from '@/src/presentation/utils/vendas/detalhesVendaCalculos'
import { DetalhesVendaInfoSection } from './detalhes/DetalhesVendaInfoSection'
import { DetalhesVendaProdutosSection } from './detalhes/DetalhesVendaProdutosSection'
import { DetalhesVendaRodizioSection } from './detalhes/DetalhesVendaRodizioSection'
import { DetalhesVendaTransferenciasSection } from './detalhes/DetalhesVendaTransferenciasSection'
import { DetalhesVendaPagamentosSection } from './detalhes/DetalhesVendaPagamentosSection'
import { DetalhesVendaResumoFinanceiroSection } from './detalhes/DetalhesVendaResumoFinanceiroSection'
import { DetalhesVendaFiscalSection } from './detalhes/DetalhesVendaFiscalSection'
import { DetalhesVendaCancelarDialog } from './detalhes/DetalhesVendaCancelarDialog'

interface DetalhesVendasProps {
  vendaId: string
  open: boolean
  onClose: () => void
  onAfterClose?: () => void
  tabelaOrigem?: 'venda' | 'venda_gestor'
  tipoVendaLista?: string
  tipoEntregaLista?: 'entrega' | 'retirada' | null
  numeroMesaLista?: number
  /** Workaround homolog: datas de mesa com Z falso. */
  datasComoHorarioLocalWallClock?: boolean
}

const PANEL_MS_DETALHES = { enter: 420, exit: 380 } as const

const DetalhesVendasPainelSlide = forwardRef(function DetalhesVendasPainelSlide(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>
) {
  return <Slide ref={ref} direction="left" {...props} />
})
DetalhesVendasPainelSlide.displayName = 'DetalhesVendasPainelSlide'

const CLASSE_LARGURA_PAINEL_DETALHES_VENDA =
  'w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]'

export function DetalhesVendas({
  vendaId,
  open,
  onClose,
  onAfterClose,
  tabelaOrigem = 'venda',
  tipoVendaLista,
  tipoEntregaLista,
  numeroMesaLista,
  datasComoHorarioLocalWallClock = false,
}: DetalhesVendasProps) {
  const {
    venda,
    isLoading,
    nomesUsuarios,
    nomesMeiosPagamento,
    nomeCliente,
    nomeTerminalResumoFiscal,
    nomeEmpresaResumoFiscal,
    clearState,
  } = usePainelDetalheVenda({
    vendaId,
    open,
    tabelaOrigem,
    tipoEntregaLista,
    onAuthOrLoadError: onClose,
  })

  const [painelTabDetalhes, setPainelTabDetalhes] = useState(0)
  const [isCancelarModalOpen, setIsCancelarModalOpen] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const cancelarVenda = useCancelarVendaGestor()
  const [internalOpen, setInternalOpen] = useState(open)

  useEffect(() => {
    if (open) setInternalOpen(true)
  }, [open])

  useEffect(() => {
    if (open) setPainelTabDetalhes(0)
  }, [open, vendaId])

  const handleSlideExited = useCallback(() => {
    setInternalOpen(false)
    onAfterClose?.()
  }, [onAfterClose])

  const handlePainelBackdropClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleConfirmarCancelamento = async () => {
    if (!venda) return
    if (justificativa.trim().length < 15) {
      showToast.error('Justificativa deve ter no mínimo 15 caracteres')
      return
    }
    try {
      await cancelarVenda.mutateAsync({
        id: venda.id,
        motivo: justificativa.trim(),
      })
      setIsCancelarModalOpen(false)
      setJustificativa('')
      onClose()
    } catch (error) {
      console.error('Erro ao cancelar venda:', error)
    }
  }

  useEffect(() => {
    if (!internalOpen) {
      clearState()
      setIsCancelarModalOpen(false)
      setJustificativa('')
    }
  }, [internalOpen, clearState])

  const resumoFinanceiro = useMemo(() => calcularResumoFinanceiroPainel(venda), [venda])
  const trocoCalculado = useMemo(() => calcularTrocoPainel(venda), [venda])
  const totalVendaCalculado = venda?.valorFinal ?? 0
  const ajustesTotaisVenda = useMemo(() => calcularAjustesTotaisVendaPainel(venda), [venda])
  const temResumoFiscal = useMemo(() => vendaPossuiResumoFiscalParaAba(venda), [venda])

  const resumoFiscalParaExibicao = useMemo((): ResumoFiscal | null => {
    if (!venda?.resumoFiscal) return null
    const n = normalizarResumoFiscal(venda.resumoFiscal as unknown)
    if (n) return n
    const raw = venda.resumoFiscal
    if (Array.isArray(raw) || typeof raw !== 'object' || raw === null) return null
    return raw as ResumoFiscal
  }, [venda?.resumoFiscal])

  const temTaxaComValor = (venda?.taxasLancadas ?? []).some(taxa => {
    if (taxa.dataRemocao?.trim()) return false
    return (Number(taxa.valorCalculado) || 0) > 0
  })

  const transferencias = linhasTransferencia(venda?.movimentacoes)

  if (!internalOpen) return null

  return (
    <Modal
      open={internalOpen}
      onClose={handlePainelBackdropClose}
      closeAfterTransition
      slots={{ backdrop: PainelPedidoBackdrop }}
      sx={{
        zIndex: 1300,
        '& .MuiBackdrop-root': {
          zIndex: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          transition: 'none',
        },
      }}
    >
      <DetalhesVendasPainelSlide
        in={open}
        timeout={{ enter: PANEL_MS_DETALHES.enter, exit: PANEL_MS_DETALHES.exit }}
        onExited={handleSlideExited}
        appear
        mountOnEnter
        unmountOnExit={false}
      >
        <div
          className={`absolute right-0 top-0 z-[1] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-bl-xl rounded-tl-xl bg-white shadow-xl outline-none ${CLASSE_LARGURA_PAINEL_DETALHES_VENDA}`}
          role="dialog"
          aria-modal
          aria-labelledby="detalhes-vendas-titulo-appbar"
        >
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-0">
            <div className="bg-primary flex w-full shrink-0 items-center gap-3 rounded-t-lg py-3 md:px-4">
              <div className="flex flex-1 items-center justify-center gap-2">
                {(venda || tipoVendaLista || tipoEntregaLista) && (
                  <TipoVendaIcon
                    tipoVenda={tipoVendaIconeRelatorio({
                      tipoVenda: String(venda?.tipoVenda ?? tipoVendaLista ?? ''),
                      tipoEntrega: venda?.tipoEntrega ?? tipoEntregaLista ?? null,
                      tabelaOrigem,
                      numeroMesa: venda?.numeroMesa ?? numeroMesaLista,
                    })}
                    numeroMesa={venda?.numeroMesa ?? numeroMesaLista}
                    containerScale={0.9}
                    className="flex-shrink-0"
                    corPrincipal="#FFFFFF"
                    corSecundaria="rgba(255, 255, 255, 0.3)"
                    corTexto="var(--color-primary-text)"
                    corBorda="rgba(255, 255, 255, 0.5)"
                    corFundo="var(--color-primary-background)"
                    corBalcao="var(--color-info)"
                    corGestor="var(--color-info)"
                    corEntrega="var(--color-info)"
                  />
                )}
                <div className="flex flex-col" id="detalhes-vendas-titulo-appbar">
                  <span className="text-xl font-semibold text-white">
                    Venda Nº. {venda?.numeroVenda}
                  </span>
                  <span className="text-lg text-white">#{venda?.codigoVenda}</span>
                  {venda?.senha ? (
                    <span className="text-sm text-white/90">Senha {venda.senha}</span>
                  ) : null}
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              >
                <MdClose size={20} />
              </button>
            </div>

            {!isLoading && venda && temResumoFiscal && (
              <div className="border-gray-200 bg-info z-[2] w-full shrink-0 border-b md:px-2">
                <div className="flex flex-wrap gap-1 px-2 pb-0 pt-1" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={painelTabDetalhes === 0}
                    onClick={() => setPainelTabDetalhes(0)}
                    className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      painelTabDetalhes === 0
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
                    }`}
                  >
                    Informações da Venda
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={painelTabDetalhes === 1}
                    onClick={() => setPainelTabDetalhes(1)}
                    className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      painelTabDetalhes === 1
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
                    }`}
                  >
                    Fiscal
                  </button>
                </div>
              </div>
            )}

            <div className="bg-info flex min-h-0 w-full flex-1 flex-col overflow-y-auto py-2 md:px-2">
              {isLoading ? (
                <div className="flex w-full min-w-0 flex-col items-center justify-center py-12">
                  <JiffyLoading />
                </div>
              ) : venda ? (
                <>
                  {(!temResumoFiscal || painelTabDetalhes === 0) && (
                    <>
                      <DetalhesVendaInfoSection
                        venda={venda}
                        nomesUsuarios={nomesUsuarios}
                        nomeCliente={nomeCliente}
                        datasComoHorarioLocalWallClock={datasComoHorarioLocalWallClock}
                      />
                      <DetalhesVendaProdutosSection
                        venda={venda}
                        nomesUsuarios={nomesUsuarios}
                        ajustesTotaisVenda={ajustesTotaisVenda}
                        totalVendaCalculado={totalVendaCalculado}
                        temTaxaComValor={temTaxaComValor}
                        datasComoHorarioLocalWallClock={datasComoHorarioLocalWallClock}
                      />
                      <DetalhesVendaRodizioSection venda={venda} />
                      <DetalhesVendaTransferenciasSection transferencias={transferencias} />
                      <DetalhesVendaPagamentosSection
                        venda={venda}
                        nomesUsuarios={nomesUsuarios}
                        nomesMeiosPagamento={nomesMeiosPagamento}
                        trocoCalculado={trocoCalculado}
                      />
                      <DetalhesVendaResumoFinanceiroSection
                        resumoFinanceiro={resumoFinanceiro}
                      />
                    </>
                  )}

                  {temResumoFiscal &&
                    painelTabDetalhes === 1 &&
                    resumoFiscalParaExibicao && (
                      <DetalhesVendaFiscalSection
                        venda={venda}
                        resumoFiscalParaExibicao={resumoFiscalParaExibicao}
                        nomeTerminalResumoFiscal={nomeTerminalResumoFiscal}
                        nomeEmpresaResumoFiscal={nomeEmpresaResumoFiscal}
                      />
                    )}
                </>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-secondary-text">Erro ao carregar detalhes da venda.</p>
                </div>
              )}
            </div>
          </div>

          <DetalhesVendaCancelarDialog
            open={isCancelarModalOpen}
            justificativa={justificativa}
            isPending={cancelarVenda.isPending}
            onJustificativaChange={setJustificativa}
            onClose={() => {
              setIsCancelarModalOpen(false)
              setJustificativa('')
            }}
            onConfirm={() => {
              void handleConfirmarCancelamento()
            }}
          />
        </div>
      </DetalhesVendasPainelSlide>
    </Modal>
  )
}
