'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MdPrint, MdRefresh, MdTune } from 'react-icons/md'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  salvarMapeamentosEstacao,
  type ImpressoraLogica,
} from '@/src/infrastructure/api/estacoesImpressaoApi'
import { showToast } from '@/src/shared/utils/toast'
import type { ModoImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
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
import { DIALOG_SALVAR_SEM_IMPRESSORA_EXPEDICAO } from '@/src/shared/utils/deliveryImpressoraExpedicao'
import { salvarDeliveryCupomTemplateLocal } from '@/src/infrastructure/printing/deliveryCupomTemplateStorage'
import {
  isQzChunkLoadError,
  listQzWindowsPrinters,
  loadQzTray,
  mensagemErroCarregarQzTray,
  parseTcpPrinterRef,
  formatTcpPrinterRef,
} from '@/src/infrastructure/printing/qzTrayClient'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import {
  useDeliveryConfigEstacaoImpressao,
  useDeliveryConfigImpressorasLogicas,
  useInvalidateDeliveryConfigImpressaoQueries,
} from '@/src/presentation/hooks/useDeliveryConfigImpressaoQueries'

interface DeliveryConfiguracoesModalProps {
  open: boolean
  onClose: () => void
}

type MapeamentosDraft = Record<string, string>

function clampCopiasUnificado(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.min(99, Math.max(1, Math.floor(n)))
}

async function mensagemErroHttp(res: Response): Promise<string> {
  const raw: unknown = await res.json().catch(() => ({}))
  return (
    textoErroCorpoApi(raw) ||
    (raw &&
    typeof raw === 'object' &&
    'error' in raw &&
    typeof (raw as { error: unknown }).error === 'string'
      ? (raw as { error: string }).error
      : '') ||
    `Erro HTTP ${res.status}`
  )
}

function DeliveryToggleRow(props: {
  id: string
  checked: boolean
  disabled?: boolean
  onChecked: (v: boolean) => void
  titulo: string
  descricao: string
}) {
  const { id, checked, disabled, onChecked, titulo, descricao } = props
  return (
    <label
      htmlFor={id}
      className={`flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-2 shadow-sm ring-1 ring-gray-100 ${disabled ? 'cursor-default opacity-75' : 'cursor-pointer'}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary-text">{titulo}</p>
        <p className="mt-0.5 text-xs text-secondary-text">{descricao}</p>
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChecked(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-secondary focus:ring-secondary"
      />
    </label>
  )
}

/**
 * Campo de mapeamento de impressora: alterna entre "impressora Windows" (select)
 * e "IP direto" (dois inputs: host + porta) sem precisar instalar no Windows.
 * O valor armazenado em IP direto é `tcp://HOST:PORTA`.
 */
function ImpressoraMapeamentoInput({
  value,
  impressorasWindows,
  onChange,
}: {
  value: string
  impressorasWindows: string[]
  onChange: (next: string) => void
}) {
  const tcpRef = parseTcpPrinterRef(value)
  const modoIp = tcpRef !== null || value.startsWith('tcp://')

  const [host, setHost] = useState(tcpRef?.host ?? '')
  const [porta, setPorta] = useState(String(tcpRef?.port ?? 9100))

  // Sincroniza campos IP quando o valor externo muda (ex: hidratação)
  useEffect(() => {
    const parsed = parseTcpPrinterRef(value)
    if (parsed) {
      setHost(parsed.host)
      setPorta(String(parsed.port))
    }
  }, [value])

  function toggleModo() {
    if (modoIp) {
      onChange('')
    } else {
      const ref = host.trim() ? formatTcpPrinterRef(host.trim(), porta || '9100') : 'tcp://'
      onChange(ref)
    }
  }

  function handleHostChange(h: string) {
    setHost(h)
    const portaNum = parseInt(porta, 10)
    if (h.trim() && portaNum >= 1 && portaNum <= 65535) {
      onChange(formatTcpPrinterRef(h.trim(), portaNum))
    } else {
      onChange(h.trim() ? `tcp://${h.trim()}:${porta}` : '')
    }
  }

  function handlePortaChange(p: string) {
    setPorta(p)
    const portaNum = parseInt(p, 10)
    if (host.trim() && portaNum >= 1 && portaNum <= 65535) {
      onChange(formatTcpPrinterRef(host.trim(), portaNum))
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {modoIp ? (
          <div className="flex flex-1 gap-1">
            <input
              type="text"
              placeholder="192.168.1.x"
              value={host}
              onChange={e => handleHostChange(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 text-sm outline-none transition-colors focus:border-secondary"
            />
            <input
              type="number"
              placeholder="9100"
              value={porta}
              min={1}
              max={65535}
              onChange={e => handlePortaChange(e.target.value)}
              className="h-9 w-20 rounded-lg border border-gray-200 bg-white px-2.5 text-sm outline-none transition-colors focus:border-secondary"
            />
          </div>
        ) : (
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-secondary"
          >
            <option value="">Selecione a impressora Windows</option>
            {impressorasWindows.map(printer => (
              <option key={printer} value={printer}>
                {printer}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          title={modoIp ? 'Usar impressora Windows' : 'Usar IP direto (sem instalar no Windows)'}
          onClick={toggleModo}
          className={`flex h-9 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors ${
            modoIp
              ? 'border-secondary bg-secondary/10 text-secondary'
              : 'border-gray-200 bg-white text-secondary-text hover:border-secondary hover:text-secondary'
          }`}
        >
          IP
        </button>
      </div>

      {modoIp && (
        <p className="text-xs text-secondary-text">
          Imprime via raw TCP — sem instalar no Windows.{' '}
          {value.startsWith('tcp://') && !parseTcpPrinterRef(value) ? (
            <span className="text-amber-600">IP ou porta inválidos.</span>
          ) : (
            <span className="font-medium text-primary-text">{value || '—'}</span>
          )}
        </p>
      )}
    </div>
  )
}

export function DeliveryConfiguracoesModal({ open, onClose }: DeliveryConfiguracoesModalProps) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const {
    empresa,
    preferenciasImpressaoDelivery,
    deliveryCupomTemplate: cupomTemplateRemoto,
    isLoading: carregandoEmpresaMe,
  } = useEmpresaMe()
  const impressorasLogicasQuery = useDeliveryConfigImpressorasLogicas(open)
  const estacaoImpressaoQuery = useDeliveryConfigEstacaoImpressao(open)
  const invalidateDeliveryConfigQueries = useInvalidateDeliveryConfigImpressaoQueries()

  const [modoImpressao, setModoImpressao] = useState<ModoImpressaoDelivery>('unificado')
  const [copiasUnificado, setCopiasUnificado] = useState(1)
  const [autoIniciarPreparoNovosPedidos, setAutoIniciarPreparoNovosPedidos] = useState(true)
  const [imprimirAoReceber, setImprimirAoReceber] = useState(true)
  const [imprimirAoFicarPronto, setImprimirAoFicarPronto] = useState(true)
  const [impressoraExpedicaoId, setImpressoraExpedicaoId] = useState<string>('')
  const [cupomTemplate, setCupomTemplate] = useState<DeliveryCupomTemplateConfig>(
    DEFAULT_DELIVERY_CUPOM_TEMPLATE
  )

  const [estacaoImpressaoId, setEstacaoImpressaoId] = useState<string | null>(null)
  const [impressorasWindows, setImpressorasWindows] = useState<string[]>([])
  const [mapeamentos, setMapeamentos] = useState<MapeamentosDraft>({})
  const [salvando, setSalvando] = useState(false)
  const [carregandoImpressoras, setCarregandoImpressoras] = useState(false)
  const [confirmSalvarSemImpressoraOpen, setConfirmSalvarSemImpressoraOpen] = useState(false)
  const [statusQz, setStatusQz] = useState<string>('QZ Tray ainda não detectado.')
  const [erroQz, setErroQz] = useState<string | null>(null)

  const formularioHidratadoRef = useRef(false)
  const mapeamentosHidratadosRef = useRef(false)
  const qzLoadSeqRef = useRef(0)
  const estacaoErroToastRef = useRef(false)

  const impressorasLogicas: ImpressoraLogica[] = impressorasLogicasQuery.data ?? []

  const carregando =
    open &&
    (carregandoEmpresaMe ||
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
      mapeamentosHidratadosRef.current = false
      return
    }
    if (formularioHidratadoRef.current || carregandoEmpresaMe || !empresa?.id) return

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
    empresa?.id,
    preferenciasImpressaoDelivery,
    cupomTemplateRemoto,
  ])

  useEffect(() => {
    if (!open) return
    if (mapeamentosHidratadosRef.current || !estacaoImpressaoQuery.data) return

    mapeamentosHidratadosRef.current = true
    setEstacaoImpressaoId(estacaoImpressaoQuery.data.estacaoId)
    const next: MapeamentosDraft = {}
    for (const item of estacaoImpressaoQuery.data.mapeamentos) {
      next[item.impressoraId] = item.nomeImpressoraWindows
    }
    setMapeamentos(next)
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

  const carregarImpressorasWindows = useCallback(async (loadSeq: number) => {
    setCarregandoImpressoras(true)
    setErroQz(null)
    setStatusQz('Conectando ao QZ Tray...')
    try {
      const qz = await loadQzTray()
      if (loadSeq !== qzLoadSeqRef.current) return

      setStatusQz('QZ Tray conectado. Buscando impressoras do Windows...')

      const unicas = await listQzWindowsPrinters(qz)
      if (loadSeq !== qzLoadSeqRef.current) return

      setImpressorasWindows(unicas)
      setStatusQz(`${unicas.length} impressora(s) encontrada(s) pelo QZ Tray.`)
      if (unicas.length === 0) {
        showToast.info('Nenhuma impressora Windows encontrada pelo QZ Tray.')
      }
    } catch (error) {
      if (loadSeq !== qzLoadSeqRef.current) return
      const msg = mensagemErroCarregarQzTray(error)
      setErroQz(msg)
      setStatusQz('Falha ao detectar QZ Tray.')
      if (!isQzChunkLoadError(error)) {
        showToast.error(msg)
      }
    } finally {
      if (loadSeq === qzLoadSeqRef.current) {
        setCarregandoImpressoras(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const loadSeq = ++qzLoadSeqRef.current
    void carregarImpressorasWindows(loadSeq)
  }, [open, carregarImpressorasWindows])

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

    const payload = impressorasLogicas
      .map(i => ({
        impressoraId: i.id,
        nomeImpressoraWindows: mapeamentos[i.id]?.trim() ?? '',
      }))
      .filter(i => i.nomeImpressoraWindows)

    setSalvando(true)
    try {
      const patchRes = await fetch(`/api/empresas/${encodeURIComponent(empresaId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ parametroDelivery }),
      })

      if (!patchRes.ok) {
        throw new Error(await mensagemErroHttp(patchRes))
      }

      if (estacaoImpressaoId && impressorasLogicas.length > 0) {
        await salvarMapeamentosEstacao(token, estacaoImpressaoId, payload)
      }

      salvarDeliveryCupomTemplateLocal(empresaId, cupomTemplate)
      invalidateDeliveryConfigQueries()
      window.dispatchEvent(new Event('jiffy:empresa-me-updated'))
      showToast.success('Configurações de delivery salvas.')
      setConfirmSalvarSemImpressoraOpen(false)
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível salvar as configurações de delivery.'
      showToast.error(msg)
    } finally {
      setSalvando(false)
    }
  }, [
    empresa?.id,
    estacaoImpressaoId,
    autoIniciarPreparoNovosPedidos,
    impressorasLogicas,
    impressoraExpedicaoId,
    imprimirAoFicarPronto,
    imprimirAoReceber,
    modoImpressao,
    copiasUnificado,
    cupomTemplate,
    mapeamentos,
    invalidateDeliveryConfigQueries,
    token,
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
    if (!impressoraExpedicaoId.trim()) {
      setConfirmSalvarSemImpressoraOpen(true)
      return
    }
    void executarSalvar()
  }, [empresa?.id, executarSalvar, impressoraExpedicaoId, token])

  return (
    <>
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Configurações de Impressão Delivery"
      subtitle="Preferências da empresa para impressão e vínculo das impressoras lógicas com este computador (QZ)"
      panelClassName="w-[min(48rem,95vw)] max-w-[100vw] sm:w-[min(760px,58vw)]"
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
      <div className="space-y-3 p-4 md:p-6">
        <DeliveryConfigCollapsibleSection
          icon={<MdTune className="h-5 w-5" aria-hidden />}
          title="Comportamento da impressão"
          description="Vale para todos os usuários da empresa — controla quando o Kanban deve disparar os tickets."
          resetExpandedWhen={open}
          contentClassName="mt-3 space-y-2"
        >
              <DeliveryToggleRow
                id="delivery-auto-iniciar-preparo"
                checked={autoIniciarPreparoNovosPedidos}
                disabled={carregando}
                onChecked={setAutoIniciarPreparoNovosPedidos}
                titulo="Enviar novos pedidos direto para produção"
                descricao="Quando ativo, pedidos novos entram automaticamente em preparo/produção."
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
                  descricao={
                    modoImpressao === 'unificado'
                      ? 'Cupom completo assim que o pedido entra em preparação.'
                      : 'Tickets da cozinha ao entrar em preparação.'
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
                      descricao="Cupom ou ticket de conferência/expedição ao marcar o pedido pronto."
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
                <label
                  htmlFor="delivery-imp-expedicao"
                  className="text-sm font-semibold text-primary-text"
                >
                  Impressora de expedição (sistema / lógica)
                </label>
                <p className="text-xs text-secondary-text">
                  {modoImpressao === 'unificado'
                    ? 'Onde o cupom completo será impresso ao iniciar preparo.'
                    : 'Onde o cupom de expedição será impresso ao marcar pronto. Produção continua na impressora de cada produto.'}
                </p>
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
        />

        <DeliveryConfigCollapsibleSection
          icon={<MdPrint className="h-5 w-5" aria-hidden />}
          title="Impressoras deste terminal"
          description="Escolha, para cada impressora cadastrada no sistema, qual impressora instalada no Windows/QZ deve receber os tickets."
          resetExpandedWhen={open}
          headerActions={
            <button
              type="button"
              onClick={() => {
                const loadSeq = ++qzLoadSeqRef.current
                void carregarImpressorasWindows(loadSeq)
              }}
              disabled={carregandoImpressoras}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-secondary px-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MdRefresh className={carregandoImpressoras ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {carregandoImpressoras ? 'Atualizando...' : 'Atualizar QZ'}
            </button>
          }
        >
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="grid grid-cols-[1fr_1.3fr] bg-gray-50 text-xs font-semibold uppercase tracking-wide text-secondary-text">
              <div className="border-r border-gray-200 px-3 py-2">Impressora do sistema</div>
              <div className="px-3 py-2">Impressora deste computador</div>
            </div>

            {carregando ? (
              <div className="px-3 py-6 text-sm text-secondary-text">Carregando configurações...</div>
            ) : impressorasLogicas.length === 0 ? (
              <div className="px-3 py-6 text-sm text-secondary-text">
                Nenhuma impressora lógica retornada por <code>/api/impressoras</code>. O QZ pode
                encontrar impressoras do Windows, mas para vincular é preciso haver impressoras
                cadastradas no sistema.
              </div>
            ) : (
              <div className="scrollbar-hide max-h-[350px] overflow-y-auto divide-y divide-gray-200">
                {impressorasLogicas.map(impressora => (
                  <div key={impressora.id} className="grid grid-cols-[1fr_1.3fr] text-sm">
                    <div className="border-r border-gray-200 px-3 py-3 font-semibold text-primary-text">
                      {impressora.nome}
                    </div>
                    <div className="px-3 py-2">
                      <ImpressoraMapeamentoInput
                        value={mapeamentos[impressora.id] ?? ''}
                        impressorasWindows={impressorasWindows}
                        onChange={next =>
                          setMapeamentos(prev => ({ ...prev, [impressora.id]: next }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-secondary-text">
            <span className="font-semibold text-primary-text">Status QZ: </span>
            {statusQz}
            {erroQz ? <div className="mt-1 text-red-600">{erroQz}</div> : null}
            {process.env.NEXT_PUBLIC_QZ_TRAY_SIGNING_ENABLED !== 'true' ? (
              <p className="mt-2 text-xs leading-relaxed text-secondary-text">
                Sem assinatura digital do site (variáveis QZ Tray), o QZ pede permissão repetidamente. Veja{' '}
                <a
                  href="https://qz.io/docs/signing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-secondary underline"
                >
                  qz.io/docs/signing
                </a>
                — ao habilitar, use `NEXT_PUBLIC_QZ_TRAY_SIGNING_ENABLED`, certificado público na pasta{' '}
                <code className="rounded bg-gray-100 px-1">public/qz-tray/signing/</code> e chave no servidor.
              </p>
            ) : null}
          </div>

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
      onOpenChange={open => {
        if (!salvando) setConfirmSalvarSemImpressoraOpen(open)
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
