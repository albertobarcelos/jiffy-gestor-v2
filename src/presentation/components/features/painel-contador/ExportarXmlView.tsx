'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { MdClose, MdFileDownload, MdHistory, MdSchedule } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Label } from '@/src/presentation/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  useAgendamentoExportacaoXml,
  useExportacaoXml,
  useHistoricoExportacaoXml,
} from '@/src/presentation/hooks/painel-contador/useExportacaoXml'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import type {
  ExportacaoHistoricoItemDTO,
  ExportacaoXmlDTO,
  ExportacaoXmlFaseEnum,
  ExportacaoXmlStatusEnum,
} from '@/src/application/dto/painel-contador/PainelContadorDTO'

type ModoPeriodo = 'mes' | 'intervalo'
type TipoXml = ExportacaoXmlDTO['tipos'][number]

const TIPOS_XML: Array<{ id: TipoXml; label: string }> = [
  { id: 'AUTORIZADO', label: 'Autorizados' },
  { id: 'CANCELADO', label: 'Cancelados' },
  { id: 'INUTILIZADO', label: 'Inutilizados' },
]

const MESES_DO_ANO = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
] as const

function hoje() {
  const now = new Date()
  return {
    ano: now.getFullYear(),
    mes: now.getMonth() + 1,
  }
}

/** Mês anterior ao atual — padrão ao abrir a aba de exportação. */
function mesAnteriorPadrao() {
  const data = new Date()
  data.setDate(1)
  data.setMonth(data.getMonth() - 1)
  return {
    ano: data.getFullYear(),
    mes: data.getMonth() + 1,
  }
}

function gerarAnos(quantidade = 6): number[] {
  const { ano } = hoje()
  return Array.from({ length: quantidade }, (_, i) => ano - i)
}

function mesParaApi(ano: string, mes: string): string {
  return `${ano}-${mes}`
}

function formatarDataHora(valor?: string | null): string {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return data.toLocaleString('pt-BR')
}

function labelStatus(status: ExportacaoXmlStatusEnum): string {
  switch (status) {
    case 'PROCESSANDO':
      return 'Processando'
    case 'CONCLUIDO':
      return 'Concluído'
    case 'ERRO':
      return 'Erro'
    default:
      return status
  }
}

function statusClass(status: ExportacaoXmlStatusEnum): string {
  switch (status) {
    case 'PROCESSANDO':
      return 'text-amber-700 bg-amber-50'
    case 'CONCLUIDO':
      return 'text-emerald-700 bg-emerald-50'
    case 'ERRO':
      return 'text-red-700 bg-red-50'
    default:
      return 'text-alternate bg-alternate/10'
  }
}

function lerListaTipos(item: ExportacaoHistoricoItemDTO): TipoXml[] {
  const raw = item as unknown as Record<string, unknown>
  const candidatos = [
    item.tipos,
    raw.tiposSelecionados,
    raw.tiposXml,
    raw.tiposExportados,
  ]

  for (const candidato of candidatos) {
    if (!Array.isArray(candidato)) continue
    const tipos = candidato.filter((t): t is TipoXml =>
      TIPOS_XML.some((itemTipo) => itemTipo.id === t)
    )
    if (tipos.length > 0) return [...new Set(tipos)]
  }
  return []
}

function textoFaseExportacao(
  status: ExportacaoXmlStatusEnum | null,
  fase: ExportacaoXmlFaseEnum | string | null | undefined,
  pct: number
): string {
  if (status === 'CONCLUIDO' || fase === 'CONCLUIDO') {
    return 'Exportação concluída. Iniciando download...'
  }
  if (status === 'ERRO' || fase === 'ERRO') {
    return 'Falha na exportação'
  }
  if (fase === 'FINALIZANDO_ZIP') {
    return 'Finalizando arquivo ZIP...'
  }
  return `Gerando XMLs... ${pct}%`
}

function ExportacaoProgressoBar({
  progresso,
  status,
  fase,
  totalEncontrados,
}: {
  progresso: number
  status: ExportacaoXmlStatusEnum | null
  fase?: ExportacaoXmlFaseEnum | string | null
  totalEncontrados?: number
}) {
  const pct = Math.max(0, Math.min(100, progresso))
  return (
    <div className="mt-4 rounded-md border border-alternate/20 bg-alternate/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-exo text-sm text-alternate">
          {textoFaseExportacao(status, fase, pct)}
        </p>
        <span className="font-exo text-sm font-semibold text-secondary">{pct}%</span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-alternate/20"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-secondary transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {typeof totalEncontrados === 'number' && (
        <p className="mt-2 font-exo text-xs text-alternate/80">
          {totalEncontrados} arquivo(s) encontrado(s)
        </p>
      )}
    </div>
  )
}

function HistoricoExportacaoSection({
  onBaixar,
  isBaixando,
}: {
  onBaixar: (id: string) => Promise<void>
  isBaixando: boolean
}) {
  const [page, setPage] = useState(0)
  const { data, isLoading, isFetching } = useHistoricoExportacaoXml(page, 8)
  const itens = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <section className="rounded-lg border border-alternate/30 bg-white p-4 sm:p-5 h-fit">
      <div className="mb-4 flex items-center gap-2">
        <MdHistory className="h-5 w-5 text-secondary" aria-hidden />
        <h3 className="font-manrope text-lg font-semibold text-secondary">Histórico</h3>
        {isFetching && !isLoading && (
          <JiffyLoading className="!gap-0 !py-0 ml-auto" size={18} />
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <JiffyLoading size={28} />
        </div>
      ) : itens.length === 0 ? (
        <p className="font-exo text-sm text-alternate">Nenhuma exportação registrada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-alternate/20">
                <th className="pb-2 pr-3 text-left font-exo text-[11px] font-semibold uppercase tracking-wide text-alternate">
                  Período
                </th>
                <th className="pb-2 px-2 text-center font-exo text-[11px] font-semibold uppercase tracking-wide text-alternate">
                  Status
                </th>
                <th className="pb-2 px-2 text-center font-exo text-[11px] font-semibold uppercase tracking-wide text-alternate">
                  Origem
                </th>
                <th className="pb-2 px-2 text-center font-exo text-[11px] font-semibold uppercase tracking-wide text-alternate">
                  Tipos
                </th>
                <th className="pb-2 pl-2 text-center font-exo text-[11px] font-semibold uppercase tracking-wide text-alternate">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item: ExportacaoHistoricoItemDTO) => {
                const tipos = lerListaTipos(item)

                return (
                  <tr key={item.exportacaoId} className="border-b border-alternate/10">
                    <td className="py-3 pr-2 align-middle text-left">
                      <p className="font-exo text-sm font-semibold text-secondary">{item.periodo}</p>
                      <p className="mt-0.5 font-exo text-[11px] leading-tight text-alternate">
                        {formatarDataHora(item.criadoEm)}
                      </p>
                    </td>
                    <td className="py-3 px-1 align-middle text-center">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 font-exo text-[11px] font-medium ${statusClass(item.status)}`}
                      >
                        {labelStatus(item.status)}
                      </span>
                    </td>
                    <td className="py-3 px-1 align-middle text-center font-exo text-xs text-alternate">
                      {item.tipoDisparo === 'AGENDADO' ? 'Agendado' : 'Manual'}
                    </td>
                    <td className="py-3 px-2 align-middle">
                      {tipos.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {TIPOS_XML.filter((tipo) => tipos.includes(tipo.id)).map((tipo) => (
                            <span
                              key={tipo.id}
                              className="inline-flex rounded-full border border-secondary/20 bg-secondary/5 px-2.5 py-0.5 font-exo text-[11px] font-medium text-secondary"
                            >
                              {tipo.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center font-exo text-xs text-alternate/60">—</p>
                      )}
                    </td>
                    <td className="py-3 pl-2 align-middle text-center">
                      {item.downloadDisponivel ? (
                        <Button
                          type="button"
                          variant="outlined"
                          size="small"
                          className="!min-w-0 !px-3"
                          disabled={isBaixando}
                          onClick={() => void onBaixar(item.exportacaoId)}
                        >
                          Baixar
                        </Button>
                      ) : (
                        <span className="font-exo text-xs text-alternate/60">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outlined"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <span className="font-exo text-xs text-alternate">
            {page + 1} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outlined"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </section>
  )
}

function parseEmailsTexto(texto: string): string[] {
  const vistos = new Set<string>()
  const emails: string[] = []
  for (const parte of texto.split(/[,;]+/)) {
    const email = parte.trim().toLowerCase()
    if (!email || !email.includes('@') || vistos.has(email)) continue
    vistos.add(email)
    emails.push(email)
  }
  return emails
}

function normalizarEmails(lista: string[]): string[] {
  const vistos = new Set<string>()
  const emails: string[] = []
  for (const item of lista) {
    const email = item.trim().toLowerCase()
    if (!email || !email.includes('@') || vistos.has(email)) continue
    vistos.add(email)
    emails.push(email)
  }
  return emails.sort()
}

function normalizarTipos(lista: string[]): TipoXml[] {
  const tipos = lista.filter((t): t is TipoXml => TIPOS_XML.some((item) => item.id === t))
  return [...new Set(tipos)].sort()
}

function listasIguais(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, index) => item === b[index])
}

function AgendamentoExportacaoSection({
  tiposPadrao,
  timezone,
}: {
  tiposPadrao: TipoXml[]
  timezone: string
}) {
  const {
    agendamento,
    isLoading,
    salvarAgendamento,
    isSalvando,
  } = useAgendamentoExportacaoXml()

  const [emailsTexto, setEmailsTexto] = useState('')
  const [emailsVinculados, setEmailsVinculados] = useState<string[]>([])
  const [tipos, setTipos] = useState<TipoXml[]>(() => normalizarTipos(tiposPadrao))
  const [baselineEmails, setBaselineEmails] = useState<string[]>([])
  const [baselineTipos, setBaselineTipos] = useState<TipoXml[]>(() =>
    normalizarTipos(tiposPadrao)
  )

  useEffect(() => {
    if (!agendamento) return

    const emails = normalizarEmails(agendamento.emails ?? [])
    const tiposApi = normalizarTipos(agendamento.tipos ?? [])
    const tiposFinais = tiposApi.length > 0 ? tiposApi : normalizarTipos(tiposPadrao)

    setEmailsVinculados(emails)
    setEmailsTexto('')
    setTipos(tiposFinais)
    setBaselineEmails(emails)
    setBaselineTipos(tiposFinais)
  }, [agendamento, tiposPadrao])

  const toggleTipo = (tipo: TipoXml) => {
    setTipos((prev) =>
      prev.includes(tipo) ? prev.filter((item) => item !== tipo) : [...prev, tipo]
    )
  }

  const adicionarEmails = (candidatos: string[]) => {
    if (candidatos.length === 0) return
    setEmailsVinculados((prev) => normalizarEmails([...prev, ...candidatos]))
  }

  const extrairEmailsDoTexto = (texto: string, forcarUltimo = false) => {
    const temSeparador = /[,;]/.test(texto)
    if (!temSeparador && !forcarUltimo) {
      setEmailsTexto(texto)
      return
    }

    const partes = texto.split(/[,;]/)
    const incompleto = forcarUltimo ? '' : (partes.pop() ?? '')
    const candidatos = parseEmailsTexto(partes.join(','))
    adicionarEmails(candidatos)
    setEmailsTexto(incompleto.trimStart())
  }

  const handleEmailsChange = (valor: string) => {
    extrairEmailsDoTexto(valor, false)
  }

  const handleEmailsKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      const candidatos = parseEmailsTexto(emailsTexto)
      if (candidatos.length > 0) {
        adicionarEmails(candidatos)
        setEmailsTexto('')
      }
      return
    }

    if (event.key === 'Backspace' && emailsTexto === '' && emailsVinculados.length > 0) {
      setEmailsVinculados((prev) => prev.slice(0, -1))
    }
  }

  const handleEmailsBlur = () => {
    const candidatos = parseEmailsTexto(emailsTexto)
    if (candidatos.length > 0) {
      adicionarEmails(candidatos)
      setEmailsTexto('')
    }
  }

  const handleSalvar = async () => {
    const pendentes = parseEmailsTexto(emailsTexto)
    const unidos = normalizarEmails([...emailsVinculados, ...pendentes])
    const tiposFinais = normalizarTipos(tipos)

    if (unidos.length === 0 || tiposFinais.length === 0) return

    await salvarAgendamento({
      emails: unidos,
      tipos: tiposFinais,
      timezone,
    })

    setEmailsVinculados(unidos)
    setTipos(tiposFinais)
    setBaselineEmails(unidos)
    setBaselineTipos(tiposFinais)
    setEmailsTexto('')
  }

  const handleRemoverEmail = (emailRemovido: string) => {
    setEmailsVinculados((prev) =>
      prev.filter((email) => email.toLowerCase() !== emailRemovido.toLowerCase())
    )
  }

  const emailsAtuais = useMemo(() => normalizarEmails(emailsVinculados), [emailsVinculados])
  const tiposAtuais = useMemo(() => normalizarTipos(tipos), [tipos])

  const temAlteracao =
    !listasIguais(emailsAtuais, baselineEmails) ||
    !listasIguais(tiposAtuais, baselineTipos)

  const podeSalvar = temAlteracao && tiposAtuais.length > 0 && emailsAtuais.length > 0

  return (
    <section className="rounded-lg border border-alternate/30 bg-white p-4 sm:p-5 h-fit">
      <div className="mb-2 flex items-center gap-2">
        <MdSchedule className="h-5 w-5 text-secondary" aria-hidden />
        <h3 className="font-manrope text-lg font-semibold text-secondary">
          Exportação mensal por e-mail
        </h3>
      </div>
      <p className="font-exo text-sm text-alternate">
        Configure e-mails para receber automaticamente o ZIP do mês anterior.
      </p>
      <p className="mb-4 mt-1 font-exo text-xs text-primary font-medium">
        O envio é feito automaticamente todo dia 01 de cada mês.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <JiffyLoading size={24} />
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="emails-agendamento">Adicionar e-mails</Label>
            <Input
              id="emails-agendamento"
              value={emailsTexto}
              onChange={(e) => handleEmailsChange(e.target.value)}
              onKeyDown={handleEmailsKeyDown}
              onBlur={handleEmailsBlur}
              placeholder="digite o e-mail e pressione ,"
              disabled={isSalvando}
              autoComplete="off"
            />
            <p className="font-exo text-xs text-alternate/70">
              Digite o e-mail e pressione vírgula (ou Enter) para adicionar. Depois clique em salvar.
            </p>
          </div>

          {emailsVinculados.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 font-exo text-xs font-medium text-alternate">
                E-mails vinculados
              </p>
              <div className="flex flex-wrap gap-2">
                {emailsVinculados.map((email) => (
                  <span
                    key={email}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary/5 px-3 py-1.5 font-exo text-xs text-secondary"
                  >
                    <span className="truncate">{email}</span>
                    <button
                      type="button"
                      aria-label={`Remover ${email}`}
                      disabled={isSalvando}
                      onClick={() => handleRemoverEmail(email)}
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-secondary/70 transition-colors hover:bg-secondary/15 hover:text-secondary disabled:opacity-40"
                    >
                      <MdClose className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-2">
            <Label>Tipos de XML</Label>
            <div className="flex flex-wrap gap-3">
              {TIPOS_XML.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 font-exo text-sm text-alternate"
                >
                  <input
                    type="checkbox"
                    checked={tipos.includes(item.id)}
                    onChange={() => toggleTipo(item.id)}
                    className="h-4 w-4 accent-secondary"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              disabled={isSalvando || !podeSalvar}
              onClick={() => void handleSalvar()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              sx={{
                backgroundColor: 'var(--color-secondary)',
                '&:hover': { backgroundColor: 'var(--color-alternate)' },
                '&:disabled': { backgroundColor: '#ccc', color: '#fff', cursor: 'not-allowed' },
              }}
            >
              {isSalvando ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}

export function ExportarXmlView() {
  const {
    exportarXmls,
    baixarExportacao,
    isExportando,
    isBaixando,
    exportacaoIdAtiva,
    status,
    progresso,
  } = useExportacaoXml()

  const referencia = useMemo(() => hoje(), [])
  const padraoExportacao = useMemo(() => mesAnteriorPadrao(), [])
  const [modoPeriodo, setModoPeriodo] = useState<ModoPeriodo>('mes')
  const [ano, setAno] = useState(String(padraoExportacao.ano))
  const [mesNum, setMesNum] = useState(String(padraoExportacao.mes).padStart(2, '0'))
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [tipos, setTipos] = useState<TipoXml[]>(['AUTORIZADO', 'CANCELADO', 'INUTILIZADO'])

  const { timezoneAgregacao } = useEmpresaMe()
  const timezone = timezoneAgregacao || 'America/Sao_Paulo'
  const opcoesAnos = useMemo(() => gerarAnos(), [])

  const mes = mesParaApi(ano, mesNum)

  const mesMaximoNoAno = Number(ano) === referencia.ano ? referencia.mes : 12

  useEffect(() => {
    if (Number(mesNum) > mesMaximoNoAno) {
      setMesNum(String(mesMaximoNoAno).padStart(2, '0'))
    }
  }, [ano, mesNum, mesMaximoNoAno])

  const toggleTipo = (tipo: TipoXml) => {
    setTipos((prev) =>
      prev.includes(tipo) ? prev.filter((item) => item !== tipo) : [...prev, tipo]
    )
  }

  const handleExportar = async () => {
    const payload: ExportacaoXmlDTO =
      modoPeriodo === 'mes'
        ? {
            mes,
            tipos,
            timezone,
          }
        : {
            dataInicial,
            dataFinal,
            tipos,
            timezone,
          }

    await exportarXmls(payload)
  }

  const podeExportarIntervalo =
    modoPeriodo === 'mes' || (Boolean(dataInicial) && Boolean(dataFinal))

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <MdFileDownload className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h2 className="font-manrope text-2xl font-semibold text-secondary">Exportar XMLs</h2>
          <p className="font-exo text-sm text-alternate">
            Exporte XMLs autorizados, cancelados e inutilizados. Gere o arquivo na hora ou configure o envio automático mensal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Coluna da Esquerda: Ações */}
        <div className="flex flex-col gap-6 xl:col-span-5">
          <div className="rounded-lg border border-alternate/30 bg-white p-4 sm:p-5">
            <h3 className="mb-4 font-manrope text-lg font-semibold text-secondary">Exportação Manual</h3>
            <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={modoPeriodo === 'mes' ? 'contained' : 'outlined'}
            onClick={() => setModoPeriodo('mes')}
            disabled={isExportando}
          >
            Por mês
          </Button>
          <Button
            type="button"
            variant={modoPeriodo === 'intervalo' ? 'contained' : 'outlined'}
            onClick={() => setModoPeriodo('intervalo')}
            disabled={isExportando}
          >
            Por intervalo
          </Button>
        </div>

        {modoPeriodo === 'mes' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ano-exportacao">Ano</Label>
              <Select value={ano} onValueChange={setAno} disabled={isExportando}>
                <SelectTrigger id="ano-exportacao" className="font-exo">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {opcoesAnos.map((opcaoAno) => (
                    <SelectItem key={opcaoAno} value={String(opcaoAno)}>
                      {opcaoAno}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mes-exportacao">Mês</Label>
              <Select value={mesNum} onValueChange={setMesNum} disabled={isExportando}>
                <SelectTrigger id="mes-exportacao" className="font-exo">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {MESES_DO_ANO.map((opcao) => {
                    const desabilitado = Number(opcao.value) > mesMaximoNoAno
                    return (
                      <SelectItem
                        key={opcao.value}
                        value={opcao.value}
                        disabled={desabilitado}
                      >
                        {opcao.label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="data-inicial-exportacao">Data inicial</Label>
              <Input
                id="data-inicial-exportacao"
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                disabled={isExportando}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="data-final-exportacao">Data final</Label>
              <Input
                id="data-final-exportacao"
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                disabled={isExportando}
              />
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-2">
          <Label>Tipos de XML</Label>
          <div className="flex flex-wrap gap-3">
            {TIPOS_XML.map((item) => (
              <label key={item.id} className="flex items-center gap-2 font-exo text-sm text-alternate">
                <input
                  type="checkbox"
                  checked={tipos.includes(item.id)}
                  onChange={() => toggleTipo(item.id)}
                  disabled={isExportando}
                  className="h-4 w-4 accent-secondary"
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <p className="mt-4 font-exo text-xs text-alternate/80">
          Fuso horário da empresa: {timezone}
        </p>

        {exportacaoIdAtiva && (
          <ExportacaoProgressoBar
            progresso={progresso}
            status={status?.status ?? 'PROCESSANDO'}
            fase={status?.fase}
            totalEncontrados={status?.totalEncontrados}
          />
        )}

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            onClick={() => void handleExportar()}
            disabled={isExportando || tipos.length === 0 || !podeExportarIntervalo}
            className="min-w-[180px]"
          >
            {isExportando ? (
              <span className="flex items-center gap-2">
                <JiffyLoading className="!gap-0 !py-0" size={20} />
                {exportacaoIdAtiva ? 'Processando...' : 'Iniciando...'}
              </span>
            ) : (
              'Exportar XMLs'
            )}
          </Button>
        </div>
      </div>

      <AgendamentoExportacaoSection tiposPadrao={tipos} timezone={timezone} />
    </div>

    {/* Coluna da Direita: Histórico */}
    <div className="flex flex-col gap-6 xl:col-span-7">
      <HistoricoExportacaoSection
        onBaixar={baixarExportacao}
        isBaixando={isBaixando}
      />
    </div>
  </div>
</div>
  )
}
