export type BikeType = 'classic' | 'ebike'

export type Station = {
  id: string
  name: string
  lat: number
  lon: number
  capacity: number
  bikes_by_type: Record<BikeType, number>
  docks_available: number
  is_renting: boolean
  is_returning: boolean
  distance_m?: number
}

export type PlanResponse = {
  status: 'FREE' | 'REDUCED' | 'OVER'
  bike_type: BikeType
  cost_eur: number
  bike_duration_s: number
  bike_distance_m: number
  walk_to_start_s: number
  walk_to_end_s: number
  total_duration_s: number
  origin_station: Station
  destination_station: Station
  backup_destination_station: Station | null
  route_geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  walk_to_start_geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  } | null
  walk_to_end_geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  } | null
  destination: { lat: number; lng: number }
  snapshot: {
    last_updated: number | null
    data_age_seconds: number | null
    stale: boolean
    network_id: string
  }
  chaining_hint: boolean
  note: string
}

export type PlanRequest = {
  start_lat: number
  start_lng: number
  bike_type: BikeType
  destination_query?: string
  destination_lat?: number
  destination_lng?: number
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let msg = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (body.detail) msg = body.detail
    } catch {
      void 0
    }
    throw new Error(msg)
  }
  return response.json() as Promise<T>
}

export type AddressSuggestion = {
  label: string
  lat: number
  lng: number
}

export async function fetchAutocomplete(
  text: string,
  focus?: { lat: number; lng: number } | null,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({ text })
  if (focus) {
    params.set('focus_lat', String(focus.lat))
    params.set('focus_lng', String(focus.lng))
  }
  const res = await fetch(`${API_BASE}/geocode/autocomplete?${params.toString()}`, { signal })
  const body = await parseResponse<{ suggestions: AddressSuggestion[] }>(res)
  return body.suggestions ?? []
}

export async function fetchPlan(payload: PlanRequest): Promise<PlanResponse> {
  const res = await fetch(`${API_BASE}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<PlanResponse>(res)
}

export type FeedbackType = 'bug' | 'feature' | 'other'

export type FeedbackRequest = {
  type: FeedbackType
  message: string
  email?: string | null
  context?: string | null
  website?: string
}

export type FeedbackResponse = {
  ok: boolean
  issue_url: string
}

export async function submitFeedback(payload: FeedbackRequest): Promise<FeedbackResponse> {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<FeedbackResponse>(res)
}

