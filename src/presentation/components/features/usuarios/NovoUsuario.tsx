'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Usuario } from '@/src/domain/entities/Usuario'
import { MenuItem } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { showToast } from '@/src/shared/utils/toast'
import { MdPerson, MdVisibility, MdVisibilityOff } from 'react-icons/md'

/** Tamanho de página ao buscar perfis PDV (a API usa paginação; o loop usa `count` para buscar todos) */
const PERFIS_PDV_PAGE_SIZE = 100

interface NovoUsuarioProps {
  usuarioId?: string
  initialPerfilPdvId?: string
  isEmbedded?: boolean
  /** No modal lateral: oculta o header interno (título já está no painel) */
  hideEmbeddedHeader?: boolean
  /** ID do `<form>` para submit pelo rodapé externo (ex.: JiffySidePanelModal) */
  embeddedFormId?: string
  hideEmbeddedFormActions?: boolean
  onEmbedFormStateChange?: (s: { isSubmitting: boolean; canSubmit: boolean }) => void
  /** Chamado após salvar com sucesso no embed (ex.: invalidar lista). */
  onSaved?: () => void
  /** Só após "Salvar e fechar" no rodapé (`saveUsuarioAndClose`), depois de `onSaved`. */
  onCloseAfterSave?: () => void
  onCancel?: () => void
}

/** API imperativa — confirmação ao fechar o painel (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
export interface NovoUsuarioHandle {
  isDirty: () => boolean
  /** Submete o formulário (mesmo fluxo do botão Salvar no embed). */
  saveUsuarioAndClose: () => void
}

interface PerfilPDV {
  id: string
  role: string
}

/**
 * Componente para criar/editar usuário
 * Replica o design e funcionalidades do Flutter
 */
export const NovoUsuario = forwardRef<NovoUsuarioHandle, NovoUsuarioProps>(function NovoUsuario(
  {
    usuarioId,
    initialPerfilPdvId,
    isEmbedded,
  hideEmbeddedHeader = false,
  embeddedFormId,
  onEmbedFormStateChange,
    onSaved,
    onCloseAfterSave,
    onCancel,
  },
  ref
) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const isEditing = !!usuarioId
  const formId = embeddedFormId ?? 'novo-usuario-form'
  const INPUT_LABEL_PROPS = { shrink: true } as const
  /** Padding interno menor e label alinhada ao topo (padrão cadastros) */
  const inputCompactSx = {
    '& .MuiOutlinedInput-input': {
      padding: '10px',
    },
  } as const

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false) // Controla visibilidade da senha
  const [perfilPdvId, setPerfilPdvId] = useState(initialPerfilPdvId || '')
  const [ativo, setAtivo] = useState(true)

  // Estados de loading e dados
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsuario, setIsLoadingUsuario] = useState(false)
  const hasLoadedUsuarioRef = useRef(false)

  // Estados para perfis PDV (sempre busca dados atualizados)
  const [perfisPDV, setPerfisPDV] = useState<PerfilPDV[]>([])
  const [isLoadingPerfis, setIsLoadingPerfis] = useState(false)

  const canSubmitEmbed = useMemo(
    () =>
      Boolean(
        nome?.trim() &&
          perfilPdvId &&
          (isEditing ? true : Boolean(password && password.length === 4))
      ),
    [nome, perfilPdvId, isEditing, password]
  )

  const getFormSnapshot = useCallback(() => {
    return JSON.stringify({
      nome: (nome || '').trim(),
      telefone: (telefone || '').trim(),
      perfilPdvId: perfilPdvId || '',
      ativo,
      password: password || '',
    })
  }, [nome, telefone, perfilPdvId, ativo, password])

  const baselineSerializedRef = useRef('')

  const commitBaseline = useCallback(() => {
    baselineSerializedRef.current = getFormSnapshot()
  }, [getFormSnapshot])

  const commitBaselineLatestRef = useRef(commitBaseline)
  commitBaselineLatestRef.current = commitBaseline

  /** Definido por `saveUsuarioAndClose` antes do submit — controla se o painel fecha após sucesso. */
  const embeddedCloseAfterSaveRef = useRef(false)

  // Baseline inicial em modo criação
  useEffect(() => {
    if (isLoadingUsuario) return
    if (isEditing) return
    const t = window.setTimeout(() => {
      commitBaselineLatestRef.current()
    }, 100)
    return () => window.clearTimeout(t)
  }, [isLoadingUsuario, isEditing, usuarioId])

  // Carrega todos os perfis PDV: usa `count` da API para saber quando parar
  const loadPerfisPDV = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingPerfis(true)
    try {
      const allPerfis: PerfilPDV[] = []
      let offset = 0
      let totalNoServidor: number | null = null

      for (;;) {
        const params = new URLSearchParams({
          limit: String(PERFIS_PDV_PAGE_SIZE),
          offset: String(offset),
        })

        const response = await fetch(`/api/perfis-pdv?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        const data = await response.json()
        const items = Array.isArray(data) ? data : data.items || []
        if (typeof data.count === 'number') {
          totalNoServidor = data.count
        }

        const newPerfis = items
          .map((item: any) => ({
            id: item.id?.toString() || '',
            role: (item.role?.toString() || '').trim(),
          }))
          .filter((perfil: PerfilPDV) => perfil.id && perfil.role)

        allPerfis.push(...newPerfis)
        offset += newPerfis.length

        const carregouTudo =
          totalNoServidor !== null
            ? allPerfis.length >= totalNoServidor
            : newPerfis.length < PERFIS_PDV_PAGE_SIZE

        if (carregouTudo || newPerfis.length === 0) {
          break
        }
      }

      setPerfisPDV(allPerfis)
    } catch (error) {
      console.error('Erro ao carregar perfis PDV:', error)
      setPerfisPDV([])
    } finally {
      setIsLoadingPerfis(false)
    }
  }, [auth])

  // Carregar perfis PDV quando o componente montar
  useEffect(() => {
    loadPerfisPDV()
  }, [loadPerfisPDV])

  // Definir perfil inicial quando não estiver em modo de edição
  useEffect(() => {
    if (!isEditing && initialPerfilPdvId && perfisPDV.length > 0 && !perfilPdvId) {
      // Verifica se o perfil inicial existe na lista de perfis
      const perfilExiste = perfisPDV.some((p: any) => p.id === initialPerfilPdvId)
      if (perfilExiste) {
        setPerfilPdvId(initialPerfilPdvId)
      }
    }
  }, [isEditing, initialPerfilPdvId, perfisPDV, perfilPdvId])

  // Garantir que o perfil seja definido quando os perfis e o perfilPdvId estiverem disponíveis
  useEffect(() => {
    if (isEditing && perfisPDV.length > 0 && !perfilPdvId && hasLoadedUsuarioRef.current) {
      // Se o perfil ainda não foi carregado, tenta carregar novamente
      // Isso pode acontecer se os perfis carregarem antes do usuário
      const loadPerfilAgain = async () => {
        const token = auth?.getAccessToken()
        if (!token) return

        try {
          const response = await fetch(`/api/usuarios/${usuarioId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const data = await response.json()
            const perfilId = data.perfilPdvId || ''
            if (perfilId) {
              console.log('Definindo perfil após carregar perfis:', perfilId)
              setPerfilPdvId(perfilId)
            }
          }
        } catch (error) {
          console.error('Erro ao recarregar perfil:', error)
        }
      }

      loadPerfilAgain()
    }
  }, [isEditing, perfisPDV, perfilPdvId, usuarioId, auth])

  useEffect(() => {
    onEmbedFormStateChange?.({ isSubmitting: isLoading, canSubmit: canSubmitEmbed })
  }, [onEmbedFormStateChange, isLoading, canSubmitEmbed])

  // Carregar dados do usuário se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedUsuarioRef.current) return

    const loadUsuario = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingUsuario(true)
      hasLoadedUsuarioRef.current = true

      try {
        const response = await fetch(`/api/usuarios/${usuarioId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const usuario = Usuario.fromJSON(data)

          setNome((usuario.getNome() || '').toUpperCase())
          setTelefone(usuario.getTelefone() || '')
          
          // Carrega o perfilPdvId diretamente dos dados da API (garantido pela rota)
          // Prioriza data.perfilPdvId que vem dos dados brutos da API externa
          const perfilId = data.perfilPdvId || usuario.getPerfilPdvId() || ''
          console.log('Carregando perfil do usuário:', {
            dataPerfilPdvId: data.perfilPdvId,
            usuarioPerfilPdvId: usuario.getPerfilPdvId(),
            perfilIdFinal: perfilId,
            dataCompleto: data,
            perfisDisponiveis: perfisPDV,
            perfilEncontrado: perfisPDV.find((p: any) => p.id === perfilId),
          })
          
          // Só define o perfil se encontrar um ID válido
          if (perfilId) {
            setPerfilPdvId(perfilId)
            console.log('PerfilPdvId definido:', perfilId)
          } else {
            console.warn('PerfilPdvId não encontrado nos dados do usuário')
          }
          
          setAtivo(usuario.isAtivo())
          
          // Carrega a senha do banco (pode vir como 'password' ou 'senha' na resposta)
          const senha = data.password || data.senha || ''
          setPassword(senha)
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error)
      } finally {
        setIsLoadingUsuario(false)
        window.setTimeout(() => {
          commitBaselineLatestRef.current()
        }, 150)
      }
    }

    loadUsuario()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, usuarioId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const shouldClosePanel = embeddedCloseAfterSaveRef.current
    embeddedCloseAfterSaveRef.current = false

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    if (!isEditing && !password) {
      showToast.error('Senha é obrigatória para novos usuários')
      return
    }

    if (!isEditing && password.length !== 4) {
      showToast.error('A senha deve conter exatamente 4 dígitos')
      return
    }

    // Em modo de edição, valida apenas se uma nova senha foi digitada
    if (isEditing && password && password.length > 0 && password.length !== 4) {
      showToast.error('A senha deve conter exatamente 4 dígitos')
      return
    }

    setIsLoading(true)
    onEmbedFormStateChange?.({ isSubmitting: true, canSubmit: canSubmitEmbed })

    try {
      const body: any = {
        nome,
        telefone,
        ativo,
        perfilPdvId,
      }

      if (!isEditing) {
        body.password = password
      } else {
        // Em modo de edição, sempre envia a senha (mesmo que seja a mesma)
        // Se o usuário não alterou, envia a senha atual
        body.password = password
      }

      const url = isEditing
        ? `/api/usuarios/${usuarioId}`
        : '/api/usuarios'
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
        throw new Error(errorData.error || 'Erro ao salvar usuário')
      }

      showToast.success(
        isEditing ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!'
      )
      window.setTimeout(() => {
        commitBaselineLatestRef.current()
      }, 0)
      if (isEmbedded) {
        onSaved?.()
        if (shouldClosePanel) {
          onCloseAfterSave?.()
        }
      } else {
        router.push('/cadastros/usuarios')
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar usuário')
    } finally {
      setIsLoading(false)
      onEmbedFormStateChange?.({ isSubmitting: false, canSubmit: canSubmitEmbed })
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onCancel?.()
    } else {
      router.push('/cadastros/usuarios')
    }
  }

  // Função para formatar senha: apenas números, máximo 4 dígitos
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Remove tudo que não é número e limita a 4 dígitos
    const numericValue = value.replace(/\D/g, '').slice(0, 4)
    setPassword(numericValue)
  }

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => {
        if (isLoadingUsuario) return false
        return getFormSnapshot() !== baselineSerializedRef.current
      },
      saveUsuarioAndClose: () => {
        embeddedCloseAfterSaveRef.current = true
        const el = document.getElementById(formId)
        if (el instanceof HTMLFormElement) {
          el.requestSubmit()
        }
      },
    }),
    [formId, getFormSnapshot, isLoadingUsuario]
  )

  if (isLoadingUsuario) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      {!isEmbedded || !hideEmbeddedHeader ? (
        <div className="sticky top-0 z-10 bg-primary-bg rounded-tl-[30px] shadow-md px-[30px] py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/25 text-primary flex items-center justify-center">
                <span className="text-2xl">
                  <MdPerson />
                </span>
              </div>
              <h1 className="text-primary text-lg font-semibold font-exo">
                {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
              </h1>
            </div>
          </div>
        </div>
      ) : null}

      {/* Formulário com scroll */}
      <div
        className={
          isEmbedded && hideEmbeddedHeader
            ? 'flex-1 overflow-y-auto px-5 py-4 scrollbar-hide'
            : 'flex-1 overflow-y-auto md:px-[30px] px-1 md:py-[30px] py-2'
        }
      >
        <form id={formId} onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          <div className="bg-white">
            <div className="mb-4 flex items-center gap-5">
              <h2 className="shrink-0 font-exo text-sm font-semibold text-primary md:text-xl">
                Dados do Usuário
              </h2>
              <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
            </div>
            <div className="flex mb-4 w-full items-center justify-end">
                <JiffyIconSwitch
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  disabled={isLoading}
                  label={ativo ? 'Ativo' : 'Inativo'}
                  labelPosition="start"
                  bordered={false}
                  size="sm"
                  className="justify-end"
                  inputProps={{
                    'aria-label': ativo
                      ? 'Desativar usuário (está ativo)'
                      : 'Ativar usuário (está inativo)',
                  }}
                />
              </div>
            <div className="space-y-6">
              <Input
                label="Nome"
                value={nome || ''}
                onChange={(e) => setNome(e.target.value.toUpperCase())}
                required
                size="small"
                placeholder="Digite o nome do usuário"
                className="bg-info"
                autoComplete="off"
                InputLabelProps={INPUT_LABEL_PROPS}
                sx={inputCompactSx}
                inputProps={{
                  'aria-label': 'Nome do usuário',
                  autoComplete: 'off',
                  name: 'usuario-nome',
                }}
              />

              <Input
                label="Telefone"
                value={telefone || ''}
                onChange={(e) => setTelefone(e.target.value)}
                size="small"
                placeholder="(00) 0 0000-0000"
                className="bg-info"
                autoComplete="off"
                InputLabelProps={INPUT_LABEL_PROPS}
                sx={inputCompactSx}
                inputProps={{
                  'aria-label': 'Telefone do usuário',
                  autoComplete: 'off',
                  name: 'usuario-telefone',
                }}
              />

              {isLoadingPerfis ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-info px-3 py-2 text-sm text-primary-text">
                  <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Carregando perfis...
                </div>
              ) : perfisPDV.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-info px-3 py-2 text-sm text-secondary-text">
                  Nenhum perfil PDV disponível
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start">
                  <div className="min-w-0">
                    <Input
                      select
                      label="Perfil PDV"
                      required
                      value={perfilPdvId}
                      onChange={(e) => setPerfilPdvId(e.target.value)}
                      size="small"
                      className="bg-info"
                      InputLabelProps={INPUT_LABEL_PROPS}
                      sx={inputCompactSx}
                      SelectProps={{
                        displayEmpty: true,
                        MenuProps: {
                          PaperProps: {
                            sx: {
                              maxHeight: 280,
                            },
                          },
                        },
                        renderValue: (selected: unknown) => {
                          if (selected === '' || selected == null) {
                            return (
                              <span className="text-sm font-normal text-secondary-text">
                                Selecione um perfil...
                              </span>
                            )
                          }
                          const id = String(selected)
                          const p = perfisPDV.find((x) => x.id === id)
                          return (
                            <span className="font-nunito">
                              {p ? p.role : id}
                            </span>
                          )
                        },
                      }}
                      inputProps={{
                        'aria-label': 'Perfil PDV do usuário',
                        name: 'usuario-perfil-pdv',
                      }}
                    >
                      
                      {perfisPDV.map((perfil) => (
                        <MenuItem
                          key={perfil.id}
                          value={perfil.id}
                        >
                          {perfil.role}
                        </MenuItem>
                      ))}
                    </Input>
                  </div>
                  <div className="min-w-0">
                    {!isEditing ? (
                      <Input
                        label="Senha"
                        type="password"
                        value={password || ''}
                        onChange={handlePasswordChange}
                        required
                        size="small"
                        placeholder="4 dígitos"
                        className="bg-info"
                        autoComplete="new-password"
                        InputLabelProps={INPUT_LABEL_PROPS}
                        sx={inputCompactSx}
                        inputProps={{
                          'aria-label': 'Senha do usuário',
                          autoComplete: 'new-password',
                          name: 'usuario-senha-nova',
                          maxLength: 4,
                          pattern: '[0-9]{4}',
                          inputMode: 'numeric',
                        }}
                      />
                    ) : (
                      <>
                        <Input
                          label="Senha"
                          type={showPassword ? 'text' : 'password'}
                          value={password || ''}
                          onChange={handlePasswordChange}
                          size="small"
                          placeholder="Nova senha (4 dígitos)"
                          className="bg-info"
                          autoComplete="new-password"
                          InputLabelProps={INPUT_LABEL_PROPS}
                          sx={inputCompactSx}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  edge="end"
                                  size="small"
                                  onClick={() => setShowPassword(!showPassword)}
                                  aria-label={
                                    showPassword ? 'Ocultar senha' : 'Mostrar senha'
                                  }
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  {showPassword ? (
                                    <MdVisibilityOff className="h-5 w-5" />
                                  ) : (
                                    <MdVisibility className="h-5 w-5" />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          inputProps={{
                            'aria-label': 'Senha do usuário',
                            autoComplete: 'new-password',
                            name: 'usuario-senha-editar',
                            maxLength: 4,
                            pattern: '[0-9]{4}',
                            inputMode: 'numeric',
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              
            </div>
          </div>

          {/* Em painel lateral o rodapé é externo — nunca duplicar Cancelar/Salvar no corpo do form */}
          {!isEmbedded ? (
            <div className="flex justify-end gap-4 pt-4 px-2">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outlined"
                className="h-8 px-[26px] rounded-lg border-primary/15 text-primary hover:bg-primary/20"
                sx={{
                  backgroundColor: 'var(--color-info)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !nome?.trim() ||
                  !perfilPdvId ||
                  (!isEditing && !password)
                }
                className="h-8 px-[26px] rounded-lg border-primary/15 text-primary hover:bg-primary/90"
                sx={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-info)',
                  borderColor: 'var(--color-primary)',
                }}
              >
                {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  )
})

NovoUsuario.displayName = 'NovoUsuario'
