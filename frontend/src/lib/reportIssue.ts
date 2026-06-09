import type { BikeType, PlanResponse } from './api'

const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO ?? 'Akshat125/myradl-route-planner'
const TEMPLATE = 'route-report.yml'
const MAX_CONTEXT_LENGTH = 2000

const ERROR_CATEGORY = 'App error or could not plan route'

export type ReportContext = {
  start: {
    lat: number
    lng: number
    label: string | null
    source: 'geolocation' | 'manual'
  } | null
  destinationQuery: string
  destinationLabel: string | null
  bikeType: BikeType
  plan: PlanResponse | null
  error?: string | null
}

function formatCoord(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

function formatMinutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`
}

function formatStation(
  station: PlanResponse['origin_station'],
  role: 'origin' | 'destination',
): string {
  const bikes = station.bikes_by_type
  const bikeSummary = `classic: ${bikes.classic ?? 0}, ebike: ${bikes.ebike ?? 0}`
  if (role === 'origin') {
    return `${station.name} (bikes: ${bikeSummary}, docks free: ${station.docks_available})`
  }
  return `${station.name} (docks free: ${station.docks_available})`
}

export function serializeRouteContext(ctx: ReportContext): string {
  const lines: string[] = [
    `- Timestamp: ${new Date().toISOString()}`,
    `- App: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}`,
  ]

  if (ctx.start) {
    const label = ctx.start.label ? ` (${ctx.start.label})` : ''
    lines.push(
      `- Start: ${formatCoord(ctx.start.lat, ctx.start.lng)}${label} [${ctx.start.source}]`,
    )
  } else {
    lines.push('- Start: not set')
  }

  const destination = ctx.destinationLabel ?? ctx.destinationQuery
  lines.push(`- Destination: ${destination || 'not set'}`)
  lines.push(`- Bike type: ${ctx.bikeType}`)

  if (ctx.plan) {
    const { plan } = ctx
    lines.push(
      `- Verdict: ${plan.status} | total ${formatMinutes(plan.total_duration_s)} | bike ${formatMinutes(plan.bike_duration_s)}`,
    )
    lines.push(`- Origin station: ${formatStation(plan.origin_station, 'origin')}`)
    lines.push(`- Destination station: ${formatStation(plan.destination_station, 'destination')}`)
    if (plan.backup_destination_station) {
      lines.push(
        `- Backup station: ${formatStation(plan.backup_destination_station, 'destination')}`,
      )
    }
    const age =
      plan.snapshot.data_age_seconds == null
        ? 'unknown'
        : plan.snapshot.data_age_seconds < 60
          ? `${plan.snapshot.data_age_seconds}s ago`
          : `${Math.round(plan.snapshot.data_age_seconds / 60)} min ago`
    lines.push(`- Dock data: ${age}, stale: ${plan.snapshot.stale ? 'yes' : 'no'}`)
  }

  if (ctx.error) {
    lines.push(`- Error: ${ctx.error}`)
  }

  let text = lines.join('\n')
  if (text.length > MAX_CONTEXT_LENGTH) {
    text = `${text.slice(0, MAX_CONTEXT_LENGTH - 20)}\n… (truncated)`
  }
  return text
}

function buildReportTitle(ctx: ReportContext): string {
  const destination = ctx.destinationLabel ?? ctx.destinationQuery
  if (ctx.error) return `[Route report] ${ctx.error.slice(0, 80)}`
  if (destination) return `[Route report] ${destination.slice(0, 80)}`
  return '[Route report]'
}

export function buildReportIssueUrl(ctx: ReportContext): string {
  const routeContext = serializeRouteContext(ctx)
  const params = new URLSearchParams({
    template: TEMPLATE,
    title: buildReportTitle(ctx),
    // Fallback for when the issue form template is not on GitHub yet.
    body: `## Route context\n\n${routeContext}\n\n## What seems off?\n\n<!-- Describe what you expected -->\n`,
    route_context: routeContext,
  })

  if (ctx.error) {
    params.set('category', ERROR_CATEGORY)
  }

  return `https://github.com/${GITHUB_REPO}/issues/new?${params.toString()}`
}
