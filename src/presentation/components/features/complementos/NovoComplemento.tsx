'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Complemento } from '@/src/domain/entities/Complemento'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'

interface NovoComplementoProps {
  complementoId?: string
}

/**
 * Componente para criar/editar complemento
 * Replica o design e funcionalidades do Flutter
 */
export function NovoComplemento({ complementoId }: NovoComplementoProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!complementoId

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipoImpactoPreco, setTipoImpactoPreco] = useState('Nenhum')
  const [ativo, setAtivo] = useState(true)

  // Estados de loading
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingComplemento, setIsLoadingComplemento] = useState(false)
  const hasLoadedComplementoRef = useRef(false)

  // Carregar dados do complemento se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedComplementoRef.current) return

    const loadComplemento = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingComplemento(true)
      hasLoadedComplementoRef.current = true

      try {
        const response = await fetch(`/api/complementos/${complementoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const complemento = Complemento.fromJSON(data)

          setNome(complemento.getNome())
          setDescricao(complemento.getDescricao() || '')
          setValor(complemento.getValor().toString())
          setTipoImpactoPreco(complemento.getTipoImpactoPreco() || 'Nenhum')
          setAtivo(complemento.isAtivo())
        }
      } catch (error) {
        console.error('Erro ao carregar complemento:', error)
      } finally {
        setIsLoadingComplemento(false)
      }
    }

    loadComplemento()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, complementoId])

  // Formatação de valor monetário
  const formatValor = (value: string) => {
    // Remove tudo que não é número ou vírgula/ponto
    const numbers = value.replace(/[^\d,.-]/g, '')
    // Substitui vírgula por ponto
    const normalized = numbers.replace(',', '.')
    return normalized
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = auth?.getAccessToken()
    if (!token) {
      alert('Token não encontrado')
      return
    }

    setIsLoading(true)

    try {
      const valorNumero = parseFloat(formatValor(valor)) || 0

      const body: any = {
        nome,
        descricao: descricao || undefined,
        valor: valorNumero,
        ativo,
        tipoImpactoPreco: tipoImpactoPreco !== 'Nenhum' ? tipoImpactoPreco : undefined,
      }

      const url = isEditing
        ? `/api/complementos/${complementoId}`
        : '/api/complementos'
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao salvar complemento')
      }

      alert(isEditing ? 'Complemento atualizado com sucesso!' : 'Complemento criado com sucesso!')
      router.push('/cadastros/complementos')
    } catch (error) {
      console.error('Erro ao salvar complemento:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar complemento')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/cadastros/complementos')
  }

  if (isLoadingComplemento) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-primary-bg rounded-tl-[30px] shadow-md px-[30px] py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/25 text-primary flex items-center justify-center">
              <span className="text-2xl">➕</span>
            </div>
            <h1 className="text-primary text-lg font-semibold font-exo">
              {isEditing ? 'Editar Complemento' : 'Cadastrar Novo Complemento'}
            </h1>
          </div>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="h-9 px-[26px] rounded-[30px] border-primary/15 text-primary bg-primary/10 hover:bg-primary/20"
          >
            Cancelar
          </Button>
        </div>
      </div>

      {/* Formulário com scroll */}
      <div className="flex-1 overflow-y-auto px-[30px] py-[30px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados */}
          <div className="bg-info rounded-[10px] p-5">
            <div className="flex items-center gap-5 mb-6">
              <h2 className="text-secondary text-xl font-semibold font-exo">
                Dados
              </h2>
              <div className="flex-1 h-px bg-alternate"></div>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome *"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Nome do complemento"
                className="bg-primary-bg"
              />

              <Input
                label="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição do complemento"
                className="bg-primary-bg"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    value={valor}
                    onChange={(e) => setValor(formatValor(e.target.value))}
                    placeholder="0,00"
                    className="w-full px-4 py-3 rounded-xl border-[1.5px] border-gray-400 bg-primary-bg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-2 focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo Impacto Preço
                  </label>
                  <select
                    value={tipoImpactoPreco}
                    onChange={(e) => setTipoImpactoPreco(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-[1.5px] border-gray-400 bg-primary-bg text-gray-900 focus:outline-none focus:border-2 focus:border-yellow-500"
                  >
                    <option value="Nenhum">Nenhum</option>
                    <option value="Adicionar">Adicionar</option>
                    <option value="Substituir">Substituir</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
                <span className="text-primary-text font-medium">Ativo</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              className="px-8"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !nome}>
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

