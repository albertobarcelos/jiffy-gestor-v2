'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MdPrint, MdTune } from 'react-icons/md'
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
import { useAtualizarEmpresaDelivery } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { usePreferenciasImpressaoDelivery } from '@/src/presentation/hooks/usePreferenciasImpressaoDelivery'
import {
  useDeliveryConfigEstacaoImpressao,
  useDeliveryConfigImpressorasLogicas,
  useInvalidateDeliveryConfigImpressaoQueries,
} from '@/src/presentation/hooks/useDeliveryConfigImpressaoQueries'
import { salvarMapeamentosEstacao } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { DeliveryVinculoImpressorasFisicas } from './DeliveryVinculoImpressorasFisicas'
import { CupomCampoInfo } from './DeliveryModoPapelToggle'

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
  const atualizarEmpresaDelivery = useAtualizarEmpresaDelivery()
  const impressorasLogicasQuery = useDeliveryConfigImpressorasLogicas(open)
  const estacaoImpressaoQuery = useDeliveryConfigEstacaoImpressao(open)
  const invalidateDeliveryConfigQueries = useInvalidateDeliveryConfigImpressaoQueries()

  const [modoImpressao, setModoImpressao] = useState<ModoImpressaoDelivery>('unificado')
  const [copiasUnificado, setCopiasUnificado] = useState(1)
  const [autoIniciarPreparoNovosPedidos, setAutoIniciarPreparoNovosPedidos] = useState(true)
  const [imprimirAoReceber, setImprimirAoReceber] = useState(true)
  const [imprimirAoFicarPronto, setImprimirAoFicarPronto] = useState(true)
  const [impressoraExpedicaoId, setImpressoraExpedicaoId] = useState<string>('')
  const [vinculosFisicos, setVinculosFisicos] = useState<Record<string, string>>({})
  const [cupomTemplate, setCupomTemplate] = useState<DeliveryCupomTemplateConfig>(
    DEFAULT_DELIVERY_CUPOM_TEMPLATE
  )
  const [salvando, setSalvando] = useState(false)
  const [confirmSalvarSemImpressoraOpen, setConfirmSalvarSemImpressoraOpen] = useState(false)

  const formularioHidratadoRef = useRef(false)
  const estacaoErroToastRef = useRef(false)

  const impressorasLogicas = impressorasLogicasQuery.data ?? []

  const carregando =
    open &&
    (carregandoEmpresaMe ||
      carregandoPreferenciasDelivery ||
      buscandoPreferenciasDelivery ||
      impressorasLogicasQuery.isPending ||
      estacaoImpressaoQuery.isPending)

  const erroConfiguracao = useMemo(() => {
    const err = estacaoImpressaoQuery.error
    if (!err) return null
    return err instanceof Error ? err.message : 'Não foi possível carregar estação de impressão.'
  }, [estacaoImpressaoQuery.error])

  useEffect(() => {
    if (!open) {
      formularioHidratadoRef.current = false
      return
    }
    formularioHidratadoRef.current = false
    void refetchPreferenciasDelivery()
  }, [open, refetchPreferenciasDelivery])

  useEffect(() => {
    if (!open) return
    if (
      formularioHidratadoRef.current ||
      carregandoEmpresaMe ||
      carregandoPreferenciasDelivery ||
      buscandoPreferenciasDelivery ||
      !empresa?.id
    )
      return

    const prefs = preferenciasImpressaoDelivery
    formularioHidratadoRef.current = true
    setModoImpressao(prefs.modo)
    setCopiasUnificado(Math.min(99, Math.max(1, prefs.copiasCupomUnificado)))
    setAutoIniciarPreparoNovosPedidos(prefs.autoIniciarPreparoNovosPedidos)
    setImprimirAoReceber(prefs.imprimirAoReceber)
    setImprimirAoFicarPronto(prefs.imprimirAoFicarPronto)
    setImpressoraExpedicaoId(prefs.impressoraExpedicaoId ?? '')
    setCupomTemplate(cupomTemplateRemoto)
  }, [
    open,
    carregandoEmpresaMe,
    carregandoPreferenciasDelivery,
    buscandoPreferenciasDelivery,
    empresa?.id,
    preferenciasImpressaoDelivery,
    cupomTemplateRemoto,
  ])

  useEffect(() => {
    if (!open) return
    const mapeamentos = estacaoImpressaoQuery.data?.mapeamentos
    if (!mapeamentos) return
    const next: Record<string, string> = {}
    for (const item of mapeamentos) {
      const id = item.impressoraId?.trim()
      const fisica = item.nomeImpressoraWindows?.trim()
      if (id && fisica) next[id] = fisica
    }
    setVinculosFisicos(next)
  }, [open, estacaoImpressaoQuery.data])

  useEffect(() => {
    if (!open) {
      estacaoErroToastRef.current = false
      return
    }
    if (!estacaoImpressaoQuery.isError || estacaoErroToastRef.current) return
    estacaoErroToastRef.current = true
    const msg = erroConfiguracao ?? 'Não foi possível inicializar a estação de impressão.'
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
    }

    setSalvando(true)
    try {
      await atualizarEmpresaDelivery.mutateAsync({ parametroDelivery })
      salvarDeliveryCupomTemplateLocal(empresaId, cupomTemplate)
      const estacaoId = estacaoImpressaoQuery.data?.estacaoId?.trim()
      if (estacaoId) {
        const mapeamentos = Object.entries(vinculosFisicos)
          .map(([impressoraId, nome]) => ({
            impressoraId,
            nomeImpressoraWindows: nome.trim(),
          }))
          .filter(item => item.impressoraId && item.nomeImpressoraWindows)
        await salvarMapeamentosEstacao(token, estacaoId, mapeamentos)
      }
      invalidateDeliveryConfigQueries()
      window.dispatchEvent(new Event('jiffy:empresa-me-updated'))
      showToast.success('Configurações de delivery salvas.')
      setConfirmSalvarSemImpressoraOpen(false)
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
    modoImpressao,
    copiasUnificado,
    cupomTemplate,
    invalidateDeliveryConfigQueries,
    token,
    vinculosFisicos,
    estacaoImpressaoQuery.data?.estacaoId,
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
        subtitle="Neste PC: vincule cada impressora lógica à impressora física. O agente só imprime o destino escolhido."
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
        <div className="space-y-4 p-5 md:p-7">
          <DeliveryConfigCollapsibleSection
            icon={<MdTune className="h-5 w-5" aria-hidden />}
            title="Comportamento da impressão"
            info="Define o que acontece quando o pedido chega e quando fica pronto: se vai sozinho para a cozinha e quando cada cupom deve sair."
            resetExpandedWhen={open}
            contentClassName="mt-3 space-y-2"
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
            info="Ligue cada impressora do sistema à impressora de verdade deste computador. Sem esse vínculo, o cupom não sai."
            resetExpandedWhen={open}
          >
            <DeliveryVinculoImpressorasFisicas
              impressorasLogicas={impressorasLogicas}
              vinculos={vinculosFisicos}
              onChange={setVinculosFisicos}
              disabled={carregando || salvando}
              enabled={open}
            />

            {erroConfiguracao ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Não foi possível inicializar a estação de impressão: {erroConfiguracao}
              </div>
            ) : null}
          </DeliveryConfigCollapsibleSection>
        </div>
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
