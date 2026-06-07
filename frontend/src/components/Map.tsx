import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'

import type { PlanResponse } from '../lib/api'
import type { Theme } from '../lib/useTheme'

type Props = {
  start: { lat: number; lng: number } | null
  plan: PlanResponse | null
  theme: Theme
}

const MUNICH_CENTER: [number, number] = [48.137154, 11.576124]

const WHITE_DOT =
  '<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4" fill="#ffffff"/></svg>'

function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin" style="background:${color}">${WHITE_DOT}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    tooltipAnchor: [0, -24],
  })
}

const ICONS = {
  start: pinIcon('#2563eb'),
  origin: pinIcon('#059669'),
  destination: pinIcon('#db2777'),
  backup: pinIcon('#d97706'),
  place: pinIcon('#dc2626'),
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 15)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
  }, [map, points])
  return null
}

const TILES = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
}

export function Map({ start, plan, theme }: Props) {
  const polyline =
    plan?.route_geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) ?? []

  const center: [number, number] = start
    ? [start.lat, start.lng]
    : plan
      ? [plan.origin_station.lat, plan.origin_station.lon]
      : MUNICH_CENTER

  const tiles = TILES[theme]
  const routeColor = theme === 'dark' ? '#34d399' : '#059669'
  const walkColor = theme === 'dark' ? '#94a3b8' : '#64748b'

  const originStation: [number, number] | null = plan
    ? [plan.origin_station.lat, plan.origin_station.lon]
    : null
  const destStation: [number, number] | null = plan
    ? [plan.destination_station.lat, plan.destination_station.lon]
    : null
  const place: [number, number] | null = plan
    ? [plan.destination.lat, plan.destination.lng]
    : null
  const startPoint: [number, number] | null = start ? [start.lat, start.lng] : null

  const toLatLng = (coords: [number, number][]) =>
    coords.map(([lng, lat]) => [lat, lng] as [number, number])

  const walkToStart = plan?.walk_to_start_geometry
    ? toLatLng(plan.walk_to_start_geometry.coordinates)
    : startPoint && originStation
      ? [startPoint, originStation]
      : null
  const walkToPlace = plan?.walk_to_end_geometry
    ? toLatLng(plan.walk_to_end_geometry.coordinates)
    : destStation && place
      ? [destStation, place]
      : null

  const bounds = [startPoint, originStation, destStation, place].filter(
    (p): p is [number, number] => p !== null,
  )

  return (
    <section className="map-frame overflow-hidden rounded-card border border-border shadow-card">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer key={theme} attribution={tiles.attribution} url={tiles.url} />
        {bounds.length > 0 ? <FitBounds points={bounds} /> : null}
        {startPoint ? (
          <Marker position={startPoint} icon={ICONS.start}>
            <Tooltip>Start</Tooltip>
          </Marker>
        ) : null}
        {plan ? (
          <>
            <Marker position={originStation!} icon={ICONS.origin}>
              <Tooltip>
                Pick up bike: {plan.origin_station.name} (
                {plan.origin_station.bikes_by_type[plan.bike_type]} bikes)
              </Tooltip>
            </Marker>
            <Marker position={destStation!} icon={ICONS.destination}>
              <Tooltip>
                Drop off bike: {plan.destination_station.name} (
                {plan.destination_station.docks_available} docks)
              </Tooltip>
            </Marker>
            {place ? (
              <Marker position={place} icon={ICONS.place}>
                <Tooltip>Destination</Tooltip>
              </Marker>
            ) : null}
            {plan.backup_destination_station ? (
              <Marker
                position={[
                  plan.backup_destination_station.lat,
                  plan.backup_destination_station.lon,
                ]}
                icon={ICONS.backup}
              >
                <Tooltip>
                  Backup station: {plan.backup_destination_station.name} (
                  {plan.backup_destination_station.docks_available} docks)
                </Tooltip>
              </Marker>
            ) : null}
            {walkToStart ? (
              <Polyline
                positions={walkToStart}
                pathOptions={{ color: walkColor, weight: 4, opacity: 0.8, dashArray: '2 9' }}
              />
            ) : null}
            {polyline.length > 0 ? (
              <Polyline positions={polyline} pathOptions={{ color: routeColor, weight: 5, opacity: 0.85 }} />
            ) : null}
            {walkToPlace ? (
              <Polyline
                positions={walkToPlace}
                pathOptions={{ color: walkColor, weight: 4, opacity: 0.8, dashArray: '2 9' }}
              />
            ) : null}
          </>
        ) : null}
      </MapContainer>
    </section>
  )
}
