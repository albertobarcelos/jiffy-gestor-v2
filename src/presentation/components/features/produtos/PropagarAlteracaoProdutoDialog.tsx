'use client'

import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { cn } from '@/src/shared/utils/cn'
import type { MenuAlvoPropagacao } from '@/src/shared/types/propagarAlteracaoProduto'

type Passo = 'perguntar' | 'escolher'

interface PropagarAlteracaoProdutoDialogProps {
  open: boolean
  passo: Passo
  origem: 'cadastroBase' | 'menu'
  variante?: 'dados' | 'imagem'
  incluirCadastroBase: boolean
  menus: MenuAlvoPropagacao[]
  selecionados: Set<string>
  cadastroBaseMarcado: boolean
  busy: boolean
  onNao: () => void
  onSim: () => void
  onVoltar: () => void
  onConfirmarEscolha: () => void
  onToggleMenu: (id: string, checked: boolean) => void
  onToggleCadastroBase: (checked: boolean) => void
  onDismiss: () => void
}

export function PropagarAlteracaoProdutoDialog({
  open,
  passo,
  origem,
  variante = 'dados',
  incluirCadastroBase,
  menus,
  selecionados,
  cadastroBaseMarcado,
  busy,
  onNao,
  onSim,
  onVoltar,
  onConfirmarEscolha,
  onToggleMenu,
  onToggleCadastroBase,
  onDismiss,
}: PropagarAlteracaoProdutoDialogProps) {
  const isImagem = variante === 'imagem'
  const titulo =
    passo === 'perguntar'
      ? isImagem
        ? 'Aplicar esta imagem em outros cardápios?'
        : 'Aplicar esta alteração em outros Menus?'
      : isImagem
        ? 'Onde aplicar esta imagem?'
        : 'Onde aplicar esta alteração?'

  const descricao =
    passo === 'perguntar'
      ? isImagem
        ? origem === 'cadastroBase'
          ? 'A imagem será salva no menu principal. Deseja aplicar também em outros cardápios?'
          : 'A imagem será salva neste cardápio. Deseja trocar a foto em outros menus também?'
        : origem === 'cadastroBase'
          ? 'A alteração será salva no cadastro do produto. Deseja copiar também para algum cardápio?'
          : 'A alteração será salva neste cardápio. Deseja copiar também para o cadastro base ou para outros menus?'
      : isImagem
        ? 'Marque os cardápios. Os que não forem marcados mantêm a imagem atual.'
        : 'Marque os destinos. O que não for marcado permanece como está.'

  return (
    <JiffyConfirmDialog
      open={open}
      onOpenChange={next => {
        if (!next && !busy) onDismiss()
      }}
      title={titulo}
      description={descricao}
      onConfirm={() => undefined}
      maxWidth="sm"
      busy={busy}
      footer={
        passo === 'perguntar' ? (
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={onNao}
              className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Não, só aqui
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSim}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Sim, escolher
            </button>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={onVoltar}
              className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirmarEscolha}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Aplicar nos selecionados
            </button>
          </div>
        )
      }
    >
      {passo === 'escolher' ? (
        <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-gray-100">
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
                Este produto não está em nenhum outro cardápio.
              </li>
            ) : (
              menus.map((menu, index) => {
                const marcado = selecionados.has(menu.id)
                return (
                  <li
                    key={menu.id}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2',
                      (incluirCadastroBase ? index + 1 : index) % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    )}
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-primary-text">
                      {menu.nome}
                    </p>
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
        </div>
      ) : null}
    </JiffyConfirmDialog>
  )
}
