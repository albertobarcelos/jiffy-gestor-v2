'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { MdFileDownload } from 'react-icons/md'
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
import { useExportacaoXml } from '@/src/presentation/hooks/painel-contador/useExportacaoXml'
import type { ExportacaoXmlDTO } from '@/src/application/dto/painel-contador/PainelContadorDTO'

type ModoPeriodo = 'mes' | 'intervalo'
type TipoXml = ExportacaoXmlDTO['tipos'][number]

const TIPOS_XML: Array<{ id: TipoXml; label: string }> = [
  { id: 'AUTORIZADO', label: 'Autorizados' },
  { id: 'CANCELADO', label: 'Cancelados' },
  { id: 'INUTILIZADO', label: 'Inutilizados' },
]

function timezonePadrao(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
  } catch {
    return 'America/Sao_Paulo'
  }
}

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

export function ExportarXmlView() {
  const { exportarXmls, isExportando } = useExportacaoXml()
  const referencia = useMemo(() => hoje(), [])
  const padraoExportacao = useMemo(() => mesAnteriorPadrao(), [])
  const [modoPeriodo, setModoPeriodo] = useState<ModoPeriodo>('mes')
  const [ano, setAno] = useState(String(padraoExportacao.ano))
  const [mesNum, setMesNum] = useState(String(padraoExportacao.mes).padStart(2, '0'))
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [tipos, setTipos] = useState<TipoXml[]>(['AUTORIZADO', 'CANCELADO', 'INUTILIZADO'])

  const timezone = useMemo(() => timezonePadrao(), [])
  const opcoesAnos = useMemo(() => gerarAnos(), [])

  const mes = mesParaApi(ano, mesNum)

  const mesMaximoNoAno =
    Number(ano) === referencia.ano ? referencia.mes : 12

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
            formato: 'completo',
          }
        : {
            dataInicial,
            dataFinal,
            tipos,
            timezone,
            formato: 'completo',
          }

    await exportarXmls(payload)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <MdFileDownload className="mt-1 h-8 w-8 shrink-0 text-secondary" aria-hidden />
        <div>
          <h2 className="font-manrope text-2xl font-semibold text-secondary">Exportar XMLs</h2>
          <p className="font-exo text-sm text-alternate">
            Exporta XMLs autorizados, cancelados e inutilizados do período selecionado em um arquivo ZIP.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-alternate/30 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={modoPeriodo === 'mes' ? 'contained' : 'outlined'}
            onClick={() => setModoPeriodo('mes')}
          >
            Por mês
          </Button>
          <Button
            type="button"
            variant={modoPeriodo === 'intervalo' ? 'contained' : 'outlined'}
            onClick={() => setModoPeriodo('intervalo')}
          >
            Por intervalo
          </Button>
        </div>

        {modoPeriodo === 'mes' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ano-exportacao">Ano</Label>
              <Select value={ano} onValueChange={setAno}>
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
              <Select value={mesNum} onValueChange={setMesNum}>
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="data-final-exportacao">Data final</Label>
              <Input
                id="data-final-exportacao"
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
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
                  className="h-4 w-4 accent-secondary"
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <p className="mt-4 font-exo text-xs text-alternate/80">
          Fuso horário: {timezone}
        </p>

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            onClick={handleExportar}
            disabled={isExportando || tipos.length === 0}
            className="min-w-[180px]"
          >
            {isExportando ? (
              <span className="flex items-center gap-2">
                <JiffyLoading className="!gap-0 !py-0" size={20} />
                Exportando...
              </span>
            ) : (
              'Baixar ZIP'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
