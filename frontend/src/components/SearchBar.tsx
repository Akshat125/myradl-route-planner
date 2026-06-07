import { CheckCircle2, Loader2, Search } from 'lucide-react'

import type { DestinationSelection } from '../App'
import type { AddressSuggestion, BikeType } from '../lib/api'
import { cardClass, fieldClass, primaryButtonClass } from '../lib/ui'
import { AddressAutocomplete } from './AddressAutocomplete'

type Props = {
  bikeType: BikeType
  destination: DestinationSelection
  loading: boolean
  focus?: { lat: number; lng: number } | null
  onBikeTypeChange: (value: BikeType) => void
  onDestinationText: (value: string) => void
  onDestinationSelect: (suggestion: AddressSuggestion) => void
  onSubmit: () => void
}

export function SearchBar({
  bikeType,
  destination,
  loading,
  focus,
  onBikeTypeChange,
  onDestinationText,
  onDestinationSelect,
  onSubmit,
}: Props) {
  const hasQuery = destination.query.trim().length > 0
  const isRecognized = Boolean(destination.selected)

  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:flex-1">
          <AddressAutocomplete
            value={destination.query}
            placeholder="Destination (e.g. Marienplatz München)"
            focus={focus}
            onTextChange={onDestinationText}
            onSelect={onDestinationSelect}
            onEnter={onSubmit}
          />
        </div>
        <select
          className={`${fieldClass} sm:w-auto`}
          value={bikeType}
          onChange={(e) => onBikeTypeChange(e.target.value as BikeType)}
          aria-label="Bike type"
        >
          <option value="classic">Classic bike</option>
          <option value="ebike">E-bike</option>
        </select>
        <button
          type="button"
          className={`${primaryButtonClass} w-full sm:w-auto`}
          onClick={onSubmit}
          disabled={loading || !hasQuery}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Calculating…
            </>
          ) : (
            <>
              <Search className="size-4" aria-hidden="true" />
              Check route
            </>
          )}
        </button>
      </div>

      {isRecognized ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-brand-subtle-foreground">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          Selected: <span className="font-medium text-foreground">{destination.selected?.label}</span>
        </p>
      ) : hasQuery ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Pick a suggestion for an exact match, or press Check route to look it up.
        </p>
      ) : null}
    </section>
  )
}
