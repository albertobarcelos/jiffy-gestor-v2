'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MdMenuBook, MdPrint, MdTune } from 'react-icons/md'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import type { ModoImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import {
  DEFAULT_DELIVERY_CUPOM_TEMPLATE,
  type DeliveryCupomTemplateConfig,
} from '@/src/shared/types/deliveryCupomTemplate'
import { DeliveryConfigCollapsibleSection } from './DeliveryConfigCollapsibleSection'
import {
  DeliveryModoCupomInfoTooltip,
  DeliveryModoCupomToggle,
} from './DeliveryModoCupomToggle'
import { DeliveryCupomTemplateEditor } from './DeliveryCupomTemplateEditor'
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
import {
  DIALOG_SALVAR_SEM_IMPRESSORA_EXPEDICAO,
  TOAST_IMPRESSORA_EXPEDICAO_NECESSARIA,
} from '@/src/shared/utils/deliveryImpressoraExpedicao'
import { salvarDeliveryCupomTemplateLocal } from '@/src/infrastructure/printing/deliveryCupomTemplateStorage'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useMenuDeliveryId } from '@/src/presentation/hooks/useMenuDeliveryId'
import { useAtualizarEmpresaDelivery } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { usePreferenciasImpressaoDelivery } from '@/src/presentation/hooks/usePreferenciasImpressaoDelivery'
import {
  useEstacaoImpressaoDestePc,
  useImpressorasLogicasEstacao,
  useInvalidateEstacaoImpressaoQueries,
} from '@/src/presentation/hooks/useEstacaoImpressaoQueries'
import { useConfigurarEstacaoDestePc } from '@/src/presentation/hooks/useConfigurarEstacaoDestePc'
import { criarEstacaoImpressaoUseCases } from '@/src/presentation/hooks/estacao-impressao/criarEstacaoDestePcUseCases'
import { montarMapeamentosEstacaoParaSalvar } from '@/src/application/estacao-impressao/montarMapeamentosEstacaoParaSalvar'
import { modosImpressaoPorImpressoraIdDeMapeamentos, type ModoImpressaoImpressora } from '@/src/domain/types/modoImpressaoImpressora'
import { resolverEstacaoReceptoraDelivery } from '@/src/domain/caixa-estacao/estacaoReceptoraDelivery'
import { DeliveryVinculoImpressorasFisicas } from './DeliveryVinculoImpressorasFisicas'
import { EstacaoDestePcCampos } from '@/src/presentation/components/features/estacao/EstacaoDestePcCampos'
import { CupomCampoInfo } from './DeliveryModoPapelToggle'
import { BaixarFredyCard } from '@/src/presentation/gestor-pedidos/windows/BaixarFredyCard'
import { BaixarJiffyPrintCard } from './BaixarJiffyPrintCard'
import { MenuParametroEmpresaSelect } from '@/src/presentation/components/features/configuracoes/MenuParametroEmpresaSelect'
import { DeliveryConfiguracoesSkeleton } from './DeliveryConfiguracoesSkeleton'

interface DeliveryConfiguracoesModalProps {
  open: boolean
  onClose: () => void
}

function clampCopiasUnificado(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.min(99, Math.max(1, Math.floor(n)))
}

function DeliveryToggleRow(props: {
  id: string
  checked: boolean
  disabled?: boolean
  onChecked: (v: boolean) => void
  titulo: string
  info: string
}) {
  const { id, checked, disabled, onChecked, titulo, info } = props
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-2 shadow-sm ring-1 ring-gray-100 ${disabled ? 'opacity-75' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <label htmlFor={id} className={`text-sm font-semibold text-primary-text ${disabled ? 'cursor-default' : 'cursor-pointer'}`}>
          {titulo}
        </label>
        <CupomCampoInfo texto={info} ariaLabel={titulo} />
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChecked(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-gray-300 accent-secondary focus:ring-secondary"
      />
    </div>
  )
}

export function DeliveryConfiguracoesModal({ open, onClose }: DeliveryConfiguracoesModalProps) {
  const token = useAuthStore.getState().tenantAuth?.getAccessToken()
  const {
    empresa,
    deliveryCupomTemplate: cupomTemplateRemoto,
    isLoading: carregandoEmpresaMe,
  } = useEmpresaMe()
  const {
    preferenciasImpressaoDelivery,
    empresaDeliveryConfigurada,
    isLoading: carregandoPreferenciasDelivery,
    isFetching: buscandoPreferenciasDelivery,
    refetch: refetchPreferenciasDelivery,
  } = usePreferenciasImpressaoDelivery()
  const { menuDeliveryId: menuDeliveryIdSalvo, isLoading: carregandoMenuDelivery } =
    useMenuDeliveryId()
  const atualizarEmpresaDelivery = useAtualizarEmpresaDelivery()
  const {
    estacoes,
    estacaoId: estacaoIdSelecionada,
    ocupado: ocupadoEstacao,
    carregando: carregandoEstacao,
    selecionar: selecionarEstacao,
    criar: criarEstacao,
    renomear: renomearEstacao,
  } = useConfigurarEstacaoDestePc(open)
  const impressorasLogicasQuery = useImpressorasLogicasEstacao(open)
  const estacaoImpressaoQuery = useEstacaoImpressaoDestePc(open)
  const invalidateEstacaoQueries = useInvalidateEstacaoImpressaoQueries()

  const [modoImpressao, setModoImpressao] = useState<ModoImpressaoDelivery>('unificado')
  const [copiasUnificado, setCopiasUnificado] = useState(1)
  const [autoIniciarPreparoNovosPedidos, setAutoIniciarPreparoNovosPedidos] = useState(false)
  const [imprimirAoReceber, setImprimirAoReceber] = useState(true)
  const [imprimirAoFicarPronto, setImprimirAoFicarPronto] = useState(true)
  const [impressoraExpedicaoId, setImpressoraExpedicaoId] = useState<string>('')
  const [menuDeliveryId, setMenuDeliveryId] = useState<string | null>(null)
  const [vinculosFisicos, setVinculosFisicos] = useState<Record<string, string>>({})
  const [modosImpressaoEstacao, setModosImpressaoEstacao] = useState<
    Record<string, ModoImpressaoImpressora>
  >({})
  const [receptoraEstacaoIdPendente, setReceptoraEstacaoIdPendente] = useState<string | null>(null)
  const [cupomTemplate, setCupomTemplate] = useState<DeliveryCupomTemplateConfig>(
    DEFAULT_DELIVERY_CUPOM_TEMPLATE
  )
  const [salvando, setSalvando] = useState(false)
  const [confirmSalvarSemImpressoraOpen, setConfirmSalvarSemImpressoraOpen] = useState(false)
  const [painelAberto, setPainelAberto] = useState(open)
  const [formularioHidratado, setFormularioHidratado] = useState(false)

  const estacaoErroToastRef = useRef(false)
  const receptoraSalvaRef = useRef<string | null>(null)
  const receptoraHidratadaRef = useRef(false)
  const modosHidratadosEstacaoRef = useRef('')
  const modosImpressaoEstacaoRef = useRef(modosImpressaoEstacao)
  modosImpressaoEstacaoRef.current = modosImpressaoEstacao

  if (open !== painelAberto) {
    setPainelAberto(open)
    setFormularioHidratado(false)
  }

  const impressorasLogicas = impressorasLogicasQuery.data ?? []
  const estacaoSelecionadaNome =
    estacoes.find(e => e.id === estacaoIdSelecionada)?.nome?.trim() || ''

  const handleChangeModosEstacao = useCallback(
    (modos: Record<string, ModoImpressaoImpressora>) => {
      setModosImpressaoEstacao(modos)
      modosImpressaoEstacaoRef.current = modos
    },
    []
  )

  const carregando =
    open &&
    (carregandoEmpresaMe ||
      carregandoPreferenciasDelivery ||
      buscandoPreferenciasDelivery ||
      carregandoMenuDelivery ||
      impressorasLogicasQuery.isPending ||
      carregandoEstacao)

  const exibirSkeleton =
    open &&
    (!formularioHidratado ||
      impressorasLogicasQuery.isPending ||
      carregandoEstacao)

  const erroConfiguracao = useMemo(() => {
    const err = estacaoImpressaoQuery.error
    if (!err) return null
    return err instanceof Error ? err.message : 'Não foi possível carregar estação de impressão.'
  }, [estacaoImpressaoQuery.error])

  useEffect(() => {
    if (!open) return
    void refetchPreferenciasDelivery()
  }, [open, refetchPreferenciasDelivery])

  useEffect(() => {
    if (!open) return
    if (
      formularioHidratado ||
      carregandoEmpresaMe ||
      carregandoPreferenciasDelivery ||
      buscandoPreferenciasDelivery ||
      carregandoMenuDelivery
    )
      return

    setFormularioHidratado(true)
    if (!empresa?.id) return

    const prefs = preferenciasImpressaoDelivery
    setModoImpressao(prefs.modo)
    setCopiasUnificado(Math.min(99, Math.max(1, prefs.copiasCupomUnificado)))
    setAutoIniciarPreparoNovosPedidos(prefs.autoIniciarPreparoNovosPedidos)
    setImprimirAoReceber(prefs.imprimirAoReceber)
    setImprimirAoFicarPronto(prefs.imprimirAoFicarPronto)
    setImpressoraExpedicaoId(prefs.impressoraExpedicaoId ?? '')
    setMenuDeliveryId(menuDeliveryIdSalvo)
    setCupomTemplate(cupomTemplateRemoto)
  }, [
    open,
    formularioHidratado,
    carregandoEmpresaMe,
    carregandoPreferenciasDelivery,
    buscandoPreferenciasDelivery,
    carregandoMenuDelivery,
    empresa?.id,
    preferenciasImpressaoDelivery,
    cupomTemplateRemoto,
    menuDeliveryIdSalvo,
  ])

  useEffect(() => {
    if (!open) modosHidratadosEstacaoRef.current = ''
  }, [open])

  useEffect(() => {
    if (!open) return
    const data = estacaoImpressaoQuery.data
    if (!data?.estacaoId) return
    const next: Record<string, string> = {}
    for (const item of data.mapeamentos) {
      const id = item.impressoraId?.trim()
      const fisica = item.nomeImpressoraWindows?.trim()
      if (id && fisica) next[id] = fisica
    }
    setVinculosFisicos(next)
    if (modosHidratadosEstacaoRef.current === data.estacaoId) return
    modosHidratadosEstacaoRef.current = data.estacaoId
    setModosImpressaoEstacao(modosImpressaoPorImpressoraIdDeMapeamentos(data.mapeamentos))
  }, [open, estacaoImpressaoQuery.data])

  useEffect(() => {
    if (!open) {
      receptoraHidratadaRef.current = false
      receptoraSalvaRef.current = null
      setReceptoraEstacaoIdPendente(null)
      return
    }
    if (receptoraHidratadaRef.current || estacoes.length === 0) return
    const id = resolverEstacaoReceptoraDelivery(estacoes)?.id ?? null
    setReceptoraEstacaoIdPendente(id)
    receptoraSalvaRef.current = id
    receptoraHidratadaRef.current = true
  }, [open, estacoes])

  const handleReceptoraChange = useCallback((estacaoId: string | null) => {
    setReceptoraEstacaoIdPendente(estacaoId?.trim() || null)
  }, [])

  const handleSelecionarEstacao = useCallback(
    (id: string) => {
      selecionarEstacao(id)
      setVinculosFisicos({})
      setModosImpressaoEstacao({})
      modosHidratadosEstacaoRef.current = ''
    },
    [selecionarEstacao]
  )

  const handleCriarEstacao = useCallback(
    async (nome: string) => {
      const criada = await criarEstacao(nome)
      if (!criada) return
      setVinculosFisicos({})
      setModosImpressaoEstacao({})
      modosHidratadosEstacaoRef.current = criada.id
    },
    [criarEstacao]
  )

  useEffect(() => {
    if (!open) {
      estacaoErroToastRef.current = false
      return
    }
    if (!estacaoImpressaoQuery.isError || estacaoErroToastRef.current) return
    estacaoErroToastRef.current = true
    const msg = erroConfiguracao ?? 'Não foi possível carregar a estação de impressão.'
    showToast.error(msg)
  }, [estacaoImpressaoQuery.isError, erroConfiguracao, open])

  const executarSalvar = useCallback(async () => {
    const empresaId = empresa?.id
    if (!token || !empresaId) return

    const expId = impressoraExpedicaoId.trim()
    const parametroDelivery = {
      modoImpressaoDelivery: modoImpressao,
      copiasCupomUnificado: Math.min(99, Math.max(1, Math.floor(Number(copiasUnificado)) || 1)),
      autoIniciarPreparoNovosPedidos,
      imprimirAoReceber,
      imprimirAoFicarPronto,
      impressoraExpedicaoId: expId || null,
      menuDeliveryId: menuDeliveryId ?? menuDeliveryIdSalvo ?? null,
    }

    setSalvando(true)
    try {
      await atualizarEmpresaDelivery.mutateAsync({ parametroDelivery })
      salvarDeliveryCupomTemplateLocal(empresaId, cupomTemplate)
      const casos = criarEstacaoImpressaoUseCases(token)
      const estacaoId = estacaoIdSelecionada.trim()
      if (estacaoId) {
        const modos = modosImpressaoEstacaoRef.current
        const mapeamentos = montarMapeamentosEstacaoParaSalvar(vinculosFisicos, modos)
        await casos.salvarMapeamentos.execute(estacaoId, mapeamentos)
      }

      const receptoraPendente = receptoraEstacaoIdPendente
      const receptoraSalva = receptoraSalvaRef.current
      if (receptoraPendente !== receptoraSalva) {
        await casos.definirReceptora.execute(receptoraSalva, receptoraPendente)
        receptoraSalvaRef.current = receptoraPendente
      }

      invalidateEstacaoQueries()
      window.dispatchEvent(new Event('jiffy:estacao-impressao-changed'))
      window.dispatchEvent(new Event('jiffy:empresa-me-updated'))
      showToast.success('Configurações de delivery salvas.')
      setConfirmSalvarSemImpressoraOpen(false)
      onClose()
    } catch (error) {
      const raw =
        error instanceof Error ? error.message : 'Não foi possível salvar as configurações de delivery.'
      const lower = raw.toLowerCase()
      const msg =
        lower.includes('não encontr') ||
        lower.includes('nao encontr') ||
        lower.includes('not found') ||
        lower.includes('404')
          ? 'Empresa delivery não encontrada. Ative o cardápio/delivery da empresa antes de salvar a impressão.'
          : raw
      showToast.error(msg)
    } finally {
      setSalvando(false)
    }
  }, [
    atualizarEmpresaDelivery,
    empresa?.id,
    autoIniciarPreparoNovosPedidos,
    impressoraExpedicaoId,
    imprimirAoFicarPronto,
    imprimirAoReceber,
    menuDeliveryId,
    menuDeliveryIdSalvo,
    modoImpressao,
    copiasUnificado,
    cupomTemplate,
    invalidateEstacaoQueries,
    token,
    vinculosFisicos,
    estacaoIdSelecionada,
    receptoraEstacaoIdPendente,
    onClose,
  ])

  const handleSalvar = useCallback(() => {
    if (!token) {
      showToast.error('Sessão expirada.')
      return
    }
    if (!empresa?.id) {
      showToast.error('Empresa não carregada. Aguarde ou abra o painel novamente.')
      return
    }
    if (!empresaDeliveryConfigurada) {
      showToast.error(
        'Empresa delivery não encontrada. Ative o cardápio/delivery da empresa antes de salvar a impressão.'
      )
      return
    }
    if (!impressoraExpedicaoId.trim()) {
      showToast.warning(TOAST_IMPRESSORA_EXPEDICAO_NECESSARIA)
      return
    }
    void executarSalvar()
  }, [empresa?.id, empresaDeliveryConfigurada, executarSalvar, impressoraExpedicaoId, token])

  return (
    <>
      <JiffySidePanelModal
        open={open}
        onClose={onClose}
        title="Configurações de Impressão Delivery"
        subtitle="Escolha o cardápio, a estação deste PC e o vínculo das impressoras físicas."
        headerExtra={
          <div className="flex items-center gap-2">
            <BaixarJiffyPrintCard />
            <BaixarFredyCard />
          </div>
        }
        panelClassName="w-[min(72rem,96vw)] max-w-[100vw] sm:w-[min(1200px,90vw)]"
        footerVariant="bar"
        footerActions={{
          barActionOrder: ['cancel', 'saveAndClose'],
          showCancel: true,
          cancelLabel: 'Fechar',
          cancelVariant: 'primaryTint10',
          onCancel: onClose,
          showSaveAndClose: true,
          saveAndCloseLabel: 'Salvar alterações',
          onSaveAndClose: handleSalvar,
          saveAndCloseLoading: salvando,
          saveAndCloseDisabled: carregando || !empresa?.id,
        }}
      >
        {exibirSkeleton ? (
          <DeliveryConfiguracoesSkeleton />
        ) : (
        <div className="space-y-4 p-5 md:p-7">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <DeliveryConfigCollapsibleSection
            icon={<MdMenuBook className="h-5 w-5" aria-hidden />}
            title="Cardápio do delivery"
            info="App público e pedidos manuais no Gestor usam este mesmo menu."
            resetExpandedWhen={open}
            contentClassName="mt-3 space-y-2"
            className="min-w-0"
          >
            <MenuParametroEmpresaSelect
              id="delivery-kanban-menu"
              label="Cardápio em uso"
              description="Produtos, preços e fotos saem deste cardápio."
              value={menuDeliveryId}
              onChange={setMenuDeliveryId}
              disabled={carregando}
            />
            <EstacaoDestePcCampos
              estacoes={estacoes}
              estacaoId={estacaoIdSelecionada}
              receptoraEstacaoId={receptoraEstacaoIdPendente}
              disabled={carregando || salvando}
              ocupado={ocupadoEstacao}
              onReceptoraChange={handleReceptoraChange}
              onSelecionar={handleSelecionarEstacao}
              onCriar={handleCriarEstacao}
              onRenomear={renomearEstacao}
            />
          </DeliveryConfigCollapsibleSection>

          <DeliveryConfigCollapsibleSection
            icon={<MdTune className="h-5 w-5" aria-hidden />}
            title="Comportamento da impressão"
            info="Define o que acontece quando o pedido chega e quando fica pronto: se vai sozinho para a cozinha e quando cada cupom deve sair."
            resetExpandedWhen={open}
            contentClassName="mt-3 space-y-2"
            className="min-w-0"
          >
            <DeliveryToggleRow
              id="delivery-auto-iniciar-preparo"
              checked={autoIniciarPreparoNovosPedidos}
              disabled={carregando}
              onChecked={setAutoIniciarPreparoNovosPedidos}
              titulo="Enviar novos pedidos direto para produção"
              info="Ligado: o pedido novo já entra na cozinha, sem você aceitar um a um. Desligado: você decide quando começar o preparo."
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-primary-text">Modo de cupom delivery</span>
              <DeliveryModoCupomInfoTooltip modo={modoImpressao} />
              <DeliveryModoCupomToggle
                value={modoImpressao}
                onChange={setModoImpressao}
                disabled={carregando}
              />
            </div>

            {modoImpressao === 'unificado' ? (
              <div className="space-y-1">
                <div className="flex flex-row items-center gap-2">
                  <label htmlFor="delivery-copias" className="text-sm font-semibold text-primary-text">
                    Quantidade de cópias do cupom unificado
                  </label>
                  <div className={`flex shrink-0 ${carregando ? 'opacity-60' : ''}`}>
                    <input
                      id="delivery-copias"
                      type="number"
                      min={1}
                      max={99}
                      value={copiasUnificado}
                      disabled={carregando}
                      onChange={e => setCopiasUnificado(clampCopiasUnificado(Number(e.target.value)))}
                      onBlur={e => setCopiasUnificado(clampCopiasUnificado(Number(e.target.value)))}
                      className="h-8 w-12 rounded-l-lg border border-r-0 border-gray-200 px-2 text-center text-sm tabular-nums outline-none [appearance:textfield] focus:border-secondary disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <div className="flex w-8 flex-col overflow-hidden rounded-r-lg border border-gray-200">
                      <button
                        type="button"
                        aria-label="Aumentar quantidade de cópias"
                        disabled={carregando || copiasUnificado >= 99}
                        onClick={() => setCopiasUnificado(v => clampCopiasUnificado(v + 1))}
                        className="flex h-4 flex-1 items-center justify-center border-b border-gray-200 bg-white text-secondary-text transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="text-sm font-semibold leading-none" aria-hidden>
                          +
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label="Diminuir quantidade de cópias"
                        disabled={carregando || copiasUnificado <= 1}
                        onClick={() => setCopiasUnificado(v => clampCopiasUnificado(v - 1))}
                        className="flex h-4 flex-1 items-center justify-center bg-white text-secondary-text transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="text-sm font-semibold leading-none" aria-hidden>
                          -
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-secondary-text">
                  No modo unificado não há segunda impressão automática ao marcar pronto; use reimpressão na
                  coluna se precisar.
                </p>
              </div>
            ) : null}

            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/90 p-2.5">
              <DeliveryToggleRow
                id="delivery-imp-receber"
                checked={imprimirAoReceber}
                disabled={carregando}
                onChecked={setImprimirAoReceber}
                titulo={
                  modoImpressao === 'unificado'
                    ? 'Imprimir ao iniciar preparo'
                    : 'Imprimir produção ao iniciar preparo'
                }
                info={
                  modoImpressao === 'unificado'
                    ? 'Ligado: o cupom completo sai assim que o pedido entra em preparo.'
                    : 'Ligado: a cozinha recebe o cupom assim que o pedido entra em preparo.'
                }
              />

              {modoImpressao === 'separado' ? (
                <>
                  <DeliveryToggleRow
                    id="delivery-imp-pronto"
                    checked={imprimirAoFicarPronto}
                    disabled={carregando}
                    onChecked={setImprimirAoFicarPronto}
                    titulo="Imprimir expedição ao marcar pronto"
                    info="Ligado: o cupom da entrega sai quando você marca o pedido como pronto."
                  />

                  {!imprimirAoFicarPronto ? (
                    <p className="text-xs text-amber-800">
                      Expedição não será impressa automaticamente ao marcar pronto enquanto esta opção
                      estiver desmarcada.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="rounded-lg bg-white px-3 py-2 text-xs text-secondary-text ring-1 ring-gray-100">
                  No modo unificado a impressão ao marcar pronto não se aplica — apenas o disparo ao iniciar
                  preparo (com cópias definidas acima).
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="delivery-imp-expedicao"
                  className="text-sm font-semibold text-primary-text"
                >
                  Impressora de expedição
                </label>
                <CupomCampoInfo
                  texto={
                    modoImpressao === 'unificado'
                      ? 'É a impressora do cupom completo, quando o pedido entra em preparo. O vínculo físico fica na seção abaixo.'
                      : 'É a impressora do cupom que vai na entrega. A da cozinha é a de cada produto, no vínculo abaixo.'
                  }
                  ariaLabel="Impressora de expedição"
                />
              </div>
              {impressorasLogicas.length === 0 ? (
                <p className="text-xs text-amber-800">
                  Nenhuma impressora cadastrada no sistema. Cadastre em Configurações → Impressoras
                  antes de usar impressão delivery.
                </p>
              ) : null}
              <select
                id="delivery-imp-expedicao"
                value={impressoraExpedicaoId}
                disabled={carregando || impressorasLogicas.length === 0}
                onChange={e => setImpressoraExpedicaoId(e.target.value)}
                className="h-9 w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Selecione uma impressora</option>
                {impressorasLogicas.map(impressora => (
                  <option key={impressora.id} value={impressora.id}>
                    {impressora.nome}
                  </option>
                ))}
              </select>
            </div>
          </DeliveryConfigCollapsibleSection>
          </div>

          <DeliveryCupomTemplateEditor
            value={cupomTemplate}
            onChange={setCupomTemplate}
            disabled={carregando}
            resetSectionsWhen={open}
            resolveImpressoraTeste={modelo => {
              const expedicao = vinculosFisicos[impressoraExpedicaoId]?.trim() ?? ''
              if (modelo === 'expedicao') return expedicao
              const outra = Object.entries(vinculosFisicos).find(
                ([id, nome]) => id !== impressoraExpedicaoId && nome.trim()
              )
              return outra?.[1].trim() || expedicao
            }}
          />

          <DeliveryConfigCollapsibleSection
            icon={<MdPrint className="h-5 w-5" aria-hidden />}
            title="Vínculo com impressoras deste PC"
            description={
              estacaoIdSelecionada && estacaoSelecionadaNome ? (
                <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-secondary/25 bg-secondary/[0.08] px-2.5 py-1 text-xs font-semibold text-secondary">
                  <span className="truncate">Estação ativa: {estacaoSelecionadaNome}</span>
                </span>
              ) : null
            }
            info="Para cada nome do Gestor, escolha a impressora deste PC. A via de produção vale no cupom separado, na reimpressão da cozinha (ícone da impressora) e ao iniciar o preparo — não ao marcar pronto (aí sai a expedição)."
            resetExpandedWhen={open}
          >
            {estacaoIdSelecionada ? (
              <DeliveryVinculoImpressorasFisicas
                impressorasLogicas={impressorasLogicas}
                vinculos={vinculosFisicos}
                onChange={setVinculosFisicos}
                modos={modosImpressaoEstacao}
                onChangeModos={handleChangeModosEstacao}
                disabled={carregando || salvando}
                enabled={open}
              />
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Selecione ou crie uma estação em Cardápio do delivery para vincular as impressoras
                deste computador.
              </p>
            )}

            {erroConfiguracao ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Não foi possível carregar a estação de impressão: {erroConfiguracao}
              </div>
            ) : null}
          </DeliveryConfigCollapsibleSection>
        </div>
        )}
      </JiffySidePanelModal>

      <JiffyConfirmDialog
        open={confirmSalvarSemImpressoraOpen}
        onOpenChange={openDialog => {
          if (!salvando) setConfirmSalvarSemImpressoraOpen(openDialog)
        }}
        title="Impressora de expedição"
        description={DIALOG_SALVAR_SEM_IMPRESSORA_EXPEDICAO}
        cancelLabel="Cancelar"
        confirmLabel="Salvar mesmo assim"
        busy={salvando}
        onConfirm={() => void executarSalvar()}
      />
    </>
  )
}
