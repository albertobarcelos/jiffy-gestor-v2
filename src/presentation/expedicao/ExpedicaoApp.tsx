'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { avaliarPedidoParaRodada, type PedidoLeituraExpedicao } from '@/src/application/expedicao/avaliarPedidoParaRodada'
import { parseCodigoBarrasExpedicao } from '@/src/application/expedicao/parseCodigoBarrasExpedicao'
import { EXPEDICAO_INATIVIDADE_MS } from '@/src/presentation/expedicao/constantes'
import {
  pathEscolherEmpresaExpedicao,
  pathExpedicaoApp,
  pathLoginExpedicao,
} from '@/src/presentation/expedicao/sessao/pathsExpedicao'
import { parseEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import {
  buscarPedidoPorCodigo,
  identificarEntregadorPorSenha,
  marcarPedidoPronto,
  vincularEDespacharPedido,
  type EntregadorIdentificado,
} from '@/src/presentation/expedicao/api/expedicaoApi'
import { ExpedicaoTecladoSenha } from '@/src/presentation/expedicao/teclado/ExpedicaoTecladoSenha'
import { ExpedicaoListaPedidos } from '@/src/presentation/expedicao/lista/ExpedicaoListaPedidos'
import { ExpedicaoChecklist } from '@/src/presentation/expedicao/checklist/ExpedicaoChecklist'
import { useLeitorCodigoBarras } from '@/src/presentation/expedicao/leitura/useLeitorCodigoBarras'
import { showToast } from '@/src/shared/utils/toast'

type TelaExpedicao = 'senha' | 'lista' | 'checklist'

export function ExpedicaoApp() {
  const [tela, setTela] = useState<TelaExpedicao>('senha')
  const [senha, setSenha] = useState('')
  const [erroSenha, setErroSenha] = useState<string | null>(null)
  const [entregador, setEntregador] = useState<EntregadorIdentificado | null>(null)
  const [pedidos, setPedidos] = useState<PedidoLeituraExpedicao[]>([])
  const [avisos, setAvisos] = useState<Array<{ codigo: string; motivo: string }>>([])
  const [ocupado, setOcupado] = useState(false)
  const [indiceChecklist, setIndiceChecklist] = useState(0)
  const [marcados, setMarcados] = useState<Record<string, boolean>>({})
  const inatividadeRef = useRef<number | undefined>(undefined)

  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const tokenAtual = (): string | null => useAuthStore.getState().tenantAuth?.getAccessToken() ?? null

  useEffect(() => {
    if (!isRehydrated) return
    const tenant = useAuthStore.getState().tenantAuth
    const identity = useAuthStore.getState().identityAuth
    if (tenant && !tenant.isExpired()) return
    if (identity && !identity.isExpired()) {
      window.location.replace(pathEscolherEmpresaExpedicao())
      return
    }
    window.location.replace(pathLoginExpedicao())
  }, [isRehydrated])

  const resetarSessao = useCallback(() => {
    setTela('senha')
    setSenha('')
    setErroSenha(null)
    setEntregador(null)
    setPedidos([])
    setAvisos([])
    setIndiceChecklist(0)
    setMarcados({})
    setOcupado(false)
  }, [])

  const confirmarSenha = useCallback(
    async (digits: string) => {
      const token = tokenAtual()
      if (!token) {
        setErroSenha('Sessão da loja expirada. Entre novamente.')
        return
      }
      if (!/^\d{4}$/.test(digits)) return
      setOcupado(true)
      setErroSenha(null)
      try {
        const identificado = await identificarEntregadorPorSenha(token, digits)
        setEntregador(identificado)
        setSenha('')
        setPedidos([])
        setAvisos([])
        setTela('lista')
      } catch (error) {
        setErroSenha(error instanceof Error ? error.message : 'Senha não encontrada.')
        setSenha('')
      } finally {
        setOcupado(false)
      }
    },
    []
  )

  const adicionarPedido = useCallback(
    async (codigoVenda: string) => {
      if (!entregador) return
      const token = tokenAtual()
      if (!token) {
        showToast.error('Sessão da loja expirada.')
        return
      }
      if (pedidos.some(p => p.codigoVenda === codigoVenda)) {
        showToast.success('Pedido já está na lista.')
        return
      }
      setOcupado(true)
      try {
        const pedido = await buscarPedidoPorCodigo(token, codigoVenda)
        const avaliacao = avaliarPedidoParaRodada(pedido, entregador.id)
        if (!avaliacao.ok) {
          setAvisos(prev => [{ codigo: pedido.codigoVenda || codigoVenda, motivo: avaliacao.motivo }, ...prev].slice(0, 6))
          return
        }
        await marcarPedidoPronto({
          token,
          pedidoId: pedido.id,
          etapaAtual: pedido.etapa,
        })
        setPedidos(prev => [...prev, { ...pedido, etapa: 'PRONTO' }])
        setAvisos(prev => prev.filter(a => a.codigo !== pedido.codigoVenda))
      } catch (error) {
        setAvisos(prev => [
          { codigo: codigoVenda, motivo: error instanceof Error ? error.message : 'Pedido não encontrado.' },
          ...prev,
        ].slice(0, 6))
      } finally {
        setOcupado(false)
      }
    },
    [entregador, pedidos]
  )

  const onLeitura = useCallback(
    (bruto: string) => {
      const lido = parseCodigoBarrasExpedicao(bruto)
      if (!lido) {
        if (tela === 'lista') {
          setAvisos(prev =>
            [{ codigo: bruto.trim().toUpperCase() || '—', motivo: 'Código não reconhecido.' }, ...prev].slice(
              0,
              6
            )
          )
        }
        return
      }
      if (lido.tipo === 'entregador') {
        if (tela === 'senha') {
          setSenha(lido.senha)
          void confirmarSenha(lido.senha)
        }
        return
      }
      if (tela === 'lista') {
        void adicionarPedido(lido.codigoVenda)
      }
    },
    [adicionarPedido, confirmarSenha, tela]
  )

  useLeitorCodigoBarras(onLeitura, tela === 'senha' || tela === 'lista')

  const expedirLista = useCallback(
    async (lista: PedidoLeituraExpedicao[]) => {
      if (!entregador) return
      const token = tokenAtual()
      if (!token) {
        showToast.error('Sessão da loja expirada.')
        return
      }
      setOcupado(true)
      const falhas: Array<{ codigo: string; motivo: string }> = []
      for (const pedido of lista) {
        try {
          await vincularEDespacharPedido({
            token,
            pedidoId: pedido.id,
            entregadorId: entregador.id,
          })
        } catch (error) {
          falhas.push({
            codigo: pedido.codigoVenda || pedido.id,
            motivo: error instanceof Error ? error.message : 'Falha ao expedir.',
          })
        }
      }
      setOcupado(false)
      if (falhas.length === 0) {
        showToast.success(
          lista.length === 1 ? 'Pedido expedido.' : `${lista.length} pedidos expedidos.`
        )
        resetarSessao()
        return
      }
      const okIds = new Set(lista.filter(p => !falhas.some(f => f.codigo === p.codigoVenda)).map(p => p.id))
      setPedidos(prev => prev.filter(p => !okIds.has(p.id)))
      setAvisos(falhas)
      setTela('lista')
      showToast.error('Alguns pedidos não saíram. Veja o aviso na lista.')
    },
    [entregador, resetarSessao]
  )

  useEffect(() => {
    if (tela !== 'lista') return
    const tocar = () => {
      window.clearTimeout(inatividadeRef.current)
      inatividadeRef.current = window.setTimeout(() => {
        resetarSessao()
      }, EXPEDICAO_INATIVIDADE_MS)
    }
    tocar()
    window.addEventListener('keydown', tocar)
    window.addEventListener('pointerdown', tocar)
    return () => {
      window.clearTimeout(inatividadeRef.current)
      window.removeEventListener('keydown', tocar)
      window.removeEventListener('pointerdown', tocar)
    }
  }, [tela, resetarSessao, pedidos.length])

  useEffect(() => {
    const onAtalho = (event: KeyboardEvent) => {
      if (tela === 'lista' && pedidos.length > 0 && !ocupado) {
        if (event.key === 'F2') {
          event.preventDefault()
          void expedirLista(pedidos)
        }
        if (event.key === 'F3') {
          event.preventDefault()
          setIndiceChecklist(0)
          setMarcados({})
          setTela('checklist')
        }
      }
      if (event.key === 'Escape' && tela === 'senha') {
        event.preventDefault()
        resetarSessao()
      }
    }
    window.addEventListener('keydown', onAtalho)
    return () => window.removeEventListener('keydown', onAtalho)
  }, [expedirLista, ocupado, pedidos, resetarSessao, tela])

  const pedidoChecklist = pedidos[indiceChecklist]

  return (
    <div className="h-dvh bg-[var(--color-info,#f4f6f8)] text-primary-text">
      {tela === 'senha' ? (
        <ExpedicaoTecladoSenha
          senha={senha}
          erro={erroSenha}
          ocupado={ocupado}
          onDigito={digito => {
            setErroSenha(null)
            setSenha(prev => {
              const next = (prev + digito).slice(0, 4)
              if (next.length === 4) {
                window.setTimeout(() => void confirmarSenha(next), 0)
              }
              return next
            })
          }}
          onApagar={() => {
            setErroSenha(null)
            setSenha(prev => prev.slice(0, -1))
          }}
          onLimpar={() => {
            setErroSenha(null)
            setSenha('')
          }}
          onConfirmar={() => void confirmarSenha(senha)}
          rodape={
            <a
              href={pathExpedicaoApp(
                typeof window !== 'undefined' ? parseEmpresaSlugFromPath(window.location.pathname) : null
              )}
              className="text-sm font-semibold text-secondary-text underline-offset-4 hover:underline"
            >
              Sou o entregador no celular
            </a>
          }
        />
      ) : null}

      {tela === 'lista' && entregador ? (
        <ExpedicaoListaPedidos
          entregadorNome={entregador.nome}
          pedidos={pedidos}
          avisos={avisos}
          ocupado={ocupado}
          onExpedirExpress={() => void expedirLista(pedidos)}
          onExpedirComConferencia={() => {
            setIndiceChecklist(0)
            setMarcados({})
            setTela('checklist')
          }}
          onTrocarEntregador={resetarSessao}
          onCodigoManual={codigo => {
            const lido = parseCodigoBarrasExpedicao(codigo)
            if (lido?.tipo === 'pedido') {
              void adicionarPedido(lido.codigoVenda)
              return
            }
            void adicionarPedido(codigo.trim().toUpperCase())
          }}
        />
      ) : null}

      {tela === 'checklist' && pedidoChecklist ? (
        <ExpedicaoChecklist
          key={pedidoChecklist.id}
          pedido={pedidoChecklist}
          indice={indiceChecklist}
          total={pedidos.length}
          marcados={marcados}
          ocupado={ocupado}
          onToggle={itemId => setMarcados(prev => ({ ...prev, [itemId]: !prev[itemId] }))}
          onContinuar={() => {
            if (indiceChecklist + 1 >= pedidos.length) {
              void expedirLista(pedidos)
              return
            }
            setIndiceChecklist(i => i + 1)
          }}
          onVoltar={() => {
            if (indiceChecklist === 0) {
              setTela('lista')
              return
            }
            setIndiceChecklist(i => i - 1)
          }}
        />
      ) : null}
    </div>
  )
}
