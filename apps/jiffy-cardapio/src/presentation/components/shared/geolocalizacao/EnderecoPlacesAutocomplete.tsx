'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { useLocaleUppercaseInputHandler } from '@/src/presentation/hooks/useLocaleUppercaseInputHandler'
import {
  buscarPlaceDetails,
  buscarPlacesAutocomplete,
  criarSessionTokenPlaces,
  type PlaceDetailsResult,
  type PlacesAutocompletePrediction,
  type PlacesBias,
} from '@/src/shared/utils/geolocalizacaoPlaces'
import { cn } from '@/src/shared/utils/cn'
import { maiusculasEnderecoInput } from '@/src/shared/utils/normalizarTextoEnderecoPublico'

export type EnderecoPlacesAutocompleteVariant = 'delivery' | 'gestor'

type EnderecoPlacesAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  onSelect: (place: PlaceDetailsResult) => void
  /** Chamado ao limpar a busca com o X (para resetar campos do formulário). */
  onClear?: () => void
  bias?: PlacesBias | null
  variant?: EnderecoPlacesAutocompleteVariant
  disabled?: boolean
  placeholder?: string
  label?: string
  className?: string
  inputClassName?: string
  inputStyle?: React.CSSProperties
  /** Exibe label flutuante (checkout delivery). */
  floatingLabel?: boolean
}

const DEBOUNCE_MS = 300
const MIN_CHARS = 3

export function EnderecoPlacesAutocomplete({
  value,
  onChange,
  onSelect,
  onClear,
  bias = null,
  variant = 'delivery',
  disabled = false,
  placeholder = 'Digite o endereço…',
  label = 'Buscar endereço',
  className,
  inputClassName,
  inputStyle,
  floatingLabel = true,
}: EnderecoPlacesAutocompleteProps) {
  const listId = useId()
  const sessionTokenRef = useRef(criarSessionTokenPlaces())
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const [predictions, setPredictions] = useState<PlacesAutocompletePrediction[]>([])
  const [aberto, setAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [highlight, setHighlight] = useState(-1)
  const skipNextSearchRef = useRef(false)

  const fecharLista = useCallback(() => {
    setAberto(false)
    setHighlight(-1)
  }, [])

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        fecharLista()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [fecharLista])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const dispararBusca = useCallback(
    (termo: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()

      const trimmed = termo.trim()
      if (trimmed.length < MIN_CHARS) {
        setPredictions([])
        setLoading(false)
        setErro(null)
        return
      }

      debounceRef.current = setTimeout(() => {
        const controller = new AbortController()
        abortRef.current = controller
        setLoading(true)
        setErro(null)

        void buscarPlacesAutocomplete({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          bias,
          signal: controller.signal,
        })
          .then(lista => {
            if (controller.signal.aborted) return
            setPredictions(lista)
            setAberto(true)
            setHighlight(lista.length > 0 ? 0 : -1)
            if (lista.length === 0) {
              setErro('Não encontramos sugestões. Continue digitando ou use Buscar endereço no mapa.')
            }
          })
          .catch(error => {
            if (controller.signal.aborted) return
            if (error instanceof DOMException && error.name === 'AbortError') return
            setPredictions([])
            setErro(error instanceof Error ? error.message : 'Erro ao buscar sugestões')
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false)
          })
      }, DEBOUNCE_MS)
    },
    [bias]
  )

  const delivery = variant === 'delivery'
  const busy = loading || loadingDetails
  const podeLimpar = value.trim().length > 0 && !disabled && !loadingDetails

  const propagarValorInput = useCallback(
    (next: string) => {
      onChange(next)
      if (skipNextSearchRef.current) {
        skipNextSearchRef.current = false
        return
      }
      dispararBusca(next)
    },
    [onChange, dispararBusca]
  )

  const { inputRef: uppercaseInputRef, handleChange: handleUppercaseChange } =
    useLocaleUppercaseInputHandler(value, propagarValorInput)

  const limparBusca = () => {
    if (disabled || loadingDetails) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    skipNextSearchRef.current = true
    sessionTokenRef.current = criarSessionTokenPlaces()
    onChange('')
    setPredictions([])
    setErro(null)
    setLoading(false)
    fecharLista()
    onClear?.()
  }

  const selecionarPrediction = async (prediction: PlacesAutocompletePrediction) => {
    setLoadingDetails(true)
    setErro(null)
    try {
      const details = await buscarPlaceDetails({
        placeId: prediction.placeId,
        sessionToken: sessionTokenRef.current,
      })
      sessionTokenRef.current = criarSessionTokenPlaces()
      skipNextSearchRef.current = true
      const textoBruto =
        [details.rua, details.numero].filter(Boolean).join(', ') ||
        details.enderecoFormatado ||
        prediction.descricao
      const texto = delivery ? maiusculasEnderecoInput(textoBruto) : textoBruto
      onChange(texto)
      onSelect(details)
      setPredictions([])
      fecharLista()
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao obter detalhes do endereço')
    } finally {
      setLoadingDetails(false)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!aberto || predictions.length === 0) {
      if (event.key === 'Escape') fecharLista()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight(prev => (prev + 1) % predictions.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight(prev => (prev <= 0 ? predictions.length - 1 : prev - 1))
      return
    }
    if (event.key === 'Enter' && highlight >= 0 && predictions[highlight]) {
      event.preventDefault()
      void selecionarPrediction(predictions[highlight])
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      fecharLista()
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <label className={cn('relative block', floatingLabel ? '' : 'space-y-1')}>
        {floatingLabel ? (
          <span
            className={cn(
              'absolute -top-2 left-3 z-10 px-1 text-xs',
              delivery ? 'bg-[var(--delivery-surface,#fff)] delivery-text-secondary' : 'bg-white text-secondary-text'
            )}
          >
            {label}
          </span>
        ) : (
          <span className="text-sm font-medium text-primary-text">{label}</span>
        )}
        <div className="relative">
          <Search
            className={cn(
              'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2',
              delivery ? 'delivery-text-secondary' : 'text-secondary-text'
            )}
            aria-hidden
          />
          <input
            type="text"
            role="combobox"
            ref={delivery ? uppercaseInputRef : undefined}
            aria-expanded={aberto}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              highlight >= 0 && predictions[highlight]
                ? `${listId}-opt-${highlight}`
                : undefined
            }
            disabled={disabled || loadingDetails}
            placeholder={placeholder}
            value={value}
            onChange={
              delivery ? handleUppercaseChange : event => propagarValorInput(event.target.value)
            }
            onFocus={() => {
              if (predictions.length > 0) setAberto(true)
            }}
            onKeyDown={onKeyDown}
            className={cn(
              delivery
                ? 'w-full rounded-xl border bg-transparent py-3 pl-10 text-base outline-none delivery-text-primary'
                : 'w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary',
              busy || podeLimpar ? 'pr-10' : 'pr-3',
              inputClassName
            )}
            style={
              delivery
                ? { borderColor: 'var(--delivery-border)', ...inputStyle }
                : inputStyle
            }
            autoComplete="off"
          />
          {busy ? (
            <span
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-xs',
                delivery ? 'delivery-text-secondary' : 'text-secondary-text'
              )}
            >
              {loadingDetails ? 'Aplicando…' : 'Buscando…'}
            </span>
          ) : podeLimpar ? (
            <button
              type="button"
              onClick={limparBusca}
              className={cn(
                'absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors',
                delivery
                  ? 'delivery-text-secondary hover:bg-[var(--delivery-surface-muted,#f3f4f6)]'
                  : 'text-secondary-text hover:bg-gray-100'
              )}
              aria-label="Limpar busca de endereço"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </label>

      {aberto && predictions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            'absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border shadow-lg',
            delivery ? 'bg-[var(--delivery-surface,#fff)]' : 'border-gray-200 bg-white'
          )}
          style={delivery ? { borderColor: 'var(--delivery-border)' } : undefined}
        >
          {predictions.map((item, index) => {
            const ativo = index === highlight
            return (
              <li key={item.placeId} role="option" aria-selected={ativo} id={`${listId}-opt-${index}`}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm',
                    ativo
                      ? delivery
                        ? 'bg-[var(--delivery-surface-muted,#f3f4f6)]'
                        : 'bg-gray-100'
                      : 'hover:bg-black/5'
                  )}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => void selecionarPrediction(item)}
                >
                  <MapPin
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      delivery ? 'delivery-text-secondary' : 'text-secondary-text'
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block font-medium',
                        delivery ? 'delivery-text-primary' : 'text-primary-text'
                      )}
                    >
                      {item.descricaoPrincipal || item.descricao}
                    </span>
                    {item.descricaoSecundaria ? (
                      <span
                        className={cn(
                          'mt-0.5 block text-xs',
                          delivery ? 'delivery-text-secondary' : 'text-secondary-text'
                        )}
                      >
                        {item.descricaoSecundaria}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {erro && !busy ? (
        <p
          className={cn(
            'mt-1.5 text-xs',
            delivery ? 'delivery-text-secondary' : 'text-secondary-text'
          )}
        >
          {erro}
        </p>
      ) : null}
    </div>
  )
}
