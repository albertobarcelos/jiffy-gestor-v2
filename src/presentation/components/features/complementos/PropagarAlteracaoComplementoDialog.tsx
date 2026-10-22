'use client'

import { useMemo, useState } from 'react'
import type { ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'
import {
  chaveUsoComplemento,
  type AlteracaoComplementoPropagavel,
} from '@/src/domain/policies/complemento/propagarAlteracaoComplemento'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { cn } from '@/src/shared/utils/cn'
import { MENU_WIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import {
  ordenarUsosComplemento,
  type ColunaOrdenacaoUsoComplemento,
  type DirecaoOrdenacaoUsoComplemento,
} from '@/src/presentation/components/features/complementos/ordenacaoUsosComplemento'
import { MdArrowDownward, MdArrowUpward, MdSearch, MdSyncAlt, MdUnfoldMore } from 'react-icons/md'

type Passo = 'perguntar' | 'escolher'

const ASK_PANEL_CLASS = 'w-[min(28rem,95vw)] max-w-[100vw]'

interface PropagarAlteracaoComplementoDialogProps {
  open: boolean
  passo: Passo
  alteracao: AlteracaoComplementoPropagavel | null
  usos: ComplementoUsoNoMenu[]
  selecionados: Set<string>
  onNao: () => void
  onSim: () => void
  onVoltar: () => void
  onConfirmarEscolha: () => void
  onToggleUso: (chave: string, marcado: boolean) => void
  onToggleTodos: (chaves: string[], marcado: boolean) => void
  onDismiss: () => void
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

function textoAlteracao(alteracao: AlteracaoComplementoPropagavel | null): string {
  if (!alteracao) return 'esta alteração'
  const partes: string[] = []
  if (alteracao.valor !== undefined) partes.push(`o valor ${formatarMoeda(alteracao.valor)}`)
  if (alteracao.ativo !== undefined) partes.push(alteracao.ativo ? 'o complemento ativo' : 'o complemento inativo')
  return partes.length > 0 ? partes.join(' e ') : 'esta alteração'
}

export function PropagarAlteracaoComplementoDialog({
  open,
  passo,
  alteracao,
  usos,
  selecionados,
  onNao,
  onSim,
  onVoltar,
  onConfirmarEscolha,
  onToggleUso,
  onToggleTodos,
  onDismiss,
}: PropagarAlteracaoComplementoDialogProps) {
  const perguntando = passo === 'perguntar'
  const resumo = textoAlteracao(alteracao)
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<{
    coluna: ColunaOrdenacaoUsoComplemento
    direcao: DirecaoOrdenacaoUsoComplemento
  }>({ coluna: 'produto', direcao: 'asc' })
  const usosOrdenados = useMemo(
    () => ordenarUsosComplemento(usos, ordenacao.coluna, ordenacao.direcao),
    [usos, ordenacao]
  )
  const usosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return usosOrdenados
    return usosOrdenados.filter(uso =>
      [uso.menu.nome, uso.produto.nome, uso.grupoComplementos.nome].some(nome =>
        nome.toLowerCase().includes(termo)
      )
    )
  }, [busca, usosOrdenados])
  const chavesFiltradas = usosFiltrados.map(chaveUsoComplemento)
  const selecionadosFiltrados = chavesFiltradas.filter(chave => selecionados.has(chave)).length
  const todosMarcados = chavesFiltradas.length > 0 && selecionadosFiltrados === chavesFiltradas.length
  const alternarOrdenacao = (coluna: ColunaOrdenacaoUsoComplemento) => {
    setOrdenacao(atual => ({
      coluna,
      direcao: atual.coluna === coluna && atual.direcao === 'asc' ? 'desc' : 'asc',
    }))
  }
  const iconeOrdenacao = (coluna: ColunaOrdenacaoUsoComplemento) => {
    if (ordenacao.coluna !== coluna) return <MdUnfoldMore size={16} aria-hidden />
    return ordenacao.direcao === 'asc' ? (
      <MdArrowUpward size={14} aria-hidden />
    ) : (
      <MdArrowDownward size={14} aria-hidden />
    )
  }
  const rotuloDirecaoOrdenacao = (coluna: ColunaOrdenacaoUsoComplemento) =>
    ordenacao.coluna === coluna && ordenacao.direcao === 'asc' ? 'decrescente' : 'crescente'

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (perguntando) {
      return {
        showCancel: true,
        cancelLabel: 'Não, só aqui',
        cancelVariant: 'primaryTint10',
        onCancel: () => {
          setBusca('')
          onNao()
        },
        showSave: true,
        saveLabel: 'Sim, escolher',
        onSave: () => {
          setBusca('')
          onSim()
        },
      }
    }
    return {
      showCancel: true,
      cancelLabel: 'Voltar',
      cancelVariant: 'primaryTint10',
      onCancel: () => {
        setBusca('')
        onVoltar()
      },
      showSave: true,
      saveLabel: 'Aplicar nos selecionados',
      onSave: onConfirmarEscolha,
    }
  }, [perguntando, onNao, onSim, onVoltar, onConfirmarEscolha])

  return (
    <JiffySidePanelModal
      open={open}
      onClose={() => {
        setBusca('')
        onDismiss()
      }}
      title={perguntando ? 'Aplicar esta alteração em outros cardápios?' : 'Onde aplicar esta alteração?'}
      subtitle={
        perguntando ? undefined : `Marque onde copiar ${resumo}. O que não for marcado permanece como está.`
      }
      panelClassName={perguntando ? ASK_PANEL_CLASS : MENU_WIDE_PANEL_CLASS}
      footerVariant="bar"
      footerActions={footerActions}
      zIndex={1700}
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3 md:px-5">
        {perguntando ? (
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-8">
            <div className="flex max-w-sm flex-col items-center text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MdSyncAlt size={64} aria-hidden />
              </div>
              <p className="text-base leading-relaxed text-primary-text">
                Este local recebe {resumo}. Os outros cardápios só mudam se você
                selecionar algum na próxima tela clicando em sim.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative mb-2 shrink-0">
              <input
                type="text"
                value={busca}
                onChange={event => setBusca(event.target.value)}
                placeholder="Buscar cardápio, produto ou grupo..."
                className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text">
                <MdSearch size={16} />
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-100">
              <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th
                      scope="col"
                      aria-sort={
                        ordenacao.coluna === 'produto'
                          ? ordenacao.direcao === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      className="w-[24%] px-3 py-2 text-xs font-semibold text-primary-text"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          size="small"
                          checked={todosMarcados}
                          indeterminate={!todosMarcados && selecionadosFiltrados > 0}
                          onChange={event => onToggleTodos(chavesFiltradas, event.target.checked)}
                          inputProps={{ 'aria-label': 'Marcar todos os usos filtrados' }}
                        />
                        <button
                          type="button"
                          onClick={() => alternarOrdenacao('produto')}
                          aria-label={`Ordenar por Produto em ordem ${rotuloDirecaoOrdenacao('produto')}`}
                          className="inline-flex items-center gap-1 text-left"
                        >
                          Produto {iconeOrdenacao('produto')}
                        </button>
                      </div>
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        ordenacao.coluna === 'menu'
                          ? ordenacao.direcao === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      className="w-[23%] px-3 py-2 text-xs font-semibold text-primary-text"
                    >
                      <button
                        type="button"
                        onClick={() => alternarOrdenacao('menu')}
                        aria-label={`Ordenar por Cardápio em ordem ${rotuloDirecaoOrdenacao('menu')}`}
                        className="inline-flex items-center gap-1 text-left"
                      >
                        Cardápio {iconeOrdenacao('menu')}
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        ordenacao.coluna === 'grupo'
                          ? ordenacao.direcao === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      className="w-[30%] px-3 py-2 text-xs font-semibold text-primary-text"
                    >
                      <button
                        type="button"
                        onClick={() => alternarOrdenacao('grupo')}
                        aria-label={`Ordenar por Grupo de complemento em ordem ${rotuloDirecaoOrdenacao('grupo')}`}
                        className="inline-flex items-center gap-1 text-left"
                      >
                        Grupo de complemento {iconeOrdenacao('grupo')}
                      </button>
                    </th>
                    <th scope="col" className="w-[15%] px-3 py-2 text-right text-xs font-semibold text-primary-text">
                      Valor
                    </th>
                    <th scope="col" className="w-[8%] px-3 py-2 text-right text-xs font-semibold text-primary-text">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usosFiltrados.map((uso, index) => {
                    const chave = chaveUsoComplemento(uso)
                    const marcado = selecionados.has(chave)
                    return (
                      <tr
                        key={chave}
                        className={cn(
                          'border-b border-gray-100 last:border-b-0',
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                        )}
                      >
                        <td className="truncate px-3 py-2 text-sm text-primary-text" title={uso.produto.nome}>
                          <div className="flex min-w-0 items-center gap-2">
                            <Checkbox
                              size="small"
                              checked={marcado}
                              onChange={event => onToggleUso(chave, event.target.checked)}
                              inputProps={{
                                'aria-label': marcado
                                  ? `Não aplicar em ${uso.produto.nome}, ${uso.menu.nome}, ${uso.grupoComplementos.nome}`
                                  : `Aplicar em ${uso.produto.nome}, ${uso.menu.nome}, ${uso.grupoComplementos.nome}`,
                              }}
                            />
                            <span className="truncate">{uso.produto.nome}</span>
                          </div>
                        </td>
                        <td className="truncate px-3 py-2 text-sm text-secondary-text" title={uso.menu.nome}>
                          {uso.menu.nome}
                        </td>
                        <td className="truncate px-3 py-2 text-sm text-primary-text" title={uso.grupoComplementos.nome}>
                          {uso.grupoComplementos.nome}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-secondary-text">
                          {formatarMoeda(uso.complementoConfig.valor)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <JiffyIconSwitch
                            checked={uso.complementoConfig.ativo}
                            onChange={() => {}}
                            disabled
                            size="xs"
                            inputProps={{
                              'aria-label': `Status: ${uso.complementoConfig.ativo ? 'Ativo' : 'Inativo'}`,
                            }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {usosFiltrados.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-secondary-text">
                  Nenhum uso encontrado para a busca.
                </p>
              ) : null}
              {selecionados.size === 0 ? (
                <p className="border-t border-gray-100 px-3 py-2 text-xs text-secondary-text">
                  Nenhum cardápio marcado. A alteração fica só neste local.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </JiffySidePanelModal>
  )
}
