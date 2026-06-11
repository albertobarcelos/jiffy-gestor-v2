'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  Cake,
  IdCard,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react'
import { Input } from '@/src/presentation/components/ui/input'
import type { PerfilDadosExibicao } from '../types/perfilTypes'

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
  localizacao: string
}

type CampoFormConfig = {
  key: keyof PerfilDadosForm
  label: string
  icon: LucideIcon
  type?: string
  autoComplete?: string
}

function dadosToForm(dados: PerfilDadosExibicao): PerfilDadosForm {
  return {
    nomeCompleto: dados.nomeCompleto?.trim() ?? '',
    apelido: dados.apelido?.trim() ?? '',
    email: dados.email?.trim() ?? '',
    dataNascimento: dados.dataNascimento?.trim() ?? '',
    telefone: dados.telefone?.trim() ?? '',
    departamento: dados.departamento?.trim() ?? '',
    localizacao: dados.localizacao?.trim() ?? '',
  }
}

function PerfilCampoInputRow({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  disabled,
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  icon: LucideIcon
  value: string
  onChange: (value: string) => void
  disabled: boolean
  type?: string
  autoComplete?: string
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
          type={type}
          size="small"
          fullWidth
          className="bg-info"
          InputLabelProps={INPUT_LABEL_PROPS}
          sx={inputCompactSx}
          autoComplete={autoComplete}
        />
      </div>
    </div>
  )
}

const CAMPOS_CONTATO: CampoFormConfig[] = [
  { key: 'nomeCompleto', label: 'Nome completo', icon: IdCard, autoComplete: 'name' },
  { key: 'apelido', label: 'Apelido', icon: UserRound, autoComplete: 'nickname' },
  { key: 'email', label: 'E-mail', icon: Mail, type: 'email', autoComplete: 'email' },
  { key: 'dataNascimento', label: 'Data de Nascimento', icon: Cake, type: 'date' },
  { key: 'telefone', label: 'Telefone', icon: Phone, type: 'tel', autoComplete: 'tel' },
  { key: 'departamento', label: 'Departamento', icon: Building2 },
  { key: 'localizacao', label: 'Cidade/UF', icon: MapPin, autoComplete: 'address-level1' },
]

export function PerfilDadosPessoaisTab({ dados }: { dados: PerfilDadosExibicao }) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<PerfilDadosForm>(() => dadosToForm(dados))

  useEffect(() => {
    if (!isEditing) {
      setForm(dadosToForm(dados))
    }
  }, [dados, isEditing])

  const updateField = useCallback((key: keyof PerfilDadosForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleToggleEdit = () => {
    if (isEditing) {
      setIsEditing(false)
      return
    }
    setIsEditing(true)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Informações de contato</h3>
            <p className="mt-0.5 text-sm text-secondary-text">
              Dados utilizados para identificação dentro da plataforma.
            </p>
          </div>
          <button type="button" onClick={handleToggleEdit} className={submitButtonClassName}>
            {isEditing ? 'Salvar' : 'Editar'}
          </button>
        </header>

        <div className="flex flex-col gap-4 px-6 py-4">
          {CAMPOS_CONTATO.map(campo => (
            <PerfilCampoInputRow
              key={campo.key}
              id={`perfil-${campo.key}`}
              label={campo.label}
              icon={campo.icon}
              value={form[campo.key]}
              onChange={value => updateField(campo.key, value)}
              disabled={!isEditing}
              type={campo.type}
              autoComplete={campo.autoComplete}
            />
          ))}
        </div>
    </div>
  )
}
