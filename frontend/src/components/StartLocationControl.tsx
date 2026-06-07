import { useState } from 'react'
import { AlertTriangle, Loader2, LocateFixed } from 'lucide-react'

import type { GeoStatus, StartLocation } from '../App'
import type { AddressSuggestion } from '../lib/api'
import { cardClass } from '../lib/ui'
import { AddressAutocomplete } from './AddressAutocomplete'

type Props = {
  start: StartLocation | null
  status: GeoStatus
  focus?: { lat: number; lng: number } | null
  onUseCurrentLocation: () => void
  onManualSelect: (suggestion: AddressSuggestion) => void
}

function statusMessage(status: GeoStatus): { text: string; tone: 'info' | 'warn' } | null {
  switch (status) {
    case 'locating':
      return { text: 'Locating you…', tone: 'info' }
    case 'denied':
      return {
        text: 'Location permission denied. Enter a start address below instead.',
        tone: 'warn',
      }
    case 'unavailable':
      return {
        text: 'Current location unavailable. Enter a start address below instead.',
        tone: 'warn',
      }
    default:
      return null
  }
}

export function StartLocationControl({
  start,
  status,
  focus,
  onUseCurrentLocation,
  onManualSelect,
}: Props) {
  const [manualText, setManualText] = useState('')
  const message = statusMessage(status)
  const locating = status === 'locating'

  const activeLabel = start
    ? start.source === 'geolocation'
      ? `Current location (${start.lat.toFixed(5)}, ${start.lng.toFixed(5)})`
      : (start.label ?? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}`)
    : null

  const handleSelect = (suggestion: AddressSuggestion) => {
    onManualSelect(suggestion)
    setManualText(suggestion.label)
  }

  return (
    <section className={cardClass}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Start location</h2>
        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-brand transition-colors hover:bg-brand-subtle disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LocateFixed className="size-4" aria-hidden="true" />
          )}
          Use my location
        </button>
      </div>

      {activeLabel ? (
        <p className="mb-3 flex items-center gap-2 text-sm text-muted">
          <span className="size-2.5 shrink-0 rounded-full bg-status-free" aria-hidden="true" />
          Active start: <span className="font-medium text-foreground">{activeLabel}</span>
        </p>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">No start location set yet.</p>
      )}

      {message ? (
        message.tone === 'warn' ? (
          <p className="mb-3 flex items-start gap-2 rounded-xl border border-status-reduced bg-status-reduced-subtle px-3 py-2 text-sm text-status-reduced">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{message.text}</span>
          </p>
        ) : (
          <p className="mb-3 text-sm text-muted">{message.text}</p>
        )
      ) : null}

      <AddressAutocomplete
        value={manualText}
        placeholder="Or enter a start address (e.g. Hauptbahnhof München)"
        focus={focus}
        onTextChange={setManualText}
        onSelect={handleSelect}
      />
    </section>
  )
}
