'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ImpressoraLogica } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { fetchAgentSystemPrinters } from '@/src/infrastructure/printing/agent/systemPrintersClient'
import {
  formatTcpPrinterRef,
  isTcpPrinterRef,
  parseTcpPrinterRef,
} from '@/src/infrastructure/printing/tcpPrinterRef'

const OPCAO_TCP = '__tcp__'

type DeliveryVinculoImpressorasFisicasProps = {
  impressorasLogicas: ImpressoraLogica[]
  vinculos: Record<string, string>
  onChange: (vinculos: Record<string, string>) => void
  disabled?: boolean
  enabled: boolean
}

export function DeliveryVinculoImpressorasFisicas(props: DeliveryVinculoImpressorasFisicasProps) {
  const { impressorasLogicas, vinculos, onChange, disabled, enabled } = props
  const [fisicas, setFisicas] = useState<string[]>([])
  const [carregandoFisicas, setCarregandoFisicas] = useState(false)
  const [erroFisicas, setErroFisicas] = useState<string | null>(null)

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
        error instanceof Error
          ? error.message
          : 'Não foi possível listar as impressoras deste PC. Abra o agent.exe.'
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
          {erroFisicas}{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => void carregarFisicas()}
            disabled={carregandoFisicas || disabled}
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      <ul className="space-y-3">
        {impressorasLogicas.map(logica => {
          const atual = vinculos[logica.id]?.trim() ?? ''
          const usandoTcp = isTcpPrinterRef(atual)
          const tcp = parseTcpPrinterRef(atual)
          const selectValue = usandoTcp ? OPCAO_TCP : atual

          return (
            <li
              key={logica.id}
              className="space-y-2 rounded-lg border border-gray-100 bg-white px-3 py-2.5 ring-1 ring-gray-100"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label
                  htmlFor={`vinculo-fisica-${logica.id}`}
                  className="min-w-[8rem] text-sm font-semibold text-primary-text"
                >
                  {logica.nome}
                </label>
                <select
                  id={`vinculo-fisica-${logica.id}`}
                  value={selectValue}
                  disabled={disabled || carregandoFisicas}
                  onChange={e => {
                    const value = e.target.value
                    if (value === OPCAO_TCP) {
                      setVinculo(logica.id, formatTcpPrinterRef(tcp?.host || '192.168.0.10', tcp?.port || 9100))
                      return
                    }
                    setVinculo(logica.id, value)
                  }}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition-colors focus:border-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Não vinculada</option>
                  {opcoesFisicas.map(nome => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                  <option value={OPCAO_TCP}>Rede (IP / porta 9100)</option>
                </select>
              </div>

              {usandoTcp ? (
                <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-[8.5rem]">
                  <input
                    aria-label={`IP da impressora ${logica.nome}`}
                    value={tcp?.host ?? ''}
                    disabled={disabled}
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
                    disabled={disabled}
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
  )
}
