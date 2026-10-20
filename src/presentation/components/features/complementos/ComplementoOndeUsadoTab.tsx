'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MdSearch } from 'react-icons/md'
import type { ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'
import type { VinculoComplementoOverride } from '@/src/domain/repositories/IComplementoOverrideRepository'
import { criarPropagarAlteracaoComplementoUseCase } from '@/src/presentation/hooks/complementos/criarPropagarAlteracaoComplementoUseCase'
import { usePropagarAlteracaoComplemento } from '@/src/presentation/hooks/complementos/usePropagarAlteracaoComplemento'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { handleApiError, showToast } from '@/src/shared/utils/toast'

interface ComplementoOndeUsadoTabProps {
  complementoId: string
}

type UsoAgrupadoPorProduto = {
  menuProdutoId: string
  menu: ComplementoUsoNoMenu['menu']
  produto: ComplementoUsoNoMenu['produto']
  grupoProduto: ComplementoUsoNoMenu['grupoProduto']
  usos: ComplementoUsoNoMenu[]
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

function aplicarVinculosLocais(
  lista: ComplementoUsoNoMenu[],
  vinculos: VinculoComplementoOverride[]
): ComplementoUsoNoMenu[] {
  return lista.map(item => {
    const vinculo = vinculos.find(
      candidato =>
        candidato.menuId === item.menu.id &&
        candidato.produtoId === item.produto.id &&
        candidato.grupoComplementoId === item.grupoComplementos.id
    )
    if (!vinculo) return item
    return {
      ...item,
      complementoConfig: {
        ...item.complementoConfig,
        ...(vinculo.valor !== undefined ? { valor: vinculo.valor } : {}),
        ...(vinculo.ativo !== undefined ? { ativo: vinculo.ativo } : {}),
      },
    }
  })
}

function agruparUsosPorProduto(usos: ComplementoUsoNoMenu[]): UsoAgrupadoPorProduto[] {
  const mapa = new Map<string, UsoAgrupadoPorProduto>()

  for (const uso of usos) {
    const existente = mapa.get(uso.menuProdutoId)
    if (existente) {
      existente.usos.push(uso)
      continue
    }
    mapa.set(uso.menuProdutoId, {
      menuProdutoId: uso.menuProdutoId,
      menu: uso.menu,
      produto: uso.produto,
      grupoProduto: uso.grupoProduto,
      usos: [uso],
    })
  }

  return Array.from(mapa.values())
    .map(grupo => ({
      ...grupo,
      usos: [...grupo.usos].sort((a, b) =>
        a.grupoComplementos.nome.localeCompare(b.grupoComplementos.nome, 'pt-BR')
      ),
    }))
    .sort((a, b) => {
      const porProduto = a.produto.nome.localeCompare(b.produto.nome, 'pt-BR')
      if (porProduto !== 0) return porProduto
      return a.menu.nome.localeCompare(b.menu.nome, 'pt-BR')
    })
}

export function ComplementoOndeUsadoTab({ complementoId }: ComplementoOndeUsadoTabProps) {
  const [usos, setUsos] = useState<ComplementoUsoNoMenu[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [busca, setBusca] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})
  const {
    pedirConfirmacao: pedirPropagacao,
    aplicarVinculos: aplicarPropagacao,
    dialog: dialogPropagacao,
  } = usePropagarAlteracaoComplemento()

  const carregar = useCallback(async () => {
    setIsLoading(true)
    setErro(null)
    try {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.')
      }
      const completo = await criarPropagarAlteracaoComplementoUseCase().buscarCompleto({
        complementoId,
        token,
      })
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

  const agrupados = useMemo(() => agruparUsosPorProduto(filtrados), [filtrados])

  const gravarValor = useCallback(
    async (uso: ComplementoUsoNoMenu) => {
      const chave = chaveUso(uso)
      const novoValor = lerMoeda(valores[chave] ?? '')
      if (novoValor === uso.complementoConfig.valor) return
      setSalvando(prev => ({ ...prev, [chave]: true }))
      try {
        const decisao = await pedirPropagacao({
          complementoId,
          origem: {
            menuId: uso.menu.id,
            produtoId: uso.produto.id,
            grupoComplementoId: uso.grupoComplementos.id,
          },
          alteracao: { valor: novoValor },
        })
        if (decisao.tipo === 'cancelado') {
          setValores(prev => ({ ...prev, [chave]: formatarMoeda(uso.complementoConfig.valor) }))
          return
        }
        const vinculoOrigem = {
          menuId: uso.menu.id,
          produtoId: uso.produto.id,
          complementoId,
          grupoComplementoId: uso.grupoComplementos.id,
          valor: novoValor,
        }
        const destinos = decisao.tipo === 'aplicar' ? decisao.vinculos : []
        await aplicarPropagacao([vinculoOrigem, ...destinos])
        if (destinos.length > 0) {
          setUsos(prev => aplicarVinculosLocais(prev, destinos))
          setValores(prev => {
            const next = { ...prev }
            for (const item of usos) {
              const copiado = destinos.find(
                vinculo =>
                  vinculo.menuId === item.menu.id &&
                  vinculo.produtoId === item.produto.id &&
                  vinculo.grupoComplementoId === item.grupoComplementos.id &&
                  vinculo.valor !== undefined
              )
              if (copiado?.valor !== undefined) next[chaveUso(item)] = formatarMoeda(copiado.valor)
            }
            return next
          })
          showToast.success('Alteração aplicada nos cardápios marcados.')
        }
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
    [aplicarPropagacao, complementoId, pedirPropagacao, usos, valores]
  )

  const gravarAtivo = useCallback(
    async (uso: ComplementoUsoNoMenu, ativo: boolean) => {
      if (uso.complementoConfig.ativo === ativo) return
      const chave = chaveUso(uso)
      setSalvando(prev => ({ ...prev, [chave]: true }))
      try {
        const decisao = await pedirPropagacao({
          complementoId,
          origem: {
            menuId: uso.menu.id,
            produtoId: uso.produto.id,
            grupoComplementoId: uso.grupoComplementos.id,
          },
          alteracao: { ativo },
        })
        if (decisao.tipo === 'cancelado') return
        const vinculoOrigem = {
          menuId: uso.menu.id,
          produtoId: uso.produto.id,
          complementoId,
          grupoComplementoId: uso.grupoComplementos.id,
          ativo,
        }
        const destinos = decisao.tipo === 'aplicar' ? decisao.vinculos : []
        await aplicarPropagacao([vinculoOrigem, ...destinos])
        if (destinos.length > 0) {
          setUsos(prev => aplicarVinculosLocais(prev, destinos))
          showToast.success('Alteração aplicada nos cardápios marcados.')
        }
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
    [aplicarPropagacao, complementoId, pedirPropagacao]
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
      <p className="mb-2 text-sm text-secondary-text">
        Valor e ativo valem por grupo neste produto deste cardápio.
      </p>
      <div className="relative mb-2">
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
      {erro ? <p className="mb-2 text-sm text-red-600">{erro}</p> : null}
      {usos.length === 0 ? (
        <p className="py-10 text-center text-sm text-secondary-text">
          Este complemento ainda não aparece em nenhum cardápio.
        </p>
      ) : agrupados.length === 0 ? (
        <p className="py-10 text-center text-sm text-secondary-text">Nenhum uso encontrado para a busca.</p>
      ) : (
        <div className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 bg-white">
          {agrupados.map(grupo => (
            <div key={grupo.menuProdutoId} className="px-3 py-1.5">
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-primary-text">{grupo.produto.nome}</p>
                <p className="truncate text-xs text-secondary-text">
                  {grupo.menu.nome}
                  {grupo.grupoProduto.nome ? ` · ${grupo.grupoProduto.nome}` : ''}
                </p>
              </div>
              <div className="mt-1 space-y-0.5">
                {grupo.usos.map(uso => {
                  const chave = chaveUso(uso)
                  return (
                    <div
                      key={chave}
                      className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_auto]"
                    >
                      <p className="min-w-0 truncate text-sm leading-tight text-primary-text">
                        {uso.grupoComplementos.nome}
                      </p>
                      <input
                        type="text"
                        value={valores[chave] ?? formatarMoeda(uso.complementoConfig.valor)}
                        onChange={event =>
                          setValores(prev => ({
                            ...prev,
                            [chave]: formatarDigitacao(event.target.value),
                          }))
                        }
                        onFocus={event => event.target.select()}
                        onBlur={() => void gravarValor(uso)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') event.currentTarget.blur()
                        }}
                        disabled={salvando[chave]}
                        aria-label={`Valor em ${uso.produto.nome} · ${uso.grupoComplementos.nome}`}
                        className="w-full rounded border border-gray-200 px-2 py-0.5 text-center text-xs text-primary-text focus:border-primary focus:outline-none disabled:opacity-50"
                      />
                      <JiffyIconSwitch
                        size="xs"
                        checked={uso.complementoConfig.ativo}
                        disabled={salvando[chave]}
                        onChange={event => void gravarAtivo(uso, event.target.checked)}
                        inputProps={{
                          'aria-label': uso.complementoConfig.ativo
                            ? `Desativar em ${uso.produto.nome} · ${uso.grupoComplementos.nome}`
                            : `Ativar em ${uso.produto.nome} · ${uso.grupoComplementos.nome}`,
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {dialogPropagacao}
    </div>
  )
}
