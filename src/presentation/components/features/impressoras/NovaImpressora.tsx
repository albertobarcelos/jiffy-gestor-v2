'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Impressora } from '@/src/domain/entities/Impressora'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'

interface NovaImpressoraProps {
  impressoraId?: string
}

/**
 * Componente para criar/editar impressora
 * Replica o design e funcionalidades do Flutter
 */
export function NovaImpressora({ impressoraId }: NovaImpressoraProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!impressoraId

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [modelo, setModelo] = useState('generico')
  const [tipoConexao, setTipoConexao] = useState('')
  const [ip, setIp] = useState('')
  const [porta, setPorta] = useState('')
  const [ativo, setAtivo] = useState(true)

  // Estados de loading
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingImpressora, setIsLoadingImpressora] = useState(false)
  const hasLoadedImpressoraRef = useRef(false)

  // Opções de modelo
  const modelos = [
    { value: 'generico', label: 'Genérico' },
    { value: 'sunmiIntegrada', label: 'Sunmi Integrada' },
    { value: 'stone', label: 'Stone' },
  ]

  // Opções de tipo de conexão
  const tiposConexao = [
    { value: 'usb', label: 'USB' },
    { value: 'ethernet', label: 'Ethernet' },
    { value: 'wifi', label: 'WiFi' },
    { value: 'bluetooth', label: 'Bluetooth' },
  ]

  // Carregar dados da impressora se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedImpressoraRef.current) return

    const loadImpressora = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingImpressora(true)
      hasLoadedImpressoraRef.current = true

      try {
        const response = await fetch(`/api/impressoras/${impressoraId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const impressora = Impressora.fromJSON(data)

          setNome(impressora.getNome())
          setModelo(impressora.getModelo() || 'generico')
          setTipoConexao(impressora.getTipoConexao() || '')
          setIp(impressora.getIp() || '')
          setPorta(impressora.getPorta() || '')
          setAtivo(impressora.isAtivo())
        }
      } catch (error) {
        console.error('Erro ao carregar impressora:', error)
      } finally {
        setIsLoadingImpressora(false)
      }
    }

    loadImpressora()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, impressoraId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = auth?.getAccessToken()
    if (!token) {
      alert('Token não encontrado')
      return
    }

    setIsLoading(true)

    try {
      const body: any = {
        nome,
        modelo,
        tipoConexao,
        ip,
        porta,
        ativo,
      }

      const url = isEditing
        ? `/api/impressoras/${impressoraId}`
        : '/api/impressoras'
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
        throw new Error(errorData.error || 'Erro ao salvar impressora')
      }

      alert(isEditing ? 'Impressora atualizada com sucesso!' : 'Impressora criada com sucesso!')
      router.push('/cadastros/impressoras')
    } catch (error) {
      console.error('Erro ao salvar impressora:', error)
      alert(error instanceof Error ? error.message : 'Erro ao salvar impressora')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/cadastros/impressoras')
  }

  if (isLoadingImpressora) {
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
              <span className="text-2xl">🖨️</span>
            </div>
            <h1 className="text-primary text-lg font-semibold font-exo">
              {isEditing ? 'Editar Impressora' : 'Nova Impressora'}
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
          {/* Informações */}
          <div className="bg-info rounded-[12px] p-5">
            <h2 className="text-secondary text-xl font-semibold font-exo mb-4">
              Informações
            </h2>
            <div className="h-px bg-alternate mb-4"></div>

            <div className="space-y-4">
              <Input
                label="Nome da Impressora *"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Digite o nome da impressora"
                className="bg-info"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo *
                </label>
                <select
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info text-gray-900 focus:outline-none focus:border-2 focus:border-primary"
                >
                  {modelos.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Conexão
                </label>
                <select
                  value={tipoConexao}
                  onChange={(e) => setTipoConexao(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info text-gray-900 focus:outline-none focus:border-2 focus:border-primary"
                >
                  <option value="">Selecione...</option>
                  {tiposConexao.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IP
                  </label>
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-2 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Porta
                  </label>
                  <input
                    type="text"
                    value={porta}
                    onChange={(e) => setPorta(e.target.value)}
                    placeholder="9100"
                    className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-info text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-2 focus:border-primary"
                  />
                </div>
              </div>

              {/* Toggle Ativo */}
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
              variant="outlined"
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

