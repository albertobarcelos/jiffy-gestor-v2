'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, List, Share2 } from 'lucide-react'
import { MdClose } from 'react-icons/md'
import type { CatalogoPublicoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizeTipoImpactoPreco } from '@/src/shared/utils/normalizeTipoImpactoPreco'
import { formatarValorComplemento } from '@/src/presentation/components/features/delivery-publico/shared/utils/formatPedidoLinhaDisplay'
import { showToast } from '@/src/shared/utils/toast'
import { DeliveryButton } from '../../shared/components/DeliveryButton'
import { DeliveryTextarea } from '../../shared/components/DeliveryInput'
import { DeliveryQuantidadeStepper } from '../../shared/components/DeliveryQuantidadeStepper'
import { useDeliveryBodyScrollLock } from '../../shared/hooks/useDeliveryBodyScrollLock'
import { useProdutoComplementos } from '../../shared/hooks/useProdutoComplementos'
import {
  useDeliveryCarrinhoStore,
  type DeliveryCarrinhoItem,
} from '../../shared/stores/deliveryCarrinhoStore'
import {
  buildProdutoShareUrl,
  compartilharLinkDelivery,
} from '../../shared/utils/compartilharProdutoDelivery'
import { observacaoItemCarrinho } from '../../shared/utils/deliveryCarrinhoItemUtils'
import { formatDeliveryCurrency } from '../../shared/utils/formatDeliveryCurrency'
import type {
  GrupoComplementoPendente,
  GrupoComplementoResolvido,
} from '../../shared/utils/produtoComplementosUtils'
import { DeliveryComplementosObrigatoriosAlertDialog } from './DeliveryComplementosObrigatoriosAlertDialog'

type DeliveryProdutoModalProps = {
  slug: string
  produto: CatalogoPublicoProdutoDTO
  onClose: () => void
  /** Chamado após adicionar item novo (não edição). */
  onAdicionado?: (payload: {
    produtoId: string
    nome: string
    imagemUrl: string | null
  }) => void
  /** Quando informado, atualiza o item do carrinho em vez de adicionar um novo. */
  itemEdicao?: DeliveryCarrinhoItem
}

function ComplementoThumb({ imagemUrl, nome }: { imagemUrl: string | null; nome: string }) {
  return (
    <div
      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md"
      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
    >
      {imagemUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagemUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Camera
            className="h-4 w-4"
            style={{ color: 'var(--delivery-text-muted)' }}
            aria-hidden
          />
        </div>
      )}
      <span className="sr-only">{nome}</span>
    </div>
  )
}

type ComplementosListaProps = {
  grupos: GrupoComplementoResolvido[]
  valorComplementosUnitario: number
  getQuantidadeComplemento: (grupoId: string, complementoId: string) => number
  ajustarQuantidadeComplemento: (
    grupo: GrupoComplementoResolvido,
    complementoId: string,
    delta: number
  ) => void
}

function ComplementosLista({
  grupos,
  valorComplementosUnitario,
  getQuantidadeComplemento,
  ajustarQuantidadeComplemento,
}: ComplementosListaProps) {
  if (grupos.length === 0) return null

  return (
    <div className="space-y-4 px-4 pt-4">
      {grupos.map(grupo => (
        <div key={grupo.id}>
          <div
            className="mb-1.5 flex items-baseline justify-between gap-2 rounded-md px-2.5 py-1.5"
            style={{
              backgroundColor: 'var(--delivery-primary-dark)',
              color: 'var(--delivery-btn-text, #ffffff)',
            }}
          >
            <p className="delivery-font-title min-w-0 text-sm font-semibold uppercase tracking-wide">
              {grupo.nome}
              {grupo.obrigatorio ? <span className="ml-1 text-red-400">*</span> : null}
            </p>
            <span className="shrink-0 text-xs font-medium tabular-nums opacity-90">
              Min: {grupo.qtdMinima} - Max: {grupo.qtdMaxima}
            </span>
          </div>
          <div
            className={
              grupo.complementos.length > 1
                ? 'grid grid-cols-2 gap-x-3 gap-y-1'
                : undefined
            }
          >
            {grupo.complementos.map(comp => {
              const qtdComp = getQuantidadeComplemento(grupo.id, comp.id)
              const tipoIp = normalizeTipoImpactoPreco(comp.tipoImpactoPreco)
              const valorTxt = formatarValorComplemento(comp.valor, tipoIp)

              return (
                <div
                  key={comp.id}
                  className="flex min-w-0 items-center justify-between gap-2 py-1.5"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <ComplementoThumb imagemUrl={comp.imagemUrl} nome={comp.nome} />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p
                        className="truncate text-sm font-medium leading-snug delivery-text-primary"
                        title={comp.nome}
                      >
                        {comp.nome}
                      </p>
                      {valorTxt ? (
                        <p className="mt-0.5 text-xs font-semibold tabular-nums delivery-text-accent sm:text-sm">
                          {valorTxt}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <DeliveryQuantidadeStepper
                    size="sm"
                    value={qtdComp}
                    min={0}
                    disabledDecrease={qtdComp <= 0}
                    decreaseLabel={`Diminuir quantidade de ${comp.nome}`}
                    increaseLabel={`Aumentar quantidade de ${comp.nome}`}
                    onDecrease={() => ajustarQuantidadeComplemento(grupo, comp.id, -1)}
                    onIncrease={() => ajustarQuantidadeComplemento(grupo, comp.id, 1)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <p className="delivery-text-secondary text-right text-sm font-medium">
        Total dos complementos:{' '}
        <span className="delivery-text-accent">
          {formatDeliveryCurrency(valorComplementosUnitario)}
        </span>
      </p>
    </div>
  )
}

export function DeliveryProdutoModal({
  slug,
  produto,
  onClose,
  onAdicionado,
  itemEdicao,
}: DeliveryProdutoModalProps) {
  const adicionarItem = useDeliveryCarrinhoStore(s => s.adicionarItem)
  const substituirItem = useDeliveryCarrinhoStore(s => s.substituirItem)
  const isEdicao = Boolean(itemEdicao)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bannerComplementosRef = useRef<HTMLDivElement>(null)
  const [alturaPrimeiraDobra, setAlturaPrimeiraDobra] = useState<number | null>(null)

  useDeliveryBodyScrollLock()

  const [quantidade, setQuantidade] = useState(itemEdicao?.quantidade ?? 1)
  const [observacao, setObservacao] = useState(
    itemEdicao ? observacaoItemCarrinho(itemEdicao) : ''
  )
  const [salvando, setSalvando] = useState(false)
  const [gruposPendentesAlerta, setGruposPendentesAlerta] = useState<GrupoComplementoPendente[]>(
    []
  )
  const [aberto, setAberto] = useState(true)
  /** Evita fechar no click sintético / remount (Strict Mode) logo após abrir. */
  const fechamentoIntencionalRef = useRef(false)
  const [podeFecharPorOverlay, setPodeFecharPorOverlay] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setPodeFecharPorOverlay(true), 400)
    return () => window.clearTimeout(t)
  }, [])

  const requestClose = () => {
    fechamentoIntencionalRef.current = true
    setAberto(false)
  }

  const handleExitComplete = () => {
    if (fechamentoIntencionalRef.current) onClose()
  }

  const handleOverlayClick = () => {
    if (!podeFecharPorOverlay) return
    requestClose()
  }

  const {
    grupos,
    precisaComplementos,
    carregandoComplementos,
    cacheComplementos,
    complementosSelecionados,
    valorComplementosUnitario,
    ajustarQuantidadeComplemento,
    getQuantidadeComplemento,
    obterGruposPendentes,
  } = useProdutoComplementos(slug, produto, itemEdicao?.complementos)

  const valorUnitario = produto.valor + valorComplementosUnitario
  const valorTotal = valorUnitario * quantidade
  const painelAmplo = precisaComplementos

  useLayoutEffect(() => {
    if (painelAmplo) {
      setAlturaPrimeiraDobra(null)
      return
    }

    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const atualizarAltura = () => {
      const bannerH = bannerComplementosRef.current?.offsetHeight ?? 0
      setAlturaPrimeiraDobra(Math.max(0, scrollEl.clientHeight - bannerH))
    }

    atualizarAltura()
    const observer = new ResizeObserver(atualizarAltura)
    observer.observe(scrollEl)
    if (bannerComplementosRef.current) {
      observer.observe(bannerComplementosRef.current)
    }
    return () => observer.disconnect()
  }, [painelAmplo, precisaComplementos, produto.nome])

  const handleIrParaComplementos = () => {
    bannerComplementosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleCompartilhar = () => {
    void compartilharLinkDelivery({
      title: produto.nome,
      text: `Confira ${produto.nome}`,
      url: buildProdutoShareUrl(slug, produto.id),
    })
  }

  const handleConfirmarAlertaComplementos = () => {
    setGruposPendentesAlerta([])
    handleIrParaComplementos()
  }

  const handleSalvar = () => {
    if (precisaComplementos && !cacheComplementos) {
      showToast.error('Aguarde o carregamento das opções do produto')
      return
    }
    if (grupos.length > 0) {
      const pendentes = obterGruposPendentes()
      if (pendentes.length > 0) {
        setGruposPendentesAlerta(pendentes)
        return
      }
    }

    setSalvando(true)
    try {
      const observacoes = observacao.trim().length >= 3 ? [observacao.trim()] : []
      const payload = {
        produtoId: produto.id,
        produtoNome: produto.nome,
        produtoImagemUrl: produto.imagemUrl,
        quantidade,
        valorUnitario,
        valorTotal,
        observacoes,
        complementos: complementosSelecionados,
      }

      if (itemEdicao) {
        substituirItem(slug, itemEdicao.id, payload)
        showToast.success('Item atualizado!')
        requestClose()
      } else {
        adicionarItem(slug, payload)
        onAdicionado?.({
          produtoId: produto.id,
          nome: produto.nome,
          imagemUrl: produto.imagemUrl,
        })
        requestClose()
      }
    } finally {
      setSalvando(false)
    }
  }

  const renderFooterActions = () => (
    <div
      className="flex shrink-0 items-center gap-3 border-t px-4 py-3"
      style={{
        borderColor: 'var(--delivery-border)',
        backgroundColor: 'var(--delivery-surface)',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <DeliveryQuantidadeStepper
        value={quantidade}
        min={1}
        decreaseLabel="Diminuir quantidade do produto"
        increaseLabel="Aumentar quantidade do produto"
        onDecrease={() => setQuantidade(q => Math.max(1, q - 1))}
        onIncrease={() => setQuantidade(q => q + 1)}
      />
      <DeliveryButton
        className="min-h-[48px] flex-1"
        disabled={salvando || (precisaComplementos && carregandoComplementos && !cacheComplementos)}
        onClick={handleSalvar}
        style={{
          backgroundColor: 'var(--delivery-primary-dark)',
          color: 'var(--delivery-btn-text, #ffffff)',
        }}
      >
        {salvando
          ? isEdicao
            ? 'Salvando...'
            : 'Adicionando...'
          : `${isEdicao ? 'Atualizar' : 'Adicionar'}  ${formatDeliveryCurrency(valorTotal)}`}
      </DeliveryButton>
    </div>
  )

  const renderObservacaoField = () => (
    <div className="px-4 pb-6 pt-4">
      <DeliveryTextarea
        value={observacao}
        onChange={e => setObservacao(e.target.value)}
        rows={3}
        maxLength={100}
        placeholder="Deseja adicionar alguma observação para este item?, escreva aqui..."
      />
    </div>
  )

  const renderProdutoCabecalho = () => (
    <>
      <div className="relative w-full shrink-0 overflow-hidden aspect-square">
        {produto.imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.imagemUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
          >
            <Camera
              className="h-16 w-16"
              style={{ color: 'var(--delivery-text-muted)' }}
              aria-hidden
            />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pt-4">
        <h2 className="delivery-font-title text-xl font-bold delivery-text-primary">
          {produto.nome}
        </h2>

        {produto.descricao ? (
          <p className="delivery-text-secondary mt-2 text-sm leading-relaxed">{produto.descricao}</p>
        ) : null}

        <p className="mt-2 text-lg font-semibold delivery-text-primary">
          {formatDeliveryCurrency(produto.valor)}
        </p>

        <div className="mt-4 flex items-center gap-2">
          {precisaComplementos ? (
            <button
              type="button"
              onClick={handleIrParaComplementos}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold uppercase tracking-wide delivery-text-primary lg:hidden"
              style={{
                borderColor: 'var(--delivery-border)',
                backgroundColor: 'var(--delivery-surface)',
              }}
            >
              <List className="h-4 w-4 shrink-0" aria-hidden />
              Complementos
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleCompartilhar}
            aria-label="Compartilhar produto"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
            style={{
              borderColor: 'var(--delivery-border)',
              backgroundColor: 'var(--delivery-surface)',
              color: 'var(--delivery-text-primary)',
            }}
          >
            <Share2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </>
  )

  const renderListaComplementos = () => (
    <ComplementosLista
      grupos={grupos}
      valorComplementosUnitario={valorComplementosUnitario}
      getQuantidadeComplemento={getQuantidadeComplemento}
      ajustarQuantidadeComplemento={ajustarQuantidadeComplemento}
    />
  )

  const renderCarregandoComplementos = () =>
    precisaComplementos && carregandoComplementos && !cacheComplementos ? (
      <p className="delivery-text-secondary px-4 pt-4 text-sm">Carregando opções...</p>
    ) : null

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {aberto ? (
        <>
          <motion.div
            key="delivery-produto-backdrop"
            className="delivery-vv-overlay z-50"
            style={{ backgroundColor: 'var(--delivery-overlay, rgba(0, 0, 0, 0.45))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleOverlayClick}
            aria-hidden
          />

          <motion.aside
            key="delivery-produto-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes do produto"
            className={[
              'delivery-vv-panel z-50 flex flex-col shadow-2xl',
              painelAmplo ? 'delivery-vv-panel--produto-complementos' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ backgroundColor: 'var(--delivery-surface)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {painelAmplo ? (
              <>
                {/* Desktop: complementos à esquerda + produto à direita */}
                <div className="hidden min-h-0 flex-1 lg:flex">
                  <div
                    className="flex min-h-0 min-w-0 flex-1 flex-col border-r"
                    style={{ borderColor: 'var(--delivery-border)' }}
                  >
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y">
                      <div
                        className="px-4 py-3"
                        style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
                      >
                        <p className="delivery-font-title text-sm font-bold delivery-text-primary">
                          Melhore ainda mais seu {produto.nome}!
                        </p>
                        <p className="delivery-text-secondary mt-0.5 text-sm">
                          escolha os complementos abaixo.
                        </p>
                      </div>
                      {renderCarregandoComplementos()}
                      {renderListaComplementos()}
                      <div className="h-4" />
                    </div>
                  </div>

                  <div className="flex w-[min(100%,24rem)] shrink-0 flex-col">
                    <div
                      className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
                      style={{
                        borderColor: 'var(--delivery-border)',
                        backgroundColor: 'var(--delivery-surface)',
                      }}
                    >
                      <h1 className="delivery-font-title text-base font-semibold delivery-text-primary">
                        Detalhes do produto
                      </h1>
                      <button
                        type="button"
                        onClick={requestClose}
                        aria-label="Fechar"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ color: 'var(--delivery-text-primary)' }}
                      >
                        <MdClose className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y">
                      {renderProdutoCabecalho()}
                      {renderObservacaoField()}
                    </div>
                    {renderFooterActions()}
                  </div>
                </div>

                {/* Mobile: coluna única (fluxo atual) */}
                <div className="flex min-h-0 flex-1 flex-col lg:hidden">
                  <div
                    className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
                    style={{
                      borderColor: 'var(--delivery-border)',
                      backgroundColor: 'var(--delivery-surface)',
                    }}
                  >
                    <h1 className="delivery-font-title text-base font-semibold delivery-text-primary">
                      Detalhes do produto
                    </h1>
                    <button
                      type="button"
                      onClick={requestClose}
                      aria-label="Fechar"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ color: 'var(--delivery-text-primary)' }}
                    >
                      <MdClose className="h-5 w-5" />
                    </button>
                  </div>

                  <div
                    ref={scrollRef}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y max-sm:scrollbar-hide"
                  >
                    <div className="flex flex-col">
                      <div className="flex flex-col">{renderProdutoCabecalho()}</div>

                      <div
                        ref={bannerComplementosRef}
                        className="sticky top-0 z-10 px-4 py-3"
                        style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
                      >
                        <p className="delivery-font-title text-sm font-bold delivery-text-primary">
                          Melhore ainda mais seu {produto.nome}!
                        </p>
                        <p className="delivery-text-secondary mt-0.5 text-sm">
                          escolha os complementos abaixo.
                        </p>
                      </div>

                      {renderCarregandoComplementos()}
                      {renderListaComplementos()}
                      {renderObservacaoField()}
                    </div>
                  </div>

                  {renderFooterActions()}
                </div>
              </>
            ) : (
              <>
                <div
                  className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
                  style={{
                    borderColor: 'var(--delivery-border)',
                    backgroundColor: 'var(--delivery-surface)',
                  }}
                >
                  <h1 className="delivery-font-title text-base font-semibold delivery-text-primary">
                    Detalhes do produto
                  </h1>
                  <button
                    type="button"
                    onClick={requestClose}
                    aria-label="Fechar"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ color: 'var(--delivery-text-primary)' }}
                  >
                    <MdClose className="h-5 w-5" />
                  </button>
                </div>

                <div
                  ref={scrollRef}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y max-sm:scrollbar-hide"
                >
                  <div className="flex flex-col">
                    <div
                      className="flex flex-col"
                      style={
                        alturaPrimeiraDobra != null
                          ? { minHeight: alturaPrimeiraDobra }
                          : { minHeight: '100%' }
                      }
                    >
                      {renderProdutoCabecalho()}
                    </div>

                    <div
                      ref={bannerComplementosRef}
                      className="px-4 py-3"
                      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
                    >
                      <p className="delivery-font-title text-sm font-bold delivery-text-primary">
                        Esta é uma ótima escolha!
                      </p>
                    </div>

                    {renderObservacaoField()}
                  </div>
                </div>

                {renderFooterActions()}
              </>
            )}
          </motion.aside>

          {gruposPendentesAlerta.length > 0 ? (
            <DeliveryComplementosObrigatoriosAlertDialog
              gruposPendentes={gruposPendentesAlerta}
              onConfirmar={handleConfirmarAlertaComplementos}
            />
          ) : null}
        </>
      ) : null}
    </AnimatePresence>
  )
}
