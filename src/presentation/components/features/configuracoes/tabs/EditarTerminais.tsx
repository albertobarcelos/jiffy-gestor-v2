'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { showToast } from '@/src/shared/utils/toast'
import { MdClose, MdPhone, MdPrint } from 'react-icons/md'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Box,
} from '@mui/material'

interface EditarTerminaisProps {
  terminalId: string
  isEmbedded?: boolean
  onSaved?: () => void
  onCancel?: () => void
}

interface Impressora {
  id: string
  nome: string
}

interface TerminalData {
  id: string
  nome: string
  modeloDispositivo: string
  versaoApk: string
  bloqueado: boolean
}

interface TerminalPreferences {
  terminalId: string
  empresaId: string
  impressoraFinalizacao?: {
    id: string
    name: string
  }
  compartilharMesas: boolean
}

/**
 * Componente para editar terminal
 * Replica o design e funcionalidades do Flutter
 */
export function EditarTerminais({
  terminalId,
  isEmbedded = false,
  onSaved,
  onCancel,
}: EditarTerminaisProps) {
  const { auth } = useAuthStore()

  // Estados do formulário
  const [nomeTerminal, setNomeTerminal] = useState('')
  const [modeloDispositivo, setModeloDispositivo] = useState('')
  const [versaoApk, setVersaoApk] = useState('')
  const [compartilhaValue, setCompartilhaValue] = useState(false)
  const [impressoraSelecionadaId, setImpressoraSelecionadaId] = useState<string>('')

  // Estados de UI
  const [loadingImpressoras, setLoadingImpressoras] = useState(true)
  const [impressoras, setImpressoras] = useState<Impressora[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingTerminal, setIsLoadingTerminal] = useState(false)

  /**
   * Carrega todas as impressoras com paginação completa
   */
  const loadAllImpressoras = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      return
    }

    setLoadingImpressoras(true)

    try {
      const allImpressoras: Impressora[] = []
      let currentOffset = 0
      let hasMore = true
      const limit = 50

      // Loop para carregar todas as páginas
      while (hasMore) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
        })

        const response = await fetch(`/api/impressoras?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao buscar impressoras')
        }

        const data = await response.json()
        const newImpressoras = (data.items || []).map((i: any) => ({
          id: i.id,
          nome: i.nome || 'Sem nome',
        }))

        allImpressoras.push(...newImpressoras)

        // Verifica se há mais páginas
        hasMore = newImpressoras.length === limit
        currentOffset += newImpressoras.length
      }

      setImpressoras(allImpressoras)
    } catch (error) {
      console.error('Erro ao carregar impressoras:', error)
      showToast.error('Erro ao carregar impressoras')
    } finally {
      setLoadingImpressoras(false)
    }
  }, [auth])

  /**
   * Carrega detalhes do terminal
   */
  const loadTerminalDetails = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token || !terminalId) {
      return
    }

    setIsLoadingTerminal(true)

    try {
      const response = await fetch(`/api/terminais/${terminalId}/detalhes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao buscar terminal')
      }

      const data: TerminalData = await response.json()

      // Preenche campos do formulário
      setNomeTerminal(data.nome || '')
      setModeloDispositivo(data.modeloDispositivo || '')
      setVersaoApk(data.versaoApk || '')
    } catch (error) {
      console.error('Erro ao carregar terminal:', error)
      showToast.error('Erro ao carregar dados do terminal')
    } finally {
      setIsLoadingTerminal(false)
    }
  }, [auth, terminalId])

  /**
   * Carrega preferências do terminal
   */
  const loadTerminalPreferences = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token || !terminalId) {
      return
    }

    try {
      const response = await fetch(`/api/preferencias-terminal/${terminalId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao buscar preferências')
      }

      const data: TerminalPreferences = await response.json()

      // Preenche preferências
      setCompartilhaValue(data.compartilharMesas || false)
      if (data.impressoraFinalizacao?.id) {
        setImpressoraSelecionadaId(data.impressoraFinalizacao.id)
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error)
      showToast.error('Erro ao carregar preferências do terminal')
    }
  }, [auth, terminalId])

  // Carrega dados quando o componente monta
  useEffect(() => {
    loadAllImpressoras()
    loadTerminalDetails()
    loadTerminalPreferences()
  }, [loadAllImpressoras, loadTerminalDetails, loadTerminalPreferences])

  /**
   * Valida o formulário
   */
  const validateForm = (): boolean => {
    if (!nomeTerminal.trim()) {
      showToast.error('Nome do terminal é obrigatório')
      return false
    }
    return true
  }

  /**
   * Submete o formulário
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado. Faça login novamente.')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Atualizar terminal primeiro
      const terminalResponse = await fetch(`/api/terminais/${terminalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: nomeTerminal,
          modeloDispositivo,
          versaoApk,
          bloqueado: false, // Sempre false pois não temos switch de status aqui
        }),
      })

      if (!terminalResponse.ok) {
        const errorData = await terminalResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao atualizar terminal')
      }

      // 2. Atualizar preferências
      const fields: any = {}
      if (impressoraSelecionadaId) {
        fields.impressoraFinalizacaoId = impressoraSelecionadaId
      }
      fields.compartilharMesas = compartilhaValue

      const preferencesResponse = await fetch(`/api/preferencias-terminal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          terminaisId: terminalId,
          fields,
        }),
      })

      if (!preferencesResponse.ok) {
        const errorData = await preferencesResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao atualizar preferências')
      }

      showToast.success('Terminal atualizado com sucesso!')
      onSaved?.()
    } catch (error: any) {
      console.error('Erro ao atualizar terminal:', error)
      showToast.error(error.message || 'Erro ao atualizar terminal')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(95vh-80px)] bg-info">
      {/* Cabeçalho */}
      {!isEmbedded && (
        <div className="px-[30px] pt-[30px] pb-4 flex items-start justify-between border-b border-[#B9CCD8]">
          <div>
            <h2 className="text-primary text-2xl font-bold font-exo">Editar Terminal</h2>
            <p className="text-[#57636C] text-sm font-nunito mt-1">
              Atualize os dados do Terminal PDV
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center text-secondary-text hover:bg-gray-200 rounded-full transition-colors"
            title="Fechar"
          >
            <MdClose size={20} />
          </button>
        </div>
      )}

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto px-[30px] pt-2 pb-0">
          {isLoadingTerminal ? (
            <div className="flex justify-center items-center">
              <CircularProgress />
            </div>
          ) : (
            <>
              {/* Seção 1: Informações Gerais */}
              <div className="mb-4">
                <h3 className="text-primary text-base font-bold font-nunito mb-4">
                  Informações Gerais
                </h3>

                {/* Header Visual com ícone */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-custom-2 flex items-center justify-center">
                    <MdPhone className="text-primary" size={20} />
                  </div>
                  <span className="text-base font-semibold font-nunito text-primary-text">
                    {nomeTerminal || 'Nome do Terminal'}
                  </span>
                </div>

                {/* Campo Nome do Terminal */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-primary-text mb-2 font-nunito">
                    Nome do Terminal
                  </label>
                  <Input
                    value={nomeTerminal}
                    onChange={(e) => setNomeTerminal(e.target.value)}
                    placeholder="Digite o nome do Terminal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#F5F5F5',
                        borderRadius: '8px',
                        '& fieldset': {
                          borderColor: '#CCCCCC',
                        },
                      },
                    }}
                  />
                </div>

                {/* Campos lado a lado: Modelo e Versão APK */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-primary-text mb-2 font-nunito">
                      Modelo do Dispositivo
                    </label>
                    <Input
                      value={modeloDispositivo}
                      disabled
                      placeholder="Digite o modelo do dispositivo"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#F5F5F5',
                          borderRadius: '8px',
                          '& fieldset': {
                            borderColor: '#CCCCCC',
                          },
                        },
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-primary-text mb-2 font-nunito">
                      Versão APK
                    </label>
                    <Input
                      value={versaoApk}
                      disabled
                      placeholder="Digite a versão do APK"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#F5F5F5',
                          borderRadius: '8px',
                          '& fieldset': {
                            borderColor: '#CCCCCC',
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Divisor */}
              <div className="h-[1px] bg-[#B9CCD8] mb-2" />

              {/* Seção 2: Preferências do Terminal */}
              <div className="mb-0">
                <h3 className="text-secondary-text text-sm font-bold font-nunito mb-4">
                  Preferências do Terminal
                </h3>

                <div className="flex gap-6">
                  {/* Switch de Compartilhamento (Lado Esquerdo) */}
                  <div className="flex-1">
                    <Box
                      sx={{
                        backgroundColor: 'rgba(238, 238, 245, 1)',
                        borderRadius: '8px',
                        p: 2,
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={compartilhaValue}
                            onChange={(e) => setCompartilhaValue(e.target.checked)}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#F5F5F5',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#003366', // Cor primary direta (sem variável CSS)
                                opacity: 1, // Garante opacidade total
                              },
                            }}
                          />
                        }
                        label={
                          <div>
                            <div className="text-sm font-semibold font-exo text-primary-text">
                              Compartilhamento
                            </div>
                            <div className="text-xs font-nunito text-secondary-text">
                              Habilita o compartilhamento de mesas
                            </div>
                          </div>
                        }
                        sx={{ margin: 0 }}
                      />
                    </Box>

                    {/* Mensagem de Aviso Condicional */}
                    {compartilhaValue && (
                      <Box
                        sx={{
                          backgroundColor: '#FFF9C4',
                          border: '1px solid #FFD54F',
                          borderRadius: '8px',
                          p: 1.5,
                          mt: 2,
                        }}
                      >
                        <p className="text-sm font-medium font-nunito text-warning">
                          Ao marcar o compartilhamento, este terminal só funcionará com internet.
                        </p>
                      </Box>
                    )}
                  </div>

                  {/* Dropdown de Impressora (Lado Direito) */}
                  <div className="flex-1">
                    <FormControl fullWidth>
                      <InputLabel id="impressora-label">Impressora de Finalização</InputLabel>
                      {loadingImpressoras ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : (
                        <Select
                          labelId="impressora-label"
                          value={impressoraSelecionadaId}
                          onChange={(e) => setImpressoraSelecionadaId(e.target.value)}
                          label="Impressora de Finalização"
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                maxHeight: '250px',
                              },
                            },
                          }}
                          sx={{
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#CCCCCC',
                            },
                          }}
                        >
                          <MenuItem value="">
                            <em>Nenhuma</em>
                          </MenuItem>
                          {impressoras.map((impressora) => (
                            <MenuItem key={impressora.id} value={impressora.id}>
                              <div className="flex items-center gap-2">
                                <MdPrint className="text-primary" size={18} />
                                <span>{impressora.nome}</span>
                              </div>
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    </FormControl>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

      {/* Rodapé com botões */}
      <div className="px-[30px] py-3 border-t border-[#B9CCD8] flex justify-end gap-3 flex-shrink-0">
        <Button
          onClick={onCancel}
          variant="outlined"
          disabled={isSubmitting}
          className="h-8 px-[26px] rounded-lg hover:bg-primary/15"
          sx={{
            textTransform: 'none',
            fontFamily: 'Nunito, sans-serif',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || isLoadingTerminal}
          className="h-8 px-[26px] rounded-lg hover:bg-primary/90"
          sx={{
            textTransform: 'none',
            fontFamily: 'Nunito, sans-serif',
            color: 'var(--color-info)',
            borderColor: 'var(--color-primary)',
            backgroundColor: 'var(--color-primary)',
          }}
        >
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}

