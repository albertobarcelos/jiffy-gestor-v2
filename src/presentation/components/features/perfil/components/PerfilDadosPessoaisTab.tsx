'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  Cake,
  IdCard,
  MapPin,
  Map as MapIcon,
  Phone,
  UserRound,
} from 'lucide-react'
import { Input } from '@/src/presentation/components/ui/input'
import { cn } from '@/src/shared/utils/cn'
import { showToast } from '@/src/shared/utils/toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import type { PerfilDadosExibicao } from '../types/perfilTypes'
import { PERFIL_DADOS_PESSOAIS_EDICAO_HABILITADA } from '../types/perfilTypes'
import { buildPerfilPatchPayload } from '../utils/perfilApiMapper'
import { aplicarMascaraTelefone } from '../utils/telefoneMask'

const INPUT_LABEL_PROPS = { shrink: true } as const

const inputCompactSx = {
  '& .MuiOutlinedInput-input': {
    padding: '10px',
    color: 'var(--color-primary-text, #171A1C)',
  },
  '& .MuiOutlinedInput-input.Mui-disabled': {
    color: 'var(--color-primary-text, #171A1C)',
    WebkitTextFillColor: 'var(--color-primary-text, #171A1C)',
    opacity: 1,
  },
} as const

const submitButtonClassName =
  'shrink-0 rounded-lg bg-[var(--color-secondary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50'

type PerfilDadosForm = {
  nomeCompleto: string
  apelido: string
  email: string
  dataNascimento: string
  telefone: string
  departamento: string
  cidade: string
  estado: string
}

type CampoFormConfig = {
  key: keyof PerfilDadosForm
  label: string
  icon: LucideIcon
  type?: string
  autoComplete?: string
  readOnly?: boolean
  /** Transforma o valor digitado (ex.: máscara, uppercase). */
  transform?: (value: string) => string
  maxLength?: number
}

function dadosToForm(dados: PerfilDadosExibicao): PerfilDadosForm {
  return {
    nomeCompleto: dados.nomeCompleto?.trim() ?? '',
    apelido: dados.apelido?.trim() ?? '',
    email: dados.email?.trim() ?? '',
    dataNascimento: dados.dataNascimento?.trim() ?? '',
    telefone: dados.telefone ? aplicarMascaraTelefone(dados.telefone) : '',
    departamento: dados.departamento?.trim() ?? '',
    cidade: dados.cidade?.trim() ?? '',
    estado: dados.estado?.trim().toUpperCase() ?? '',
  }
}

function PerfilCampoInputRow({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  disabled,
  readOnly,
  type = 'text',
  autoComplete,
  maxLength,
}: {
  id: string
  label: string
  icon: LucideIcon
  value: string
  onChange: (value: string) => void
  disabled: boolean
  readOnly?: boolean
  type?: string
  autoComplete?: string
  maxLength?: number
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-alternate bg-gray-50 text-[var(--color-secondary)]">
        <Icon className="size-[15px]" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <Input
          id={id}
          label={label}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          readOnly={readOnly}
          type={type}
          size="small"
          fullWidth
          className="bg-info"
          InputLabelProps={INPUT_LABEL_PROPS}
          sx={inputCompactSx}
          autoComplete={autoComplete}
          maxLength={maxLength}
        />
      </div>
    </div>
  )
}

const CAMPOS_TOPO: CampoFormConfig[] = [
  { key: 'nomeCompleto', label: 'Nome completo', icon: IdCard, autoComplete: 'name' },
  { key: 'apelido', label: 'Apelido', icon: UserRound, autoComplete: 'nickname' },
  { key: 'dataNascimento', label: 'Data de Nascimento', icon: Cake, type: 'date' },
  {
    key: 'telefone',
    label: 'Telefone',
    icon: Phone,
    type: 'tel',
    autoComplete: 'tel',
    transform: aplicarMascaraTelefone,
    maxLength: 16,
  },
  { key: 'departamento', label: 'Departamento', icon: Building2 },
]

type PerfilDadosPessoaisTabProps = {
  dados: PerfilDadosExibicao
  tokenPerfil: string | null
  onPerfilAtualizado?: (dados: PerfilDadosExibicao) => void
}

export function PerfilDadosPessoaisTab({
  dados,
  tokenPerfil,
  onPerfilAtualizado,
}: PerfilDadosPessoaisTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<PerfilDadosForm>(() => dadosToForm(dados))

  useEffect(() => {
    if (!isEditing) {
      setForm(dadosToForm(dados))
    }
  }, [dados, isEditing])

  const updateField = useCallback(
    (key: keyof PerfilDadosForm, value: string, transform?: (v: string) => string) => {
      setForm(prev => ({ ...prev, [key]: transform ? transform(value) : value }))
    },
    []
  )

  const handleCancelEdit = () => {
    setForm(dadosToForm(dados))
    setIsEditing(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!isEditing) {
      setIsEditing(true)
      return
    }

    if (!tokenPerfil) {
      showToast.error('Sessão expirada ou indisponível. Entre novamente para alterar os dados.')
      return
    }

    const nome = form.nomeCompleto.trim()
    if (!nome) {
      showToast.warning('Indique um nome completo.')
      return
    }

    if (form.estado.trim() && !/^[A-Za-z]{2}$/.test(form.estado.trim())) {
      showToast.warning('Informe a UF com 2 letras (ex.: SP).')
      return
    }

    setSalvando(true)
    try {
      const res = await fetch('/api/auth/usuario/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenPerfil}`,
        },
        body: JSON.stringify(buildPerfilPatchPayload(form)),
      })

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          message?: string
          error?: string
        }
        if (res.status === 404) {
          showToast.error(
            'Conta não encontrada no servidor. Saia e entre novamente para atualizar a sessão.'
          )
          return
        }
        showToast.error(errBody.message || errBody.error || 'Não foi possível salvar os dados.')
        return
      }

      const data = (await res.json()) as {
        nome?: string | null
        username?: string
        apelido?: string | null
        dataNascimento?: string | null
        telefone?: string | null
        departamento?: string | null
        cidade?: string | null
        estado?: string | null
      }

      const nomeGuardado =
        typeof data.nome === 'string' && data.nome.trim().length > 0 ? data.nome.trim() : nome

      const dadosAtualizados: PerfilDadosExibicao = {
        nomeCompleto: nomeGuardado,
        apelido: data.apelido ?? null,
        email: data.username?.trim() || form.email,
        dataNascimento: data.dataNascimento ?? null,
        telefone: data.telefone ?? null,
        departamento: data.departamento ?? null,
        cidade: data.cidade ?? null,
        estado: data.estado ?? null,
      }

      setForm(dadosToForm(dadosAtualizados))
      onPerfilAtualizado?.(dadosAtualizados)

      useAuthStore.getState().updateSessionUserDisplayName(nomeGuardado)

      setIsEditing(false)
      showToast.success('Dados pessoais atualizados com sucesso.')
    } catch {
      showToast.error('Não foi possível salvar os dados pessoais.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
    >
      <header className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">Informações de contato</h3>
          <p className="mt-0.5 text-sm text-secondary-text">
            Dados utilizados para identificação dentro da plataforma.
          </p>
        </div>
        <div
          className={cn(
            'flex shrink-0 gap-2',
            !PERFIL_DADOS_PESSOAIS_EDICAO_HABILITADA && 'hidden'
          )}
        >
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={salvando}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className={submitButtonClassName}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          ) : (
            <button type="submit" className={submitButtonClassName}>
              Editar
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4 px-6 py-4">
        {CAMPOS_TOPO.map(campo => (
          <PerfilCampoInputRow
            key={campo.key}
            id={`perfil-${campo.key}`}
            label={campo.label}
            icon={campo.icon}
            value={form[campo.key]}
            onChange={value => updateField(campo.key, value, campo.transform)}
            disabled={!isEditing || campo.readOnly === true}
            readOnly={campo.readOnly}
            type={campo.type}
            autoComplete={campo.autoComplete}
            maxLength={campo.maxLength}
          />
        ))}

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="min-w-0 flex-1">
            <PerfilCampoInputRow
              id="perfil-cidade"
              label="Cidade"
              icon={MapPin}
              value={form.cidade}
              onChange={value => updateField('cidade', value)}
              disabled={!isEditing}
              autoComplete="address-level2"
              maxLength={100}
            />
          </div>
          <div className="w-full sm:w-32">
            <PerfilCampoInputRow
              id="perfil-estado"
              label="UF"
              icon={MapIcon}
              value={form.estado}
              onChange={value =>
                updateField('estado', value, v =>
                  v.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()
                )
              }
              disabled={!isEditing}
              autoComplete="address-level1"
              maxLength={2}
            />
          </div>
        </div>
      </div>
    </form>
  )
}
