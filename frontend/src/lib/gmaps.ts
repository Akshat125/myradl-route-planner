type LatLng = { lat: number; lng: number }

export type TravelMode = 'bicycling' | 'walking' | 'driving' | 'transit'

type BuildOptions = {
  waypoints?: LatLng[]
  travelMode?: TravelMode
}

function coord(point: LatLng): string {
  return `${point.lat},${point.lng}`
}

export function buildGoogleMapsUrl(
  origin: LatLng,
  destination: LatLng,
  options: BuildOptions = {},
): string {
  const params = new URLSearchParams({
    api: '1',
    origin: coord(origin),
    destination: coord(destination),
    travelmode: options.travelMode ?? 'bicycling',
  })

  if (options.waypoints && options.waypoints.length > 0) {
    params.set('waypoints', options.waypoints.map(coord).join('|'))
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export type JourneyLeg = {
  mode: TravelMode
  modeLabel: string
  fromLabel: string
  toLabel: string
  url: string
}

/**
 * Google Maps deep links only carry a single travel mode per URL, so we expose
 * one link per leg (walk -> bike -> walk) instead of a lossy bike-only handoff.
 */
export function buildJourneyLegs(
  start: LatLng,
  originStation: { lat: number; lng: number; name: string },
  destinationStation: { lat: number; lng: number; name: string },
  finalDestination: { lat: number; lng: number; label?: string | null },
): JourneyLeg[] {
  const destLabel = finalDestination.label ?? 'Destination'
  return [
    {
      mode: 'walking',
      modeLabel: 'Walk',
      fromLabel: 'Start',
      toLabel: originStation.name,
      url: buildGoogleMapsUrl(
        start,
        { lat: originStation.lat, lng: originStation.lng },
        { travelMode: 'walking' },
      ),
    },
    {
      mode: 'bicycling',
      modeLabel: 'Bike',
      fromLabel: originStation.name,
      toLabel: destinationStation.name,
      url: buildGoogleMapsUrl(
        { lat: originStation.lat, lng: originStation.lng },
        { lat: destinationStation.lat, lng: destinationStation.lng },
        { travelMode: 'bicycling' },
      ),
    },
    {
      mode: 'walking',
      modeLabel: 'Walk',
      fromLabel: destinationStation.name,
      toLabel: destLabel,
      url: buildGoogleMapsUrl(
        { lat: destinationStation.lat, lng: destinationStation.lng },
        { lat: finalDestination.lat, lng: finalDestination.lng },
        { travelMode: 'walking' },
      ),
    },
  ]
}
