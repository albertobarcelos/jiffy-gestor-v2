'use client'

import { useMemo } from 'react'
import type { ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'
import {
  chaveUsoComplemento,
  type AlteracaoComplementoPropagavel,
} from '@/src/domain/policies/complemento/propagarAlteracaoComplemento'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { cn } from '@/src/shared/utils/cn'

type Passo = 'perguntar' | 'escolher'

type UsoAgrupado = {
  menuProdutoId: string
  menuNome: string
  produtoNome: string
  usos: ComplementoUsoNoMenu[]
}

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
  onToggleTodos: (marcado: boolean) => void
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

function agrupar(usos: ComplementoUsoNoMenu[]): UsoAgrupado[] {
  const mapa = new Map<string, UsoAgrupado>()
  for (const uso of usos) {
    const existente = mapa.get(uso.menuProdutoId)
    if (existente) {
      existente.usos.push(uso)
      continue
    }
    mapa.set(uso.menuProdutoId, {
      menuProdutoId: uso.menuProdutoId,
      menuNome: uso.menu.nome,
      produtoNome: uso.produto.nome,
      usos: [uso],
    })
  }
  return Array.from(mapa.values())
    .map(grupo => ({
      ...grupo,
      usos: [...grupo.usos].sort((a, b) =>
        a.grupoComplementos.nome.localeCompare(b.grupoComplementos.nome, 'pt-BR')
      ),
    }))
    .sort((a, b) => {
      const porProduto = a.produtoNome.localeCompare(b.produtoNome, 'pt-BR')
      if (porProduto !== 0) return porProduto
      return a.menuNome.localeCompare(b.menuNome, 'pt-BR')
    })
}

const PANEL_CLASS = 'w-[min(28rem,95vw)] max-w-[100vw]'

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
  const agrupados = useMemo(() => agrupar(usos), [usos])
  const todosMarcados = usos.length > 0 && usos.every(uso => selecionados.has(chaveUsoComplemento(uso)))

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (perguntando) {
      return {
        showCancel: true,
        cancelLabel: 'Não, só aqui',
        cancelVariant: 'primaryTint10',
        onCancel: onNao,
        showSave: true,
        saveLabel: 'Sim, escolher',
        onSave: onSim,
      }
    }
    return {
      showCancel: true,
      cancelLabel: 'Voltar',
      cancelVariant: 'primaryTint10',
      onCancel: onVoltar,
      showSave: true,
      saveLabel: 'Aplicar nos selecionados',
      onSave: onConfirmarEscolha,
    }
  }, [perguntando, onNao, onSim, onVoltar, onConfirmarEscolha])

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onDismiss}
      title={perguntando ? 'Aplicar esta alteração em outros cardápios?' : 'Onde aplicar esta alteração?'}
      subtitle={
        perguntando
          ? `Este local recebe ${resumo}. Os outros cardápios só mudam se você marcar.`
          : `Marque onde copiar ${resumo}. O que não for marcado permanece como está.`
      }
      panelClassName={PANEL_CLASS}
      footerVariant="bar"
      footerActions={footerActions}
      zIndex={1700}
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3 md:px-5">
        {perguntando ? null : (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-100">
            <ul>
              <li className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-2">
                <p className="text-sm font-medium text-primary-text">Marcar todos</p>
                <JiffyIconSwitch
                  checked={todosMarcados}
                  onChange={event => onToggleTodos(event.target.checked)}
                  label="Marcar todos"
                  labelPosition="start"
                  size="xs"
                  inputProps={{ 'aria-label': 'Marcar todos os cardápios' }}
                />
              </li>
              {agrupados.map(grupo => (
                <li key={grupo.menuProdutoId} className="border-t border-gray-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-primary-text">{grupo.produtoNome}</p>
                  <p className="truncate text-xs text-secondary-text">{grupo.menuNome}</p>
                  <ul className="mt-1">
                    {grupo.usos.map((uso, index) => {
                      const chave = chaveUsoComplemento(uso)
                      const marcado = selecionados.has(chave)
                      return (
                        <li
                          key={chave}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded px-1 py-1.5',
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-primary-text">{uso.grupoComplementos.nome}</p>
                            <p className="text-xs text-secondary-text">
                              {formatarMoeda(uso.complementoConfig.valor)}
                              {' · '}
                              {uso.complementoConfig.ativo ? 'Ativo' : 'Inativo'}
                            </p>
                          </div>
                          <JiffyIconSwitch
                            checked={marcado}
                            onChange={event => onToggleUso(chave, event.target.checked)}
                            size="xs"
                            inputProps={{
                              'aria-label': marcado
                                ? `Não aplicar em ${grupo.produtoNome}, ${uso.grupoComplementos.nome}`
                                : `Aplicar em ${grupo.produtoNome}, ${uso.grupoComplementos.nome}`,
                            }}
                          />
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
            {selecionados.size === 0 ? (
              <p className="border-t border-gray-100 px-3 py-2 text-xs text-secondary-text">
                Nenhum cardápio marcado. A alteração fica só neste local.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </JiffySidePanelModal>
  )
}
