import { Fragment } from 'react'
import type { VendaContingenciaPublica } from '@/src/infrastructure/api/fetchVendaContingenciaPublica'
import {
  deveExibirAguardoFinalizacaoDelivery,
  deveExibirRodapeDanfe80mm,
} from '@/src/infrastructure/api/fetchVendaContingenciaPublica'
import { CupomRodapeDanfe80 } from '@/src/presentation/components/features/venda-contingencia/CupomRodapeDanfe80'
import { formatarCnpjExibicao } from '@/src/presentation/components/features/meus-apps/utils/empresaParaMeusApp'
import { formatarCpfCnpjExibicao } from '@/src/shared/utils/cpfCnpj'
import { formatarCepMascara } from '@/src/shared/utils/consultaCep'
import { normalizeTipoImpactoPreco } from '@/src/application/mappers/VendaApiNormalizer'
import { formatarValorComplemento } from '@/src/domain/services/pedido/CalculadoraPedido'
import { Heart } from 'lucide-react'

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '0,00'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCurrencyBrl(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function parseNumeroCampo(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(n) ? n : null
}

function tipoAjusteEhPercentual(tipo: string | null | undefined): boolean {
  const t = String(tipo ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (
    t === 'percentual' ||
    t === 'porcentagem' ||
    t === 'percentage' ||
    t.includes('percent')
  )
}

type ProdutoCupom = NonNullable<VendaContingenciaPublica['produtosLancados']>[number]

type ComplementoCupom = NonNullable<ProdutoCupom['complementos']>[number]

function formatarValorUnitarioComplementoCupom(complemento: ComplementoCupom): string {
  const tipo = normalizeTipoImpactoPreco(complemento.tipoImpactoPreco)
  if (tipo === 'nenhum') {
    return formatMoney(0)
  }
  const valor = complemento.valorUnitario
  if (valor == null || Number.isNaN(valor)) return ''
  return formatarValorComplemento(valor, tipo)
}

/** Exibe o ajuste configurado no produto (ex.: -50%, +2,00) usando campos da API, sem recalcular totais. */
function formatarAjusteProdutoCupom(produto: ProdutoCupom): string {
  const desconto = parseNumeroCampo(produto.desconto)
  if (desconto != null && desconto > 0) {
    if (tipoAjusteEhPercentual(produto.tipoDesconto)) {
      return `-${Math.round(desconto * 100)}%`
    }
    return `-${formatMoney(desconto)}`
  }

  const acrescimo = parseNumeroCampo(produto.acrescimo)
  if (acrescimo != null && acrescimo > 0) {
    if (tipoAjusteEhPercentual(produto.tipoAcrescimo)) {
      return `+${Math.round(acrescimo * 100)}%`
    }
    return `+${formatMoney(acrescimo)}`
  }

  return ''
}

function rotuloTipoDocPorModelo(modelo: number | null | undefined): string | null {
  if (modelo == null || Number.isNaN(modelo)) return null
  if (modelo === 65) return 'NFC-e'
  if (modelo === 55) return 'NF-e'
  return `Modelo ${modelo}`
}

function resolveNomeEstabelecimento(data: VendaContingenciaPublica): string {
  const razaoSocial = data.emitente?.razaoSocial?.trim()
  if (razaoSocial) return razaoSocial
  const nomeEmpresa = data.nomeEmpresa?.trim()
  if (nomeEmpresa) return nomeEmpresa
  const nomeEmpresaLegacy = data.empresa?.nome?.trim()
  if (nomeEmpresaLegacy) return nomeEmpresaLegacy
  return 'Estabelecimento'
}

function resolveClienteCupomExibicao(data: VendaContingenciaPublica): string {
  const nome = data.identificacao?.trim() || data.clienteNome?.trim()
  return nome || 'Consumidor Final'
}

/** CPF/CNPJ do cliente formatado (endpoint de contingência); vazio quando ausente. */
function resolveDocumentoClienteCupom(data: VendaContingenciaPublica): string {
  return formatarCpfCnpjExibicao(data.documentoCpfCnpj)
}

function resolveCnpjEstabelecimento(data: VendaContingenciaPublica): string | undefined {
  const cnpj = data.emitente?.cnpj?.trim() || data.empresa?.cnpj?.trim()
  return cnpj || undefined
}

type EnderecoEstabelecimentoCupom = NonNullable<
  NonNullable<VendaContingenciaPublica['emitente']>['endereco']
>

function enderecoTemConteudo(endereco: EnderecoEstabelecimentoCupom | null | undefined): boolean {
  if (!endereco) return false
  return Boolean(
    endereco.rua?.trim() ||
      endereco.numero?.trim() ||
      endereco.bairro?.trim() ||
      endereco.cidade?.trim() ||
      endereco.estado?.trim() ||
      endereco.cep?.trim()
  )
}

function formatarEnderecoEstabelecimentoLinhas(
  endereco: EnderecoEstabelecimentoCupom | null | undefined
): string[] {
  if (!endereco || !enderecoTemConteudo(endereco)) return []

  const linhas: string[] = []
  const ruaNumero = [endereco.rua?.trim(), endereco.numero?.trim()].filter(Boolean).join(', ')
  if (ruaNumero) linhas.push(ruaNumero)

  const bairro = endereco.bairro?.trim()
  const cidadeUf = [endereco.cidade?.trim(), endereco.estado?.trim()].filter(Boolean).join(' - ')
  if (bairro || cidadeUf) {
    linhas.push([bairro, cidadeUf].filter(Boolean).join(' - '))
  }

  const cep = endereco.cep?.trim()
  if (cep) linhas.push(`CEP: ${formatarCepMascara(cep)}`)

  return linhas
}

function resolveEnderecoEstabelecimentoLinhas(data: VendaContingenciaPublica): string[] {
  const fromEmitente = data.emitente?.endereco
  if (enderecoTemConteudo(fromEmitente)) {
    return formatarEnderecoEstabelecimentoLinhas(fromEmitente)
  }
  return []
}

/** Cabeçalho: emitente em destaque + linha da venda mais compacta. */
function CabecalhoCupom({ data }: { data: VendaContingenciaPublica }) {
  const empresa = resolveNomeEstabelecimento(data)
  const cnpj = resolveCnpjEstabelecimento(data)
  const enderecoLinhas = resolveEnderecoEstabelecimentoLinhas(data)
  const codigoRaw = data.codigoVenda
  const codigo =
    codigoRaw != null && String(codigoRaw).trim() !== '' ? String(codigoRaw).trim() : '—'
  const numero =
    data.numeroVenda != null && !Number.isNaN(Number(data.numeroVenda))
      ? String(data.numeroVenda)
      : '—'

  return (
    <header className="pb-1 text-center">
      <div className="font-poppins text-base font-extrabold leading-tight text-black md:text-xl">
        {empresa}
      </div>
      {(cnpj || enderecoLinhas.length > 0) && (
        <div className="mt-0.5 space-y-0 text-xs leading-tight text-black/75">
          {cnpj && <div>CNPJ: {formatarCnpjExibicao(cnpj)}</div>}
          {enderecoLinhas.map((linha, i) => (
            <div key={i}>{linha}</div>
          ))}
        </div>
      )}
      <h1 className="font-poppins mt-2 flex flex-wrap items-baseline justify-center gap-x-2 text-sm font-semibold leading-tight text-black/85">
        <span>VENDA #{codigo}</span>
        <span>N° {numero}</span>
      </h1>
    </header>
  )
}

function CupomFooterMarca() {
  return (
    <footer className="mt-4 border-t border-slate-300/80 pt-3">
      <p className="font-poppins flex items-center justify-center gap-1 text-center text-xs text-black/70">
        <span>Feito carinho por Jiffy</span>
        <Heart className="size-3 shrink-0 fill-black text-black" aria-hidden />
        <span>!</span>
      </p>
    </footer>
  )
}

/** Rodapé: QR quando emitida; aguardo finalização (delivery); contingência + processamento. */
function CupomRodapeFiscal({
  data,
  rodapeDanfeSrc,
}: {
  data: VendaContingenciaPublica
  rodapeDanfeSrc?: string | null
}) {
  const notaEmitida = deveExibirRodapeDanfe80mm(data)

  if (notaEmitida) {
    return <CupomRodapeDanfe80 src={rodapeDanfeSrc} />
  }

  if (deveExibirAguardoFinalizacaoDelivery(data)) {
    return (
      <>
        <div className="my-3 h-px bg-black/40" />
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs leading-relaxed text-slate-800">
          <p className="font-semibold">Pedido ainda não finalizado</p>
          <p className="mt-1">
            A venda ainda não foi finalizada. Aguarde: a nota fiscal será emitida após a
            finalização do pedido.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="my-3 h-px bg-black/40" />
      <p className="text-center text-xs leading-snug">
        Cupom não fiscal
      </p>
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs leading-relaxed text-amber-950">
        <p className="font-semibold">Nota fiscal em processamento</p>
        <p className="mt-1">
          A NFC-e está sendo emitida. Atualize esta página após 5 minutos para consultar o QR Code.
        </p>
      </div>
    </>
  )
}

interface CupomFiscalContingenciaProps {
  data: VendaContingenciaPublica
  /** URL do proxy PNG 80mm; só preencher quando nota emitida (página calcula). */
  rodapeDanfeSrc?: string | null
}

/**
 * Cupom estilo térmico (alinhado ao visual de DetalhesFechamento).
 */
export function CupomFiscalContingencia({ data, rodapeDanfeSrc }: CupomFiscalContingenciaProps) {
  const textoPuro =
    data.cupomFiscal?.trim() ||
    data.textoCupom?.trim() ||
    data.cupomContingencia?.trim()

  if (textoPuro) {
    return (
      <>
        <CabecalhoCupom data={data} />
        <div className="my-2 h-px bg-slate-300" />
        <pre
          className="whitespace-pre-wrap break-words text-sm leading-relaxed"
          style={{ fontFamily: "'Roboto Mono', 'Courier New', monospace" }}
        >
          {textoPuro}
        </pre>
        <CupomRodapeFiscal data={data} rodapeDanfeSrc={rodapeDanfeSrc} />
        <CupomFooterMarca />
      </>
    )
  }

  const rf = data.resumoFiscal
  const tipoDocExibicao =
    data.tipoDocFiscal?.trim() || rotuloTipoDocPorModelo(rf?.modelo ?? undefined)
  const statusFiscalExibicao = rf?.status?.trim() || data.statusFiscal
  const numeroDocExibicao = rf?.numero ?? data.numeroFiscal
  const serieExibicao = rf?.serie?.trim() || data.serieFiscal
  const dataEmissaoExibicao = rf?.dataEmissao || data.dataEmissaoFiscal
  const retornoSefazExibicao = rf?.retornoSefaz?.trim() || data.retornoSefaz

  const produtos = (data.produtosLancados || []).filter((p) => !p.removido)
  const pagamentos = (data.pagamentos || []).filter((p) => !p.cancelado)
  const documentoCliente = resolveDocumentoClienteCupom(data)

  return (
    <div className="space-y-2 text-sm" style={{ fontFamily: "'Roboto Mono', 'Courier New', monospace" }}>
      <CabecalhoCupom data={data} />
      <div className="my-2 h-px bg-slate-300" />

      <div className="space-y-0.5">
        
        {(data.codigoTerminal || data.terminalNome) && (
          <div>
            Terminal: {[data.codigoTerminal, data.terminalNome].filter(Boolean).join(' — ')}
          </div>
        )}
        <div>Cliente: {resolveClienteCupomExibicao(data)}</div>
        {data.tipoEntrega && (
          <div>
            Entrega:{' '}
            {data.tipoEntrega === 'entrega' ? 'Delivery' : data.tipoEntrega === 'retirada' ? 'Retirada' : data.tipoEntrega}
          </div>
        )}
        {documentoCliente && <div>CPF/CNPJ: {documentoCliente}</div>}
        <div>Abertura: {formatDateTime(data.dataCriacao)}</div>
        <div>Finalização: {formatDateTime(data.dataFinalizacao)}</div>
      </div>

      <div className="h-px bg-black/40 my-2" />

      <div className="space-y-1">
        <div className="font-bold">DOCUMENTO FISCAL</div>
        {tipoDocExibicao && <div>Tipo: {tipoDocExibicao}</div>}
        {statusFiscalExibicao && <div>Status: {statusFiscalExibicao}</div>}
        {numeroDocExibicao != null && (
          <div>
            Nº doc.: {numeroDocExibicao}
            {serieExibicao ? ` / Série ${serieExibicao}` : ''}
          </div>
        )}
        {dataEmissaoExibicao && <div>Emissão: {formatDateTime(dataEmissaoExibicao)}</div>}
        {retornoSefazExibicao && (
          <div className="text-xs break-words opacity-90">SEFAZ: {retornoSefazExibicao}</div>
        )}
      </div>

      {produtos.length > 0 && (
        <>
          <div className="h-px bg-black/40 my-2" />
          <div className="font-bold mb-1">ITENS</div>
          <table className="w-full text-xs table-fixed" style={{ borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: '36%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="text-left py-1 font-bold" style={{ padding: '2px' }}>
                  Descrição
                </th>
                <th className="text-right py-1 font-bold" style={{ padding: '2px' }}>
                  Qtd
                </th>
                <th className="text-right py-1 font-bold" style={{ padding: '2px' }}>
                  Acrés/Desc
                </th>
                <th className="text-right py-1 font-bold" style={{ padding: '2px' }}>
                  V Unit.
                </th>
                <th className="text-right py-1 font-bold" style={{ padding: '2px' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, i) => {
                const q = p.quantidade ?? 0
                const ajuste = formatarAjusteProdutoCupom(p)
                const complementos = (p.complementos || []).filter(
                  c => c.nomeComplemento?.trim() || c.quantidade != null
                )
                return (
                  <Fragment key={i}>
                    <tr>
                      <td
                        className="align-top break-words"
                        style={{ padding: '2px', verticalAlign: 'top' }}
                      >
                        {p.nomeProduto || 'Item'}
                      </td>
                      <td
                        className="text-right whitespace-nowrap align-top"
                        style={{ padding: '2px', verticalAlign: 'top' }}
                      >
                        {formatMoney(q)}
                      </td>
                      <td
                        className="text-right whitespace-nowrap align-top"
                        style={{ padding: '2px', verticalAlign: 'top' }}
                      >
                        {ajuste}
                      </td>
                      <td
                        className="text-right whitespace-nowrap align-top"
                        style={{ padding: '2px', verticalAlign: 'top' }}
                      >
                        {p.valorUnitario != null ? formatMoney(p.valorUnitario) : '—'}
                      </td>
                      <td
                        className="text-right whitespace-nowrap align-top"
                        style={{ padding: '2px', verticalAlign: 'top' }}
                      >
                        {p.valorFinal != null ? formatMoney(p.valorFinal) : '—'}
                      </td>
                    </tr>
                    {complementos.map((c, j) => (
                      <tr key={`${i}-comp-${j}`}>
                        <td
                          className="align-top break-words opacity-80"
                          style={{ padding: '2px 2px 2px 14px', verticalAlign: 'top' }}
                        >
                          {c.nomeComplemento || 'Complemento'}
                        </td>
                        <td
                          className="text-right whitespace-nowrap align-top opacity-80"
                          style={{ padding: '2px', verticalAlign: 'top' }}
                        >
                          {formatMoney(c.quantidade ?? 1)}
                        </td>
                        <td
                          className="text-right whitespace-nowrap align-top"
                          style={{ padding: '2px', verticalAlign: 'top' }}
                        />
                        <td
                          className="text-right whitespace-nowrap align-top opacity-80"
                          style={{ padding: '2px', verticalAlign: 'top' }}
                        >
                          {formatarValorUnitarioComplementoCupom(c)}
                        </td>
                        <td
                          className="text-right whitespace-nowrap align-top"
                          style={{ padding: '2px', verticalAlign: 'top' }}
                        />
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      {(data.taxasLancadas?.length ?? 0) > 0 && (
        <>
          <div className="h-px bg-black/40 my-2" />
          <div className="font-bold mb-1">TAXAS</div>
          <ul className="space-y-1 text-xs">
            {data.taxasLancadas!.map((taxa, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="break-words">
                  {taxa.nome || 'Taxa'}
                  {taxa.quantidade != null && taxa.quantidade > 1 ? ` x${taxa.quantidade}` : ''}
                </span>
                <span className="shrink-0">{formatCurrencyBrl(taxa.valor)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="h-px bg-black/40 my-2" />

      <div className="space-y-1">
        {data.totalDesconto != null && data.totalDesconto > 0 && (
          <div className="flex justify-between">
            <span>Descontos</span>
            <span>- {formatCurrencyBrl(data.totalDesconto)}</span>
          </div>
        )}
        {data.totalAcrescimo != null && data.totalAcrescimo > 0 && (
          <div className="flex justify-between">
            <span>Acréscimos</span>
            <span>+ {formatCurrencyBrl(data.totalAcrescimo)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold">
          <span>TOTAL</span>
          <span>{formatCurrencyBrl(data.valorFinal)}</span>
        </div>
        {data.troco != null && data.troco > 0 && (
          <div className="flex justify-between">
            <span>Troco</span>
            <span>{formatCurrencyBrl(data.troco)}</span>
          </div>
        )}
      </div>

      {pagamentos.length > 0 && (
        <>
          <div className="h-px bg-black/40 my-2" />
          <div className="font-bold mb-1">PAGAMENTOS</div>
          <ul className="space-y-1 text-xs">
            {pagamentos.map((pg, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="break-words">
                  {pg.nomeMeioPagamento || pg.meioPagamentoNome || pg.meioPagamentoId || 'Pagamento'}
                </span>
                <span className="shrink-0">{formatCurrencyBrl(pg.valor)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <CupomRodapeFiscal data={data} rodapeDanfeSrc={rodapeDanfeSrc} />
      <CupomFooterMarca />
    </div>
  )
}
