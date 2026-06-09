import {
  ArrowUpRight,
  Bike,
  CheckCircle2,
  CircleAlert,
  CircleX,
  Footprints,
} from 'lucide-react'
import type { ComponentType } from 'react'

import type { PlanResponse } from '../lib/api'
import { buildJourneyLegs } from '../lib/gmaps'
import { cardClass } from '../lib/ui'

type Props = {
  start: { lat: number; lng: number; label?: string | null } | null
  plan: PlanResponse | null
  loading?: boolean
  destinationLabel?: string | null
  reportUrl?: string | null
}

function formatMinutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`
}

function formatDataAge(seconds: number | null): string {
  if (seconds == null) return 'unknown age'
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.round(seconds / 60)
  return mins === 1 ? '1 min ago' : `${mins} min ago`
}

const STATUS_META: Record<
  PlanResponse['status'],
  {
    headline: string
    subtitle: string
    icon: ComponentType<{ className?: string }>
    heroClass: string
    textClass: string
  }
> = {
  FREE: {
    headline: 'Free ride',
    subtitle: 'Bike leg fits within the 30-minute window',
    icon: CheckCircle2,
    heroClass: 'verdict-hero verdict-hero-free',
    textClass: 'text-status-free',
  },
  REDUCED: {
    headline: 'Reduced fare',
    subtitle: 'E-bike discount applies — bike leg under 30 minutes',
    icon: CircleAlert,
    heroClass: 'verdict-hero verdict-hero-reduced',
    textClass: 'text-status-reduced',
  },
  OVER: {
    headline: 'Over 30 min',
    subtitle: 'Bike leg exceeds the free 30-minute window',
    icon: CircleX,
    heroClass: 'verdict-hero verdict-hero-over',
    textClass: 'text-status-over',
  },
}

function VerdictSkeleton() {
  return (
    <section className={cardClass} aria-busy="true" aria-live="polite">
      <div className="verdict-hero animate-pulse bg-surface-muted">
        <div className="h-10 w-36 rounded-lg bg-surface-muted" />
        <div className="mt-3 h-5 w-40 rounded bg-surface-muted" />
      </div>
      <div className="mt-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-16 w-3 shrink-0 rounded-full bg-surface-muted" />
            <div className="h-16 flex-1 animate-pulse rounded-xl bg-surface-muted" />
          </div>
        ))}
      </div>
      <span className="sr-only">Calculating your route…</span>
    </section>
  )
}

function FreshnessLine({ snapshot }: { snapshot: PlanResponse['snapshot'] }) {
  const age = formatDataAge(snapshot.data_age_seconds)
  if (snapshot.stale) {
    return (
      <p className="mt-4 text-xs text-status-reduced">
        Dock data may be outdated ({age}). Availability can change quickly.
      </p>
    )
  }
  return <p className="mt-4 text-xs text-muted-foreground">Dock data updated {age}</p>
}

export function VerdictCard({ start, plan, loading, destinationLabel, reportUrl }: Props) {
  if (loading) {
    return <VerdictSkeleton />
  }

  if (!plan) {
    return (
      <section className={cardClass}>
        <p className="text-sm text-muted">
          Enter a destination to see whether your ride fits the 30-minute benefit window.
        </p>
      </section>
    )
  }

  const status = STATUS_META[plan.status]
  const StatusIcon = status.icon

  const legs = start
    ? buildJourneyLegs(
        start,
        {
          lat: plan.origin_station.lat,
          lng: plan.origin_station.lon,
          name: plan.origin_station.name,
        },
        {
          lat: plan.destination_station.lat,
          lng: plan.destination_station.lon,
          name: plan.destination_station.name,
        },
        { lat: plan.destination.lat, lng: plan.destination.lng, label: destinationLabel },
      )
    : null

  const legTimes = [plan.walk_to_start_s, plan.bike_duration_s, plan.walk_to_end_s]

  return (
    <section className={`${cardClass} verdict-result`}>
      <div className={status.heroClass}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`verdict-headline ${status.textClass}`}>{status.headline}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {formatMinutes(plan.total_duration_s)}
              <span className="ml-1.5 text-base font-normal text-muted">total</span>
            </p>
          </div>
          <StatusIcon className={`size-8 shrink-0 ${status.textClass}`} aria-hidden="true" />
        </div>
        <p className="mt-2 text-sm text-muted">{status.subtitle}</p>
        {plan.cost_eur > 0 ? (
          <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
            Est. fare: €{plan.cost_eur.toFixed(2)}
          </p>
        ) : null}
      </div>

      {legs ? (
        <div className="journey-section">
          <h3 className="journey-section-label">Your route</h3>
          <ol className="journey-timeline">
            {legs.map((leg, index) => {
              const ModeIcon = leg.mode === 'bicycling' ? Bike : Footprints
              const isBike = leg.mode === 'bicycling'
              const stepClass = isBike ? 'journey-step-bike' : 'journey-step-walk'
              const isLast = index === legs.length - 1
              return (
                <li key={`${leg.fromLabel}-${leg.toLabel}`} className={`journey-step ${stepClass}`}>
                  <div className="journey-rail" aria-hidden="true">
                    <span className="journey-dot" />
                    {!isLast ? <span className="journey-line" /> : null}
                  </div>
                  <a
                    href={leg.url}
                    target="_blank"
                    rel="noreferrer"
                    className="journey-card focus-ring"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isBike
                            ? 'bg-status-free-subtle text-status-free'
                            : 'bg-brand-subtle text-brand-subtle-foreground'
                        }`}
                      >
                        <ModeIcon className="size-3.5" aria-hidden="true" />
                        {leg.modeLabel}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatMinutes(legTimes[index])}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-snug text-foreground">
                      {leg.fromLabel} → {leg.toLabel}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      Open in Google Maps
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </a>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}

      <FreshnessLine snapshot={plan.snapshot} />

      {plan.note ? <p className="mt-3 text-xs text-muted">{plan.note}</p> : null}

      {reportUrl ? (
        <a
          href={reportUrl}
          target="_blank"
          rel="noreferrer"
          className="focus-ring mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Something looks wrong?
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
    </section>
  )
}
