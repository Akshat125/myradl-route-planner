type LatLng = { lat: number; lng: number }

type TravelMode = 'bicycling' | 'walking'

function coord(point: LatLng): string {
  return `${point.lat},${point.lng}`
}

function mapsUrl(origin: LatLng, destination: LatLng, travelMode: TravelMode): string {
  const params = new URLSearchParams({
    api: '1',
    origin: coord(origin),
    destination: coord(destination),
    travelmode: travelMode,
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export type JourneyLeg = {
  mode: TravelMode
  modeLabel: string
  fromLabel: string
  toLabel: string
  url: string
}

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
      url: mapsUrl(start, { lat: originStation.lat, lng: originStation.lng }, 'walking'),
    },
    {
      mode: 'bicycling',
      modeLabel: 'Bike',
      fromLabel: originStation.name,
      toLabel: destinationStation.name,
      url: mapsUrl(
        { lat: originStation.lat, lng: originStation.lng },
        { lat: destinationStation.lat, lng: destinationStation.lng },
        'bicycling',
      ),
    },
    {
      mode: 'walking',
      modeLabel: 'Walk',
      fromLabel: destinationStation.name,
      toLabel: destLabel,
      url: mapsUrl(
        { lat: destinationStation.lat, lng: destinationStation.lng },
        { lat: finalDestination.lat, lng: finalDestination.lng },
        'walking',
      ),
    },
  ]
}
