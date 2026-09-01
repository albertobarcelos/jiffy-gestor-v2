'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import { Input } from '@/src/presentation/components/ui/input'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { usePropagarAlteracaoProduto } from '@/src/presentation/hooks/produtos/usePropagarAlteracaoProduto'
import { showToast } from '@/src/shared/utils/toast'
import type { MenuProduto } from '@/src/shared/types/menus'
import { MENU_PRODUTO_FORM_ID } from './menuPanelConstants'
import { ProdutoFormWithPreviewLayout } from '@/src/presentation/components/features/produtos/preview/ProdutoFormWithPreviewLayout'
import { parsePrecoPreviewFromInput } from '@/src/presentation/components/features/produtos/preview/produtoPreviewModel'
import type { ProdutoPreviewImageUpload } from '@/src/presentation/components/features/produtos/preview/ProdutoSimplePreviewCard'

export type MenuProdutoSnapshotHandle = {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

interface MenuProdutoSnapshotFormProps {
  menuId: string
  produto: MenuProduto
  formId?: string
  onDirtyChange?: (dirty: boolean) => void
  onSavingChange?: (saving: boolean) => void
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

export const MenuProdutoSnapshotForm = forwardRef<
  MenuProdutoSnapshotHandle,
  MenuProdutoSnapshotFormProps
>(function MenuProdutoSnapshotForm(
  {
    menuId,
    produto,
    formId = MENU_PRODUTO_FORM_ID,
    onDirtyChange,
    onSavingChange,
  },
  ref
) {
  const { updateProduto, uploadImagemProduto } = useMenuMutations(menuId)
  const [imagemPreviewOverride, setImagemPreviewOverride] = useState<string | null>(null)
  const { pedirConfirmacao, aplicarNosDestinos, aplicarImagemNosDestinos, dialog: dialogPropagacao } =
    usePropagarAlteracaoProduto()
  const [nome, setNome] = useState(produto.nome)
  const [descricao, setDescricao] = useState(produto.descricao ?? '')
  const [valor, setValor] = useState(
    formatCurrency(String(Math.round(Number(produto.valor ?? 0) * 100)))
  )
  const [ativo, setAtivo] = useState(produto.ativo)
  const [favorito, setFavorito] = useState(produto.favorito)

  const syncFromProduto = useCallback((next: MenuProduto) => {
    setNome(next.nome)
    setDescricao(next.descricao ?? '')
    setValor(formatCurrency(String(Math.round(Number(next.valor ?? 0) * 100))))
    setAtivo(next.ativo)
    setFavorito(next.favorito)
  }, [])

  useEffect(() => {
    syncFromProduto(produto)
  }, [produto, syncFromProduto])

  useEffect(() => {
    if (!produto.image?.imageUrl) return
    setImagemPreviewOverride(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
  }, [produto.image?.imageUrl])

  useEffect(() => {
    return () => {
      if (imagemPreviewOverride?.startsWith('blob:')) {
        URL.revokeObjectURL(imagemPreviewOverride)
      }
    }
  }, [imagemPreviewOverride])

  const handlePreviewImageUpload = useCallback(
    async (file: File) => {
      const blobUrl = URL.createObjectURL(file)
      setImagemPreviewOverride(prev => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
        return blobUrl
      })
      try {
        await uploadImagemProduto.mutateAsync({
          produtoId: produto.produtoId,
          file,
        })
        const destinos = await pedirConfirmacao({
          origem: 'menu',
          produtoId: produto.produtoId,
          menuIdAtual: menuId,
          variante: 'imagem',
        })
        if (destinos && destinos.menuIds.length > 0) {
          await aplicarImagemNosDestinos({
            produtoId: produto.produtoId,
            file,
            destinos,
            vincularSeAusente: true,
          })
          showToast.success('Imagem atualizada neste cardápio e nos selecionados')
        } else {
          showToast.success('Imagem atualizada neste cardápio')
        }
      } catch (err) {
        setImagemPreviewOverride(prev => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
          return null
        })
        showToast.error(err instanceof Error ? err.message : 'Erro ao enviar imagem')
      }
    },
    [uploadImagemProduto, produto.produtoId, menuId, pedirConfirmacao, aplicarImagemNosDestinos]
  )

  const isDirty = useCallback(() => {
    const valorNum = parseCurrency(valor)
    return (
      nome.trim() !== produto.nome ||
      (descricao.trim() || '') !== (produto.descricao ?? '').trim() ||
      (Number.isFinite(valorNum) ? valorNum : -1) !== Number(produto.valor) ||
      ativo !== produto.ativo ||
      favorito !== produto.favorito
    )
  }, [nome, descricao, valor, ativo, favorito, produto])

  useEffect(() => {
    onDirtyChange?.(isDirty())
  }, [isDirty, onDirtyChange])

  const save = useCallback(async () => {
    const nomeTrim = nome.trim()
    const valorNum = parseCurrency(valor)
    if (!nomeTrim) {
      showToast.error('Informe o nome')
      return false
    }
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      showToast.error('Informe um preço válido')
      return false
    }

    const destinos = await pedirConfirmacao({
      origem: 'menu',
      produtoId: produto.produtoId,
      menuIdAtual: menuId,
    })
    if (destinos === null) return false

    const snapshot = {
      nome: nomeTrim,
      descricao: descricao.trim() || null,
      valor: valorNum,
      ativo,
      favorito,
    }

    onSavingChange?.(true)
    try {
      await updateProduto.mutateAsync({
        produtoId: produto.produtoId,
        input: snapshot,
      })
      if (destinos.aplicarNoCadastroBase || destinos.menuIds.length > 0) {
        await aplicarNosDestinos({
          produtoId: produto.produtoId,
          snapshot,
          destinos,
        })
      }
      showToast.success('Produto atualizado neste cardápio')
      return true
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao salvar')
      return false
    } finally {
      onSavingChange?.(false)
    }
  }, [
    nome,
    valor,
    descricao,
    ativo,
    favorito,
    produto.produtoId,
    menuId,
    updateProduto,
    onSavingChange,
    pedirConfirmacao,
    aplicarNosDestinos,
  ])

  useImperativeHandle(ref, () => ({ isDirty, save }), [isDirty, save])

  const previewProduto = useMemo(
    () => ({
      nome,
      preco: parsePrecoPreviewFromInput(valor),
      descricao,
      imagemUrl: imagemPreviewOverride ?? produto.image?.imageUrl ?? null,
    }),
    [nome, valor, descricao, imagemPreviewOverride, produto.image?.imageUrl]
  )

  const previewImageUpload = useMemo(
    (): ProdutoPreviewImageUpload => ({
      enabled: true,
      busy: uploadImagemProduto.isPending,
      hint: 'Arraste ou clique para recortar e enviar',
      onUpload: handlePreviewImageUpload,
    }),
    [handlePreviewImageUpload, uploadImagemProduto.isPending]
  )

  return (
    <ProdutoFormWithPreviewLayout
      showPreview
      preview={previewProduto}
      imageUpload={previewImageUpload}
      className="min-h-0 flex-1"
    >
      <form
        id={formId}
        className="p-2 md:p-4"
        onSubmit={e => {
          e.preventDefault()
          void save()
        }}
      >
      <div className="rounded-[10px] bg-info p-2 md:p-4">
        <div className="mb-2 flex items-center gap-5">
          <h2 className="text-xl font-semibold text-primary">Informações</h2>
          <div className="h-px flex-1 bg-primary/70" />
        </div>
        <p className="mb-4 text-sm text-secondary-text">
          Essas alterações valem neste cardápio. Ao salvar, você pode copiar para o cadastro base
          ou para outros menus.
        </p>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <Input
              label="Nome no cardápio"
              required
              size="small"
              value={nome}
              onChange={e => setNome(e.target.value.toLocaleUpperCase('pt-BR'))}
              className="bg-white"
              sx={sxEntradaCompactaProduto}
              InputLabelProps={{ required: true }}
            />
            <Input
              label="Preço"
              size="small"
              value={valor}
              onChange={e => setValor(formatCurrency(e.target.value))}
              placeholder="R$ 0,00"
              className="bg-white"
              sx={sxEntradaCompactaProduto}
            />
          </div>

          <Input
            label="Descrição"
            size="small"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            className="bg-white"
            sx={sxEntradaCompactaProduto}
            multiline
            minRows={3}
          />

          <div className="flex flex-col items-end gap-3 pt-1">
            <JiffyIconSwitch
              checked={ativo}
              onChange={e => setAtivo(e.target.checked)}
              label={ativo ? 'Ativo neste cardápio' : 'Inativo neste cardápio'}
              labelPosition="end"
              bordered={false}
              size="sm"
              className="justify-end"
            />
            <JiffyIconSwitch
              checked={favorito}
              onChange={e => setFavorito(e.target.checked)}
              label="Favorito"
              labelPosition="end"
              bordered={false}
              size="sm"
              className="justify-end"
            />
          </div>
        </div>
      </div>
      {dialogPropagacao}
      </form>
    </ProdutoFormWithPreviewLayout>
  )
})
