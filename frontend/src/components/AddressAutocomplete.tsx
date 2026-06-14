import { useEffect, useId, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { fetchAutocomplete, type AddressSuggestion } from '../lib/api'
import { fieldClass } from '../lib/ui'

type Props = {
  value: string
  placeholder?: string
  disabled?: boolean
  focus?: { lat: number; lng: number } | null
  onTextChange: (text: string) => void
  onSelect: (suggestion: AddressSuggestion) => void
  onEnter?: () => void
}

const DEBOUNCE_MS = 250
const MIN_QUERY = 3

export function AddressAutocomplete({
  value,
  placeholder,
  disabled,
  focus,
  onTextChange,
  onSelect,
  onEnter,
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const justSelectedRef = useRef(false)
  const listId = useId()

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }
    const query = value.trim()
    if (query.length < MIN_QUERY) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setSuggestions([])
      setError(null)
      setLoading(false)
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const results = await fetchAutocomplete(query, focus, controller.signal)
        setSuggestions(results)
        setError(results.length === 0 ? 'No matches found.' : null)
        setOpen(true)
        setActiveIndex(-1)
      } catch (err) {
        if (controller.signal.aborted) return
        setSuggestions([])
        setError(err instanceof Error ? err.message : 'Address lookup failed.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [value, focus])

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const select = (suggestion: AddressSuggestion) => {
    justSelectedRef.current = true
    onSelect(suggestion)
    setOpen(false)
    setSuggestions([])
    setActiveIndex(-1)
    setError(null)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((i) => (i + 1) % suggestions.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault()
        select(suggestions[activeIndex])
        return
      }
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
    }
    if (event.key === 'Enter') {
      onEnter?.()
    }
  }

  return (
    <div className="relative flex flex-col" ref={containerRef}>
      <input
        className={`${fieldClass} pr-9`}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          onTextChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      {loading ? (
        <Loader2
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      ) : null}
      {open && (suggestions.length > 0 || error) ? (
        <ul
          className="menu absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-card"
          id={listId}
          role="listbox"
        >
          {suggestions.map((s, index) => (
            <li
              key={`${s.label}-${s.lat}-${s.lng}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground ${
                index === activeIndex ? 'bg-surface-muted' : 'hover:bg-surface-muted'
              }`}
              onMouseDown={(e) => {
                e.preventDefault()
                select(s)
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="block">{s.label}</span>
              {s.secondary ? (
                <span className="block text-xs text-muted-foreground">{s.secondary}</span>
              ) : null}
            </li>
          ))}
          {suggestions.length === 0 && error ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{error}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
