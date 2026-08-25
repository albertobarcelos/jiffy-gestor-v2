'use client'

import { useEffect, useState } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Input } from '@/src/presentation/components/ui/input'
import { UppercaseLocaleInput } from '@/src/presentation/components/ui/UppercaseLocaleInput'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { showToast } from '@/src/shared/utils/toast'
import type { Menu } from '@/src/shared/types/menus'
import { MENU_FORM_ID, MENU_SIDE_PANEL_CLASS } from './menuPanelConstants'

interface MenuFormPanelProps {
  open: boolean
  menu: Menu | null
  onClose: () => void
}

export function MenuFormPanel({ open, menu, onClose }: MenuFormPanelProps) {
  const isEdit = Boolean(menu)
  const { createMenu, updateMenu } = useMenuMutations()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const saving = createMenu.isPending || updateMenu.isPending

  useEffect(() => {
    if (!open) return
    setNome(menu?.nome ?? '')
    setDescricao(menu?.descricao ?? '')
    setAtivo(menu?.ativo ?? true)
  }, [open, menu])

  const handleSave = async () => {
    const nomeTrim = nome.trim()
    if (!nomeTrim) {
      showToast.error('Informe o nome do menu')
      return
    }

    try {
      if (isEdit && menu) {
        await updateMenu.mutateAsync({
          id: menu.id,
          input: { nome: nomeTrim, descricao: descricao.trim() || null, ativo },
        })
        showToast.success('Menu atualizado')
      } else {
        await createMenu.mutateAsync({
          nome: nomeTrim,
          descricao: descricao.trim() || null,
        })
        showToast.success('Menu criado')
      }
      onClose()
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao salvar menu')
    }
  }

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar menu' : 'Novo menu'}
      subtitle={
        isEdit && menu?.nome ? (
          <span className="text-base font-medium normal-case"># {menu.nome}</span>
        ) : undefined
      }
      scrollableBody={false}
      footerVariant="bar"
      panelClassName={MENU_SIDE_PANEL_CLASS}
      footerActions={{
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'primaryTint10',
        onCancel: onClose,
        showSave: true,
        saveLabel: 'Salvar',
        saveFormId: MENU_FORM_ID,
        saveLoading: saving,
        saveDisabled: !nome.trim() || saving,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <form
          id={MENU_FORM_ID}
          className="min-h-0 flex-1 overflow-y-auto p-2 md:p-4"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSave()
          }}
        >
          <div className="rounded-[10px] bg-info p-2 md:p-4">
            <div className="mb-2 flex items-center gap-5">
              <h2 className="text-xl font-semibold text-primary">Informações</h2>
              <div className="h-px flex-1 bg-primary/70" />
            </div>
            <p className="mb-4 text-sm text-secondary-text">
              Os produtos deste menu são incluídos depois, na tela do cardápio.
              Alterar um menu não muda o cadastro de produtos.
            </p>

            <div className="space-y-4">
              <UppercaseLocaleInput
                label="Nome do menu"
                required
                size="small"
                value={nome}
                onValueChange={setNome}
                placeholder="Ex.: Delivery, Salão, Eventos"
                className="bg-white"
                sx={sxEntradaCompactaProduto}
                InputLabelProps={{ required: true }}
              />

              <Input
                label="Descrição"
                size="small"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Opcional"
                className="bg-white"
                sx={sxEntradaCompactaProduto}
                multiline
                minRows={3}
              />

              {isEdit && (
                <div className="flex justify-end pt-1">
                  <JiffyIconSwitch
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    label={ativo ? 'Menu ativo' : 'Menu inativo'}
                    labelPosition="end"
                    bordered={false}
                    size="sm"
                    className="justify-end"
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </JiffySidePanelModal>
  )
}
