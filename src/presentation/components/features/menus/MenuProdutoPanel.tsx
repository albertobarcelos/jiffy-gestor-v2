'use client'

import { useEffect, useState } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Input } from '@/src/presentation/components/ui/input'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { showToast } from '@/src/shared/utils/toast'
import type { MenuProduto } from '@/src/shared/types/menus'
import { MENU_PRODUTO_FORM_ID, MENU_SIDE_PANEL_CLASS } from './menuPanelConstants'

interface MenuProdutoPanelProps {
  open: boolean
  menuId: string
  produto: MenuProduto | null
  onClose: () => void
}

function formatCurrency(value: string) {
  const numbers = value.replace(/\D/g, '')
  if (!numbers) return ''
  const num = parseFloat(numbers) / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

function parseCurrency(value: string): number {
  const digits = value.replace(/\D/g, '')
  if (!digits) return NaN
  return parseFloat(digits) / 100
}

export function MenuProdutoPanel({
  open,
  menuId,
  produto,
  onClose,
}: MenuProdutoPanelProps) {
  const { updateProduto } = useMenuMutations(menuId)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [favorito, setFavorito] = useState(false)

  useEffect(() => {
    if (!open || !produto) return
    setNome(produto.nome)
    setDescricao(produto.descricao ?? '')
    setValor(
      formatCurrency(
        String(Math.round(Number(produto.valor ?? 0) * 100))
      )
    )
    setAtivo(produto.ativo)
    setFavorito(produto.favorito)
  }, [open, produto])

  const handleSave = async () => {
    if (!produto) return
    const nomeTrim = nome.trim()
    const valorNum = parseCurrency(valor)
    if (!nomeTrim) {
      showToast.error('Informe o nome')
      return
    }
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      showToast.error('Informe um preço válido')
      return
    }

    try {
      await updateProduto.mutateAsync({
        produtoId: produto.produtoId,
        input: {
          nome: nomeTrim,
          descricao: descricao.trim() || null,
          valor: valorNum,
          ativo,
          favorito,
        },
      })
      showToast.success('Produto atualizado neste cardápio')
      onClose()
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Editar produto no cardápio"
      subtitle={
        produto?.nome ? (
          <span className="text-base font-medium normal-case"># {produto.nome}</span>
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
        saveFormId: MENU_PRODUTO_FORM_ID,
        saveLoading: updateProduto.isPending,
        saveDisabled: !nome.trim() || updateProduto.isPending,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <form
          id={MENU_PRODUTO_FORM_ID}
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
              Essas alterações valem só para este cardápio. O cadastro do produto
              permanece igual.
            </p>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <Input
                  label="Nome no cardápio"
                  required
                  size="small"
                  value={nome}
                  onChange={(e) => setNome(e.target.value.toLocaleUpperCase('pt-BR'))}
                  className="bg-white"
                  sx={sxEntradaCompactaProduto}
                  InputLabelProps={{ required: true }}
                />
                <Input
                  label="Preço"
                  size="small"
                  value={valor}
                  onChange={(e) => setValor(formatCurrency(e.target.value))}
                  placeholder="R$ 0,00"
                  className="bg-white"
                  sx={sxEntradaCompactaProduto}
                />
              </div>

              <Input
                label="Descrição"
                size="small"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="bg-white"
                sx={sxEntradaCompactaProduto}
                multiline
                minRows={3}
              />

              <div className="flex flex-col items-end gap-3 pt-1">
                <JiffyIconSwitch
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  label={ativo ? 'Ativo neste cardápio' : 'Inativo neste cardápio'}
                  labelPosition="end"
                  bordered={false}
                  size="sm"
                  className="justify-end"
                />
                <JiffyIconSwitch
                  checked={favorito}
                  onChange={(e) => setFavorito(e.target.checked)}
                  label="Favorito"
                  labelPosition="end"
                  bordered={false}
                  size="sm"
                  className="justify-end"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </JiffySidePanelModal>
  )
}
