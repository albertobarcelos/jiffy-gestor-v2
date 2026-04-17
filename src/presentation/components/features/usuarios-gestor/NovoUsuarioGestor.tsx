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
import { UsuarioGestor } from '@/src/domain/entities/UsuarioGestor'
import { PerfilGestor as PerfilGestorEntity } from '@/src/domain/entities/PerfilGestor'
import { MenuItem } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { Input } from '@/src/presentation/components/ui/input'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MdPerson, MdVisibility, MdVisibilityOff } from 'react-icons/md'

interface NovoUsuarioGestorProps {
  usuarioId?: string
  initialPerfilGestorId?: string
  isEmbedded?: boolean
  hideEmbeddedHeader?: boolean
  embeddedFormId?: string
  hideEmbeddedFormActions?: boolean
  onEmbedFormStateChange?: (s: {
    isSubmitting: boolean
    canSubmit: boolean
  }) => void
  onSaved?: () => void
  /** Só após "Salvar e fechar" no rodapé (`saveUsuarioAndClose`), depois de `onSaved`. */
  onCloseAfterSave?: () => void
  onCancel?: () => void
}

/** API imperativa — confirmação ao fechar o painel (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
export interface NovoUsuarioGestorHandle {
  isDirty: () => boolean
  saveUsuarioAndClose: () => void
}

interface PerfilGestor {
  id: string
  role: string
}

const MODULOS_ACESSO = ['Fiscal', 'Financeiro', 'Estoque', 'Dashboard'] as const

/**
 * Componente para criar/editar usuário gestor
 * Replica o design e funcionalidades do Flutter
 */
export const NovoUsuarioGestor = forwardRef<NovoUsuarioGestorHandle, NovoUsuarioGestorProps>(
  function NovoUsuarioGestor(
    {
      usuarioId,
      initialPerfilGestorId,
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
  const formId = embeddedFormId ?? 'novo-usuario-gestor-form'
  const INPUT_LABEL_PROPS = { shrink: true } as const
  const inputCompactSx = {
    '& .MuiOutlinedInput-input': {
      padding: '10px 12px',
    },
  } as const

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [perfilGestorId, setPerfilGestorId] = useState(initialPerfilGestorId || '')
  const [ativo, setAtivo] = useState(true)
  const [modulosAcesso, setModulosAcesso] = useState<string[]>([])
  const [perfilGestorCompleto, setPerfilGestorCompleto] = useState<PerfilGestorEntity | null>(null)

  // Estados de loading e dados
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsuario, setIsLoadingUsuario] = useState(false)
  const hasLoadedUsuarioRef = useRef(false)

  // Estados para perfis gestor
  const [perfisGestor, setPerfisGestor] = useState<PerfilGestor[]>([])
  const [isLoadingPerfis, setIsLoadingPerfis] = useState(false)

  const emailValido = useMemo(() => {
    const t = username.trim()
    if (!t) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
  }, [username])

  const canSubmitEmbed = useMemo(
    () =>
      Boolean(
        nome?.trim() &&
          emailValido &&
          perfilGestorId &&
          (isEditing || Boolean(password?.trim()))
      ),
    [nome, emailValido, perfilGestorId, isEditing, password]
  )

  const getFormSnapshot = useCallback(() => {
    const modulosKey = [...modulosAcesso].sort().join(',')
    return JSON.stringify({
      nome: (nome || '').trim(),
      username: (username || '').trim(),
      perfilGestorId: perfilGestorId || '',
      ativo,
      password: password || '',
      modulosKey,
    })
  }, [nome, username, perfilGestorId, ativo, password, modulosAcesso])

  const baselineSerializedRef = useRef('')
  const embeddedCloseAfterSaveRef = useRef(false)

  const commitBaseline = useCallback(() => {
    baselineSerializedRef.current = getFormSnapshot()
  }, [getFormSnapshot])

  const commitBaselineLatestRef = useRef(commitBaseline)
  commitBaselineLatestRef.current = commitBaseline

  useEffect(() => {
    if (isLoadingUsuario) return
    if (isEditing) return
    const t = window.setTimeout(() => {
      commitBaselineLatestRef.current()
    }, 100)
    return () => window.clearTimeout(t)
  }, [isLoadingUsuario, isEditing, usuarioId])

  useEffect(() => {
    onEmbedFormStateChange?.({
      isSubmitting: isLoading,
      canSubmit: canSubmitEmbed,
    })
  }, [onEmbedFormStateChange, isLoading, canSubmitEmbed])

  // Carregar todos os perfis gestor fazendo requisições sequenciais
  const loadPerfisGestor = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      return
    }

    setIsLoadingPerfis(true)
    try {
      const allPerfis: PerfilGestor[] = []
      let currentOffset = 0
      let hasMore = true
      let maxIterations = 100 // Proteção contra loop infinito
      let iterations = 0

      while (hasMore && iterations < maxIterations) {
        iterations++
        const params = new URLSearchParams({
          limit: '10',
          offset: currentOffset.toString(),
        })

        const response = await fetch(`/api/pessoas/perfis-gestor?${params.toString()}`, {
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

        // A API pode retornar { items: [...] } ou diretamente um array
        const items = Array.isArray(data) ? data : (data.items || [])
        
        if (items.length === 0) {
          hasMore = false
          break
        }

        const newPerfis = items
          .map((item: any) => ({
            id: item.id?.toString() || '',
            role: item.role?.toString() || '',
          }))
          .filter((perfil: PerfilGestor) => perfil.id && perfil.role)

        allPerfis.push(...newPerfis)
        
        // Usa hasNext da API se disponível, senão verifica se retornou 10 itens
        hasMore = data.hasNext !== undefined ? data.hasNext : newPerfis.length === 10
        currentOffset += newPerfis.length
      }

      setPerfisGestor(allPerfis)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar perfis gestor'
      showToast.error(errorMessage)
      setPerfisGestor([])
    } finally {
      setIsLoadingPerfis(false)
    }
  }, [auth])

  // Carregar perfis gestor quando o componente montar
  useEffect(() => {
    loadPerfisGestor()
  }, [loadPerfisGestor])

  useEffect(() => {
    hasLoadedUsuarioRef.current = false
  }, [usuarioId])

  // Carregar dados completos do perfil gestor quando selecionado
  const loadPerfilGestorCompleto = useCallback(async (perfilId: string) => {
    const token = auth?.getAccessToken()
    if (!token || !perfilId) {
      setPerfilGestorCompleto(null)
      return
    }

    try {
      const response = await fetch(`/api/pessoas/perfis-gestor/${perfilId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const perfil = PerfilGestorEntity.fromJSON(data)
        setPerfilGestorCompleto(perfil)
      } else {
        setPerfilGestorCompleto(null)
      }
    } catch (error) {
      setPerfilGestorCompleto(null)
    }
  }, [auth])

  // Carregar perfil completo quando perfilGestorId mudar
  useEffect(() => {
    if (perfilGestorId) {
      loadPerfilGestorCompleto(perfilGestorId)
    } else {
      setPerfilGestorCompleto(null)
    }
  }, [perfilGestorId, loadPerfilGestorCompleto])

  // Definir perfil inicial quando não estiver em modo de edição
  useEffect(() => {
    if (!isEditing && initialPerfilGestorId && perfisGestor.length > 0 && !perfilGestorId) {
      const perfilExiste = perfisGestor.some((p: any) => p.id === initialPerfilGestorId)
      if (perfilExiste) {
        setPerfilGestorId(initialPerfilGestorId)
      }
    }
  }, [isEditing, initialPerfilGestorId, perfisGestor, perfilGestorId])

  // Carregar dados do usuário se estiver editando
  useEffect(() => {
    if (!isEditing || hasLoadedUsuarioRef.current) return

    const loadUsuario = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoadingUsuario(true)
      hasLoadedUsuarioRef.current = true

      try {
        const response = await fetch(`/api/pessoas/usuarios-gestor/${usuarioId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const usuario = UsuarioGestor.fromJSON(data)

          setNome(usuario.getNome())
          setUsername(usuario.getUsername())
          setAtivo(usuario.isAtivo())
          
          const perfilId = usuario.getPerfilGestorId() || ''
          if (perfilId) {
            setPerfilGestorId(perfilId)
            // O perfil completo será carregado pelo useEffect quando perfilGestorId mudar
          }
          
          // Não precisamos mais de modulosAcesso, pois vem do perfil gestor
          // setModulosAcesso(usuario.getModulosAcesso() || [])
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar usuário gestor'
        showToast.error(errorMessage)
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

    if (!nome || !username) {
      showToast.error('Nome e e-mail são obrigatórios')
      return
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(username)) {
      showToast.error('Por favor, insira um e-mail válido')
      return
    }

    if (!isEditing && !password) {
      showToast.error('Senha é obrigatória para novos usuários')
      return
    }

    if (!perfilGestorId) {
      showToast.error('Perfil gestor é obrigatório')
      return
    }

    setIsLoading(true)

    try {
      const body: any = {
        nome,
        username,
        ativo,
        perfilGestorId,
      }

      // Módulos de acesso só são enviados na criação
      // Na edição, os módulos vêm do perfil gestor associado
      if (!isEditing) {
        body.modulosAcesso = modulosAcesso.length > 0 ? modulosAcesso : []
        body.password = password
      } else if (password) {
        // Em modo de edição, só envia senha se foi alterada
        body.password = password
      }

      const url = isEditing
        ? `/api/pessoas/usuarios-gestor/${usuarioId}`
        : '/api/pessoas/usuarios-gestor'
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
        throw new Error(errorData.error || 'Erro ao salvar usuário gestor')
      }

      showToast.success(
        isEditing ? 'Usuário gestor atualizado com sucesso!' : 'Usuário gestor criado com sucesso!'
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
        router.push('/cadastros/usuarios-gestor')
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar usuário gestor')
    } finally {
      setIsLoading(false)
      onEmbedFormStateChange?.({ isSubmitting: false, canSubmit: canSubmitEmbed })
    }
  }

  const handleCancel = () => {
    if (isEmbedded) {
      onCancel?.()
    } else {
      router.push('/cadastros/usuarios-gestor')
    }
  }

  // Função removida - módulos de acesso agora vêm do perfil gestor

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
      <div className="flex flex-col items-center justify-center h-full">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!isEmbedded || !hideEmbeddedHeader ? (
        <div className="sticky top-0 z-10 bg-white shadow-sm md:px-[30px] px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary md:h-12 md:w-12">
                <span className="text-xl md:text-2xl">
                  <MdPerson />
                </span>
              </div>
              <h1 className="font-exo text-sm font-semibold text-primary md:text-lg">
                {isEditing ? 'Editar Usuário Gestor' : 'Novo Usuário Gestor'}
              </h1>
            </div>
            <Button
              type="button"
              onClick={handleCancel}
              variant="outlined"
              className="h-8 rounded-lg px-8 transition-colors hover:bg-primary/15"
              sx={{
                backgroundColor: 'var(--color-info)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide md:px-6">
        <form
          id={formId}
          onSubmit={handleSubmit}
          className="space-y-4"
          autoComplete="off"
        >
          <div className="bg-white">
            <div className="flex items-center gap-5">
              <h2 className="shrink-0 text-sm font-semibold text-primary md:text-xl">
                Dados do Usuário
              </h2>
              <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
            </div>

            <div className="flex items-center justify-end py-2">
              <div
                className="tooltip-hover-below tooltip-hover-below-align-end flex items-center justify-center"
                data-tooltip={
                  ativo
                    ? 'Usuário gestor ativo'
                    : 'Usuário gestor inativo'
                }
              >
                <JiffyIconSwitch
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  disabled={isLoading}
                  label={ativo ? 'Ativo' : 'Inativo'}
                  bordered={false}
                  size="sm"
                  className="shrink-0 px-0 py-0"
                  inputProps={{
                    'aria-label': ativo
                      ? 'Desativar usuário gestor'
                      : 'Ativar usuário gestor',
                  }}
                />
              </div>
            </div>

            <div className="space-y-5">
              <Input
                label="Nome"
                value={nome.toUpperCase()}
                onChange={(e) => setNome(e.target.value.toUpperCase())}
                required
                size="small"
                placeholder="Digite o nome do usuário"
                className="bg-white"
                autoComplete="off"
                InputLabelProps={INPUT_LABEL_PROPS}
                sx={inputCompactSx}
                inputProps={{
                  'aria-label': 'Nome do usuário gestor',
                  autoComplete: 'off',
                }}
              />

              <Input
                label="E-mail"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                size="small"
                placeholder="Digite o e-mail"
                className="bg-white"
                autoComplete="email"
                InputLabelProps={INPUT_LABEL_PROPS}
                sx={inputCompactSx}
                inputProps={{
                  'aria-label': 'E-mail do usuário gestor',
                  autoComplete: 'email',
                }}
              />

              {isLoadingPerfis ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-primary-text">
                  <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Carregando perfis gestor...
                </div>
              ) : perfisGestor.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-secondary-text">
                  Nenhum perfil gestor disponível
                </div>
              ) : (
                <Input
                  select
                  label="Perfil Gestor"
                  required
                  value={perfilGestorId}
                  onChange={(e) => setPerfilGestorId(e.target.value)}
                  size="small"
                  className="bg-white"
                  InputLabelProps={INPUT_LABEL_PROPS}
                  sx={inputCompactSx}
                  SelectProps={{
                    displayEmpty: true,
                    MenuProps: {
                      PaperProps: {
                        sx: { maxHeight: 280 },
                      },
                    },
                    renderValue: (selected: unknown) => {
                      if (selected === '' || selected == null) {
                        return (
                          <span className="font-nunito text-sm font-normal text-secondary-text">
                            Selecione um perfil gestor...
                          </span>
                        )
                      }
                      const id = String(selected)
                      const p = perfisGestor.find((x) => x.id === id)
                      return (
                        <span className="font-nunito uppercase">
                          {p ? p.role : id}
                        </span>
                      )
                    },
                  }}
                  inputProps={{
                    'aria-label': 'Perfil gestor do usuário',
                  }}
                >
                  <MenuItem value="">
                    <em>Selecione um perfil gestor...</em>
                  </MenuItem>
                  {perfisGestor.map((perfil) => (
                    <MenuItem
                      key={perfil.id}
                      value={perfil.id}
                      sx={{ textTransform: 'uppercase' }}
                    >
                      {perfil.role}
                    </MenuItem>
                  ))}
                </Input>
              )}

              {!isEditing && (
                <Input
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  size="small"
                  placeholder="Digite a senha"
                  className="bg-white"
                  autoComplete="new-password"
                  InputLabelProps={INPUT_LABEL_PROPS}
                  sx={inputCompactSx}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="small"
                          type="button"
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
                    'aria-label': 'Senha do usuário gestor',
                    autoComplete: 'new-password',
                  }}
                />
              )}

              {isEditing && (
                <Input
                  label="Nova senha (opcional)"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  size="small"
                  placeholder="Deixe em branco para manter a atual"
                  className="bg-white"
                  autoComplete="new-password"
                  InputLabelProps={INPUT_LABEL_PROPS}
                  sx={inputCompactSx}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="small"
                          type="button"
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
                    'aria-label': 'Nova senha do usuário gestor',
                    autoComplete: 'new-password',
                  }}
                />
              )}
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center gap-5">
                <h2 className="shrink-0 text-sm font-semibold text-primary md:text-base">
                  Módulos de Acesso
                </h2>
                <div className="h-px min-w-0 flex-1 bg-primary/70" aria-hidden />
              </div>
              <p className="mb-3 text-xs text-secondary-text">
                Definidos pelo Perfil Gestor selecionado.
              </p>
              {!perfilGestorId ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white px-3 text-center text-sm text-secondary-text">
                  Selecione um perfil gestor para visualizar os módulos
                </div>
              ) : !perfilGestorCompleto ? (
                <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-6">
                  <JiffyLoading className="!gap-0 !py-0" size={24} />
                </div>
              ) : (
                <div className="space-y-0">
                  {MODULOS_ACESSO.map((modulo) => {
                    let isActive = false
                    switch (modulo) {
                      case 'Financeiro':
                        isActive = perfilGestorCompleto.hasAcessoFinanceiro()
                        break
                      case 'Estoque':
                        isActive = perfilGestorCompleto.hasAcessoEstoque()
                        break
                      case 'Fiscal':
                        isActive = perfilGestorCompleto.hasAcessoFiscal()
                        break
                      case 'Dashboard':
                        isActive = perfilGestorCompleto.hasAcessoDashboard()
                        break
                    }

                    return (
                      <div
                        key={modulo}
                        className="flex items-center justify-between py-1 last:border-b-0"
                      >
                        <span className="text-sm font-medium text-primary-text md:text-sm">
                          {modulo}
                        </span>
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            isActive
                              ? 'bg-accent1 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              {perfilGestorCompleto ? (
                <p className="mt-2 text-xs text-secondary-text">
                  Para alterar permissões, edite o Perfil Gestor.
                </p>
              ) : null}
            </div>
          </div>

          {!isEmbedded ? (
            <div className="flex justify-end gap-4 pt-2">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outlined"
                className="h-8 rounded-lg px-8 transition-colors hover:bg-primary/15"
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
                  !nome ||
                  !username ||
                  !perfilGestorId ||
                  (!isEditing && !password?.trim())
                }
                className="h-8 rounded-lg text-white hover:bg-primary/90"
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

NovoUsuarioGestor.displayName = 'NovoUsuarioGestor'
