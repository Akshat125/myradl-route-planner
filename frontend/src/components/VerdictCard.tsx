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
}

function formatMinutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`
}

const STATUS_META: Record<
  PlanResponse['status'],
  { label: string; icon: ComponentType<{ className?: string }>; pill: string }
> = {
  FREE: {
    label: 'Free window hit',
    icon: CheckCircle2,
    pill: 'bg-status-free-subtle text-status-free',
  },
  REDUCED: {
    label: 'Reduced e-bike fare',
    icon: CircleAlert,
    pill: 'bg-status-reduced-subtle text-status-reduced',
  },
  OVER: {
    label: 'Over 30-minute window',
    icon: CircleX,
    pill: 'bg-status-over-subtle text-status-over',
  },
}

function VerdictSkeleton() {
  return (
    <section className={cardClass} aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div className="h-6 w-24 animate-pulse rounded-md bg-surface-muted" />
        <div className="h-6 w-28 animate-pulse rounded-full bg-surface-muted" />
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-4">
        <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
        <div className="h-7 w-16 animate-pulse rounded bg-surface-muted" />
      </div>
      <div className="mt-6 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-muted" />
        ))}
      </div>
      <span className="sr-only">Calculating your route…</span>
    </section>
  )
}

export function VerdictCard({ start, plan, loading, destinationLabel }: Props) {
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
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Verdict</h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.pill}`}
        >
          <StatusIcon className="size-3.5" />
          {status.label}
        </span>
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-4">
        <span className="text-sm text-muted">Estimated total time</span>
        <span className="text-2xl font-semibold text-foreground">
          {formatMinutes(plan.total_duration_s)}
        </span>
      </div>

      {legs ? (
        <ol className="mt-5 flex flex-col gap-2">
          {legs.map((leg, index) => {
            const ModeIcon = leg.mode === 'bicycling' ? Bike : Footprints
            const badgeClass =
              leg.mode === 'bicycling'
                ? 'bg-status-free-subtle text-status-free'
                : 'bg-brand-subtle text-brand-subtle-foreground'
            return (
              <li key={`${leg.fromLabel}-${leg.toLabel}`} className="min-w-0">
                <a
                  href={leg.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-3 text-foreground transition-colors hover:border-border-strong hover:bg-surface-muted"
                >
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}
                  >
                    <ModeIcon className="size-3.5" aria-hidden="true" />
                    {leg.modeLabel}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {leg.fromLabel} → {leg.toLabel}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatMinutes(legTimes[index])}
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
            )
          })}
        </ol>
      ) : null}
    </section>
  )
}
