'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
} from 'react'
import { MdDeleteOutline } from 'react-icons/md'
import { Input } from '@/src/presentation/components/ui/input'
import { UppercaseLocaleInput } from '@/src/presentation/components/ui/UppercaseLocaleInput'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { usePropagarAlteracaoProduto } from '@/src/presentation/hooks/produtos/usePropagarAlteracaoProduto'
import { showToast } from '@/src/shared/utils/toast'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'
import { MENU_PRODUTO_FORM_ID } from './menuPanelConstants'
import {
  MenuCategoriaNesteCardapioCampos,
  type MenuCategoriaNesteCardapioHandle,
} from './MenuCategoriaNesteCardapioCampos'
import { MenuProdutoPromocaoControl } from './MenuProdutoPromocaoControl'
import {
  VALOR_PROMOCIONAL_MINIMO,
  descontoPercentualFromPrecos,
  isValorPromocionalValido,
  produtoTemPromocaoPreenchida,
  valorPromocionalFromDesconto,
} from '@/src/domain/policies/menu/precoVigenteSnapshot'
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
  grupo?: MenuGrupoProduto | null
  formId?: string
  onDirtyChange?: (dirty: boolean) => void
  onSavingChange?: (saving: boolean) => void
  onGrupoChange?: (grupo: MenuGrupoProduto) => void
  onRemoverDesteCardapio?: () => void
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

function formatCurrencyFromNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0) return ''
  return formatCurrency(String(Math.round(value * 100)))
}

function parseCurrency(value: string): number {
  const digits = value.replace(/\D/g, '')
  if (!digits) return NaN
  return parseFloat(digits) / 100
}

function formatDescontoPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return ''
  return String(value).replace('.', ',')
}

function parseDescontoPct(value: string): number {
  const normalized = value.replace('%', '').trim().replace(',', '.')
  if (!normalized) return NaN
  return Number(normalized)
}

/** Props do input nativo: seleciona o conteúdo ao focar/clicar. */
const inputPropsSelecionarConteudo = {
  onFocus: (e: FocusEvent<HTMLInputElement>) => {
    e.currentTarget.select()
  },
  onClick: (e: MouseEvent<HTMLInputElement>) => {
    e.currentTarget.select()
  },
  onMouseUp: (e: MouseEvent<HTMLInputElement>) => {
    e.preventDefault()
  },
}

function descontoInicialFromProduto(produto: MenuProduto): string {
  const pct = descontoPercentualFromPrecos(
    Number(produto.valor ?? 0),
    Number(produto.valorPromocional ?? 0)
  )
  return formatDescontoPct(pct)
}

export const MenuProdutoSnapshotForm = forwardRef<
  MenuProdutoSnapshotHandle,
  MenuProdutoSnapshotFormProps
>(function MenuProdutoSnapshotForm(
  {
    menuId,
    produto,
    grupo = null,
    formId = MENU_PRODUTO_FORM_ID,
    onDirtyChange,
    onSavingChange,
    onGrupoChange,
    onRemoverDesteCardapio,
  },
  ref
) {
  const { updateProduto, uploadImagemProduto } = useMenuMutations(menuId)
  const categoriaRef = useRef<MenuCategoriaNesteCardapioHandle>(null)
  const [categoriaDirty, setCategoriaDirty] = useState(false)
  const [imagemPreviewOverride, setImagemPreviewOverride] = useState<string | null>(null)
  const { pedirConfirmacao, aplicarNosDestinos, aplicarImagemNosDestinos, dialog: dialogPropagacao } =
    usePropagarAlteracaoProduto()
  const [nome, setNome] = useState(produto.nome)
  const [descricao, setDescricao] = useState(produto.descricao ?? '')
  const [valor, setValor] = useState(formatCurrencyFromNumber(Number(produto.valor ?? 0)))
  const [valorPromocional, setValorPromocional] = useState(
    formatCurrencyFromNumber(Number(produto.valorPromocional ?? 0))
  )
  const [descontoPct, setDescontoPct] = useState(() => descontoInicialFromProduto(produto))
  const [promocaoAtiva, setPromocaoAtiva] = useState(produto.promocaoAtiva === true)
  const [modoPromocao, setModoPromocao] = useState(() =>
    produtoTemPromocaoPreenchida(produto.valorPromocional)
  )
  const [ativo, setAtivo] = useState(produto.ativo)
  const [favorito, setFavorito] = useState(produto.favorito)

  const syncFromProduto = useCallback((next: MenuProduto) => {
    setNome(next.nome)
    setDescricao(next.descricao ?? '')
    setValor(formatCurrencyFromNumber(Number(next.valor ?? 0)))
    setValorPromocional(formatCurrencyFromNumber(Number(next.valorPromocional ?? 0)))
    setDescontoPct(descontoInicialFromProduto(next))
    setPromocaoAtiva(next.promocaoAtiva === true)
    setModoPromocao(produtoTemPromocaoPreenchida(next.valorPromocional))
    setAtivo(next.ativo)
    setFavorito(next.favorito)
  }, [])

  const ativarPromocao = useCallback(() => {
    setModoPromocao(true)
    setPromocaoAtiva(true)
  }, [])

  const removerPromocao = useCallback(() => {
    setModoPromocao(false)
    setPromocaoAtiva(false)
    setValorPromocional(formatCurrencyFromNumber(0))
    setDescontoPct('')
  }, [])

  const handleModoPromocaoSwitch = (checked: boolean) => {
    if (checked) ativarPromocao()
    else removerPromocao()
  }

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

  const handleValorNormalChange = (raw: string) => {
    const next = formatCurrency(raw)
    setValor(next)
    if (!modoPromocao) return
    const normal = parseCurrency(next)
    const promo = parseCurrency(valorPromocional)
    if (Number.isFinite(normal) && normal > 0 && Number.isFinite(promo) && promo >= 0) {
      setDescontoPct(formatDescontoPct(descontoPercentualFromPrecos(normal, promo)))
    }
  }

  const handleValorPromocionalChange = (raw: string) => {
    const next = formatCurrency(raw)
    setValorPromocional(next)
    const normal = parseCurrency(valor)
    const promo = parseCurrency(next)
    if (Number.isFinite(normal) && normal > 0 && Number.isFinite(promo) && promo >= 0) {
      setDescontoPct(formatDescontoPct(descontoPercentualFromPrecos(normal, promo)))
    }
  }

  const handleDescontoPctChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d.,]/g, '')
    setDescontoPct(cleaned)
    const normal = parseCurrency(valor)
    const pct = parseDescontoPct(cleaned)
    if (!Number.isFinite(normal) || normal <= 0 || !Number.isFinite(pct)) return
    const promo = valorPromocionalFromDesconto(normal, pct)
    if (promo == null) return
    setValorPromocional(formatCurrencyFromNumber(promo))
  }

  const isDirty = useCallback(() => {
    const valorNum = parseCurrency(valor)
    const promoNum = modoPromocao ? parseCurrency(valorPromocional) : 0
    const promoBase = Number(produto.valorPromocional ?? 0)
    const promoAtivaEfetiva = modoPromocao ? promocaoAtiva : false
    return (
      categoriaDirty ||
      nome.trim() !== produto.nome ||
      (descricao.trim() || '') !== (produto.descricao ?? '').trim() ||
      (Number.isFinite(valorNum) ? valorNum : -1) !== Number(produto.valor) ||
      (Number.isFinite(promoNum) ? promoNum : -1) !== promoBase ||
      promoAtivaEfetiva !== (produto.promocaoAtiva === true) ||
      ativo !== produto.ativo ||
      favorito !== produto.favorito
    )
  }, [
    categoriaDirty,
    nome,
    descricao,
    valor,
    valorPromocional,
    modoPromocao,
    promocaoAtiva,
    ativo,
    favorito,
    produto,
  ])

  useEffect(() => {
    onDirtyChange?.(isDirty())
  }, [isDirty, onDirtyChange])

  const save = useCallback(async () => {
    const nomeTrim = nome.trim()
    const valorNum = parseCurrency(valor)
    const promoRaw = parseCurrency(valorPromocional)
    const promoNum = modoPromocao
      ? Number.isFinite(promoRaw)
        ? Math.max(0, promoRaw)
        : 0
      : 0
    const promoAtivaEfetiva = modoPromocao ? promocaoAtiva : false

    if (!nomeTrim) {
      showToast.error('Informe o nome')
      return false
    }
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      showToast.error('Informe um preço válido')
      return false
    }
    if (modoPromocao) {
      if (!Number.isFinite(promoNum) || promoNum <= VALOR_PROMOCIONAL_MINIMO) {
        showToast.error('Informe um preço promocional maior que R$ 1,00')
        return false
      }
      if (promoNum >= valorNum) {
        showToast.error('O preço promocional precisa ser menor que o preço normal')
        return false
      }
    }

    const destinos = await pedirConfirmacao({
      origem: 'menu',
      produtoId: produto.produtoId,
      menuIdAtual: menuId,
    })
    if (destinos === null) return false

    const nomeCategoriaOk = (await categoriaRef.current?.save()) ?? true
    if (!nomeCategoriaOk) return false

    const grupoProdutoIdSelecionado = categoriaRef.current?.grupoProdutoIdSelecionado()
    const grupoMudou =
      Boolean(grupoProdutoIdSelecionado) &&
      grupoProdutoIdSelecionado !== grupo?.grupoBase.id

    const snapshot = {
      nome: nomeTrim,
      descricao: descricao.trim() || null,
      valor: valorNum,
      valorPromocional: promoNum,
      promocaoAtiva: promoAtivaEfetiva,
      ativo,
      favorito,
    }

    onSavingChange?.(true)
    try {
      await updateProduto.mutateAsync({
        produtoId: produto.produtoId,
        input: {
          ...snapshot,
          ...(grupoMudou ? { grupoProdutoId: grupoProdutoIdSelecionado } : {}),
        },
      })
      if (grupoMudou) {
        categoriaRef.current?.confirmarGrupoSelecionado()
      }
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
    valorPromocional,
    modoPromocao,
    promocaoAtiva,
    descricao,
    ativo,
    favorito,
    produto.produtoId,
    menuId,
    grupo?.grupoBase.id,
    updateProduto,
    onSavingChange,
    pedirConfirmacao,
    aplicarNosDestinos,
  ])

  useImperativeHandle(ref, () => ({ isDirty, save }), [isDirty, save])

  const precoNormalPreview = parsePrecoPreviewFromInput(valor)
  const precoPromoPreview = parsePrecoPreviewFromInput(valorPromocional)
  const previewProduto = useMemo(() => {
    const promoVigente =
      modoPromocao &&
      promocaoAtiva &&
      precoPromoPreview != null &&
      precoNormalPreview != null &&
      isValorPromocionalValido(precoPromoPreview, precoNormalPreview)
    const descontoNum = parseDescontoPct(descontoPct)

    return {
      nome,
      preco: promoVigente ? precoPromoPreview : precoNormalPreview,
      precoRegular: promoVigente ? precoNormalPreview : null,
      promocaoAtiva: Boolean(promoVigente),
      descontoPercentual:
        promoVigente && Number.isFinite(descontoNum) && descontoNum > 0 ? descontoNum : null,
      descricao,
      imagemUrl: imagemPreviewOverride ?? produto.image?.imageUrl ?? null,
    }
  }, [
    nome,
    precoNormalPreview,
    precoPromoPreview,
    modoPromocao,
    promocaoAtiva,
    descontoPct,
    descricao,
    imagemPreviewOverride,
    produto.image?.imageUrl,
  ])

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
            {modoPromocao ? (
              <>
                <UppercaseLocaleInput
                  label="Nome no cardápio"
                  required
                  size="small"
                  value={nome}
                  onValueChange={setNome}
                  className="bg-white"
                  sx={sxEntradaCompactaProduto}
                  InputLabelProps={{ required: true }}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
                    <Input
                      label="Preço Normal"
                      size="small"
                      value={valor}
                      onChange={e => handleValorNormalChange(e.target.value)}
                      placeholder="R$ 0,00"
                      className="bg-white"
                      sx={sxEntradaCompactaProduto}
                      inputProps={inputPropsSelecionarConteudo}
                    />
                    <Input
                      label="Preço Promocional"
                      size="small"
                      value={valorPromocional}
                      onChange={e => handleValorPromocionalChange(e.target.value)}
                      placeholder="R$ 0,00"
                      className="bg-white"
                      sx={sxEntradaCompactaProduto}
                      inputProps={inputPropsSelecionarConteudo}
                    />
                    <Input
                      label="Desconto %"
                      size="small"
                      value={descontoPct}
                      onChange={e => handleDescontoPctChange(e.target.value)}
                      placeholder="0"
                      className="bg-white"
                      sx={sxEntradaCompactaProduto}
                      inputProps={{ inputMode: 'decimal', ...inputPropsSelecionarConteudo }}
                    />
                  </div>
                  <div className="flex shrink-0 justify-end pb-0.5 sm:justify-center">
                    <MenuProdutoPromocaoControl
                      promocaoAtiva={promocaoAtiva}
                      onToggle={setPromocaoAtiva}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,10rem)] sm:items-start">
                <UppercaseLocaleInput
                  label="Nome no cardápio"
                  required
                  size="small"
                  value={nome}
                  onValueChange={setNome}
                  className="bg-white"
                  sx={sxEntradaCompactaProduto}
                  InputLabelProps={{ required: true }}
                />
                <Input
                  label="Preço"
                  size="small"
                  value={valor}
                  onChange={e => handleValorNormalChange(e.target.value)}
                  placeholder="R$ 0,00"
                  className="bg-white"
                  sx={sxEntradaCompactaProduto}
                  inputProps={inputPropsSelecionarConteudo}
                />
              </div>
            )}

            {grupo ? (
              <MenuCategoriaNesteCardapioCampos
                ref={categoriaRef}
                menuId={menuId}
                grupo={grupo}
                produtoId={produto.produtoId}
                onDirtyChange={setCategoriaDirty}
                onGrupoChange={onGrupoChange}
              />
            ) : null}

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
                checked={modoPromocao}
                onChange={e => handleModoPromocaoSwitch(e.target.checked)}
                label={modoPromocao ? 'Remover Promoção' : 'Ativar Promoção'}
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
            {onRemoverDesteCardapio ? (
              <button
                type="button"
                onClick={onRemoverDesteCardapio}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-600/40 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-600/10"
              >
                <MdDeleteOutline className="text-lg" aria-hidden />
                Remover deste cardápio
              </button>
            ) : null}
          </div>
        </div>
      </form>
      {dialogPropagacao}
    </ProdutoFormWithPreviewLayout>
  )
})
