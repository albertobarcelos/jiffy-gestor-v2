'use client'

import { useEffect, useMemo, useState } from 'react'
import { MdReceiptLong, MdRestartAlt } from 'react-icons/md'
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

  return (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-primary-text">{props.label}</label>
      <div className="flex gap-2">
        <input
          type="number"
          min={8}
          max={18}
          value={draft}
          disabled={props.disabled}
          onChange={e => {
            const next = e.target.value
            setDraft(next)
            props.onChange(parseFonteOpcional(next))
          }}
          onBlur={() => {
            const limitado = limitarFonteOpcional(parseFonteOpcional(draft))
            setDraft(limitado == null ? '' : String(limitado))
            props.onChange(limitado)
          }}
          placeholder="Padrão"
          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
        />
        <button
          type="button"
          disabled={props.disabled || props.value == null}
          onClick={() => props.onChange(null)}
          className="h-10 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-secondary-text hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
    <label className={`flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-gray-100 ${props.disabled ? 'opacity-60' : ''}`}>
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

export function DeliveryCupomTemplateEditor({
  value,
  onChange,
  disabled,
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
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <MdReceiptLong className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-semibold text-primary-text">Modelo visual do cupom</h3>
            <p className="mt-1 text-sm text-secondary-text">
              Ajustes salvos em <code>parametroEmpresa.cupomDeliveryTemplate</code>. A impressão
              continua usando o mesmo fluxo de tickets/QZ.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(DEFAULT_DELIVERY_CUPOM_TEMPLATE)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MdRestartAlt className="h-4 w-4" />
          Restaurar padrão
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
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
            <div className="grid gap-3 md:grid-cols-2">
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

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-primary-text">Texto extra no cabeçalho</label>
              <textarea
                rows={3}
                value={value.cabecalhoExtra}
                disabled={disabled}
                onChange={e => onChange(update(value, 'cabecalhoExtra', e.target.value.slice(0, 500)))}
                placeholder="Ex.: Obrigado pela preferência"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-primary-text">Texto extra no rodapé</label>
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
          <div className="max-h-[720px] overflow-auto rounded-lg bg-white p-2 shadow-inner">
            <iframe
              key={modeloSelecionado}
              title={`Preview do cupom delivery ${modeloPreview?.label ?? modeloSelecionado}`}
              srcDoc={previewSelecionado}
              className={`mx-auto w-full max-w-[340px] rounded border border-gray-100 bg-white ${
                modeloSelecionado === 'producao' ? 'h-[520px]' : 'h-[700px]'
              }`}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

