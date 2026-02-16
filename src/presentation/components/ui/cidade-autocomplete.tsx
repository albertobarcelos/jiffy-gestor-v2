'use client'

import { useState } from 'react'
import { Input } from './input'
import { Label } from './label'

interface CidadeAutocompleteProps {
  value: string
  onChange: (value: string) => void
  estado: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  onValidationChange?: (isValid: boolean) => void
  className?: string
  // Se true, usa input HTML nativo ao invés de Input do shadcn/ui
  useNativeInput?: boolean
  // Classes customizadas para o input nativo
  inputClassName?: string
}

/**
 * Componente de validação de cidade via API do IBGE.
 * 
 * Funcionalidades:
 * - Valida se a cidade existe no estado selecionado ao perder foco
 * - Feedback visual de validação (verde=válido, vermelho=inválido)
 * - Mensagens de erro claras
 */
export function CidadeAutocomplete({
  value,
  onChange,
  estado,
  label = 'Cidade',
  placeholder = 'Digite o nome da cidade',
  required = false,
  disabled = false,
  onValidationChange,
  className = '',
  useNativeInput = false,
  inputClassName = '',
}: CidadeAutocompleteProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Validar cidade quando o campo perder o foco
  const handleBlur = async () => {
    if (!value || !estado) {
      setIsValid(null)
      onValidationChange?.(false)
      return
    }

    if (value.length < 2) {
      setIsValid(false)
      setErro('Digite pelo menos 2 caracteres')
      onValidationChange?.(false)
      return
    }

    try {
      setIsValidating(true)
      const response = await fetch(
        `/api/v1/ibge/validar-cidade?cidade=${encodeURIComponent(value)}&uf=${estado}`
      )

      if (response.ok) {
        const data = await response.json()
        const valido = data.valido === true

        setIsValid(valido)
        setErro(valido ? null : `Cidade "${value}" não encontrada no estado ${estado}`)
        onValidationChange?.(valido)
      } else {
        setIsValid(false)
        setErro('Erro ao validar cidade')
        onValidationChange?.(false)
      }
    } catch (error) {
      console.error('Erro ao validar cidade:', error)
      setIsValid(false)
      setErro('Erro ao validar cidade')
      onValidationChange?.(false)
    } finally {
      setIsValidating(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    // Limpar validação anterior quando o usuário começar a digitar novamente
    setIsValid(null)
    setErro(null)
  }

  const inputClasses = `
    ${useNativeInput ? 'w-full h-8 px-4 rounded-lg border bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50' : ''}
    ${isValid === false ? 'border-red-500 focus:border-red-500' : ''}
    ${isValid === true ? 'border-green-500 focus:border-green-500' : ''}
    ${inputClassName}
  `.trim()

  return (
    <div className={`space-y-2 ${className}`}>
      {useNativeInput ? (
        <label className="block text-sm font-medium text-primary-text">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      ) : (
        <Label htmlFor="cidade">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        {useNativeInput ? (
          <input
            id="cidade"
            type="text"
            value={value}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled || !estado}
            className={inputClasses}
          />
        ) : (
          <Input
            id="cidade"
            value={value}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled || !estado}
            className={
              isValid === false
                ? 'border-red-500 focus:border-red-500'
                : isValid === true
                ? 'border-green-500 focus:border-green-500'
                : ''
            }
          />
        )}
        {isValidating && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {isValid === true && !isValidating && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
            ✓
          </div>
        )}
        {isValid === false && !isValidating && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
            ✗
          </div>
        )}
      </div>

      {/* Mensagens de erro/validação */}
      {erro && (
        <p className="text-sm text-red-500">{erro}</p>
      )}
      {isValid === true && !erro && (
        <p className="text-sm text-green-500">Cidade válida</p>
      )}
      {!estado && (
        <p className="text-sm text-yellow-500">Selecione o estado primeiro</p>
      )}
    </div>
  )
}
