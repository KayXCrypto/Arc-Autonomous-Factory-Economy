import { useEffect, useState } from 'react'

export type Route = 'intro' | 'app'

function parse(hash: string): Route {
  return hash.startsWith('#/app') ? 'app' : 'intro'
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export const HREF_INTRO = '#/'
export const HREF_APP = '#/app'
