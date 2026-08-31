'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdMoreVert } from 'react-icons/md'
import type { Cliente } from '@/src/domain/entities/Cliente'
import { Button } from '@/src/presentation/components/ui/button'
import { SeletorClienteModal } from '@/src/presentation/components/features/pedidos/components/SeletorClienteModal'
import { NovoPedidoModal } from '@/src/presentation/components/features/pedidos/NovoPedidoModal'
import { useClientes } from '@/src/presentation/hooks/useClientes'
import { gravarPendenciaQuadroFlow } from '../quadro/filtroPendenteQuadroFlow'
import { pathQuadroDaSessaoAtual } from '../sessao/pathsGestorSessao'
import { WHATSAPP_PAINEL_LARGURA_PX } from '../constantes'
import { termoBuscaClientePorTelefone } from '@/src/shared/utils/telefoneClienteMatch'
import {
  conversaEhAMesma,
  idConversaWhatsApp,
  tituloConversaGenerico,
} from '@/src/shared/utils/nomeClienteMatch'
import { podeControlarWhatsAppWebView, whatsappReload, whatsappStatus } from './tauriWhatsAppBridge'
import { setWhatsAppWebViewSuspenso } from './whatsappUiState'
import { AtalhosWhatsAppSection } from './AtalhosWhatsAppSection'
import { escolherClienteDaConversa } from './escolherClienteDaConversa'
import { useWhatsAppConversaAtual } from './useWhatsAppConversaAtual'

type Props = {
  onPedirLimparSessao: () => void
}

export function JiffyCustomerPanel({ onPedirLimparSessao }: Props) {
  const router = useRouter()
  const conversa = useWhatsAppConversaAtual()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [manualNestaConversa, setManualNestaConversa] = useState(false)
  const [desvinculadoNestaConversa, setDesvinculadoNestaConversa] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [novoPedidoAberto, setNovoPedidoAberto] = useState(false)
  const [configMensagensAberta, setConfigMensagensAberta] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [carregado, setCarregado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const idConversaRef = useRef('')

  const telefoneConversa = conversa.telefone
  const tituloConversa = conversa.titulo
  const idConversa = idConversaWhatsApp(telefoneConversa, tituloConversa)
  const termoApi = telefoneConversa
    ? termoBuscaClientePorTelefone(telefoneConversa)
    : !tituloConversaGenerico(tituloConversa)
      ? String(tituloConversa)
      : ''
  const { data: achados, isFetching } = useClientes(
    {
      q: termoApi || undefined,
      ativo: true,
      limit: 20,
    },
    { enabled: Boolean(termoApi) }
  )

  useEffect(() => {
    if (conversaEhAMesma(idConversaRef.current, idConversa)) {
      if (!idConversaRef.current) idConversaRef.current = idConversa
      return
    }
    idConversaRef.current = idConversa
    setManualNestaConversa(false)
    setDesvinculadoNestaConversa(false)
    setCliente(null)
  }, [idConversa])

  useEffect(() => {
    if (manualNestaConversa || desvinculadoNestaConversa) return
    if (isFetching) return
    setCliente(escolherClienteDaConversa(achados?.clientes ?? [], telefoneConversa, tituloConversa))
  }, [
    achados,
    isFetching,
    telefoneConversa,
    tituloConversa,
    manualNestaConversa,
    desvinculadoNestaConversa,
  ])

  useEffect(() => {
    if (!podeControlarWhatsAppWebView()) return
    let cancel = false
    const tick = () => {
      void whatsappStatus()
        .then(s => {
          if (!cancel) setCarregado(s.loaded)
        })
        .catch(() => {
          /* webview ainda a nascer */
        })
    }
    tick()
    const id = window.setInterval(tick, 2000)
    return () => {
      cancel = true
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    setWhatsAppWebViewSuspenso(buscaAberta || novoPedidoAberto || configMensagensAberta)
    return () => setWhatsAppWebViewSuspenso(false)
  }, [buscaAberta, novoPedidoAberto, configMensagensAberta])

  const telefoneExibido = cliente?.getTelefone()?.trim() || telefoneConversa || ''

  const copiarTelefone = useCallback(async () => {
    if (!telefoneExibido) {
      setAviso('Não há telefone nesta conversa.')
      return
    }
    try {
      await navigator.clipboard.writeText(telefoneExibido)
      setAviso('Telefone copiado.')
    } catch {
      setAviso('Não foi possível copiar.')
    }
  }, [telefoneExibido])

  const verPedidosCliente = useCallback(() => {
    if (!cliente && !telefoneExibido) {
      setAviso('Abra uma conversa ou selecione um cliente.')
      return
    }
    gravarPendenciaQuadroFlow(telefoneExibido || cliente?.getNome() || '', true)
    router.replace(pathQuadroDaSessaoAtual())
  }, [cliente, router, telefoneExibido])

  const abrirNovoPedido = useCallback(() => {
    setNovoPedidoAberto(true)
  }, [])

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'F2') {
        ev.preventDefault()
        if (!buscaAberta && !configMensagensAberta) abrirNovoPedido()
      }
      if (ev.key === 'F3') {
        ev.preventDefault()
        if (!novoPedidoAberto && !buscaAberta) setConfigMensagensAberta(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abrirNovoPedido, buscaAberta, configMensagensAberta, novoPedidoAberto])

  const estadoCliente = useMemo(() => {
    if (desvinculadoNestaConversa) return 'desvinculado' as const
    if (cliente) return 'vinculado' as const
    if (isFetching && termoApi) return 'buscando' as const
    if (telefoneConversa || !tituloConversaGenerico(tituloConversa)) return 'nao-encontrado' as const
    return 'sem-conversa' as const
  }, [cliente, desvinculadoNestaConversa, isFetching, telefoneConversa, termoApi, tituloConversa])

  return (
    <aside
      className="flex h-full min-h-0 shrink-0 flex-col border-l border-primary/10 bg-white"
      style={{ width: WHATSAPP_PAINEL_LARGURA_PX }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-primary-bg px-3 py-3">
        <div>
          <p className="text-sm font-semibold text-secondary">
            {carregado ? 'WhatsApp conectado' : 'Conecte seu WhatsApp'}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAberto(v => !v)}
            className="rounded-lg p-1.5 text-secondary-text hover:bg-primary-bg"
            aria-label="Mais opções"
          >
            <MdMoreVert size={20} />
          </button>
          {menuAberto ? (
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-primary/10 bg-white py-1 shadow-md">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-primary-bg"
                onClick={() => {
                  setMenuAberto(false)
                  void whatsappReload()
                }}
              >
                Recarregar WhatsApp
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-error hover:bg-primary-bg"
                onClick={() => {
                  setMenuAberto(false)
                  onPedirLimparSessao()
                }}
              >
                Desconectar / limpar sessão
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {aviso ? (
          <p className="mb-3 rounded-lg bg-primary-bg px-2 py-1.5 text-xs text-primary-text" role="status">
            {aviso}
          </p>
        ) : null}

        <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-text">Cliente</p>

        {estadoCliente === 'vinculado' && cliente ? (
          <div className="mt-2 rounded-lg border border-primary/20 bg-primary-bg/60 px-3 py-2">
            <p className="text-sm font-semibold text-primary-text">{cliente.getNome()}</p>
            {telefoneExibido ? <p className="text-xs text-secondary-text">{telefoneExibido}</p> : null}
            <div className="mt-2 flex flex-col gap-2">
              <Button type="button" variant="outlined" className="w-full" onClick={() => setBuscaAberta(true)}>
                Trocar cliente
              </Button>
              <Button
                type="button"
                variant="outlined"
                className="w-full"
                onClick={() => {
                  setCliente(null)
                  setManualNestaConversa(false)
                  setDesvinculadoNestaConversa(true)
                  setAviso(null)
                }}
              >
                Desvincular
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-primary-text">
              {estadoCliente === 'buscando'
                ? 'A localizar o cliente…'
                : estadoCliente === 'nao-encontrado'
                  ? 'Cliente não cadastrado'
                  : estadoCliente === 'desvinculado'
                    ? 'Desvinculado desta conversa'
                    : 'Abra uma conversa'}
            </p>
            {telefoneExibido ? <p className="text-xs text-secondary-text">{telefoneExibido}</p> : null}
            <Button
              type="button"
              variant="outlined"
              className="mt-2 w-full"
              onClick={() => setBuscaAberta(true)}
            >
              Buscar cliente
            </Button>
          </>
        )}

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-secondary-text">Pedidos</p>
        <div className="mt-2 flex flex-col gap-2">
          <Button
            type="button"
            className="w-full !bg-secondary !text-white hover:!bg-secondary/90"
            onClick={abrirNovoPedido}
          >
            + Novo pedido (F2)
          </Button>
          <Button type="button" variant="outlined" className="w-full" onClick={verPedidosCliente}>
            Pedidos do cliente
          </Button>
        </div>

        <AtalhosWhatsAppSection
          onAviso={setAviso}
          onCopiarTelefone={() => void copiarTelefone()}
          configAberta={configMensagensAberta}
          onConfigAbertaChange={setConfigMensagensAberta}
        />
      </div>

      <SeletorClienteModal
        open={buscaAberta}
        buscaInicial={termoApi}
        onClose={() => setBuscaAberta(false)}
        onSelect={c => {
          setCliente(c)
          setManualNestaConversa(true)
          setDesvinculadoNestaConversa(false)
          setBuscaAberta(false)
          setAviso(null)
        }}
        title="Buscar cliente"
      />

      <NovoPedidoModal
        open={novoPedidoAberto}
        tipoInicioPedido="entrega"
        clienteInicial={cliente}
        telefoneInicial={telefoneExibido}
        onClose={() => setNovoPedidoAberto(false)}
        onAfterClose={() => setNovoPedidoAberto(false)}
        onSuccess={() => setNovoPedidoAberto(false)}
      />
    </aside>
  )
}
