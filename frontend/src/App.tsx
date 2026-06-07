import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Bike, Moon, Sun } from 'lucide-react'

import './App.css'
import { Map } from './components/Map'
import { SearchBar } from './components/SearchBar'
import { StartLocationControl } from './components/StartLocationControl'
import { VerdictCard } from './components/VerdictCard'
import { fetchPlan, type AddressSuggestion, type BikeType, type PlanResponse } from './lib/api'
import { useTheme } from './lib/useTheme'

export type StartLocation = {
  lat: number
  lng: number
  label: string | null
  source: 'geolocation' | 'manual'
}

export type GeoStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable'

export type DestinationSelection = {
  query: string
  selected: AddressSuggestion | null
}

function App() {
  const { theme, toggleTheme } = useTheme()
  const [bikeType, setBikeType] = useState<BikeType>('classic')
  const [destination, setDestination] = useState<DestinationSelection>({ query: '', selected: null })
  const [start, setStart] = useState<StartLocation | null>(null)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [plan, setPlan] = useState<PlanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable')
      return
    }
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStart({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: null,
          source: 'geolocation',
        })
        setGeoStatus('granted')
        setError(null)
      },
      (err) => {
        setGeoStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }, [])

  useEffect(() => {
    // Geolocation is an external system; trigger the one-time lookup on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    requestCurrentLocation()
  }, [requestCurrentLocation])

  const handleManualStart = (suggestion: AddressSuggestion) => {
    setStart({
      lat: suggestion.lat,
      lng: suggestion.lng,
      label: suggestion.label,
      source: 'manual',
    })
    setError(null)
  }

  const handleDestinationSelect = (suggestion: AddressSuggestion) => {
    setDestination({ query: suggestion.label, selected: suggestion })
  }

  const handleDestinationText = (text: string) => {
    setDestination({ query: text, selected: null })
  }

  const submit = async () => {
    if (!start) {
      setError('Set your start location first (use current location or enter an address).')
      return
    }
    if (!destination.query.trim()) {
      setError('Please enter a destination.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const nextPlan = await fetchPlan({
        start_lat: start.lat,
        start_lng: start.lng,
        bike_type: bikeType,
        ...(destination.selected
          ? {
              destination_lat: destination.selected.lat,
              destination_lng: destination.selected.lng,
            }
          : { destination_query: destination.query.trim() }),
      })
      setPlan(nextPlan)
    } catch (err) {
      setPlan(null)
      setError(err instanceof Error ? err.message : 'Route planning failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-7">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand text-brand-foreground shadow-card">
            <Bike className="size-5" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">MyRadl Route Planner</h1>
            <p className="text-sm text-muted">Free-ride planner for Munich&rsquo;s bike share</p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="focus-ring grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          {theme === 'dark' ? (
            <Sun className="size-5" aria-hidden="true" />
          ) : (
            <Moon className="size-5" aria-hidden="true" />
          )}
        </button>
      </header>

      <StartLocationControl
        start={start}
        status={geoStatus}
        focus={start}
        onUseCurrentLocation={requestCurrentLocation}
        onManualSelect={handleManualStart}
      />

      <SearchBar
        bikeType={bikeType}
        destination={destination}
        loading={loading}
        focus={start}
        onBikeTypeChange={setBikeType}
        onDestinationText={handleDestinationText}
        onDestinationSelect={handleDestinationSelect}
        onSubmit={submit}
      />

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-card border border-status-over bg-status-over-subtle px-4 py-3 text-sm text-status-over"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      <section className="results-grid">
        <Map start={start} plan={plan} theme={theme} />
        <VerdictCard
          start={start}
          plan={plan}
          loading={loading}
          destinationLabel={destination.selected?.label ?? destination.query}
        />
      </section>
    </main>
  )
}

export default App
