'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Complemento } from '@/src/domain/entities/Complemento'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { showToast } from '@/src/shared/utils/toast'
import { MdOutlineOfflinePin } from 'react-icons/md'

interface NovoComplementoProps {
  complementoId?: string
  isEmbedded?: boolean
  onSaved?: () => void
  onCancel?: () => void
}

/**
 * Componente para criar/editar complemento
 * Replica o design e funcionalidades do Flutter
 */
export function NovoComplemento({
  complementoId,
  isEmbedded,
  onSaved,
  onCancel,
}: NovoComplementoProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!complementoId

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipoImpactoPreco, setTipoImpactoPreco] = useState<'nenhum' | 'aumenta' | 'diminui'>('nenhum')
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
          const tipoBanco = (complemento.getTipoImpactoPreco() || 'nenhum').toLowerCase()
          const tipoNormalizado =
            tipoBanco === 'aumenta' || tipoBanco === 'diminui' ? tipoBanco : 'nenhum'
          setTipoImpactoPreco(tipoNormalizado)
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
  const formatValorInput = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      return ''
    }
    const numberValue = parseInt(digits, 10)
    const formatted = (numberValue / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    return formatted
  }

  const parseValorToNumber = (value: string): number => {
    const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
    const parsed = parseFloat(normalized)
    return Number.isNaN(parsed) ? 0 : parsed
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
      const valorNumero = parseValorToNumber(valor)

      const body: any = {
        nome,
        descricao: descricao || undefined,
        valor: valorNumero,
        ativo,
        tipoImpactoPreco,
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

      showToast.success(isEditing ? 'Complemento atualizado com sucesso!' : 'Complemento criado com sucesso!')
      if (isEmbedded) {
        onSaved?.()
      } else {
        router.push('/cadastros/complementos')
      }
    } catch (error) {
      console.error('Erro ao salvar complemento:', error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar complemento')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onCancel?.()
    } else {
      router.push('/cadastros/complementos')
    }
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
              <span className="text-2xl"><MdOutlineOfflinePin /></span>
            </div>
            <h1 className="text-primary text-lg font-semibold font-exo">
              {isEditing ? 'Editar Complemento' : 'Cadastrar Novo Complemento'}
            </h1>
          </div>
          <Button
            onClick={handleCancel}
            variant="outlined"
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
          <div className="bg-info rounded-[10px] p-2">
            <div className="flex items-center gap-5 mb-2">
              <h2 className="text-secondary text-xl font-semibold font-exo">
                Dados
              </h2>
              <div className="flex-1 h-px bg-alternate"></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-end gap-3 rounded-lg px-4 py-1">
                <span className="text-primary-text font-medium">Ativo</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-secondary-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-accent1"></div>
                </label>
              </div>

              <Input
                label="Nome do Complemento"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Nome do complemento"
                className="bg-primary-bg"
                InputLabelProps={{
                  required: true,
                  sx: {
                    '& .MuiFormLabel-asterisk': {
                      color: 'var(--color-error)',
                    },
                  },
                }}
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
                    onChange={(e) => setValor(formatValorInput(e.target.value))}
                    placeholder="R$ 0,00"
                    className="w-full px-4 py-3 rounded-xl border-[1.5px] border-gray-400 bg-primary-bg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-2 focus:border-primary-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo Impacto Preço
                  </label>
                  <select
                    value={tipoImpactoPreco}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase()
                      setTipoImpactoPreco(
                        value === 'aumenta' || value === 'diminui' ? value : 'nenhum'
                      )
                    }}
                    className="w-full px-4 py-3 rounded-xl border-[1.5px] border-gray-400 bg-primary-bg text-gray-900 focus:outline-none focus:border-2 focus:border-primary-text"
                  >
                    <option value="nenhum">Nenhum</option>
                    <option value="aumenta">Aumenta</option>
                    <option value="diminui">Diminui</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end pt-4">
            
            <Button type="submit" disabled={isLoading || !nome} 
            sx={{
              backgroundColor: 'var(--color-primary)',
            }}
            className="text-white hover:bg-primary/80 w-32">
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

