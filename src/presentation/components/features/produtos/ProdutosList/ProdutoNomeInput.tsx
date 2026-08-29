'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocaleUppercaseInputHandler } from '@/src/presentation/hooks/useLocaleUppercaseInputHandler'

export type ProdutoNomeCommitResult = void | boolean | Promise<void | boolean>

interface ProdutoNomeInputProps {
  nome: string
  disabled?: boolean
  /**
   * Retorne `false` (ou Promise de `false`) para indicar cancelamento —
   * o campo volta ao `nome` prop.
   */
  onCommit: (novoNome: string) => ProdutoNomeCommitResult
}

function normalizarNome(value: string): string {
  return value.trim().toLocaleUpperCase('pt-BR')
}

/**
 * Nome clicável na lista: exibe texto truncado; ao clicar, vira input editável.
 * Enter/blur confirma; Escape cancela sem chamar onCommit.
 */
export function ProdutoNomeInput({ nome, disabled = false, onCommit }: ProdutoNomeInputProps) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(nome)
  const committingRef = useRef(false)
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  const { inputRef, handleChange: handleInputChange } = useLocaleUppercaseInputHandler(
    inputValue,
    setInputValue
  )

  useEffect(() => {
    if (committingRef.current || editing) return
    setInputValue(nome)
  }, [nome, editing])

  useEffect(() => {
    if (!editing) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editing])

  const startEdit = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation()
      if (disabled) return
      setInputValue(nome)
      setEditing(true)
    },
    [disabled, nome]
  )

  const cancelEdit = useCallback(() => {
    setInputValue(nome)
    setEditing(false)
  }, [nome])

  const handleCommit = useCallback(async () => {
    if (committingRef.current || disabled) return

    const next = normalizarNome(inputValue)
    if (!next) {
      setInputValue(nome)
      setEditing(false)
      return
    }
    if (next === normalizarNome(nome)) {
      setEditing(false)
      setInputValue(nome)
      return
    }

    committingRef.current = true
    try {
      const result = await onCommitRef.current(next)
      if (result === false) {
        setInputValue(nome)
        setEditing(false)
        return
      }
      setInputValue(next)
      setEditing(false)
    } catch {
      setInputValue(nome)
      setEditing(false)
    } finally {
      committingRef.current = false
    }
  }, [inputValue, nome, disabled])

  if (!editing) {
    const nomeExibicao = nome.length > 30 ? `${nome.slice(0, 30)}…` : nome
    return (
      <button
        type="button"
        title={nome.length > 30 ? nome : 'Clique para editar o nome'}
        aria-label={`Editar nome: ${nome}`}
        disabled={disabled}
        onClick={startEdit}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            startEdit(e)
          }
        }}
        className="min-w-0 truncate rounded px-0.5 text-left text-sm font-normal tracking-wide text-primary-text hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/80 disabled:cursor-not-allowed disabled:opacity-60 md:text-base"
      >
        {nomeExibicao}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      type="text"
      aria-label="Nome do produto"
      value={inputValue}
      disabled={disabled}
      onClick={e => e.stopPropagation()}
      onChange={handleInputChange}
      onBlur={() => {
        void handleCommit()
      }}
      onKeyDown={e => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          cancelEdit()
        }
      }}
      className="min-w-0 w-full rounded-lg border border-primary/50 bg-info px-2 py-1 text-sm font-normal tracking-wide text-primary-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 md:text-base"
    />
  )
}
