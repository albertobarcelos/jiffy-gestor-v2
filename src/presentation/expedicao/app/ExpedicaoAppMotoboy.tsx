'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExpedicaoChecklist } from '@/src/presentation/expedicao/checklist/ExpedicaoChecklist'
import { ExpedicaoTecladoSenha } from '@/src/presentation/expedicao/teclado/ExpedicaoTecladoSenha'
import { ExpedicaoAppTabBar } from '@/src/presentation/expedicao/app/shell/ExpedicaoAppTabBar'
import { PedidosTab } from '@/src/presentation/expedicao/app/tabs/PedidosTab'
import { PedidoDetalheScreen } from '@/src/presentation/expedicao/app/tabs/PedidoDetalheScreen'
import { ConfirmarEntregaDialog } from '@/src/presentation/expedicao/app/tabs/ConfirmarEntregaDialog'
import { RodadaAppScreen } from '@/src/presentation/expedicao/app/tabs/RodadaAppScreen'
import { ComissoesTab } from '@/src/presentation/expedicao/app/tabs/ComissoesTab'
import { PerfilTab } from '@/src/presentation/expedicao/app/tabs/PerfilTab'
import { ConfigTab } from '@/src/presentation/expedicao/app/tabs/ConfigTab'
import { PegarPedidoScanner } from '@/src/presentation/expedicao/app/scanner/PegarPedidoScanner'
import { prepararSomLeituraExpedicao } from '@/src/presentation/expedicao/app/som/somLeituraExpedicao'
import {
  gravarPrefsAppEntregador,
  lerPrefsAppEntregador,
  type PrefsAppEntregador,
} from '@/src/presentation/expedicao/app/prefs/prefsAppEntregador'
import type { AbaExpedicaoApp } from '@/src/presentation/expedicao/app/tipos'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useExpedicaoAppRealtime } from '@/src/presentation/expedicao/app/realtime/useExpedicaoAppRealtime'
import { showToast } from '@/src/shared/utils/toast'
import { useSessaoEntregadorApp } from '@/src/presentation/expedicao/app/hooks/useSessaoEntregadorApp'
import { useComissaoEntregadorApp } from '@/src/presentation/expedicao/app/hooks/useComissaoEntregadorApp'
import { usePedidosEntregadorApp } from '@/src/presentation/expedicao/app/hooks/usePedidosEntregadorApp'
import { useRodadaEntregadorApp } from '@/src/presentation/expedicao/app/hooks/useRodadaEntregadorApp'
import { usePwaInstallPrompt } from '@/src/presentation/expedicao/app/pwa/usePwaInstallPrompt'
import { ExpedicaoAppInstalarScreen } from '@/src/presentation/expedicao/app/pwa/ExpedicaoAppInstalarScreen'
import { deveMostrarPortaoInstalacaoPwa } from '@/src/application/expedicao/app/portaoInstalacaoPwaEntregador'

const VERSAO_APP = '0.1.0'

export function ExpedicaoAppMotoboy() {
  const [aba, setAba] = useState<AbaExpedicaoApp>('pedidos')
  const [prefs, setPrefs] = useState<PrefsAppEntregador>(lerPrefsAppEntregador)
  const [pedindoAviso, setPedindoAviso] = useState(false)
  const [compartilhandoLogs, setCompartilhandoLogs] = useState(false)
  const pwa = usePwaInstallPrompt()

  const sessao = useSessaoEntregadorApp()
  const entregadorId = sessao.entregador?.id ?? null
  const comissao = useComissaoEntregadorApp(entregadorId, sessao.tokenAtual)
  const carregarComissao = comissao.carregarComissao
  const onEntregaConfirmada = useCallback(
    async (periodoAlvo: typeof comissao.periodo) => {
      await carregarComissao('hoje')
      if (periodoAlvo !== 'hoje') await carregarComissao(periodoAlvo)
    },
    [carregarComissao]
  )
  const pedidos = usePedidosEntregadorApp({
    entregadorId,
    tokenAtual: sessao.tokenAtual,
    periodo: comissao.periodo,
    onEntregaConfirmada,
  })
  const carregarPedidos = pedidos.carregarPedidos
  const onExpedida = useCallback(
    () => carregarPedidos({ silencioso: true }),
    [carregarPedidos]
  )
  const rodada = useRodadaEntregadorApp({
    entregadorId,
    tokenAtual: sessao.tokenAtual,
    onExpedida,
  })

  useEffect(() => {
    if (sessao.entregador) setAba('pedidos')
  }, [sessao.entregador])

  useEffect(() => {
    if (!entregadorId || aba !== 'comissoes') return
    void carregarComissao(comissao.periodo)
  }, [aba, carregarComissao, comissao.periodo, entregadorId])

  useExpedicaoAppRealtime({
    habilitado: Boolean(sessao.entregador),
    entregadorId,
    avisos: prefs.avisosPedidoNovo,
    idsAtuais: pedidos.pedidos.map(pedido => pedido.id),
    onAtualizar: () => {
      void carregarPedidos({ silencioso: true })
      void carregarComissao('hoje')
    },
  })

  useEffect(() => {
    if (!entregadorId || aba !== 'pedidos' || rodada.tela !== 'abas') return
    const refetch = () => {
      if (document.visibilityState !== 'visible') return
      void carregarPedidos({ silencioso: true })
    }
    window.addEventListener('focus', refetch)
    document.addEventListener('visibilitychange', refetch)
    return () => {
      window.removeEventListener('focus', refetch)
      document.removeEventListener('visibilitychange', refetch)
    }
  }, [aba, carregarPedidos, entregadorId, rodada.tela])

  const atualizarPrefs = useCallback((next: PrefsAppEntregador) => {
    setPrefs(next)
    gravarPrefsAppEntregador(next)
  }, [])

  const sairEntregador = useCallback(() => {
    sessao.sairEntregador()
    pedidos.resetarPedidos()
    comissao.setComissaoPorPeriodo({})
    setAba('pedidos')
  }, [comissao.setComissaoPorPeriodo, pedidos.resetarPedidos, sessao])

  const compartilharLogs = useCallback(async () => {
    const texto = [
      `Jiffy Expedição App ${VERSAO_APP}`,
      `Loja: ${sessao.empresa?.nomeExibicao ?? '—'} (${sessao.empresa?.id ?? '—'})`,
      `Entregador: ${sessao.entregador?.nome ?? '—'} (${sessao.entregador?.id ?? '—'})`,
      `Pedidos ativos: ${pedidos.pedidos.length}`,
    ].join('\n')
    setCompartilhandoLogs(true)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Logs Expedição', text: texto })
        return
      }
      await navigator.clipboard.writeText(texto)
      showToast.success('Logs copiados.')
    } catch {
      showToast.error('Não foi possível compartilhar os logs.')
    } finally {
      setCompartilhandoLogs(false)
    }
  }, [pedidos.pedidos.length, sessao.empresa, sessao.entregador])

  const alterarAvisos = useCallback(
    async (value: boolean) => {
      if (value && typeof Notification !== 'undefined') {
        if (Notification.permission === 'denied') {
          showToast.error('O navegador bloqueou os avisos. Libere nas configurações do aparelho.')
          atualizarPrefs({ ...prefs, avisosPedidoNovo: false })
          return
        }
        if (Notification.permission === 'default') {
          setPedindoAviso(true)
          try {
            const resultado = await Notification.requestPermission()
            if (resultado !== 'granted') {
              showToast.error('Permissão de aviso negada.')
              atualizarPrefs({ ...prefs, avisosPedidoNovo: false })
              return
            }
          } finally {
            setPedindoAviso(false)
          }
        }
      }
      atualizarPrefs({ ...prefs, avisosPedidoNovo: value })
    },
    [atualizarPrefs, prefs]
  )

  if (!pwa.pronto || sessao.aguardandoBootstrap) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#f4f6f8]">
        <JiffyLoading text="Abrindo o app…" />
      </div>
    )
  }

  if (
    deveMostrarPortaoInstalacaoPwa({
      ehCelular: pwa.ehCelular,
      standalone: pwa.standalone,
    })
  ) {
    return <ExpedicaoAppInstalarScreen pwa={pwa} />
  }

  const overlaySaindo = sessao.saindoLoja ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80">
      <JiffyLoading text="Saindo…" />
    </div>
  ) : null

  if (!sessao.entregador) {
    return (
      <div className="h-dvh bg-[#f4f6f8] text-zinc-900">
        {overlaySaindo}
        <ExpedicaoTecladoSenha
          senha={sessao.senha}
          erro={sessao.erroSenha}
          ocupado={sessao.autenticando}
          titulo="Sua senha"
          subtitulo="Digite os 4 dígitos para ver seus pedidos e comissões."
          onDigito={digito => {
            sessao.setErroSenha(null)
            sessao.setSenha(prev => {
              const next = (prev + digito).slice(0, 4)
              if (next.length === 4) {
                window.setTimeout(() => void sessao.confirmarSenha(next), 0)
              }
              return next
            })
          }}
          onApagar={() => {
            sessao.setErroSenha(null)
            sessao.setSenha(prev => prev.slice(0, -1))
          }}
          onLimpar={() => {
            sessao.setErroSenha(null)
            sessao.setSenha('')
          }}
          onConfirmar={() => void sessao.confirmarSenha(sessao.senha)}
          rodape={
            <button
              type="button"
              disabled={sessao.saindoLoja}
              onClick={sessao.sairLoja}
              className="text-sm font-semibold text-zinc-500 underline-offset-4 hover:underline disabled:opacity-50"
            >
              Sair da loja
            </button>
          }
        />
      </div>
    )
  }

  const lojas = (sessao.hubEmpresas ?? []).filter(loja => Boolean(loja.id) && !loja.bloqueado)
  const lojaNome = sessao.empresa?.nomeExibicao ?? 'Loja'
  const comissaoHoje = comissao.comissaoPorPeriodo.hoje ?? null
  const comissaoAtual = comissao.comissaoPorPeriodo[comissao.periodo] ?? null
  const pedidoAberto = pedidos.pedidos.find(pedido => pedido.id === pedidos.pedidoAbertoId) ?? null
  const pedidoConfirmar = pedidos.pedidos.find(pedido => pedido.id === pedidos.confirmarId) ?? null
  const pedidoChecklist = rodada.rodada[rodada.indiceChecklist]

  return (
    <div className="flex h-dvh flex-col bg-[#f4f6f8] text-zinc-900">
      {overlaySaindo}
      {rodada.tela === 'rodada' ? (
        <RodadaAppScreen
          pedidos={rodada.rodada}
          avisos={rodada.avisosRodada}
          ocupado={rodada.expedindo}
          onPegarMais={() => {
            prepararSomLeituraExpedicao()
            rodada.setScannerAberto(true)
          }}
          onConferir={() => {
            rodada.setIndiceChecklist(0)
            rodada.setMarcados({})
            rodada.setTela('checklist')
          }}
          onExpedir={() => void rodada.expedirRodada()}
          onCancelar={() => {
            rodada.limparRodada()
            setAba('pedidos')
          }}
        />
      ) : null}

      {rodada.tela === 'checklist' && pedidoChecklist ? (
        <div className="min-h-0 flex-1">
          <ExpedicaoChecklist
            pedido={pedidoChecklist}
            indice={rodada.indiceChecklist}
            total={rodada.rodada.length}
            marcados={rodada.marcados}
            ocupado={rodada.expedindo}
            onToggle={itemId =>
              rodada.setMarcados(prev => ({ ...prev, [itemId]: !prev[itemId] }))
            }
            onContinuar={() => {
              if (rodada.indiceChecklist + 1 >= rodada.rodada.length) {
                void rodada.expedirRodada()
                return
              }
              rodada.setIndiceChecklist(i => i + 1)
            }}
            onVoltar={() => {
              if (rodada.indiceChecklist === 0) {
                rodada.setTela('rodada')
                return
              }
              rodada.setIndiceChecklist(i => i - 1)
            }}
          />
        </div>
      ) : null}

      {rodada.tela === 'abas' && aba === 'pedidos' && pedidoAberto ? (
        <PedidoDetalheScreen
          pedido={pedidoAberto}
          itens={pedidos.itensAberto}
          carregandoItens={pedidos.carregandoItens}
          confirmando={pedidos.confirmandoId === pedidoAberto.id}
          onVoltar={() => pedidos.setPedidoAbertoId(null)}
          onPedirConfirmacao={() => pedidos.setConfirmarId(pedidoAberto.id)}
        />
      ) : null}
      {rodada.tela === 'abas' && !(aba === 'pedidos' && pedidoAberto) ? (
        <div key={aba} className="expedicao-slide-direita flex min-h-0 flex-1 flex-col">
          {aba === 'pedidos' ? (
            <PedidosTab
              loja={lojaNome}
              hoje={comissaoHoje}
              pedidos={pedidos.pedidos}
              carregando={pedidos.carregandoPedidos}
              atualizando={pedidos.atualizandoPedidos}
              erro={pedidos.erroPedidos}
              confirmandoId={pedidos.confirmandoId}
              onAbrir={pedidoId => void pedidos.abrirPedido(pedidoId)}
              onPedirConfirmacao={pedidos.setConfirmarId}
              onTentarNovamente={() => void pedidos.carregarPedidos()}
              onAtualizar={() => pedidos.carregarPedidos({ silencioso: true })}
            />
          ) : null}
          {aba === 'comissoes' ? (
            <ComissoesTab
              loja={lojaNome}
              periodo={comissao.periodo}
              onPeriodo={comissao.setPeriodo}
              dados={comissaoAtual}
              carregando={comissao.carregandoComissao}
              erro={comissao.erroComissao}
              onTentarNovamente={() => void comissao.carregarComissao(comissao.periodo)}
            />
          ) : null}
          {aba === 'perfil' ? (
            <PerfilTab
              nome={sessao.entregador.nome}
              telefone={sessao.entregador.telefone}
              email={sessao.usuario?.getEmail() ?? null}
              lojaAtiva={lojaNome}
              lojas={lojas}
              lojaAtivaId={sessao.empresa?.id ?? null}
              onTrocarLoja={loja => void sessao.trocarLoja(loja)}
              onSair={sairEntregador}
              onSairLoja={sessao.sairLoja}
              trocandoLojaId={sessao.trocandoLojaId}
            />
          ) : null}
          {aba === 'config' ? (
            <ConfigTab
              avisos={prefs.avisosPedidoNovo}
              onAvisos={value => void alterarAvisos(value)}
              pedindoAviso={pedindoAviso}
              versao={VERSAO_APP}
              lojaId={sessao.empresa?.id ?? '—'}
              onCompartilharLogs={() => void compartilharLogs()}
              compartilhandoLogs={compartilhandoLogs}
              pwaInstalado={pwa.instalado}
              pwaPodeInstalar={pwa.podeInstalar}
              onInstalarPwa={() => void pwa.instalar()}
            />
          ) : null}
        </div>
      ) : null}

      {rodada.tela === 'abas' && !pedidos.pedidoAbertoId ? (
        <ExpedicaoAppTabBar
          aba={aba}
          ocupado={rodada.pegando}
          onAba={setAba}
          onColetar={() => {
            prepararSomLeituraExpedicao()
            rodada.setScannerAberto(true)
          }}
        />
      ) : null}
      <PegarPedidoScanner
        aberto={rodada.scannerAberto}
        ocupado={rodada.pegando}
        onFechar={() => rodada.setScannerAberto(false)}
        onCodigo={codigo => rodada.pegarPedido(codigo)}
      />
      {pedidoConfirmar ? (
        <ConfirmarEntregaDialog
          pedido={pedidoConfirmar}
          ocupado={pedidos.confirmandoId === pedidoConfirmar.id}
          onCancelar={() => pedidos.setConfirmarId(null)}
          onConfirmar={() => void pedidos.confirmarEntrega(pedidoConfirmar.id)}
        />
      ) : null}
    </div>
  )
}
