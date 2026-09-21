'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode, type SelectHTMLAttributes } from 'react'
import { MdKeyboardArrowDown } from 'react-icons/md'
import type { ImpressoraLogica } from '@/src/infrastructure/api/estacoesImpressaoApi'
import {
  jaPediuDownloadJiffyPrint,
  marcarDownloadJiffyPrintIniciado,
  mensagemJiffyPrintIndisponivel,
  nomeFicheiroInstaladorJiffyPrint,
  urlInstaladorJiffyPrint,
} from '@/src/infrastructure/printing/agent/localAgentClient'
import { fetchAgentSystemPrinters } from '@/src/infrastructure/printing/agent/systemPrintersClient'
import {
  formatTcpPrinterRef,
  isTcpPrinterRef,
  parseTcpPrinterRef,
} from '@/src/infrastructure/printing/tcpPrinterRef'
import {
  MODO_IMPRESSAO_IMPRESSORA_OPCOES,
  parseModoImpressaoImpressora,
  type ModoImpressaoImpressora,
} from '@/src/domain/types/modoImpressaoImpressora'
import { CupomCampoInfo } from './DeliveryModoPapelToggle'

const OPCAO_TCP = '__tcp__'

const HINT_MODO_VIA_ESTACAO =
  'Como a cozinha recebe os itens nesta estação, no modo de cupom separado. Unificado e expedição não usam isto. Ficha no delivery sai como Normal.'

const SELECT_CLASS =
  'h-9 w-full cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-9 text-sm outline-none transition-colors focus:border-secondary disabled:cursor-not-allowed disabled:opacity-60'

function VinculoSelect({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className={`relative min-w-0 ${className ?? 'w-full'}`}>
      <select {...props} className={SELECT_CLASS}>
        {children}
      </select>
      <MdKeyboardArrowDown
        className="pointer-events-none absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
    </div>
  )
}

type DeliveryVinculoImpressorasFisicasProps = {
  impressorasLogicas: ImpressoraLogica[]
  vinculos: Record<string, string>
  onChange: (vinculos: Record<string, string>) => void
  modos: Record<string, ModoImpressaoImpressora>
  onChangeModos: (modos: Record<string, ModoImpressaoImpressora>) => void
  disabled?: boolean
  enabled: boolean
}

export function DeliveryVinculoImpressorasFisicas(props: DeliveryVinculoImpressorasFisicasProps) {
  const { impressorasLogicas, vinculos, onChange, modos, onChangeModos, disabled, enabled } = props
  const [fisicas, setFisicas] = useState<string[]>([])
  const [carregandoFisicas, setCarregandoFisicas] = useState(false)
  const [erroFisicas, setErroFisicas] = useState<string | null>(null)
  const [downloadPedido, setDownloadPedido] = useState(false)

  useEffect(() => {
    setDownloadPedido(jaPediuDownloadJiffyPrint())
  }, [])

  const carregarFisicas = useCallback(async () => {
    if (!enabled) return
    setCarregandoFisicas(true)
    setErroFisicas(null)
    try {
      const items = await fetchAgentSystemPrinters()
      setFisicas(items.map(item => item.name))
    } catch (error) {
      setFisicas([])
      setErroFisicas(
        error instanceof Error && !/failed to fetch/i.test(error.message)
          ? error.message
          : mensagemJiffyPrintIndisponivel()
      )
    } finally {
      setCarregandoFisicas(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    void carregarFisicas()
  }, [enabled, carregarFisicas])

  const opcoesFisicas = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of [...fisicas, ...Object.values(vinculos)]) {
      const nome = raw.trim()
      if (!nome || isTcpPrinterRef(nome)) continue
      const key = nome.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(nome)
    }
    return out
  }, [fisicas, vinculos])

  function setVinculo(impressoraId: string, value: string) {
    onChange({ ...vinculos, [impressoraId]: value })
  }

  function setModo(impressoraId: string, value: string) {
    onChangeModos({ ...modos, [impressoraId]: parseModoImpressaoImpressora(value) })
  }

  if (impressorasLogicas.length === 0) {
    return (
      <p className="text-xs text-amber-800">
        Nenhuma impressora lógica cadastrada. Cadastre em Configurações → Impressoras e volte aqui para
        vincular à impressora física deste PC.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {erroFisicas ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p>{erroFisicas}</p>
          <p className="mt-1 text-xs">
            Cozinha, Caixa e as outras linhas são só os nomes do Gestor. A impressora de verdade
            aparece no menu depois que o Jiffy Print estiver aberto.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={urlInstaladorJiffyPrint()}
              download={nomeFicheiroInstaladorJiffyPrint()}
              className="inline-flex rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
              onClick={() => {
                marcarDownloadJiffyPrintIniciado()
                setDownloadPedido(true)
              }}
            >
              {downloadPedido ? 'Baixar de novo' : 'Baixar o Jiffy Print'}
            </a>
            <button
              type="button"
              className="inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              onClick={() => void carregarFisicas()}
              disabled={carregandoFisicas || disabled}
            >
              Já instalei — tentar de novo
            </button>
          </div>
          {downloadPedido ? (
            <p
              role="status"
              className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
            >
              Download iniciado. Procure <strong>{nomeFicheiroInstaladorJiffyPrint()}</strong> na
              pasta Downloads, instale, abra o Jiffy Print e depois clique em «Já instalei —
              tentar de novo».
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white ring-1 ring-gray-100">
        <div className="hidden grid-cols-[9rem_minmax(0,1fr)_11rem] items-center gap-3 border-b border-gray-100 px-3 py-2 text-xs font-semibold text-secondary-text sm:grid">
          <span>Impressora</span>
          <span>Deste PC</span>
          <span className="flex items-center gap-1">
            Via de produção
            <CupomCampoInfo texto={HINT_MODO_VIA_ESTACAO} ariaLabel="Via de produção" />
          </span>
        </div>
        <ul className="divide-y divide-gray-100">
          {impressorasLogicas.map(logica => {
            const atual = vinculos[logica.id]?.trim() ?? ''
            const usandoTcp = isTcpPrinterRef(atual)
            const tcp = parseTcpPrinterRef(atual)
            const selectValue = usandoTcp ? OPCAO_TCP : atual
            const modoAtual = parseModoImpressaoImpressora(modos[logica.id])
            const hintModo = MODO_IMPRESSAO_IMPRESSORA_OPCOES.find(o => o.valor === modoAtual)?.hint

            return (
              <li key={logica.id} className="space-y-2 px-3 py-2.5">
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_11rem] sm:gap-3">
                  <label
                    htmlFor={`vinculo-fisica-${logica.id}`}
                    title={logica.nome}
                    className="truncate text-sm font-semibold text-primary-text"
                  >
                    {logica.nome}
                  </label>
                  <VinculoSelect
                    id={`vinculo-fisica-${logica.id}`}
                    value={selectValue}
                    disabled={disabled || carregandoFisicas || Boolean(erroFisicas)}
                    onChange={e => {
                      const value = e.target.value
                      if (value === OPCAO_TCP) {
                        setVinculo(
                          logica.id,
                          formatTcpPrinterRef(tcp?.host || '192.168.0.10', tcp?.port || 9100)
                        )
                        return
                      }
                      setVinculo(logica.id, value)
                    }}
                  >
                    <option value="">Não vinculada</option>
                    {opcoesFisicas.map(nome => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))}
                    <option value={OPCAO_TCP}>Rede (IP / porta 9100)</option>
                  </VinculoSelect>
                  <div className="flex min-w-0 items-center gap-2 sm:block">
                    <span className="shrink-0 text-xs font-semibold text-secondary-text sm:hidden">
                      Via de produção
                    </span>
                    <VinculoSelect
                      id={`vinculo-modo-${logica.id}`}
                      value={modoAtual}
                      disabled={disabled}
                      title={hintModo}
                      aria-label={`Via de produção — ${logica.nome}`}
                      onChange={e => setModo(logica.id, e.target.value)}
                    >
                      {MODO_IMPRESSAO_IMPRESSORA_OPCOES.map(opcao => (
                        <option key={opcao.valor} value={opcao.valor}>
                          {opcao.label}
                        </option>
                      ))}
                    </VinculoSelect>
                  </div>
                </div>

                {usandoTcp ? (
                  <div className="flex flex-wrap items-center gap-2 sm:pl-[calc(9rem+0.75rem)]">
                    <input
                      aria-label={`IP da impressora ${logica.nome}`}
                      value={tcp?.host ?? ''}
                      disabled={disabled || Boolean(erroFisicas)}
                      onChange={e =>
                        setVinculo(logica.id, formatTcpPrinterRef(e.target.value.trim(), tcp?.port || 9100))
                      }
                      placeholder="192.168.0.10"
                      className="h-9 w-40 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-secondary"
                    />
                    <input
                      aria-label={`Porta da impressora ${logica.nome}`}
                      type="number"
                      min={1}
                      max={65535}
                      value={tcp?.port ?? 9100}
                      disabled={disabled || Boolean(erroFisicas)}
                      onChange={e =>
                        setVinculo(
                          logica.id,
                          formatTcpPrinterRef(tcp?.host || '192.168.0.10', Number(e.target.value) || 9100)
                        )
                      }
                      className="h-9 w-20 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-secondary"
                    />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
