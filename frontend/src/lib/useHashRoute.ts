import { useEffect, useState } from 'react'

export type Route = 'home' | 'impressum' | 'datenschutz'

function parseHash(): Route {
  if (typeof window === 'undefined') return 'home'
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  if (hash === 'impressum') return 'impressum'
  if (hash === 'datenschutz') return 'datenschutz'
  return 'home'
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
