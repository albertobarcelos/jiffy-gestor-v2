'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MdSearch } from 'react-icons/md'
import type { ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import {
  buscarComplementoCompleto,
  gravarOverridesComplemento,
} from './complementoOverrideApi'

interface ComplementoOndeUsadoTabProps {
  complementoId: string
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

function formatarDigitacao(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 'R$ 0,00'
  return formatarMoeda(parseInt(digits, 10) / 100)
}

function lerMoeda(value: string): number {
  const normalized = value.replace(/R\$/g, '').trim().replace(/\./g, '').replace(',', '.')
  const parsed = parseFloat(normalized)
  return Number.isNaN(parsed) ? 0 : parsed
}

function chaveUso(uso: ComplementoUsoNoMenu): string {
  return `${uso.menuProdutoId}:${uso.grupoComplementos.id}`
}

export function ComplementoOndeUsadoTab({ complementoId }: ComplementoOndeUsadoTabProps) {
  const [usos, setUsos] = useState<ComplementoUsoNoMenu[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [busca, setBusca] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})

  const carregar = useCallback(async () => {
    setIsLoading(true)
    setErro(null)
    try {
      const completo = await buscarComplementoCompleto(complementoId)
      setUsos(completo.vinculos)
      setValores(
        Object.fromEntries(
          completo.vinculos.map(uso => [chaveUso(uso), formatarMoeda(uso.complementoConfig.valor)])
        )
      )
    } catch (error) {
      setErro(handleApiError(error))
    } finally {
      setIsLoading(false)
    }
  }, [complementoId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return usos
    return usos.filter(uso => {
      const texto = [uso.menu.nome, uso.produto.nome, uso.grupoComplementos.nome, uso.grupoProduto.nome]
        .join(' ')
        .toLowerCase()
      return texto.includes(termo)
    })
  }, [busca, usos])

  const gravarValor = useCallback(
    async (uso: ComplementoUsoNoMenu) => {
      const chave = chaveUso(uso)
      const novoValor = lerMoeda(valores[chave] ?? '')
      if (novoValor === uso.complementoConfig.valor) return
      setSalvando(prev => ({ ...prev, [chave]: true }))
      try {
        await gravarOverridesComplemento({
          vinculos: [
            {
              menuId: uso.menu.id,
              produtoId: uso.produto.id,
              complementoId,
              grupoComplementoId: uso.grupoComplementos.id,
              valor: novoValor,
            },
          ],
        })
        setUsos(prev =>
          prev.map(item =>
            chaveUso(item) === chave
              ? {
                  ...item,
                  complementoConfig: { ...item.complementoConfig, valor: novoValor },
                }
              : item
          )
        )
        showToast.success('Valor deste cardápio atualizado.')
      } catch (error) {
        showToast.error(handleApiError(error))
        setValores(prev => ({
          ...prev,
          [chave]: formatarMoeda(uso.complementoConfig.valor),
        }))
      } finally {
        setSalvando(prev => ({ ...prev, [chave]: false }))
      }
    },
    [complementoId, valores]
  )

  const gravarAtivo = useCallback(
    async (uso: ComplementoUsoNoMenu, ativo: boolean) => {
      if (uso.complementoConfig.ativo === ativo) return
      const chave = chaveUso(uso)
      setSalvando(prev => ({ ...prev, [chave]: true }))
      try {
        await gravarOverridesComplemento({
          vinculos: [
            {
              menuId: uso.menu.id,
              produtoId: uso.produto.id,
              complementoId,
              grupoComplementoId: uso.grupoComplementos.id,
              ativo,
            },
          ],
        })
        setUsos(prev =>
          prev.map(item =>
            chaveUso(item) === chave
              ? { ...item, complementoConfig: { ...item.complementoConfig, ativo } }
              : item
          )
        )
        showToast.success(ativo ? 'Complemento ativado neste cardápio.' : 'Complemento desativado neste cardápio.')
      } catch (error) {
        showToast.error(handleApiError(error))
      } finally {
        setSalvando(prev => ({ ...prev, [chave]: false }))
      }
    },
    [complementoId]
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-info p-3 md:p-5">
      <p className="mb-3 text-sm text-secondary-text">
        Valor e ativo valem só neste produto deste cardápio.
      </p>
      <div className="relative mb-3">
        <input
          type="text"
          value={busca}
          onChange={event => setBusca(event.target.value)}
          placeholder="Buscar cardápio, produto ou grupo..."
          className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text">
          <MdSearch size={16} />
        </span>
      </div>
      {erro ? <p className="mb-3 text-sm text-red-600">{erro}</p> : null}
      {usos.length === 0 ? (
        <p className="py-10 text-center text-sm text-secondary-text">
          Este complemento ainda não aparece em nenhum cardápio.
        </p>
      ) : filtrados.length === 0 ? (
        <p className="py-10 text-center text-sm text-secondary-text">Nenhum uso encontrado para a busca.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-100 bg-white">
          {filtrados.map(uso => {
            const chave = chaveUso(uso)
            return (
              <div
                key={chave}
                className="grid items-center gap-3 border-b border-gray-100 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary-text">
                    {uso.menu.nome}
                    <span className="font-normal text-secondary-text"> · {uso.produto.nome}</span>
                  </p>
                  <p className="truncate text-xs text-secondary-text">
                    {uso.grupoComplementos.nome}
                    {uso.grupoProduto.nome ? ` · ${uso.grupoProduto.nome}` : ''}
                  </p>
                </div>
                <input
                  type="text"
                  value={valores[chave] ?? formatarMoeda(uso.complementoConfig.valor)}
                  onChange={event =>
                    setValores(prev => ({ ...prev, [chave]: formatarDigitacao(event.target.value) }))
                  }
                  onFocus={event => event.target.select()}
                  onBlur={() => void gravarValor(uso)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                  disabled={salvando[chave]}
                  aria-label={`Valor em ${uso.menu.nome}`}
                  className="w-full rounded border border-gray-200 px-2 py-1 text-center text-xs text-primary-text focus:border-primary focus:outline-none disabled:opacity-50"
                />
                <JiffyIconSwitch
                  size="xs"
                  checked={uso.complementoConfig.ativo}
                  disabled={salvando[chave]}
                  onChange={event => void gravarAtivo(uso, event.target.checked)}
                  inputProps={{
                    'aria-label': uso.complementoConfig.ativo
                      ? `Desativar em ${uso.produto.nome}`
                      : `Ativar em ${uso.produto.nome}`,
                  }}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
