'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MdReceiptLong, MdRestartAlt } from 'react-icons/md'
import { DeliveryConfigCollapsibleSection } from './DeliveryConfigCollapsibleSection'
import { renderDeliveryCupomHtml } from '@/src/application/delivery/renderDeliveryCupomHtml'
import {
  DEFAULT_DELIVERY_CUPOM_TEMPLATE,
  type DeliveryCupomModelo,
  type DeliveryCupomTemplateConfig,
} from '@/src/shared/types/deliveryCupomTemplate'
import type {
  VendaGestorTicket,
  VendaGestorTicketsResponse,
} from '@/src/shared/types/vendaGestorTickets'

interface DeliveryCupomTemplateEditorProps {
  value: DeliveryCupomTemplateConfig
  onChange: (value: DeliveryCupomTemplateConfig) => void
  disabled?: boolean
  resetSectionsWhen?: unknown
}

function update<K extends keyof DeliveryCupomTemplateConfig>(
  value: DeliveryCupomTemplateConfig,
  key: K,
  next: DeliveryCupomTemplateConfig[K]
): DeliveryCupomTemplateConfig {
  return { ...value, [key]: next }
}

type FonteBlocoKey =
  | 'tamanhoFonteCabecalho'
  | 'tamanhoFontePedido'
  | 'tamanhoFonteClienteEndereco'
  | 'tamanhoFonteItens'
  | 'tamanhoFonteResumo'
  | 'tamanhoFontePagamento'
  | 'tamanhoFonteRodape'

const MODELOS_CUPOM: Array<{ value: DeliveryCupomModelo; label: string; hint: string }> = [
  {
    value: 'producao',
    label: 'Produção',
    hint: 'Use fontes maiores para cozinha e preparo.',
  },
  {
    value: 'expedicao',
    label: 'Expedição',
    hint: 'Use fontes menores para caber mais informações no papel.',
  },
]

const FONTES_BLOCO: Array<[string, FonteBlocoKey]> = [
  ['Cabeçalho', 'tamanhoFonteCabecalho'],
  ['Pedido, data e previsão', 'tamanhoFontePedido'],
  ['Cliente e endereço', 'tamanhoFonteClienteEndereco'],
  ['Itens do pedido', 'tamanhoFonteItens'],
  ['Resumo do pedido', 'tamanhoFonteResumo'],
  ['Pagamento/cobrança', 'tamanhoFontePagamento'],
  ['Empresa e rodapé', 'tamanhoFonteRodape'],
]

function parseFonteOpcional(value: string): number | null {
  if (!value.trim()) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.floor(n)
}

function limitarFonteOpcional(value: number | null): number | null {
  if (value == null) return null
  return Math.min(18, Math.max(8, value))
}

const FONT_BLOCO_MIN = 8
const FONT_BLOCO_MAX = 18

function FonteBlocoInput(props: {
  label: string
  value: number | null
  disabled?: boolean
  onChange: (v: number | null) => void
}) {
  const [draft, setDraft] = useState(props.value == null ? '' : String(props.value))

  useEffect(() => {
    setDraft(props.value == null ? '' : String(props.value))
  }, [props.value])

  const aplicarValor = (next: number | null) => {
    const limitado = limitarFonteOpcional(next)
    setDraft(limitado == null ? '' : String(limitado))
    props.onChange(limitado)
  }

  const stepDown = () => {
    if (props.disabled) return
    if (props.value == null) return
    if (props.value <= FONT_BLOCO_MIN) aplicarValor(null)
    else aplicarValor(props.value - 1)
  }

  const stepUp = () => {
    if (props.disabled) return
    if (props.value == null) aplicarValor(FONT_BLOCO_MIN)
    else aplicarValor(Math.min(FONT_BLOCO_MAX, props.value + 1))
  }

  const padraoAtivo = props.value != null

  return (
    <div className="space-y-0.5">
      <label className="text-xs font-medium text-primary-text">{props.label}</label>
      <div className="flex items-center gap-1">
        <div
          className={`inline-flex h-7 overflow-hidden rounded-md border border-gray-200 bg-white ${props.disabled ? 'opacity-60' : ''}`}
        >
          <button
            type="button"
            aria-label={`Diminuir fonte de ${props.label}`}
            disabled={props.disabled || props.value == null}
            onClick={stepDown}
            className="flex h-7 w-6 shrink-0 items-center justify-center border-r border-gray-200 text-sm font-normal leading-none text-secondary-text transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            maxLength={3}
            value={draft}
            disabled={props.disabled}
            placeholder=""
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 3)
              setDraft(digits)
              if (!digits) {
                props.onChange(null)
                return
              }
              props.onChange(parseFonteOpcional(digits))
            }}
            onBlur={() => {
              if (!draft.trim()) {
                aplicarValor(null)
                return
              }
              aplicarValor(parseFonteOpcional(draft))
            }}
            className="h-7 w-8 border-0 bg-transparent px-0 text-center text-xs tabular-nums outline-none focus:ring-0 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            aria-label={`Aumentar fonte de ${props.label}`}
            disabled={props.disabled || (props.value != null && props.value >= FONT_BLOCO_MAX)}
            onClick={stepUp}
            className="flex h-7 w-6 shrink-0 items-center justify-center border-l border-gray-200 text-sm font-normal leading-none text-secondary-text transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
        <button
          type="button"
          disabled={props.disabled || !padraoAtivo}
          onClick={() => aplicarValor(null)}
          className={`h-7 shrink-0 rounded-md border px-2 text-xs font-normal transition-colors ${
            padraoAtivo
              ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50'
              : 'cursor-default border-gray-200 bg-white text-secondary-text disabled:opacity-60'
          } ${props.disabled ? 'opacity-60' : ''}`}
        >
          Padrão
        </button>
      </div>
    </div>
  )
}

function PreviewToggle(props: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className={`flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs ring-1 ring-gray-100 ${props.disabled ? 'opacity-60' : ''}`}>
      <span className="font-medium text-primary-text">{props.label}</span>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={e => props.onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
    </label>
  )
}

function sampleCupom(tipoCupom: VendaGestorTicket['tipoCupom']): {
  root: VendaGestorTicketsResponse
  ticket: VendaGestorTicket
} {
  return {
    root: {
      vendaId: 'preview',
      codigoVenda: 'TBIMLFJA',
      numeroVenda: 22,
      tipoVenda: 'entrega',
      dataPedido: '2026-05-02T15:18:00-04:00',
      dataPrevista: '2026-05-02T16:10:00-04:00',
      entregador: { nome: 'Thauan Barcelos' },
      cliente: { nome: 'Alberto Barcelos', telefone: '(65) 9 9293-4536' },
      enderecoEntrega: {
        rua: 'Rua Teste',
        numero: '123',
        bairro: 'Bairro',
        cidade: 'Cidade',
        uf: 'MT',
        cep: '12345678',
        referencia: 'Próximo ao mercado',
      },
      observacaoPedido: 'Manda canudo',
      valorFinal: 30,
      resumoPedido: {
        valorItens: 20,
        valorAdicionais: 2,
        taxaEntrega: 8,
        valorTotal: 30,
      },
      pagamento: {
        status: 'pendente',
        cobrarCliente: true,
        meioPagamento: 'dinheiro',
        valorReceber: 30,
        valorFaltante: 30,
      },
      empresa: {
        nomeExibicao: 'Espeto do Joaquim',
        cnpj: '12.345.678/0001-90',
        telefone: '(65) 3000-0000',
      },
      tickets: [],
      modoImpressaoDelivery: 'separado',
    },
    ticket: {
      ticketId: 'preview',
      tipoCupom,
      impressoraId: 'cozinha',
      impressoraNome: tipoCupom === 'producao' ? 'Cozinha' : 'Expedição',
      impressora: {
        nome: tipoCupom === 'producao' ? 'Cozinha' : 'Expedição',
        nomeImpressoraWindows: 'EPSON TM-T20',
      },
      copias: 1,
      itens: [
        {
          produtoId: '1',
          nomeProduto: 'Coca Cola',
          quantidade: 1,
          valorFinal: 10,
          observacao: 'Manda canudo',
          complementos: [{ nome: 'Limão e gelo', quantidade: 1, impressao: { valorFinal: 2 } }],
        },
        {
          produtoId: '2',
          nomeProduto: 'Hambúrguer do Beto',
          quantidade: 1,
          valorFinal: 10,
        },
      ],
    },
  }
}

function CupomPreviewIframe({ srcDoc, title }: { srcDoc: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const syncHeight = useCallback(() => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc) return

    doc.documentElement.style.overflow = 'hidden'
    doc.body.style.overflow = 'hidden'
    doc.body.style.margin = '0'

    const height = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight)
    iframe.style.height = `${height}px`
  }, [])

  useEffect(() => {
    syncHeight()
  }, [srcDoc, syncHeight])

  return (
    <iframe
      ref={iframeRef}
      title={title}
      srcDoc={srcDoc}
      scrolling="no"
      onLoad={syncHeight}
      className="mx-auto block w-full max-w-[340px] overflow-hidden rounded border border-gray-100 bg-white"
    />
  )
}

export function DeliveryCupomTemplateEditor({
  value,
  onChange,
  disabled,
  resetSectionsWhen,
}: DeliveryCupomTemplateEditorProps) {
  const [modeloSelecionado, setModeloSelecionado] = useState<DeliveryCupomModelo>('expedicao')
  const fontesModelo = value.fontesPorModelo?.[modeloSelecionado] ??
    DEFAULT_DELIVERY_CUPOM_TEMPLATE.fontesPorModelo[modeloSelecionado]

  const updateFonteModelo = (key: FonteBlocoKey, next: number | null) => {
    onChange({
      ...value,
      fontesPorModelo: {
        ...DEFAULT_DELIVERY_CUPOM_TEMPLATE.fontesPorModelo,
        ...value.fontesPorModelo,
        [modeloSelecionado]: {
          ...DEFAULT_DELIVERY_CUPOM_TEMPLATE.fontesPorModelo[modeloSelecionado],
          ...fontesModelo,
          [key]: next,
        },
      },
    })
  }

  const previewHtml = useMemo(() => {
    const producao = sampleCupom('producao')
    const expedicao = sampleCupom('expedicao')
    return {
      producao: renderDeliveryCupomHtml({
        ...producao,
        nomeEmpresa: 'Espeto do Joaquim',
        template: value,
      }),
      expedicao: renderDeliveryCupomHtml({
        ...expedicao,
        nomeEmpresa: 'Espeto do Joaquim',
        template: value,
      }),
    }
  }, [value])
  const modeloPreview = MODELOS_CUPOM.find(modelo => modelo.value === modeloSelecionado)
  const previewSelecionado = previewHtml[modeloSelecionado]

  return (
    <DeliveryConfigCollapsibleSection
      icon={<MdReceiptLong className="h-5 w-5" aria-hidden />}
      title="Modelo visual do cupom"
      resetExpandedWhen={resetSectionsWhen}
      headerActions={
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(DEFAULT_DELIVERY_CUPOM_TEMPLATE)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MdRestartAlt className="h-4 w-4" />
          Restaurar padrão
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-primary-text">Largura</label>
              <select
                value={value.larguraMm}
                disabled={disabled}
                onChange={e => onChange(update(value, 'larguraMm', Number(e.target.value) === 58 ? 58 : 80))}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
              >
                <option value={80}>80mm</option>
                <option value={58}>58mm</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-primary-text">Densidade</label>
              <select
                value={value.densidade}
                disabled={disabled}
                onChange={e =>
                  onChange(update(value, 'densidade', e.target.value as DeliveryCupomTemplateConfig['densidade']))
                }
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
              >
                <option value="compacto">Compacto</option>
                <option value="normal">Normal</option>
                <option value="espacoso">Espaçoso</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-primary-text">Fonte base</label>
              <input
                type="number"
                min={10}
                max={18}
                value={value.tamanhoFonteBase}
                disabled={disabled}
                onChange={e =>
                  onChange(update(value, 'tamanhoFonteBase', Math.min(18, Math.max(10, Number(e.target.value) || 13))))
                }
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-primary-text">Fonte por bloco</h4>
              <p className="mt-0.5 text-xs text-secondary-text">
                Escolha o modelo e ajuste individualmente. Deixe vazio para usar a fonte base.
              </p>
            </div>
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              {MODELOS_CUPOM.map(modelo => {
                const selected = modeloSelecionado === modelo.value
                return (
                  <button
                    key={modelo.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setModeloSelecionado(modelo.value)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-white text-primary-text hover:border-primary/50'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{modelo.label}</span>
                    <span className={`mt-0.5 block text-xs ${selected ? 'text-white/85' : 'text-secondary-text'}`}>
                      {modelo.hint}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              {FONTES_BLOCO.map(([label, key]) => (
                <FonteBlocoInput
                  key={`${modeloSelecionado}-${key}`}
                  label={label}
                  value={fontesModelo[key]}
                  disabled={disabled}
                  onChange={v => updateFonteModelo(key, v)}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <PreviewToggle
              label="Mostrar nome/logo texto"
              checked={value.mostrarLogoTexto}
              disabled={disabled}
              onChange={v => onChange(update(value, 'mostrarLogoTexto', v))}
            />
            <PreviewToggle
              label="Produtos em destaque"
              checked={value.destacarProdutos}
              disabled={disabled}
              onChange={v => onChange(update(value, 'destacarProdutos', v))}
            />
            <PreviewToggle
              label="Telefone do cliente"
              checked={value.mostrarTelefoneCliente}
              disabled={disabled}
              onChange={v => onChange(update(value, 'mostrarTelefoneCliente', v))}
            />
            <PreviewToggle
              label="Endereço de entrega"
              checked={value.mostrarEnderecoEntrega}
              disabled={disabled}
              onChange={v => onChange(update(value, 'mostrarEnderecoEntrega', v))}
            />
            <PreviewToggle
              label="Valores"
              checked={value.mostrarValores}
              disabled={disabled}
              onChange={v => onChange(update(value, 'mostrarValores', v))}
            />
            <PreviewToggle
              label="Observação do pedido"
              checked={value.mostrarObservacaoPedido}
              disabled={disabled}
              onChange={v => onChange(update(value, 'mostrarObservacaoPedido', v))}
            />
            <PreviewToggle
              label="Data/hora no rodapé"
              checked={value.mostrarDataHora}
              disabled={disabled}
              onChange={v => onChange(update(value, 'mostrarDataHora', v))}
            />
          </div>

          <div className="grid items-end gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-primary-text">Texto extra no cabeçalho</label>
              <textarea
                rows={3}
                value={value.cabecalhoExtra}
                disabled={disabled}
                onChange={e => onChange(update(value, 'cabecalhoExtra', e.target.value.slice(0, 500)))}
                placeholder="Ex.: Obrigado pela preferência"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-primary-text">Texto extra no rodapé</label>
              <textarea
                rows={3}
                value={value.rodapeExtra}
                disabled={disabled}
                onChange={e => onChange(update(value, 'rodapeExtra', e.target.value.slice(0, 500)))}
                placeholder="Ex.: Volte sempre"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-secondary-text">
              Preview {modeloPreview?.label ?? ''}
            </div>
            <p className="mt-0.5 text-[11px] text-secondary-text">
              Mostrando o mesmo modelo selecionado na edição de fontes.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg bg-white p-2 shadow-inner">
            <CupomPreviewIframe
              key={modeloSelecionado}
              title={`Preview do cupom delivery ${modeloPreview?.label ?? modeloSelecionado}`}
              srcDoc={previewSelecionado}
            />
          </div>
        </div>
      </div>
    </DeliveryConfigCollapsibleSection>
  )
}

