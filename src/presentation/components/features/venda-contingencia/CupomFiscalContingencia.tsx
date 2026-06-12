import type { VendaContingenciaPublica } from '@/src/infrastructure/api/fetchVendaContingenciaPublica'
import { deveExibirRodapeDanfe80mm } from '@/src/infrastructure/api/fetchVendaContingenciaPublica'
import { CupomRodapeDanfe80 } from '@/src/presentation/components/features/venda-contingencia/CupomRodapeDanfe80'
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

function resolveCnpjEstabelecimento(data: VendaContingenciaPublica): string | undefined {
  const cnpj = data.emitente?.cnpj?.trim() || data.empresa?.cnpj?.trim()
  return cnpj || undefined
}

/** Cabeçalho: emitente em destaque + linha da venda mais compacta. */
function CabecalhoCupom({ data }: { data: VendaContingenciaPublica }) {
  const empresa = resolveNomeEstabelecimento(data)
  const cnpj = resolveCnpjEstabelecimento(data)
  const codigoRaw = data.codigoVenda
  const codigo =
    codigoRaw != null && String(codigoRaw).trim() !== '' ? String(codigoRaw).trim() : '—'
  const numero =
    data.numeroVenda != null && !Number.isNaN(Number(data.numeroVenda))
      ? String(data.numeroVenda)
      : '—'

  return (
    <header className="pb-1 text-center">
      <div className="font-poppins text-base font-extrabold leading-snug text-black md:text-xl">
        {empresa}
      </div>
      {cnpj && <div className="text-xs text-black/75">CNPJ: {cnpj}</div>}
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
        <span>Venda feita por Jiffy com amor</span>
        <Heart className="size-3 shrink-0 fill-black text-black" aria-hidden />
        <span>!</span>
      </p>
    </footer>
  )
}

/** Rodapé: QR quando emitida; aviso de contingência + emissão em andamento caso contrário. */
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

  return (
    <>
      <div className="my-3 h-px bg-black/40" />
      <p className="text-center text-xs leading-snug">
        Documento emitido em contingência. Troque pela via definitiva quando disponível, conforme
        legislação.
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

  return (
    <div className="space-y-2 text-sm" style={{ fontFamily: "'Roboto Mono', 'Courier New', monospace" }}>
      <CabecalhoCupom data={data} />
      <div className="my-2 h-px bg-slate-300" />

      <div className="space-y-0.5">
        {data.codigoVenda != null && <div>Cód. venda: {data.codigoVenda}</div>}
        {data.numeroVenda != null && <div>Nº venda: {data.numeroVenda}</div>}
        {(data.codigoTerminal || data.terminalNome) && (
          <div>
            Terminal: {[data.codigoTerminal, data.terminalNome].filter(Boolean).join(' — ')}
          </div>
        )}
        {(data.identificacao || data.clienteNome) && (
          <div>Cliente / identif.: {data.identificacao || data.clienteNome}</div>
        )}
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
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="text-left py-1 font-bold" style={{ padding: '2px' }}>
                  Descrição
                </th>
                <th className="text-right py-1 font-bold" style={{ padding: '2px' }}>
                  Qtd
                </th>
                <th className="text-right py-1 font-bold" style={{ padding: '2px' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, i) => {
                const q = p.quantidade ?? 0
                return (
                  <tr key={i}>
                    <td style={{ padding: '2px', verticalAlign: 'top' }}>
                      <div>{p.nomeProduto || 'Item'}</div>
                      {(p.complementos || []).map((c, j) => (
                        <div key={j} className="text-[11px] opacity-80 pl-1">
                          + {c.nomeComplemento} x{c.quantidade ?? 1}{' '}
                          {c.valorUnitario != null ? `(${formatCurrencyBrl(c.valorUnitario)})` : ''}
                        </div>
                      ))}
                    </td>
                    <td className="text-right whitespace-nowrap" style={{ padding: '2px' }}>
                      {formatMoney(q)}
                    </td>
                    <td className="text-right whitespace-nowrap" style={{ padding: '2px' }}>
                      {p.valorFinal != null ? formatCurrencyBrl(p.valorFinal) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
