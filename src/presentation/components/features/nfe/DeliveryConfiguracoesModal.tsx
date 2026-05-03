'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MdPrint, MdRefresh, MdTune } from 'react-icons/md'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  getEstacaoImpressaoId,
  salvarEstacaoImpressaoId,
} from '@/src/infrastructure/printing/estacaoImpressaoStorage'
import {
  buscarImpressorasLogicas,
  buscarMapeamentosEstacao,
  criarEstacaoImpressao,
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
import { DeliveryCupomTemplateEditor } from './DeliveryCupomTemplateEditor'
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
      className={`flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2.5 shadow-sm ring-1 ring-gray-100 ${disabled ? 'cursor-default opacity-75' : 'cursor-pointer'}`}
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

      let estacaoId = getEstacaoImpressaoId()
      const logicas = await buscarImpressorasLogicas(token)
      setImpressorasLogicas(logicas)

      if (!estacaoId) {
        try {
          const estacao = await criarEstacaoImpressao(token, nomeEstacaoPadrao())
          estacaoId = estacao.id
          salvarEstacaoImpressaoId(estacao.id)
        } catch (createError) {
          const estacoes = await listarEstacoesImpressao(token).catch(() => [])
          const existente = estacoes.find(e => e.ativo) ?? estacoes[0]
          if (existente) {
            estacaoId = existente.id
            salvarEstacaoImpressaoId(existente.id)
          } else {
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
      }
      setEstacaoImpressaoId(estacaoId)

      const salvos = await buscarMapeamentosEstacao(token, estacaoId)
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

  const handleSalvar = useCallback(async () => {
    if (!token) {
      showToast.error('Sessão expirada.')
      return
    }
    if (!empresaId) {
      showToast.error('Empresa não carregada. Aguarde ou abra o painel novamente.')
      return
    }

    const parametroEmpresa: Record<string, unknown> = {
      ...parametroEmpresaDraft,
      modoImpressaoDelivery: modoImpressao,
      copiasCupomUnificado: Math.min(99, Math.max(1, Math.floor(Number(copiasUnificado)) || 1)),
      autoIniciarPreparoNovosPedidos,
      imprimirAoReceber,
      imprimirAoFicarPronto,
    }

    /** Evita UUID `null`/stale aliases: muitos backends rejeitam `null`; omitir significa usar impressora do produto quando não há fallback fixo. */
    delete parametroEmpresa.impressoraExpedicaoId
    delete parametroEmpresa.impressora_expedicao_id
    /** Backend atual rejeita chaves extras em parametroEmpresa. O modelo visual fica local por empresa. */
    delete parametroEmpresa.cupomDeliveryTemplate
    delete parametroEmpresa.modeloCupomDelivery
    const expId = impressoraExpedicaoId.trim()
    if (modoImpressao === 'separado' && expId) {
      parametroEmpresa.impressoraExpedicaoId = expId
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

  return (
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
      <div className="space-y-4 p-4 md:p-6">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <MdTune className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-primary-text">
                  Comportamento da impressão (empresa)
                </h3>
                <p className="mt-1 text-sm text-secondary-text">
                  Vale para todos os usuários da empresa — controla quando o Kanban pode disparar tickets
                  após iniciar preparo ou marcar pronto.
                </p>
              </div>

              <DeliveryToggleRow
                id="delivery-auto-iniciar-preparo"
                checked={autoIniciarPreparoNovosPedidos}
                disabled={carregando}
                onChecked={setAutoIniciarPreparoNovosPedidos}
                titulo="Enviar novos pedidos direto para produção"
                descricao="Quando ativo, pedidos novos entram automaticamente em preparo/produção. Desative para manter os pedidos aguardando ação manual."
              />

              <div className="space-y-1">
                <label htmlFor="delivery-modo-impressao" className="text-sm font-semibold text-primary-text">
                  Modo de cupom delivery
                </label>
                <select
                  id="delivery-modo-impressao"
                  value={modoImpressao}
                  disabled={carregando}
                  onChange={e =>
                    setModoImpressao(e.target.value === 'separado' ? 'separado' : 'unificado')
                  }
                  className="h-10 w-full max-w-md rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60"
                >
                  <option value="unificado">
                    Unificado — um cupom completo ao iniciar preparo (recomendado para a maioria)
                  </option>
                  <option value="separado">
                    Separado — produção na cozinha ao receber e expedição ao marcar pronto
                  </option>
                </select>
              </div>

              {modoImpressao === 'unificado' ? (
                <div className="space-y-1">
                  <label htmlFor="delivery-copias" className="text-sm font-semibold text-primary-text">
                    Quantidade de cópias do cupom unificado
                  </label>
                  <input
                    id="delivery-copias"
                    type="number"
                    min={1}
                    max={99}
                    value={copiasUnificado}
                    disabled={carregando}
                    onChange={e => {
                      const n = Number(e.target.value)
                      if (Number.isFinite(n)) setCopiasUnificado(Math.min(99, Math.max(1, Math.floor(n))))
                    }}
                    className="h-10 w-full max-w-[8rem] rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                  />
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

              {modoImpressao === 'separado' ? (
                <div className="space-y-1">
                  <label
                    htmlFor="delivery-imp-expedicao"
                    className="text-sm font-semibold text-primary-text"
                  >
                    Impressora de expedição (sistema / lógica)
                  </label>
                  <p className="text-xs text-secondary-text">
                    Opcional: define uma impressora de expedição única em toda a empresa. Sem escolha aqui, o
                    servidor usa a impressora lógica de cada produto (e este terminal precisa estar mapeando
                    todas as impressoras usadas nos tickets).
                  </p>
                  <select
                    id="delivery-imp-expedicao"
                    value={impressoraExpedicaoId}
                    disabled={carregando}
                    onChange={e => setImpressoraExpedicaoId(e.target.value)}
                    className="h-10 w-full max-w-md rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60"
                  >
                    <option value="">
                      Por produto — impressora configurada em cada item (sem fallback único aqui)
                    </option>
                    {impressorasLogicas.map(impressora => (
                      <option key={impressora.id} value={impressora.id}>
                        {impressora.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <DeliveryCupomTemplateEditor
          value={cupomTemplate}
          onChange={setCupomTemplate}
          disabled={carregando}
        />

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <MdPrint className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-primary-text">
                  Impressoras deste terminal
                </h3>
                <p className="mt-1 text-sm text-secondary-text">
                  Escolha, para cada impressora cadastrada no sistema, qual impressora instalada no
                  Windows/QZ deve receber os tickets.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={carregarImpressorasWindows}
              disabled={carregandoImpressoras}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MdRefresh className={carregandoImpressoras ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {carregandoImpressoras ? 'Atualizando...' : 'Atualizar QZ'}
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
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

          <div className="mt-2 text-xs text-secondary-text">
            {linhasConfiguradas} de {impressorasLogicas.length} impressora(s) vinculada(s).
          </div>
        </section>
      </div>
    </JiffySidePanelModal>
  )
}
