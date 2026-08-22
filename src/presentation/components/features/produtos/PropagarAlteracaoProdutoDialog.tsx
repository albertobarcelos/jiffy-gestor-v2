'use client'

import { useMemo } from 'react'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { cn } from '@/src/shared/utils/cn'
import type {
  MenuAlvoPropagacao,
  VariantePropagacaoProduto,
} from '@/src/shared/types/propagarAlteracaoProduto'

type Passo = 'perguntar' | 'escolher'

interface PropagarAlteracaoProdutoDialogProps {
  open: boolean
  passo: Passo
  origem: 'cadastroBase' | 'menu'
  variante?: VariantePropagacaoProduto
  /** true = ativar; false = desativar (só `statusAtivo`). */
  novoAtivo?: boolean
  /** Menus em que o produto/imagem já foi salvo (exibição na pergunta de criação). */
  menusJaSalvos?: MenuAlvoPropagacao[]
  incluirCadastroBase: boolean
  /** Lista de menus na alteração a partir do cadastro base (sem passo perguntar). */
  fluxoListaCadastroBase?: boolean
  /** Confirmação simples: ativo/inativo vale em todos os menus vinculados. */
  confirmacaoStatusGlobal?: boolean
  /** Obriga marcar ao menos um menu para confirmar (produto já vinculado). */
  exigePeloMenosUmMenu?: boolean
  menusJaVinculadosIds?: Set<string>
  menus: MenuAlvoPropagacao[]
  selecionados: Set<string>
  cadastroBaseMarcado: boolean
  busy: boolean
  confirmarEscolhaDisabled?: boolean
  onNao: () => void
  onSim: () => void
  onVoltar: () => void
  onConfirmarEscolha: () => void
  onToggleMenu: (id: string, checked: boolean) => void
  onToggleCadastroBase: (checked: boolean) => void
  onDismiss: () => void
}

function formatarListaMenus(menus: MenuAlvoPropagacao[]): string {
  if (menus.length === 0) return ''
  if (menus.length === 1) return menus[0].nome
  if (menus.length === 2) return `${menus[0].nome} e ${menus[1].nome}`
  const inicio = menus
    .slice(0, -1)
    .map(m => m.nome)
    .join(', ')
  return `${inicio} e ${menus[menus.length - 1].nome}`
}

const PANEL_CLASS = 'w-[min(28rem,95vw)] max-w-[100vw]'

export function PropagarAlteracaoProdutoDialog({
  open,
  passo,
  origem,
  variante = 'dados',
  novoAtivo,
  menusJaSalvos = [],
  incluirCadastroBase,
  fluxoListaCadastroBase = false,
  confirmacaoStatusGlobal = false,
  exigePeloMenosUmMenu = false,
  menusJaVinculadosIds,
  menus,
  selecionados,
  cadastroBaseMarcado,
  busy,
  confirmarEscolhaDisabled = false,
  onNao,
  onSim,
  onVoltar,
  onConfirmarEscolha,
  onToggleMenu,
  onToggleCadastroBase,
  onDismiss,
}: PropagarAlteracaoProdutoDialogProps) {
  const isImagem = variante === 'imagem'
  const isVinculo = variante === 'vinculoMenus'
  const isStatus = variante === 'statusAtivo'
  const ativando = isStatus && novoAtivo === true
  const desativando = isStatus && novoAtivo === false
  const nomesJaSalvos = formatarListaMenus(menusJaSalvos)

  const titulo = confirmacaoStatusGlobal
    ? ativando
      ? 'Ativar produto?'
      : 'Desativar produto?'
    : fluxoListaCadastroBase
      ? 'Onde aplicar esta alteração?'
      : passo === 'perguntar'
        ? isVinculo
          ? 'Vincular este produto a outros cardápios?'
          : isImagem
            ? 'Aplicar esta imagem em outros cardápios?'
            : isStatus
              ? ativando
                ? 'Ativar produto neste cardápio?'
                : 'Desativar produto neste cardápio?'
              : 'Aplicar esta alteração em outros Menus?'
        : isVinculo
          ? 'Onde vincular o produto?'
          : isImagem
            ? 'Onde aplicar esta imagem?'
            : isStatus
              ? ativando
                ? 'Onde mais ativar o produto?'
                : 'Onde mais desativar o produto?'
              : 'Onde aplicar esta alteração?'

  const descricao = confirmacaoStatusGlobal
    ? desativando
      ? 'O produto ficará indisponível no cadastro base e em todos os cardápios em que estiver vinculado. Deseja continuar?'
      : 'O produto ficará disponível no cadastro base e em todos os cardápios em que estiver vinculado. Deseja continuar?'
    : fluxoListaCadastroBase
      ? exigePeloMenosUmMenu
        ? 'A alteração será salva no cadastro base e nos menus marcados. Menus desmarcados permanecem vinculados, mas não recebem esta alteração. É obrigatório marcar pelo menos um menu.'
        : 'A alteração será salva no cadastro base. Marque os menus para vincular o produto e aplicar a alteração neles, ou confirme sem seleção para salvar só no cadastro.'
      : passo === 'perguntar'
        ? isVinculo
          ? nomesJaSalvos
            ? `O produto já foi salvo em: ${nomesJaSalvos}. Deseja vinculá-lo também a outros cardápios?`
            : 'O produto foi salvo. Deseja vinculá-lo também a outros cardápios?'
          : isImagem
            ? origem === 'cadastroBase'
              ? menusJaSalvos.length > 0
                ? `A imagem será salva em: ${nomesJaSalvos}. Deseja aplicar também em outros cardápios?`
                : 'Escolha em quais cardápios salvar esta imagem. Produto sem vínculo não envia foto automaticamente.'
              : 'A imagem será salva neste cardápio. Deseja trocar a foto em outros menus também?'
            : isStatus
              ? desativando
                ? 'O produto ficará indisponível neste cardápio. Deseja aplicar a mesma desativação no cadastro base ou em outros menus?'
                : 'O produto ficará disponível neste cardápio. Deseja aplicar a mesma ativação no cadastro base ou em outros menus?'
              : origem === 'cadastroBase'
                ? 'A alteração será salva no cadastro do produto. Deseja copiar também para algum cardápio?'
                : 'A alteração será salva neste cardápio. Deseja copiar também para o cadastro base ou para outros menus?'
        : isVinculo
          ? 'Marque os cardápios adicionais. Os já salvos permanecem vinculados.'
          : isImagem
            ? 'Marque os cardápios. Os que não forem marcados mantêm a imagem atual.'
            : isStatus
              ? desativando
                ? 'Marque onde mais o produto deve ficar indisponível. O que não for marcado permanece como está.'
                : 'Marque onde mais o produto deve ficar disponível. O que não for marcado permanece como está.'
              : 'Marque os destinos. O que não for marcado permanece como está.'

  const labelNao = isVinculo ? 'Não, só nestes' : 'Não, só aqui'
  const labelConfirmar = confirmacaoStatusGlobal
    ? ativando
      ? 'Ativar'
      : 'Desativar'
    : fluxoListaCadastroBase
      ? 'Salvar alteração'
      : isVinculo
        ? 'Vincular nos selecionados'
        : isStatus
          ? ativando
            ? 'Ativar nos selecionados'
            : 'Desativar nos selecionados'
          : 'Aplicar nos selecionados'

  const mostrarLista =
    !confirmacaoStatusGlobal && (fluxoListaCadastroBase || passo === 'escolher')

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (confirmacaoStatusGlobal) {
      return {
        showCancel: true,
        cancelLabel: 'Cancelar',
        cancelVariant: 'primaryTint10',
        onCancel: onDismiss,
        cancelDisabled: busy,
        showSave: true,
        saveLabel: labelConfirmar,
        onSave: onConfirmarEscolha,
        saveLoading: busy,
        saveDisabled: busy,
      }
    }
    if (fluxoListaCadastroBase) {
      return {
        showCancel: true,
        cancelLabel: 'Cancelar',
        cancelVariant: 'primaryTint10',
        onCancel: onDismiss,
        cancelDisabled: busy,
        showSave: true,
        saveLabel: labelConfirmar,
        onSave: onConfirmarEscolha,
        saveLoading: busy,
        saveDisabled: busy || confirmarEscolhaDisabled,
      }
    }
    if (passo === 'perguntar') {
      return {
        showCancel: true,
        cancelLabel: labelNao,
        cancelVariant: 'primaryTint10',
        onCancel: onNao,
        cancelDisabled: busy,
        showSave: true,
        saveLabel: 'Sim, escolher',
        onSave: onSim,
        saveLoading: busy,
        saveDisabled: busy,
      }
    }
    return {
      showCancel: true,
      cancelLabel: 'Voltar',
      cancelVariant: 'primaryTint10',
      onCancel: onVoltar,
      cancelDisabled: busy,
      showSave: true,
      saveLabel: labelConfirmar,
      onSave: onConfirmarEscolha,
      saveLoading: busy,
      saveDisabled: busy || confirmarEscolhaDisabled,
    }
  }, [
    confirmacaoStatusGlobal,
    fluxoListaCadastroBase,
    passo,
    busy,
    confirmarEscolhaDisabled,
    labelConfirmar,
    labelNao,
    onDismiss,
    onConfirmarEscolha,
    onNao,
    onSim,
    onVoltar,
  ])

  return (
    <JiffySidePanelModal
      open={open}
      onClose={() => {
        if (!busy) onDismiss()
      }}
      closeOnOverlay={!busy}
      closeOnEscape={!busy}
      title={titulo}
      subtitle={descricao}
      panelClassName={PANEL_CLASS}
      footerVariant="bar"
      footerActions={footerActions}
      zIndex={1400}
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3 md:px-5">
        {mostrarLista ? (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-100">
            <ul>
              {incluirCadastroBase ? (
                <li className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary-text">Cadastro base</p>
                    <p className="text-xs text-secondary-text">Produto no cadastro da empresa</p>
                  </div>
                  <JiffyIconSwitch
                    checked={cadastroBaseMarcado}
                    onChange={e => onToggleCadastroBase(e.target.checked)}
                    label="Cadastro base"
                    labelPosition="start"
                    size="xs"
                    disabled={busy}
                    inputProps={{ 'aria-label': 'Aplicar no cadastro base' }}
                  />
                </li>
              ) : null}
              {menus.length === 0 && !incluirCadastroBase ? (
                <li className="px-3 py-6 text-center text-sm text-secondary-text">
                  {isVinculo
                    ? 'Não há outros cardápios disponíveis para vincular.'
                    : 'Este produto não está em nenhum outro cardápio.'}
                </li>
              ) : (
                menus.map((menu, index) => {
                  const marcado = selecionados.has(menu.id)
                  const jaVinculado = menusJaVinculadosIds?.has(menu.id) ?? false
                  return (
                    <li
                      key={menu.id}
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-2',
                        (incluirCadastroBase ? index + 1 : index) % 2 === 0
                          ? 'bg-white'
                          : 'bg-gray-50'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary-text">
                          {menu.nome}
                        </p>
                        {fluxoListaCadastroBase && jaVinculado ? (
                          <p className="text-xs text-secondary-text">Já vinculado</p>
                        ) : null}
                      </div>
                      <JiffyIconSwitch
                        checked={marcado}
                        onChange={e => onToggleMenu(menu.id, e.target.checked)}
                        label="Menu"
                        labelPosition="start"
                        size="xs"
                        disabled={busy}
                        inputProps={{
                          'aria-label': marcado
                            ? `Não aplicar no menu ${menu.nome}`
                            : `Aplicar no menu ${menu.nome}`,
                        }}
                      />
                    </li>
                  )
                })
              )}
            </ul>
            {fluxoListaCadastroBase && exigePeloMenosUmMenu && selecionados.size === 0 ? (
              <p className="border-t border-gray-100 px-3 py-2 text-xs text-red-600">
                Selecione pelo menos um menu para salvar a alteração.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </JiffySidePanelModal>
  )
}
