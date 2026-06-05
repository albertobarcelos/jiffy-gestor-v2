'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MdPrint, MdRefresh, MdTune } from 'react-icons/md'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  getEstacaoImpressaoId,
  limparEstacaoImpressaoId,
  salvarEstacaoImpressaoId,
} from '@/src/infrastructure/printing/estacaoImpressaoStorage'
import {
  buscarImpressorasLogicas,
  buscarMapeamentosEstacao,
  criarEstacaoImpressao,
  isEstacaoImpressaoNotFoundError,
  listarEstacoesImpressao,
  salvarMapeamentosEstacao,
  type ImpressoraLogica,
} from '@/src/infrastructure/api/estacoesImpressaoApi'
import { showToast } from '@/src/shared/utils/toast'
import { parsePreferenciasImpressaoDelivery } from '@/src/shared/utils/parsePreferenciasImpressaoDelivery'
import type { ModoImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import { parseDeliveryCupomTemplate } from '@/src/shared/utils/parseDeliveryCupomTemplate'
import {
  DEFAULT_DELIVERY_CUPOM_TEMPLATE,
  type DeliveryCupomTemplateConfig,
} from '@/src/shared/types/deliveryCupomTemplate'
import { DeliveryConfigCollapsibleSection } from './DeliveryConfigCollapsibleSection'
import { DeliveryCupomTemplateEditor } from './DeliveryCupomTemplateEditor'
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
import { DIALOG_SALVAR_SEM_IMPRESSORA_EXPEDICAO } from '@/src/shared/utils/deliveryImpressoraExpedicao'
import {
  getDeliveryCupomTemplateLocal,
  salvarDeliveryCupomTemplateLocal,
} from '@/src/infrastructure/printing/deliveryCupomTemplateStorage'

interface DeliveryConfiguracoesModalProps {
  open: boolean
  onClose: () => void
}

type MapeamentosDraft = Record<string, string>

function nomeEstacaoPadrao(): string {
  if (typeof window === 'undefined') return 'Estação Gestor'
  const userAgent = window.navigator.userAgent
  const browser =
    userAgent.includes('Edg') ? 'Edge'
    : userAgent.includes('Chrome') ? 'Chrome'
    : userAgent.includes('Firefox') ? 'Firefox'
    : 'Navegador'
  return `Estação ${browser} - ${new Date().toLocaleDateString('pt-BR')}`
}

function boolConfig(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === '1' || v === 1) return true
  if (v === 'false' || v === '0' || v === 0) return false
  return fallback
}

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
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 accent-primary focus:ring-primary"
      />
    </label>
  )
}

export function DeliveryConfiguracoesModal({ open, onClose }: DeliveryConfiguracoesModalProps) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [parametroEmpresaDraft, setParametroEmpresaDraft] = useState<Record<string, unknown>>({})
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
  const [impressorasLogicas, setImpressorasLogicas] = useState<ImpressoraLogica[]>([])
  const [impressorasWindows, setImpressorasWindows] = useState<string[]>([])
  const [mapeamentos, setMapeamentos] = useState<MapeamentosDraft>({})
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregandoImpressoras, setCarregandoImpressoras] = useState(false)
  const [confirmSalvarSemImpressoraOpen, setConfirmSalvarSemImpressoraOpen] = useState(false)
  const [statusQz, setStatusQz] = useState<string>('QZ Tray ainda não detectado.')
  const [erroQz, setErroQz] = useState<string | null>(null)
  const [erroConfiguracao, setErroConfiguracao] = useState<string | null>(null)

  const carregarImpressorasWindows = useCallback(async () => {
    setCarregandoImpressoras(true)
    setErroQz(null)
    setStatusQz('Conectando ao QZ Tray...')
    try {
      const { loadQzTray } = await import('@/src/infrastructure/printing/qzTrayClient')
      const qz = await loadQzTray()
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect()
      }
      setStatusQz('QZ Tray conectado. Buscando impressoras do Windows...')

      const found = await qz.printers.find()
      let printers =
        Array.isArray(found)
          ? found
          : typeof found === 'string' && found.trim()
            ? [found.trim()]
            : []

      if (printers.length === 0) {
        const details = await qz.printers.details()
        const arr = Array.isArray(details) ? details : [details]
        printers = arr
          .map(p => (p && typeof p.name === 'string' ? p.name.trim() : ''))
          .filter(Boolean)
      }

      const unicas = [...new Set(printers)].sort((a, b) => a.localeCompare(b))
      setImpressorasWindows(unicas)
      setStatusQz(`${unicas.length} impressora(s) encontrada(s) pelo QZ Tray.`)
      if (unicas.length === 0) {
        showToast.info('Nenhuma impressora Windows encontrada pelo QZ Tray.')
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Não foi possível conectar ao QZ Tray para listar impressoras.'
      setErroQz(msg)
      setStatusQz('Falha ao detectar QZ Tray.')
      showToast.error(msg)
    } finally {
      setCarregandoImpressoras(false)
    }
  }, [])

  const carregarConfiguracao = useCallback(async () => {
    if (!token) return
    setCarregando(true)
    setErroConfiguracao(null)
    try {
      const resEmpresa = await fetch('/api/empresas/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resEmpresa.ok) {
        setEmpresaId(null)
        throw new Error(await mensagemErroHttp(resEmpresa))
      }
      const dataEmpresa = (await resEmpresa.json()) as Record<string, unknown>
      const idEmp = dataEmpresa.id != null ? String(dataEmpresa.id).trim() : ''
      if (!idEmp) {
        throw new Error('Resposta da empresa sem id.')
      }
      setEmpresaId(idEmp)

      const rawPe = dataEmpresa.parametroEmpresa
      if (rawPe && typeof rawPe === 'object' && !Array.isArray(rawPe)) {
        setParametroEmpresaDraft({ ...(rawPe as Record<string, unknown>) })
      } else {
        setParametroEmpresaDraft({})
      }

      const prefs = parsePreferenciasImpressaoDelivery(dataEmpresa)
      const parametroEmpresa =
        rawPe && typeof rawPe === 'object' && !Array.isArray(rawPe)
          ? (rawPe as Record<string, unknown>)
          : {}
      setModoImpressao(prefs.modo)
      setCopiasUnificado(Math.min(99, Math.max(1, prefs.copiasCupomUnificado)))
      setAutoIniciarPreparoNovosPedidos(
        boolConfig(
          parametroEmpresa.autoIniciarPreparoNovosPedidos ??
            parametroEmpresa.auto_iniciar_preparo_novos_pedidos ??
            dataEmpresa.autoIniciarPreparoNovosPedidos ??
            dataEmpresa.auto_iniciar_preparo_novos_pedidos,
          true
        )
      )
      setImprimirAoReceber(prefs.imprimirAoReceber)
      setImprimirAoFicarPronto(prefs.imprimirAoFicarPronto)
      setImpressoraExpedicaoId(prefs.impressoraExpedicaoId ?? '')
      setCupomTemplate(getDeliveryCupomTemplateLocal(idEmp) ?? parseDeliveryCupomTemplate(dataEmpresa))

      const criarOuReaproveitarEstacao = async (): Promise<string> => {
        try {
          const estacao = await criarEstacaoImpressao(token, nomeEstacaoPadrao())
          salvarEstacaoImpressaoId(estacao.id)
          return estacao.id
        } catch (createError) {
          const estacoes = await listarEstacoesImpressao(token).catch(() => [])
          const existente = estacoes.find(e => e.ativo) ?? estacoes[0]
          if (existente) {
            salvarEstacaoImpressaoId(existente.id)
            return existente.id
          }

          throw createError
        }
      }

      let estacaoId = getEstacaoImpressaoId()
      const logicas = await buscarImpressorasLogicas(token)
      setImpressorasLogicas(logicas)

      if (!estacaoId) {
        try {
          estacaoId = await criarOuReaproveitarEstacao()
        } catch (createError) {
          const msg =
            createError instanceof Error
              ? createError.message
              : 'Não foi possível criar estação de impressão.'
          setErroConfiguracao(msg)
          showToast.error(msg)
          setMapeamentos({})
          setEstacaoImpressaoId(null)
          return
        }
      }
      setEstacaoImpressaoId(estacaoId)

      let salvos = []
      try {
        salvos = await buscarMapeamentosEstacao(token, estacaoId)
      } catch (error) {
        if (!isEstacaoImpressaoNotFoundError(error)) throw error

        limparEstacaoImpressaoId()
        estacaoId = await criarOuReaproveitarEstacao()
        setEstacaoImpressaoId(estacaoId)
        salvos = await buscarMapeamentosEstacao(token, estacaoId)
      }
      const next: MapeamentosDraft = {}
      for (const item of salvos) {
        next[item.impressoraId] = item.nomeImpressoraWindows
      }
      setMapeamentos(next)
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar configurações de impressão.'
      showToast.error(msg)
    } finally {
      setCarregando(false)
    }
  }, [token])

  useEffect(() => {
    if (!open) return
    void carregarConfiguracao()
    void carregarImpressorasWindows()
  }, [open, carregarConfiguracao, carregarImpressorasWindows])

  const linhasConfiguradas = useMemo(
    () => impressorasLogicas.filter(i => Boolean(mapeamentos[i.id]?.trim())).length,
    [impressorasLogicas, mapeamentos]
  )

  const executarSalvar = useCallback(async () => {
    if (!token || !empresaId) return

    const parametroEmpresa: Record<string, unknown> = {
      ...parametroEmpresaDraft,
      modoImpressaoDelivery: modoImpressao,
      copiasCupomUnificado: Math.min(99, Math.max(1, Math.floor(Number(copiasUnificado)) || 1)),
      autoIniciarPreparoNovosPedidos,
      imprimirAoReceber,
      imprimirAoFicarPronto,
    }

    delete parametroEmpresa.impressoraExpedicaoId
    delete parametroEmpresa.impressora_expedicao_id
    delete parametroEmpresa.cupomDeliveryTemplate
    delete parametroEmpresa.modeloCupomDelivery

    const expId = impressoraExpedicaoId.trim()
    parametroEmpresa.impressoraExpedicaoId = expId || null

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
        body: JSON.stringify({ parametroEmpresa }),
      })

      if (!patchRes.ok) {
        throw new Error(await mensagemErroHttp(patchRes))
      }

      if (estacaoImpressaoId && impressorasLogicas.length > 0) {
        await salvarMapeamentosEstacao(token, estacaoImpressaoId, payload)
      }

      salvarDeliveryCupomTemplateLocal(empresaId, cupomTemplate)
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
    empresaId,
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
    parametroEmpresaDraft,
    token,
  ])

  const handleSalvar = useCallback(() => {
    if (!token) {
      showToast.error('Sessão expirada.')
      return
    }
    if (!empresaId) {
      showToast.error('Empresa não carregada. Aguarde ou abra o painel novamente.')
      return
    }
    if (!impressoraExpedicaoId.trim()) {
      setConfirmSalvarSemImpressoraOpen(true)
      return
    }
    void executarSalvar()
  }, [empresaId, executarSalvar, impressoraExpedicaoId, token])

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
        saveAndCloseDisabled: carregando || !empresaId,
      }}
    >
      <div className="space-y-3 p-4 md:p-6">
        <DeliveryConfigCollapsibleSection
          icon={<MdTune className="h-5 w-5" aria-hidden />}
          title="Comportamento da impressão (empresa)"
          description="Vale para todos os usuários da empresa — controla quando o Kanban pode disparar tickets após iniciar preparo ou marcar pronto."
          resetExpandedWhen={open}
        >
              <DeliveryToggleRow
                id="delivery-auto-iniciar-preparo"
                checked={autoIniciarPreparoNovosPedidos}
                disabled={carregando}
                onChecked={setAutoIniciarPreparoNovosPedidos}
                titulo="Enviar novos pedidos direto para produção"
                descricao="Quando ativo, pedidos novos entram automaticamente em preparo/produção. Desative para manter os pedidos aguardando ação manual."
              />

              <div className="flex flex-row items-center gap-2">
                <label htmlFor="delivery-modo-impressao" className="shrink-0 text-sm font-semibold text-primary-text">
                  Modo de cupom delivery
                </label>
                <div className="min-w-0 flex-1">
                  <Select
                    value={modoImpressao}
                    disabled={carregando}
                    onValueChange={v =>
                      setModoImpressao(v === 'separado' ? 'separado' : 'unificado')
                    }
                  >
                    <SelectTrigger
                      id="delivery-modo-impressao"
                      className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm shadow-none focus:border-primary focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 [&>span]:line-clamp-1 [&>span]:text-left"
                    >
                      <SelectValue placeholder="Selecione o modo de cupom" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-gray-200">
                      <SelectItem value="unificado">
                        Unificado — Um cupom completo ao iniciar preparo (recomendado para a maioria)
                      </SelectItem>
                      <SelectItem value="separado">
                        Separado — Produção na cozinha ao receber e expedição ao marcar pronto
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                        className="h-8 w-12 rounded-l-lg border border-r-0 border-gray-200 px-2 text-center text-sm tabular-nums outline-none [appearance:textfield] focus:border-primary disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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

              <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/90 p-3">
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
                    ? 'Cupom completo ao iniciar preparo. Mapeie também na seção "Impressoras deste terminal".'
                    : 'Cupom de expedição ao marcar pronto. Produção continua na impressora de cada produto. Mapeie também na seção "Impressoras deste terminal".'}
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
                  className="h-9 w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
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
              onClick={carregarImpressorasWindows}
              disabled={carregandoImpressoras}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
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
              <div className="divide-y divide-gray-200">
                {impressorasLogicas.map(impressora => (
                  <div key={impressora.id} className="grid grid-cols-[1fr_1.3fr] text-sm">
                    <div className="border-r border-gray-200 px-3 py-3 font-semibold text-primary-text">
                      {impressora.nome}
                    </div>
                    <div className="px-3 py-2">
                      <select
                        value={mapeamentos[impressora.id] ?? ''}
                        onChange={e =>
                          setMapeamentos(prev => ({
                            ...prev,
                            [impressora.id]: e.target.value,
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary"
                      >
                        <option value="">Selecione a impressora Windows</option>
                        {impressorasWindows.map(printer => (
                          <option key={printer} value={printer}>
                            {printer}
                          </option>
                        ))}
                      </select>
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
                  className="font-medium text-primary underline"
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

          <div className="text-xs text-secondary-text">
            {linhasConfiguradas} de {impressorasLogicas.length} impressora(s) vinculada(s).
          </div>
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
